import { useState } from 'react'
import {
  Package,
  PackagePlus,
  ShieldCheck,
  Lock,
  Truck,
  CircleCheck,
  CircleAlert,
  Clock,
  ArrowRight,
  Eye,
  Boxes,
} from 'lucide-react'
import {
  Card,
  CardTitle,
  PageHeader,
  StatCard,
  Badge,
  Table,
  Tr,
  Td,
  EmptyState,
  Modal,
} from '@/components/ui'
import { bundles as seedBundles, fleetTotals, LATEST_STABLE } from '@/data/fleet'
import type { UpdateBundle, BundleState } from '@/data/fleet'

/* Ordered offline delivery pipeline (Failed is a separate error state). */
const PIPELINE: BundleState[] = ['Built', 'Signed', 'Delivered', 'Imported', 'Verified', 'Activated']

const STATE_VERB: Record<BundleState, string> = {
  Built: 'Build',
  Signed: 'Sign',
  Delivered: 'Deliver',
  Imported: 'Import',
  Verified: 'Verify',
  Activated: 'Activate',
  Failed: 'Retry',
}

function nextState(state: BundleState): BundleState | null {
  const i = PIPELINE.indexOf(state)
  if (i < 0 || i === PIPELINE.length - 1) return null
  return PIPELINE[i + 1]
}

type BadgeTone = 'green' | 'blue' | 'slate' | 'red' | 'orange'
function stateTone(state: BundleState): BadgeTone {
  if (state === 'Activated') return 'green'
  if (state === 'Failed') return 'red'
  if (state === 'Built' || state === 'Signed') return 'slate'
  return 'blue' // Delivered / Imported / Verified
}

const dotClass: Record<BadgeTone, string> = {
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  slate: 'bg-slate-300',
  red: 'bg-rose-500',
  orange: 'bg-orange-500',
}

let seq = seedBundles.length

