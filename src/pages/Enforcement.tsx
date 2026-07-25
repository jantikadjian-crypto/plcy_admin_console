import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, ShieldBan, Flag, Gauge, Timer, ScanSearch, Check, X, ArrowRight, Wrench, GitPullRequest, ChevronDown, ChevronUp } from 'lucide-react'
import { clsx } from 'clsx'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardTitle, StatCard, PageHeader, Table, Tr, Td, Badge, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { fmtNum, fmtCompact } from '@/data/mock'
import { packs as policyPacks, controlsForPack, familyOf } from '@/data/policy'
import type { PolicyPack } from '@/data/policy'
import {
  outcomeTone, enforcementMetrics, topControls, controlById, packById, familyOfControl,
  verdictTone, verdictLabel, tuningRecommendations, TUNING_MIN_FALSE_POSITIVES,
} from '@/data/enforcement'
import type { EnforcementDecision, DecisionOutcome, Verdict, Tuning } from '@/data/enforcement'
import {
  useEnforcement, setVerdict, clearVerdict, setPackMode, addException, setEnforcementEnabled,
  recordProposal, ENFORCEMENT_MODES,
} from '@/data/enforcementStore'
import type { EnforcementMode } from '@/data/enforcementStore'
import { addChangeRequest } from '@/data/policyChangesStore'
import { versionBaseline } from '@/data/policyChanges'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const trafficTrend = [
  { day: 'Jun 30', allowed: 40200, flagged: 1180, blocked: 420 },
  { day: 'Jul 1', allowed: 47500, flagged: 1420, blocked: 510 },
  { day: 'Jul 2', allowed: 44800, flagged: 1310, blocked: 470 },
  { day: 'Jul 3', allowed: 51200, flagged: 1560, blocked: 610 },
  { day: 'Jul 4', allowed: 58900, flagged: 1740, blocked: 690 },
  { day: 'Jul 5', allowed: 55100, flagged: 1610, blocked: 640 },
  { day: 'Jul 6', allowed: 60400, flagged: 1890, blocked: 720 },
]

/* Enforcement rows derive from the live policy catalog (@/data/policy) so the
 * page always reflects the real packs, controls, and composites — no separate
 * hardcoded list to drift. Scope is a deterministic pseudo-value keyed off each
 * pack id (mock telemetry, stable across renders). */
const hash = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)

/** A pack enforced only through monitor-mode controls reports Monitor; privacy/
 * security/sovereignty/compliance packs Block; governance/cost packs Warn. */
function defaultModeFor(pack: PolicyPack): EnforcementMode {
  const ctrls = controlsForPack(pack)
  if (ctrls.length > 0 && ctrls.every((c) => c.mode === 'monitor')) return 'Monitor'
  if (pack.category === 'Governance' || pack.category === 'Cost') return 'Warn'
  return 'Block'
}

interface EnforcementRow {
  pack: PolicyPack
  controls: number
  fallback: EnforcementMode
  scope: string
}

// Composite packs are what customers deploy as enforced bundles; show the live ones.
const enforcementRows: EnforcementRow[] = policyPacks
  .filter((p) => p.type === 'composite' && p.status === 'live')
  .map((pack) => {
    const h = hash(pack.id)
    const customers = 1 + (h % 6)
    const instances = customers + (h % 4)
    return {
      pack,
      controls: controlsForPack(pack).length,
      fallback: defaultModeFor(pack),
      scope: `${customers} customer${customers > 1 ? 's' : ''} · ${instances} instance${instances > 1 ? 's' : ''}`,
    }
  })

const modeTone: Record<EnforcementMode, string> = {
  Monitor: 'bg-blue-600 text-white',
  Warn: 'bg-orange-500 text-white',
  Block: 'bg-rose-500 text-white',
}

/** Mode selector — a real, gated control rather than a static indicator. */
function ModePills({ active, onPick, disabled }: { active: EnforcementMode; onPick: (m: EnforcementMode) => void; disabled: boolean }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-inset ring-slate-200">
      {ENFORCEMENT_MODES.map((m) => (
        <button
          key={m}
          onClick={() => !disabled && onPick(m)}
          disabled={disabled}
          title={disabled ? 'Your role does not permit this action' : `Set ${m} mode`}
          className={clsx(
            'px-2.5 py-1 text-[11px] font-semibold transition-colors',
            m === active ? modeTone[m] : 'bg-white text-ink-400',
            disabled ? 'cursor-not-allowed' : m !== active && 'hover:bg-slate-50 hover:text-ink-600',
          )}
        >
          {m}
        </button>
      ))}
    </div>
  )
}

