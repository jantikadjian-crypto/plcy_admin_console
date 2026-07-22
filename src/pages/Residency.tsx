import { useMemo, useState } from 'react'
import {
  Globe,
  ShieldCheck,
  Lock,
  Ban,
  CheckCircle2,
  Pencil,
  Save,
  X,
  RotateCw,
  ArrowRight,
} from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td } from '@/components/ui'
import { useSession } from '@/context/Session'
import { regions, regionByCode } from '@/data/fleet'
import { mechanismFull } from '@/data/privacy'
import {
  evaluateResidency,
  loadPolicies,
  savePolicies,
  resetPolicies,
  defaultPolicies,
  OPERATIONS,
  MECHANISMS,
  DATA_CATEGORIES,
} from '@/data/residency'
import type {
  ResidencyPolicy,
  ResidencyOp,
  ResidencyDecision,
  Mechanism,
  TelemetryLevel,
  SupportAccess,
} from '@/data/residency'
import { recentResidency } from '@/data/residency'

const decisionTone: Record<ResidencyDecision, 'green' | 'yellow' | 'red'> = {
  Allow: 'green',
  'Require safeguard': 'yellow',
  Block: 'red',
}
const DecisionIcon = ({ d }: { d: ResidencyDecision }) =>
  d === 'Allow' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : d === 'Block' ? <Ban className="h-5 w-5 text-rose-600" /> : <ShieldCheck className="h-5 w-5 text-amber-600" />

const needsTarget = (op: ResidencyOp) => op === 'Replicate' || op === 'Transfer' || op === 'Backup'
const TELEMETRY: TelemetryLevel[] = ['None', 'Metadata only', 'Full']
const SUPPORT: SupportAccess[] = ['In-region staff', 'Break-glass (approved)', 'None']