export default function Bundles() {
  const [rows, setRows] = useState<UpdateBundle[]>(seedBundles)
  const [sel, setSel] = useState<UpdateBundle | null>(null)

  const advance = (id: string) =>
    setRows((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b
        const next = nextState(b.state)
        if (!next) return b
        return { ...b, state: next, signed: b.signed || next === 'Signed' || PIPELINE.indexOf(next) > 1 }
      }),
    )

  // Keep the open modal in sync with advancing state.
  const selLive = sel ? rows.find((b) => b.id === sel.id) ?? null : null

  const buildBundle = () => {
    seq += 1
    const fresh: UpdateBundle = {
      id: `bndl_new_${seq}`,
      customer: 'Helix Health',
      version: LATEST_STABLE,
      sizeGb: Number((12 + Math.random()).toFixed(1)),
      created: '2026-07-07',
      state: 'Built',
      signed: false,
      checksum: `sha256:${Math.random().toString(16).slice(2, 6)}…${Math.random().toString(16).slice(2, 6)}`,
    }
    setRows((prev) => [fresh, ...prev])
  }

  const pending = rows.filter((b) => b.state !== 'Activated' && b.state !== 'Failed').length
  const delivered = rows.filter((b) => b.state === 'Delivered').length
  const activated = rows.filter((b) => b.state === 'Activated').length

  return (
    <>
      <PageHeader
        title="Update Bundles"
        description="Signed offline update delivery for air-gapped deployments"
        actions={
          <button className="btn-primary" onClick={buildBundle}>
            <PackagePlus className="h-4 w-4" />
            Build bundle
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Air-gapped sites" value={fleetTotals.airgapped} icon={Boxes} tone="red" footer="Offline delivery only" />
        <StatCard label="Bundles pending" value={pending} icon={Clock} tone="orange" footer="Not yet activated" />
        <StatCard label="Delivered" value={delivered} icon={Truck} tone="blue" footer="Awaiting import" />
        <StatCard label="Activated" value={activated} icon={CircleCheck} tone="green" footer="Live on target site" />
      </div>

      {/* Lifecycle legend / stepper */}
      <Card className="mt-6">
        <CardTitle title="Offline delivery lifecycle" subtitle="Each bundle advances through six stages before it is live at the air-gapped site" />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
          {PIPELINE.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-sm font-medium text-ink-700 ring-1 ring-inset ring-slate-200">
                <span className={`h-2 w-2 rounded-full ${dotClass[stateTone(s)]}`} />
                {s}
              </span>
              {i < PIPELINE.length - 1 && <ArrowRight className="h-4 w-4 text-ink-300" />}
            </div>
          ))}
          <span className="ml-2 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
            <CircleAlert className="h-3.5 w-3.5" />
            Failed — error state, rebuild required
          </span>
        </div>
      </Card>

      {/* Bundle table */}
      <Card className="mt-6">
        <CardTitle title="Bundles" subtitle={`${rows.length} bundle${rows.length === 1 ? '' : 's'} across air-gapped customers`} />
        {rows.length === 0 ? (
          <EmptyState icon={Package} title="No bundles yet" description="Build a signed offline bundle to ship an update to an air-gapped site." />
        ) : (
          <Table columns={['Customer', 'Version', 'Size', 'Created', 'Signed', 'State', 'Checksum', 'Actions', '']}>
            {rows.map((b) => {
              const next = nextState(b.state)
              return (
                <Tr key={b.id}>
                  <Td className="font-semibold text-ink-900">{b.customer}</Td>
                  <Td className="font-mono text-xs text-ink-700">{b.version}</Td>
                  <Td className="text-sm text-ink-700">{b.sizeGb} GB</Td>
                  <Td className="text-sm text-ink-500">{b.created}</Td>
                  <Td>
                    {b.signed ? (
                      <Badge tone="green">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Signed
                      </Badge>
                    ) : (
                      <Badge tone="slate">
                        <Lock className="h-3.5 w-3.5" />
                        Unsigned
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={stateTone(b.state)} dot>
                      {b.state}
                    </Badge>
                  </Td>
                  <Td className="max-w-[9rem] truncate font-mono text-xs text-ink-400">{b.checksum}</Td>
                  <Td>
                    {b.state === 'Activated' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <CircleCheck className="h-3.5 w-3.5" />
                        Activated
                      </span>
                    ) : next ? (
                      <button className="btn-secondary px-2.5 py-1 text-xs" onClick={() => advance(b.id)}>
                        <ArrowRight className="h-3.5 w-3.5" />
                        {STATE_VERB[next]}
                      </button>
                    ) : (
                      <span className="text-xs text-ink-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <button
                      className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600"
                      aria-label={`View ${b.customer} bundle`}
                      onClick={() => setSel(b)}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </Card>

      {/* Bundle detail modal */}
      {selLive && (
        <Modal
          open
          onClose={() => setSel(null)}
          title={<span className="font-mono">{selLive.version}</span>}
          subtitle={`${selLive.customer} · ${selLive.sizeGb} GB offline bundle`}
          headerRight={<Badge tone={stateTone(selLive.state)} dot>{selLive.state}</Badge>}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setSel(null)}>
                Close
              </button>
              {(() => {
                const next = nextState(selLive.state)
                return next ? (
                  <button className="btn-primary" onClick={() => advance(selLive.id)}>
                    <ArrowRight className="h-4 w-4" />
                    {STATE_VERB[next]}
                  </button>
                ) : (
                  <button className="btn-primary" disabled>
                    <CircleCheck className="h-4 w-4" />
                    Activated
                  </button>
                )
              })()}
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KV label="Customer" value={selLive.customer} />
              <KV label="Version" value={selLive.version} mono />
              <KV label="Size" value={`${selLive.sizeGb} GB`} />
              <KV label="Created" value={selLive.created} />
              <KV label="Checksum" value={selLive.checksum} mono />
              <KV label="Signature" value={selLive.signed ? 'Cosign verified' : 'Unsigned'} />
            </div>

            <section>
              <h4 className="mb-3 text-sm font-semibold text-ink-900">Lifecycle</h4>
              <ol className="space-y-2.5">
                {PIPELINE.map((step, i) => {
                  const current = PIPELINE.indexOf(selLive.state)
                  const done = i < current
                  const active = i === current
                  return (
                    <li key={step} className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          done
                            ? 'bg-emerald-500 text-white'
                            : active
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {done ? '✓' : i + 1}
                      </span>
                      <span className={`text-sm ${done || active ? 'text-ink-900' : 'text-ink-400'}`}>{step}</span>
                      {active && <Badge tone="blue">Current</Badge>}
                    </li>
                  )
                })}
              </ol>
            </section>

            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Boxes className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-900">
                This bundle is transferred <strong>out-of-band</strong> to the air-gapped site — via physical media or a
                one-way data diode. The site imports, verifies the signature, and activates it locally; no network path
                exists between PLCY and the deployment.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 font-semibold text-ink-900 ${mono ? 'truncate font-mono text-sm' : ''}`}>{value}</p>
    </div>
  )
}