const OUTCOMES: (DecisionOutcome | 'All')[] = ['All', 'Blocked', 'Flagged', 'Allowed']

/* The log is a scroll-back list, not a worklist — the recent end is what gets
 * read. Cap it there and keep the rest one click away. */
const DECISION_CAP = 25

/** Current version of a pack per the change-management history, for the CR bump. */
function versionsFor(packId: string): { from: string; to: string } {
  const from = versionBaseline[packId]?.[0]?.version ?? '1.0'
  const [major, minor] = from.split('.')
  return { from, to: `${major}.${Number(minor ?? 0) + 1}` }
}

export default function Enforcement() {
  const { log, triage, modes, exceptions, proposals, enabled } = useEnforcement()
  const { can, logAction } = useSession()
  const manage = can('policy.manage')

  const [outcome, setOutcome] = useState<DecisionOutcome | 'All'>('All')
  const [customer, setCustomer] = useState('All')
  const [family, setFamily] = useState('All')
  const [onlyUntriaged, setOnlyUntriaged] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [sel, setSel] = useState<EnforcementDecision | null>(null)

  // A filter change redefines "most recent" — collapse back to the cap.
  useEffect(() => setShowAll(false), [outcome, customer, family, onlyUntriaged])

  const evaluatedToday = trafficTrend[trafficTrend.length - 1]
  const total = evaluatedToday.allowed + evaluatedToday.flagged + evaluatedToday.blocked
  const m = enforcementMetrics(log, triage)

  const customers = [...new Set(log.map((d) => d.customer))].sort()
  const families = [...new Set(log.map((d) => familyOfControl(d.controlId)))].sort()
  const top = topControls(log)
  const topMax = top[0]?.hits || 1

  const rows = log
    .filter((d) => (outcome === 'All' ? true : d.outcome === outcome))
    .filter((d) => (customer === 'All' ? true : d.customer === customer))
    .filter((d) => (family === 'All' ? true : familyOfControl(d.controlId) === family))
    .filter((d) => (onlyUntriaged ? !triage[d.id] : true))

  const visible = showAll ? rows : rows.slice(0, DECISION_CAP)
  const hidden = rows.length - visible.length

  const toggleGlobal = () => {
    const next = !enabled
    setEnforcementEnabled(next)
    logAction({ action: next ? 'enforcement.enable' : 'enforcement.disable', target: 'Global enforcement', category: 'policy' })
  }

  const pickMode = (pack: PolicyPack, mode: EnforcementMode) => {
    setPackMode(pack.id, mode)
    logAction({ action: 'enforcement.mode', target: `${pack.name} → ${mode}`, category: 'policy' })
  }

  const tunings = tuningRecommendations(log, triage)

  /**
   * Hand a recommendation to Policy Change Management as a real change request,
   * carrying the evidence that justified it. From here it follows the normal
   * path — review, approvals, dry-run, schedule, apply.
   */
  const fileChangeRequest = (t: Tuning) => {
    const { from, to } = versionsFor(t.packId)
    const crId = addChangeRequest({
      packId: t.packId,
      packName: t.packName,
      title: t.kind === 'demote-to-monitor'
        ? `Drop ${t.controlId} to monitor mode while it's retuned`
        : `Narrow ${t.controlId} to stop false positives on ${t.affectedCustomers.join(', ')}`,
      summary: `${t.rationale} Raised from the enforcement decision log; evidence: ${t.evidence.join(', ')}.`,
      risk: t.kind === 'demote-to-monitor' ? 'High' : 'Medium',
      fromVersion: from,
      toVersion: to,
      changes: [t.proposal],
    })
    recordProposal(t.controlId, crId)
    logAction({ action: 'enforcement.tuning.propose', target: `${t.controlId} → ${crId}`, category: 'policy' })
  }

  return (
    <>
      <PageHeader
        title="Enforcement Controls"
        description="Real-time policy enforcement across all governed traffic. The counters say how much was stopped; the decision log says why — every entry resolves to the control that fired, what it matched, and whether a reviewer agreed."
      />

      {/* Master switch */}
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Global enforcement</h2>
            <p className="text-xs text-ink-500">
              {enabled
                ? 'Policies are actively enforced on all inbound and outbound traffic.'
                : 'Enforcement paused — traffic is passing through unchecked.'}
            </p>
          </div>
        </div>
        <GatedButton
          cap="policy.manage"
          showLock={false}
          onClick={toggleGlobal}
          className={clsx('flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors', enabled ? 'bg-brand-600' : 'bg-slate-300')}
          aria-label="Toggle global enforcement"
        >
          <span className={clsx('h-6 w-6 rounded-full bg-white shadow-sm transition-transform', enabled ? 'translate-x-5' : 'translate-x-0')} />
        </GatedButton>
      </Card>

      {!enabled && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <ShieldBan className="mt-0.5 h-4 w-4 shrink-0" />
          <p><span className="font-semibold">Enforcement is paused globally.</span> Controls still evaluate and log, but nothing is blocked. The decision log below reflects the last enforced traffic.</p>
        </div>
      )}

      {/* Stat row */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requests evaluated today" value={fmtCompact(total)} icon={Gauge} tone="blue" footer="Across all instances" />
        <StatCard label="Blocked" value={fmtNum(evaluatedToday.blocked)} icon={ShieldBan} tone="red" footer="Policy violations stopped" />
        <StatCard
          label="False-positive rate"
          value={m.reviewed ? `${m.falsePositiveRate.toFixed(0)}%` : '—'}
          icon={ScanSearch}
          tone={!m.reviewed ? 'slate' : m.falsePositiveRate > 20 ? 'red' : m.falsePositiveRate > 10 ? 'orange' : 'green'}
          footer={m.reviewed ? `${m.reviewed} of ${m.total} decisions reviewed` : 'No decisions reviewed yet'}
        />
        <StatCard label="p95 decision latency" value={`${m.p95Latency}ms`} icon={Timer} tone={m.p95Latency > 50 ? 'orange' : 'green'} footer="Enforcement point overhead" />
      </div>

      {/* Chart */}
      <Card className="mt-6">
        <CardTitle title="Enforcement Outcomes" subtitle="Allowed, flagged, and blocked traffic over the last 7 days" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gAllowed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gFlagged" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gBlocked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v / 1000}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Area type="monotone" dataKey="allowed" name="Allowed" stroke="#10b981" strokeWidth={2} fill="url(#gAllowed)" />
              <Area type="monotone" dataKey="flagged" name="Flagged" stroke="#f59e0b" strokeWidth={2} fill="url(#gFlagged)" />
              <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#ef4444" strokeWidth={2} fill="url(#gBlocked)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Decision log */}
      <Card className="mt-6">
        <CardTitle
          title="Decision log"
          subtitle="Every enforcement decision, newest first. Click a row for the control that fired, what it matched, and the policy chain behind it."
        />

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-inset ring-slate-200">
            {OUTCOMES.map((o) => (
              <button
                key={o}
                onClick={() => setOutcome(o)}
                className={clsx('px-3 py-1 text-xs font-medium transition-colors', o === outcome ? 'bg-brand-600 text-white' : 'bg-white text-ink-500 hover:bg-slate-50')}
              >
                {o}
              </button>
            ))}
          </div>
          <select value={customer} onChange={(e) => setCustomer(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-ink-700">
            <option>All</option>
            {customers.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={family} onChange={(e) => setFamily(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-ink-700">
            <option value="All">All control families</option>
            {families.map((f) => <option key={f}>{f}</option>)}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-ink-600">
            <input type="checkbox" checked={onlyUntriaged} onChange={(e) => setOnlyUntriaged(e.target.checked)} className="rounded border-slate-300" />
            Needs review
          </label>
          <span className="ml-auto text-xs text-ink-400">
            {hidden > 0
              ? `Showing ${visible.length} of ${rows.length} matching · ${log.length} total`
              : `${rows.length} of ${log.length}`}
          </span>
        </div>

        <Table columns={['Time', 'Outcome', 'Control', 'Customer', 'Subject', 'Latency', 'Review']}>
          {visible.map((d) => {
            const t = triage[d.id]
            const control = controlById(d.controlId)
            return (
              <Tr key={d.id} className="cursor-pointer" onClick={() => setSel(d)}>
                <Td className="whitespace-nowrap text-xs tabular-nums text-ink-500">{d.at.slice(11, 16)}</Td>
                <Td><Badge tone={outcomeTone[d.outcome]} dot>{d.outcome}</Badge></Td>
                <Td>
                  <span className="font-mono text-xs font-semibold text-ink-800">{d.controlId}</span>
                  <span className="block text-[11px] text-ink-400">{control?.name ?? familyOfControl(d.controlId)}</span>
                </Td>
                <Td className="text-xs text-ink-600">
                  {d.customer}
                  <span className="block text-[11px] text-ink-400">{d.instance}</span>
                </Td>
                <Td className="max-w-[280px] text-xs text-ink-600">
                  <span className="block truncate" title={d.subject}>{d.subject}</span>
                  <span className="text-[11px] text-ink-400">{d.direction} · {d.matched.join(', ')}</span>
                </Td>
                <Td className="text-xs tabular-nums text-ink-500">{d.latencyMs}ms</Td>
                <Td>
                  {t
                    ? <Badge tone={verdictTone[t.verdict]}>{verdictLabel[t.verdict]}</Badge>
                    : <span className="text-[11px] text-ink-300">unreviewed</span>}
                </Td>
              </Tr>
            )
          })}
        </Table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-ink-400">No decisions match these filters.</p>}

        {rows.length > DECISION_CAP && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={() => setShowAll((v) => !v)}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              {showAll
                ? <><ChevronUp className="h-3.5 w-3.5" />Show most recent {DECISION_CAP}</>
                : <><ChevronDown className="h-3.5 w-3.5" />Show all {rows.length} decisions<span className="text-ink-400">({hidden} older)</span></>}
            </button>
          </div>
        )}
      </Card>

      {/* Tuning recommendations — false positives turned into proposals */}
      <Card className="mt-6">
        <CardTitle
          title="Tuning recommendations"
          subtitle={`Controls the review trail says are over-firing. Each proposal can be handed to Policy Change Management, carrying the decisions that justify it. Raised once a control has ${TUNING_MIN_FALSE_POSITIVES} reviewed false positives.`}
        />
        {tunings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
            <Wrench className="mx-auto h-5 w-5 text-ink-300" />
            <p className="mt-2 text-sm text-ink-500">No control has enough false positives to justify a change yet.</p>
            <p className="mt-1 text-xs text-ink-400">Review decisions in the log above — once a control accumulates {TUNING_MIN_FALSE_POSITIVES}, a proposal appears here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tunings.map((t) => {
              const crId = proposals[t.controlId]
              return (
                <div key={t.controlId} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-ink-800">{t.controlId}</span>
                    <span className="text-sm font-medium text-ink-900">{t.controlName}</span>
                    <Badge tone="orange">{t.falsePositives} of {t.reviewed} false ({t.fpRate.toFixed(0)}%)</Badge>
                    <span className="text-[11px] text-ink-500">{t.packName}</span>
                  </div>

                  <p className="mt-2 text-sm text-ink-700">{t.rationale}</p>

                  {/* The proposed edit, as a diff */}
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white text-xs">
                    <div className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-500">
                      Proposed change · {t.proposal.field}
                    </div>
                    <div className="flex items-start gap-2 px-3 py-1.5">
                      <span className="mt-0.5 w-4 shrink-0 text-center font-mono text-rose-600">−</span>
                      <span className="text-ink-600 line-through decoration-rose-300">{t.proposal.before}</span>
                    </div>
                    <div className="flex items-start gap-2 border-t border-slate-100 px-3 py-1.5">
                      <span className="mt-0.5 w-4 shrink-0 text-center font-mono text-emerald-600">+</span>
                      <span className="font-medium text-ink-800">{t.proposal.after}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-[11px] text-ink-500">
                      Evidence: {t.evidence.map((e) => <span key={e} className="font-mono">{e} </span>)}
                    </span>
                    <div className="ml-auto">
                      {crId ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-ink-600">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Raised as <Link to="/policy?tab=changes" className="font-mono font-semibold text-brand-700 hover:underline">{crId}</Link>
                        </span>
                      ) : (
                        <GatedButton
                          cap="policy.manage"
                          showLock={false}
                          disabled={!manage}
                          onClick={() => fileChangeRequest(t)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                        >
                          <GitPullRequest className="h-3.5 w-3.5" />Open change request
                        </GatedButton>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Where enforcement pressure sits */}
      <Card className="mt-6">
        <CardTitle title="Top firing controls" subtitle="Where enforcement pressure actually sits, across the decisions logged." />
        <div className="space-y-2">
          {top.map((c) => {
            const ctrl = controlById(c.id)
            return (
              <div key={c.id} className="flex items-center gap-3">
                <div className="w-44 shrink-0">
                  <p className="font-mono text-xs font-semibold text-ink-800">{c.id}</p>
                  <p className="truncate text-[11px] text-ink-400" title={ctrl?.name}>{ctrl?.name}</p>
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.hits / topMax) * 100}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-xs tabular-nums text-ink-500">
                  {c.hits} hit{c.hits === 1 ? '' : 's'}{c.blocked > 0 && <span className="text-rose-600"> · {c.blocked} blocked</span>}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Rules table */}
      <Card className="mt-6">
        <CardTitle
          title="Active Enforcement Rules"
          subtitle="Each row is a live composite pack (framework or industry bundle). Changing a mode takes effect at the enforcement point and is written to the audit log."
        />
        <Table columns={['Policy pack', 'Controls', 'Scope', 'Mode', 'Exceptions']}>
          {enforcementRows.map(({ pack, controls, fallback, scope }) => {
            const mode = modes[pack.id] ?? fallback
            const packExceptions = exceptions.filter((e) => controlsForPack(pack).some((c) => c.id === e.controlId)).length
            return (
              <Tr key={pack.id}>
                <Td>
                  <div className="font-medium text-ink-900">{pack.name}</div>
                  <div className="text-xs text-ink-400">
                    {pack.id} · {pack.category} · {pack.kind === 'industry' ? 'Industry' : 'Framework'} composite
                  </div>
                </Td>
                <Td className="text-ink-700">{controls}</Td>
                <Td className="text-ink-700">{scope}</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <ModePills active={mode} onPick={(next) => pickMode(pack, next)} disabled={!manage} />
                    {modes[pack.id] && modes[pack.id] !== fallback && (
                      <span className="text-[11px] text-amber-700" title={`Catalog default is ${fallback}`}>overridden</span>
                    )}
                  </span>
                </Td>
                <Td className="text-xs text-ink-500">{packExceptions || <span className="text-ink-300">—</span>}</Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

      {sel && <DecisionDetail d={sel} onClose={() => setSel(null)} />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Decision drill-down — why this request was enforced                 */
/* ------------------------------------------------------------------ */
function DecisionDetail({ d, onClose }: { d: EnforcementDecision; onClose: () => void }) {
  const { triage, exceptions } = useEnforcement()
  const { can, logAction } = useSession()
  const manage = can('policy.manage')
  const [note, setNote] = useState('')

  const control = controlById(d.controlId)
  const primitive = control ? packById(control.packId) : undefined
  const via = packById(d.viaPackId)
  const t = triage[d.id]
  const raised = exceptions.filter((e) => e.controlId === d.controlId && e.customer === d.customer)

  const judge = (verdict: Verdict) => {
    setVerdict(d.id, verdict, note.trim() || undefined)
    logAction({ action: `enforcement.triage.${verdict === 'correct' ? 'correct' : 'fp'}`, target: `${d.id} · ${d.controlId}`, category: 'policy' })
    setNote('')
  }
  const undo = () => {
    clearVerdict(d.id)
    logAction({ action: 'enforcement.triage.clear', target: d.id, category: 'policy' })
  }
  const except = () => {
    const reason = note.trim() || `False positive on ${d.controlId} for ${d.customer}`
    addException(d.controlId, d.customer, reason)
    logAction({ action: 'enforcement.exception.add', target: `${d.controlId} · ${d.customer}`, category: 'policy' })
    setNote('')
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${d.outcome} · ${d.controlId}`}
      subtitle={`${d.customer} · ${d.instance} · ${d.model} · ${d.at.slice(0, 16).replace('T', ' ')}`}
      maxWidth="max-w-3xl"
      headerRight={<Badge tone={outcomeTone[d.outcome]} dot>{d.outcome}</Badge>}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="space-y-6">
        {/* What happened */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">What happened</h4>
          <p className="text-sm text-ink-700">{d.subject}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.matched.map((mm) => (
              <span key={mm} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] text-ink-600">{mm}</span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-400">
            Detector reports matched entity types only — request content is never stored. Evaluated on the {d.direction} leg, {d.latencyMs}ms, actor <span className="font-mono">{d.actor}</span>, region {d.region}.
          </p>
        </section>

        {/* Policy chain */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Why it was enforced</h4>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-lg bg-violet-50 px-2.5 py-1 font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">{via?.name ?? d.viaPackId}</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
            <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">{primitive?.name ?? control?.packId}</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono font-semibold text-ink-700">{d.controlId}</span>
          </div>
          {control && (
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              <div><dt className="text-ink-500">Control</dt><dd className="font-medium text-ink-800">{control.name}</dd></div>
              <div><dt className="text-ink-500">Family</dt><dd className="text-ink-700">{familyOf(control.prefix)}</dd></div>
              <div><dt className="text-ink-500">Detector</dt><dd className="text-ink-700">{control.detector}</dd></div>
              <div><dt className="text-ink-500">Decision</dt><dd className="text-ink-700">{control.decision}</dd></div>
              <div className="sm:col-span-2"><dt className="text-ink-500">Obligation</dt><dd className="text-ink-700">{control.obligation}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-ink-500">Evidence emitted</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {control.evidence.map((e) => <span key={e} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-ink-600">{e}</span>)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-500">Mode</dt>
                <dd className="text-ink-700">
                  {control.mode === 'monitor'
                    ? 'Monitor — the control logged this decision but did not stop the request.'
                    : 'Enforce — the control acted on the request at the enforcement point.'}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* Triage */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Was this the right call?</h4>
          {t ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
              <Badge tone={verdictTone[t.verdict]}>{verdictLabel[t.verdict]}</Badge>
              <span className="text-xs text-ink-600">by {t.by} · {t.at}</span>
              {t.note && <span className="text-xs text-ink-500">— {t.note}</span>}
              <GatedButton cap="policy.manage" showLock={false} disabled={!manage} onClick={undo}
                className="ml-auto text-[11px] text-ink-500 hover:text-ink-800 hover:underline">
                Undo
              </GatedButton>
            </div>
          ) : (
            <>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={manage ? 'Optional note for the reviewer trail…' : 'Requires policy.manage'}
                disabled={!manage}
                className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm placeholder:text-ink-400 disabled:bg-slate-50"
              />
              <div className="flex flex-wrap gap-2">
                <GatedButton cap="policy.manage" showLock={false} disabled={!manage} onClick={() => judge('correct')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                  <Check className="h-3.5 w-3.5" />Correct call
                </GatedButton>
                <GatedButton cap="policy.manage" showLock={false} disabled={!manage} onClick={() => judge('false-positive')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50">
                  <X className="h-3.5 w-3.5" />False positive
                </GatedButton>
              </div>
            </>
          )}
          <p className="mt-2 text-[11px] text-ink-400">Verdicts drive the false-positive rate on this page — the signal for whether a control is tuned or over-firing.</p>
        </section>

        {/* Exceptions */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Exceptions</h4>
          {raised.length > 0 ? (
            <ul className="mb-2 space-y-1">
              {raised.map((e) => (
                <li key={e.id} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-ink-600">
                  <span className="font-mono text-ink-400">{e.id}</span> — {e.reason}
                  <span className="block text-[11px] text-ink-400">{e.by} · {e.at}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-2 text-xs text-ink-500">No carve-out for {d.controlId} on {d.customer}.</p>
          )}
          <GatedButton cap="policy.manage" showLock={false} disabled={!manage} onClick={except}
            className="btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
            <Flag className="h-3.5 w-3.5" />Raise an exception for {d.customer}
          </GatedButton>
          <p className="mt-1.5 text-[11px] text-ink-400">Narrow carve-out for this control on this account only — the pack stays enforced everywhere else.</p>
        </section>
      </div>
    </Modal>
  )
}
