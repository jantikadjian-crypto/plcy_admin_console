import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Link } from 'react-router-dom'
import { Rocket, ArrowUpCircle, RotateCcw, CircleCheck, CircleAlert, ShieldCheck, Boxes, ArrowUpRight } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Modal } from '@/components/ui'
import {
  deployments as seedDeployments,
  releases,
  versionDistribution,
  fleetTotals,
  regionByCode,
  LATEST_STABLE,
} from '@/data/fleet'
import type { Deployment, RolloutStatus, Channel, Release } from '@/data/fleet'
import { useCustomerScope } from '@/context/CustomerScope'
import { useSession } from '@/context/Session'
import { GatedButton } from '@/components/GatedButton'
import { useRegistryPromoted, platformPromotedTag } from '@/data/registryStore'
import { compareVer } from '@/data/clusters'

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)', fontSize: 12 }

const statusTone: Record<RolloutStatus, 'green' | 'orange' | 'blue' | 'purple' | 'red'> = {
  'Up to date': 'green',
  'Update available': 'orange',
  'Rolling out': 'blue',
  Rollback: 'purple',
  Offline: 'red',
}
const channelTone: Record<Channel, 'green' | 'orange' | 'purple'> = { Stable: 'green', RC: 'orange', Canary: 'purple' }
const sovTone = (s: string) => (s === 'Air-gapped' ? 'red' : s === 'Sovereign Cloud' ? 'purple' : 'slate') as 'red' | 'purple' | 'slate'

const barColor = (v: string) => (v.includes('rc') ? '#f59e0b' : v === LATEST_STABLE ? '#10b981' : v.startsWith('v4.6') ? '#ef4444' : '#3366ff')

const ROLLOUT_STEPS = ['Preflight checks', 'Pull signed images', 'Apply Helm release', 'Run migrations', 'Health checks', 'Cutover']
function stepProgress(status: RolloutStatus): number {
  if (status === 'Up to date') return ROLLOUT_STEPS.length
  if (status === 'Rolling out') return 4
  if (status === 'Rollback') return 2
  return 0
}