function Chip({ label, on, editable, onClick }: { label: string; on: boolean; editable: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => editable && onClick()}
      disabled={!editable}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        on ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'bg-slate-100 text-ink-500'
      } ${editable ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}`}
    >
      {label}
    </button>
  )
}

export default function Residency() {
  const { can, logAction } = useSession()
  const canEdit = can('transfer.approve')

  const [policies, setPolicies] = useState<Record<string, ResidencyPolicy>>(() => loadPolicies())
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, ResidencyPolicy>>({})
  const view = editing ? draft : policies

  // Simulator state
  const [src, setSrc] = useState('eu-central-1')
  const [op, setOp] = useState<ResidencyOp>('Transfer')
  const [target, setTarget] = useState('us-east-1')
  const [mechanism, setMechanism] = useState<Mechanism>('SCCs')
  const [category, setCategory] = useState(DATA_CATEGORIES[0])

  const result = useMemo(
    () =>
      evaluateResidency(view[src], {
        sourceRegion: src,
        operation: op,
        targetRegion: needsTarget(op) ? target : undefined,
        mechanism,
        dataCategory: category,
      }),
    [view, src, op, target, mechanism, category],
  )

  const startEdit = () => { setDraft(JSON.parse(JSON.stringify(policies)) as Record<string, ResidencyPolicy>); setEditing(true) }
  const cancel = () => setEditing(false)
  const save = () => {
    savePolicies(draft)
    setPolicies(draft)
    logAction({ action: 'residency.policy.update', target: 'region residency policies', category: 'sovereignty' })
    setEditing(false)
  }
  const reset = () => {
    resetPolicies()
    const def = defaultPolicies()
    setPolicies(def)
    if (editing) setDraft(JSON.parse(JSON.stringify(def)) as Record<string, ResidencyPolicy>)
    logAction({ action: 'residency.policy.reset', target: 'region residency policies', category: 'sovereignty' })
  }

  const setPolicy = (code: string, patch: Partial<ResidencyPolicy>) =>
    setDraft((d) => ({ ...d, [code]: { ...d[code], ...patch } }))
  const toggleIn = (code: string, field: 'allowedTargets' | 'backupRegions' | 'allowedMechanisms', val: string) => {
    const cur = draft[code][field] as string[]
    setPolicy(code, { [field]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] } as Partial<ResidencyPolicy>)
  }

  const lockedCount = Object.values(view).filter((p) => p.allowedTargets.length === 0).length
  const telemetryRestricted = Object.values(view).filter((p) => p.telemetry !== 'Full').length
  const blockedToday = recentResidency.filter((e) => e.decision === 'Block').length

  return (
    <>
      <PageHeader
        title="Residency Controls"
        description="Where each region's data may live and move — storage, backups, transfers, telemetry and support access, enforced by policy. In plain terms: rules that pin each region's customer data to where it's legally allowed to sit, and automatically block or flag anything that would move it somewhere it shouldn't."
        actions={
          editing ? (
            <div className="flex items-center gap-2">
              <button className="btn-ghost text-ink-500" onClick={reset}><RotateCw className="h-4 w-4" />Reset</button>
              <button className="btn-secondary" onClick={cancel}><X className="h-4 w-4" />Cancel</button>
              <button className="btn-primary" onClick={save}><Save className="h-4 w-4" />Save policies</button>
            </div>
          ) : (
            canEdit && (
              <button className="btn-primary" onClick={startEdit}><Pencil className="h-4 w-4" />Edit policies</button>
            )
          )
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Regions enforced" value={regions.length} icon={Globe} tone="blue" footer="Residency policies active" />
        <StatCard label="In-region locked" value={lockedCount} icon={Lock} tone="purple" footer="No egress permitted" />
        <StatCard label="Telemetry restricted" value={telemetryRestricted} icon={ShieldCheck} tone="orange" footer="Metadata-only or none" />
        <StatCard label="Blocked (recent)" value={blockedToday} icon={Ban} tone="red" footer="Residency violations stopped" />
      </div>

      {/* Simulator */}
      <Card className="mt-6">
        <CardTitle title="Residency Simulator" subtitle="Evaluate a proposed data operation against the enforced policy" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Source region">
              <select className="input" value={src} onChange={(e) => setSrc(e.target.value)}>
                {regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Operation">
              <select className="input" value={op} onChange={(e) => setOp(e.target.value as ResidencyOp)}>
                {OPERATIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            {needsTarget(op) && (
              <Field label="Target region">
                <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {regions.filter((r) => r.code !== src).map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Data category">
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {DATA_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            {needsTarget(op) && (
              <Field label="Transfer mechanism">
                <select className="input" value={mechanism} onChange={(e) => setMechanism(e.target.value as Mechanism)}>
                  {MECHANISMS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
            )}
          </div>

          {/* Decision */}
          <div className={`flex flex-col justify-center rounded-2xl border p-5 ${
            result.decision === 'Allow' ? 'border-emerald-200 bg-emerald-50' : result.decision === 'Block' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'
          }`}>
            <div className="flex items-center gap-2">
              <DecisionIcon d={result.decision} />
              <span className="text-lg font-bold text-ink-900">{result.decision}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-ink-700">
              <span>{regionByCode(src)?.name}</span>
              {needsTarget(op) && (<><ArrowRight className="h-4 w-4 text-ink-400" /><span>{regionByCode(target)?.name}</span></>)}
            </div>
            <p className="mt-2 text-sm text-ink-600">{result.reason}</p>
            {result.safeguard && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/70 px-2 py-1 text-xs font-medium text-ink-700 ring-1 ring-inset ring-slate-200">
                <ShieldCheck className="h-3.5 w-3.5" /> Safeguard: {result.safeguard}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Region policies */}
      <Card className="mt-6">
        <CardTitle title="Region Residency Policies" subtitle={editing ? 'Click chips to allow/deny · toggle safeguards' : 'The enforced ruleset per region'} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {regions.map((r) => {
            const p = view[r.code]
            const others = regions.filter((x) => x.code !== r.code)
            return (
              <div key={r.code} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{r.name}</p>
                    <p className="font-mono text-xs text-ink-400">{r.code} · {r.jurisdiction}</p>
                  </div>
                  <Badge tone={r.sovereignty === 'Air-gapped' ? 'purple' : r.sovereignty === 'Sovereign Cloud' ? 'blue' : 'slate'}>{r.sovereignty}</Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <PolicyRow label="Allowed targets">
                    {others.length === 0 ? <span className="text-ink-400">—</span> : others.map((o) => (
                      <Chip key={o.code} label={o.code} on={p.allowedTargets.includes(o.code)} editable={editing} onClick={() => toggleIn(r.code, 'allowedTargets', o.code)} />
                    ))}
                    {p.allowedTargets.length === 0 && !editing && <span className="text-xs font-medium text-purple-600">In-region only</span>}
                  </PolicyRow>

                  <PolicyRow label="Backup regions">
                    {[r, ...others].map((o) => (
                      <Chip key={o.code} label={o.code} on={p.backupRegions.includes(o.code)} editable={editing} onClick={() => toggleIn(r.code, 'backupRegions', o.code)} />
                    ))}
                  </PolicyRow>

                  <PolicyRow label="Cross-border safeguard">
                    {editing ? (
                      <button
                        onClick={() => setPolicy(r.code, { crossBorderRequiresSafeguard: !p.crossBorderRequiresSafeguard })}
                        aria-pressed={p.crossBorderRequiresSafeguard}
                        className={`inline-flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${p.crossBorderRequiresSafeguard ? 'justify-end bg-brand-600' : 'justify-start bg-slate-300'}`}
                      >
                        <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                      </button>
                    ) : (
                      <Badge tone={p.crossBorderRequiresSafeguard ? 'orange' : 'slate'}>{p.crossBorderRequiresSafeguard ? 'Required' : 'Not required'}</Badge>
                    )}
                  </PolicyRow>

                  <PolicyRow label="Mechanisms">
                    {MECHANISMS.map((m) => (
                      <Chip key={m} label={mechanismFull(m) ? `${m} — ${mechanismFull(m)}` : m} on={p.allowedMechanisms.includes(m)} editable={editing} onClick={() => toggleIn(r.code, 'allowedMechanisms', m)} />
                    ))}
                  </PolicyRow>

                  <PolicyRow label="Telemetry">
                    {editing ? (
                      <select className="input h-8 w-40 py-1 text-xs" value={p.telemetry} onChange={(e) => setPolicy(r.code, { telemetry: e.target.value as TelemetryLevel })}>
                        {TELEMETRY.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    ) : (
                      <Badge tone={p.telemetry === 'Full' ? 'green' : p.telemetry === 'None' ? 'red' : 'orange'}>{p.telemetry}</Badge>
                    )}
                  </PolicyRow>

                  <PolicyRow label="Support access">
                    {editing ? (
                      <select className="input h-8 w-48 py-1 text-xs" value={p.supportAccess} onChange={(e) => setPolicy(r.code, { supportAccess: e.target.value as SupportAccess })}>
                        {SUPPORT.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <Badge tone={p.supportAccess === 'In-region staff' ? 'green' : p.supportAccess === 'None' ? 'red' : 'orange'}>{p.supportAccess}</Badge>
                    )}
                  </PolicyRow>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Enforcement log */}
      <Card className="mt-6">
        <CardTitle title="Enforcement Log" subtitle="Recent residency decisions across the fleet" />
        <Table columns={['Time', 'Customer', 'Operation', 'Source', 'Target', 'Detail', 'Decision']}>
          {recentResidency.map((e) => (
            <Tr key={e.id}>
              <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{e.time}</Td>
              <Td className="font-medium text-ink-900">{e.customer}</Td>
              <Td className="text-ink-700">{e.operation}</Td>
              <Td className="text-xs text-ink-600"><span title={e.source}>{regionByCode(e.source)?.name ?? e.source}</span></Td>
              <Td className="text-xs text-ink-600"><span title={e.target}>{regionByCode(e.target)?.name ?? e.target}</span></Td>
              <Td className="text-ink-600">{e.detail}</Td>
              <Td>
                <Badge tone={decisionTone[e.decision]} dot>{e.decision}</Badge>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  )
}
function PolicyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-400">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}