export default function Releases() {
  const { scope, isAll } = useCustomerScope()
  const { logAction } = useSession()
  const promoted = useRegistryPromoted()
  const [rows, setRows] = useState<Deployment[]>(seedDeployments)
  const [sel, setSel] = useState<Deployment | null>(null)
  const [relSel, setRelSel] = useState<Release | null>(null)

  // The rollout target is the tag promoted for the platform image in the
  // Container Registry — promote there and the whole fleet re-evaluates here.
  const target = platformPromotedTag(promoted) || LATEST_STABLE

  // Status is derived against the live target; user-initiated transitions
  // (Rolling out / Rollback) are held on the row until completed.
  const displayStatus = (d: Deployment): RolloutStatus => {
    if (d.status === 'Offline') return 'Offline'
    if (d.status === 'Rolling out' || d.status === 'Rollback') return d.status
    return compareVer(d.version, target) < 0 ? 'Update available' : 'Up to date'
  }

  const scoped = isAll ? rows : rows.filter((d) => d.customer === scope)

  const setStatus = (id: string, status: RolloutStatus, patch?: Partial<Deployment>) =>
    setRows((prev) => prev.map((d) => (d.id === id ? { ...d, status, target, ...patch } : d)))

  const stage = (d: Deployment) => {
    logAction({ action: d.connectivity === 'Air-gapped' ? 'release.ship-bundle' : 'release.stage', target: `${d.customer} → ${target}`, category: 'release' })
    setStatus(d.id, 'Rolling out')
  }
  const complete = (d: Deployment) => {
    logAction({ action: 'release.complete', target: `${d.customer} → ${target}`, category: 'release' })
    setStatus(d.id, 'Up to date', { version: target })
  }
  const rollbackRolling = (d: Deployment) => {
    logAction({ action: 'release.rollback', target: `${d.customer} → ${d.version}`, category: 'release' })
    setStatus(d.id, 'Update available')
  }

  const upToDate = scoped.filter((d) => displayStatus(d) === 'Up to date').length
  const updateAvailable = scoped.filter((d) => displayStatus(d) === 'Update available').length
  const rollingOut = scoped.filter((d) => displayStatus(d) === 'Rolling out').length

  return (
    <>
      <PageHeader
        title="Releases"
        description={isAll ? 'Platform versions and staged rollout across the fleet' : `Rollout status for ${scope}`}
        actions={<GatedButton cap="release.rollout" className="btn-primary"><Rocket className="h-4 w-4" />New rollout</GatedButton>}
      />

      {/* Registry ↔ fleet coherence banner */}
      <Link to="/registry" className="mt-1 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-sm transition-colors hover:bg-brand-50">
        <Boxes className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        <span className="text-ink-700">
          Rollout target is <span className="font-mono font-semibold text-ink-900">{target}</span> — the tag promoted for <span className="font-mono">plcy/policy-engine</span> in the Container Registry. Promote a different tag there to change what the fleet rolls out to.
        </span>
        <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-brand-500" />
      </Link>

      {/* Stat row */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rollout target" value={target} icon={Rocket} tone="blue" footer="Promoted in registry" />
        <StatCard label="Up to date" value={`${upToDate}/${scoped.length}`} icon={CircleCheck} tone="green" footer="On the promoted tag" />
        <StatCard label="Update available" value={updateAvailable} icon={CircleAlert} tone="orange" footer="Behind the target" />
        <StatCard label="Rolling out" value={rollingOut} icon={ArrowUpCircle} tone="purple" footer="In progress" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Version distribution */}
        <Card className="lg:col-span-2">
          <CardTitle title="Version Distribution" subtitle="Deployments by platform version across the fleet" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={versionDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="version" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(v: number) => `${v} deployments`} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {versionDistribution.map((d) => (
                    <Cell key={d.version} fill={barColor(d.version)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Releases list */}
        <Card>
          <CardTitle title="Release Channels" subtitle="Available platform versions" />
          <ul className="divide-y divide-slate-100">
            {releases.map((r) => (
              <li key={r.version}>
                <button className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-slate-50" onClick={() => setRelSel(r)}>
                  <span className="font-mono text-sm font-semibold text-ink-900">{r.version}</span>
                  <Badge tone={channelTone[r.channel]}>{r.channel}</Badge>
                  <span className="ml-auto text-xs text-ink-400">{r.released}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Fleet rollout table */}
      <Card className="mt-6">
        <CardTitle title="Fleet Rollout" subtitle={`${scoped.length} single-tenant deployment${scoped.length === 1 ? '' : 's'}${isAll ? '' : ` · ${scope}`}`} />
        <Table columns={['Customer', 'Region', 'Mode', 'Current', 'Target', 'Status', 'Actions', '']} noun="customers">
          {scoped.map((d) => (
            <Tr key={d.id}>
              <Td className="font-semibold text-ink-900">{d.customer}</Td>
              <Td>
                <p className="text-sm text-ink-700">{regionByCode(d.regionCode)?.name ?? d.regionCode}</p>
                <p className="font-mono text-xs text-ink-400">{d.regionCode}</p>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={d.connectivity === 'Air-gapped' ? 'red' : 'blue'}>{d.connectivity}</Badge>
                  <Badge tone={sovTone(d.sovereignty)}>{d.sovereignty}</Badge>
                </div>
              </Td>
              <Td className="font-mono text-xs text-ink-700">
                {d.version}
                {displayStatus(d) === 'Update available' && <span className="ml-1 text-[10px] font-semibold text-orange-600">behind</span>}
              </Td>
              <Td className="font-mono text-xs text-ink-500">{d.status === 'Offline' ? '—' : target}</Td>
              <Td><Badge tone={statusTone[displayStatus(d)]} dot>{displayStatus(d)}</Badge></Td>
              <Td>
                {displayStatus(d) === 'Update available' && (
                  <GatedButton
                    cap="release.rollout"
                    className="btn-secondary px-2.5 py-1 text-xs"
                    onClick={() => stage(d)}
                    title={d.connectivity === 'Air-gapped' ? 'Requires a signed update bundle' : 'Stage staged rollout'}
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    {d.connectivity === 'Air-gapped' ? 'Ship bundle' : 'Stage update'}
                  </GatedButton>
                )}
                {displayStatus(d) === 'Rolling out' && (
                  <div className="flex gap-1">
                    <GatedButton cap="release.rollout" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => complete(d)}>
                      <CircleCheck className="h-3.5 w-3.5" />Complete
                    </GatedButton>
                    <GatedButton cap="release.rollout" className="btn-ghost px-2 py-1 text-xs text-rose-600" onClick={() => rollbackRolling(d)}>
                      <RotateCcw className="h-3.5 w-3.5" />Roll back
                    </GatedButton>
                  </div>
                )}
                {(displayStatus(d) === 'Up to date' || displayStatus(d) === 'Offline' || displayStatus(d) === 'Rollback') && <span className="text-xs text-ink-400">—</span>}
              </Td>
              <Td>
                <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${d.customer}`} onClick={() => setSel(d)}>
                  <Rocket className="h-4 w-4" />
                </button>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* Deployment rollout drawer */}
      {sel && (
        <Modal
          open
          onClose={() => setSel(null)}
          title={sel.customer}
          subtitle={`${regionByCode(sel.regionCode)?.name} · ${sel.regionCode}`}
          headerRight={<Badge tone={statusTone[displayStatus(sel)]} dot>{displayStatus(sel)}</Badge>}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={sel.connectivity === 'Air-gapped' ? 'red' : 'blue'}>{sel.connectivity}</Badge>
              <Badge tone={sovTone(sel.sovereignty)}>{sel.sovereignty}</Badge>
              <Badge tone="slate">Kubernetes {sel.k8sVersion}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <KV label="Current" value={sel.version} mono />
              <KV label="Target (promoted)" value={sel.status === 'Offline' ? '—' : target} mono />
              <KV label="Last sync" value={sel.lastSync} />
            </div>

            <section>
              <h4 className="mb-3 text-sm font-semibold text-ink-900">Rollout pipeline</h4>
              <ol className="space-y-2.5">
                {ROLLOUT_STEPS.map((step, i) => {
                  const done = i < stepProgress(displayStatus(sel))
                  const active = i === stepProgress(displayStatus(sel)) && displayStatus(sel) === 'Rolling out'
                  return (
                    <li key={step} className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                        {done ? '✓' : i + 1}
                      </span>
                      <span className={`text-sm ${done || active ? 'text-ink-900' : 'text-ink-400'}`}>{step}</span>
                      {active && <Badge tone="blue">In progress</Badge>}
                    </li>
                  )
                })}
              </ol>
            </section>

            {sel.connectivity === 'Air-gapped' && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <Boxes className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">
                  Air-gapped site — updates ship as a <strong>signed offline bundle</strong>. Build &amp; deliver the bundle from the Update Bundles page; the site imports, verifies, and activates it on its own schedule.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Release notes drawer */}
      {relSel && (
        <Modal open onClose={() => setRelSel(null)} title={<span className="font-mono">{relSel.version}</span>} subtitle={`Released ${relSel.released}`} headerRight={<Badge tone={channelTone[relSel.channel]}>{relSel.channel}</Badge>}>
          <div className="space-y-4">
            <Badge tone={relSel.status.includes('Deprecated') ? 'red' : relSel.status.includes('current') ? 'green' : 'slate'}>{relSel.status}</Badge>
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900"><ShieldCheck className="h-4 w-4 text-ink-400" />Release notes</p>
              <ul className="list-inside list-disc space-y-1 rounded-xl border border-slate-200 p-4 text-sm text-ink-700">
                {relSel.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
            <p className="text-xs text-ink-400">{fleetTotals.deployments} deployments in the fleet · {fleetTotals.airgapped} air-gapped.</p>
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
      <p className={`mt-0.5 font-semibold text-ink-900 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  )
}
