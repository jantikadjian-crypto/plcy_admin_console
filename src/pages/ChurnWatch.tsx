import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Hourglass, Send, DollarSign, Siren, BellRing, PlayCircle, Check, TrendingUp, Clock, ArrowUpRight, CalendarClock } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader, StatCard, Card, CardTitle, Badge } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import {
  deriveChurnAlerts, churnSeverityTone, churnStatusTone, isChurnClosed,
  CHURN_STATUSES, CS_REPS, CHURN_NOTIFY_CHANNELS, healthTone, churnTone,
  CHURN_NOW, CHURN_SLA_HOURS, churnAgeHours, churnSlaBreached, fmtAge,
  retentionMetrics, saveLossTrend, renewalSignal, stageTone, isRenewalOpen, isRenewalAtRisk,
} from '@/data/success'
import type { ChurnAlert, ChurnCaseStatus, Renewal, RenewalStage, RenewalSignal, CSTask } from '@/data/success'
import { escalationManager } from '@/data/notifications'
import {
  useSuccess, churnCaseFor, assignChurnOwner, setChurnStatus,
  notifyChurnTeam, addChurnNote, addTask, addActivity, escalateChurn, setRenewalStage,
} from '@/data/successStore'
import type { ChurnCase } from '@/data/successStore'

const AS_OF = '2026-07-24'
const dueInDays = (n: number) => new Date(Date.parse(AS_OF) + n * 86400000).toISOString().slice(0, 10)

export function ChurnWatch() {
  const { churn, tasks, renewals } = useSuccess()
  const { can, logAction } = useSession()
  const alerts = deriveChurnAlerts(AS_OF)

  const caseOf = (c: string) => churnCaseFor(c, churn)
  const openAlerts = alerts.filter((a) => !isChurnClosed(caseOf(a.customer).status))
  const awaiting = openAlerts.filter((a) => caseOf(a.customer).status === 'New').length
  const critical = openAlerts.filter((a) => a.severity === 'Critical').length
  const arrAtRisk = openAlerts.reduce((s, a) => s + a.arr, 0)
  const breaching = openAlerts.filter((a) => churnSlaBreached(a, caseOf(a.customer).status !== 'New')).length

  return (
    <div>
      <PageHeader title="Churn Watch" description="Health- and risk-driven early warning. Every at-risk account raises an alert the team is notified about — assign a CS rep to actively work the save, and cases that sit past SLA escalate to the manager." />

      <RetentionRollup churn={churn} />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs text-amber-900">
          Churn-risk alerts fan out to <span className="font-semibold">{CHURN_NOTIFY_CHANNELS.join(' · ')}</span> through the
          {' '}<span className="font-semibold">Customer Success</span> notification routing rule. Each case is owned by the account's CSM from the moment it's raised. First-response SLA:
          {' '}<span className="font-semibold">Critical {CHURN_SLA_HOURS.Critical}h · High {CHURN_SLA_HOURS.High}h · Medium {CHURN_SLA_HOURS.Medium}h</span> — no response past SLA auto-escalates to <span className="font-semibold">{escalationManager()}</span>.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open cases" value={openAlerts.length} icon={ShieldAlert} tone={openAlerts.length ? 'orange' : 'green'} footer={`${alerts.length} accounts flagged`} />
        <StatCard label="Awaiting response" value={awaiting} icon={Hourglass} tone={awaiting ? 'orange' : 'green'} footer="CSM hasn't acted yet" />
        <StatCard label="SLA breached" value={breaching} icon={Clock} tone={breaching ? 'red' : 'green'} footer="Past first-response SLA" />
        <StatCard label="ARR at risk" value={`$${(arrAtRisk / 1000).toFixed(0)}k`} icon={DollarSign} tone={arrAtRisk ? 'orange' : 'green'} footer="Open churn cases" />
      </div>

      <Card>
        <CardTitle title="Active alerts" subtitle="Sorted by severity — assign a rep, notify the team, and work the save play. Breached cases surface an escalation." />
        <div className="space-y-3">
          {alerts.map((a) => (
            <ChurnCard key={a.customer} alert={a} kase={caseOf(a.customer)} can={can} logAction={logAction}
              renewal={renewals.find((r) => r.customer === a.customer)} tasks={tasks}
              hasFollowUp={tasks.some((t) => t.customer === a.customer && t.play === 'save' && t.status === 'open')} />
          ))}
          {alerts.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No accounts are tripping the churn watch. 🎉</p>}
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Portfolio retention rollup                                          */
/* ------------------------------------------------------------------ */
function RetentionRollup({ churn }: { churn: Record<string, ChurnCase> }) {
  const m = retentionMetrics(churn)
  const maxOutcome = Math.max(1, ...saveLossTrend.map((o) => Math.max(o.saved, o.lost)))
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <RetentionTile label="Net revenue retention" value={`${m.nrr.toFixed(0)}%`} tone={m.nrr >= 100 ? 'green' : 'orange'} hint="Incl. expansion" icon={TrendingUp} />
        <RetentionTile label="Gross retention" value={`${m.gross.toFixed(0)}%`} tone={m.gross >= 90 ? 'green' : 'orange'} hint="Excl. expansion" />
        <RetentionTile label="ARR saved" value={`$${(m.savedArr / 1000).toFixed(0)}k`} tone="green" hint="Cases marked Saved" />
        <RetentionTile label="ARR lost" value={`$${(m.lostArr / 1000).toFixed(0)}k`} tone={m.lostArr ? 'red' : 'slate'} hint="Cases marked Lost" />
      </div>
      <Card className="min-w-[240px]">
        <p className="mb-2 text-xs font-semibold text-ink-700">Saves vs. losses · 6 mo</p>
        <div className="flex items-end gap-2">
          {saveLossTrend.map((o) => (
            <div key={o.month} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-16 items-end gap-0.5">
                <div className="w-2 rounded-sm bg-emerald-400" style={{ height: `${(o.saved / maxOutcome) * 100}%` }} title={`${o.saved} saved`} />
                <div className="w-2 rounded-sm bg-rose-400" style={{ height: `${(o.lost / maxOutcome) * 100}%` }} title={`${o.lost} lost`} />
              </div>
              <span className="text-[10px] text-ink-400">{o.month}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-400" />saved</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-400" />lost</span>
        </div>
      </Card>
    </div>
  )
}

function RetentionTile({ label, value, tone, hint, icon: Icon }: { label: string; value: string; tone: 'green' | 'orange' | 'red' | 'slate'; hint: string; icon?: typeof TrendingUp }) {
  const color = tone === 'green' ? 'text-emerald-600' : tone === 'orange' ? 'text-amber-600' : tone === 'red' ? 'text-rose-600' : 'text-ink-700'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={clsx('mt-1 flex items-center gap-1 text-2xl font-bold', color)}>{Icon && <Icon className="h-4 w-4" />}{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-400">{hint}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The renewal a churn case is protecting                              */
/* ------------------------------------------------------------------ */
/**
 * A churn case only matters because there's revenue behind it. This ties the
 * case to its renewal: the stage on record, the probability with this case
 * folded in, and — when the pipeline reads rosier than the evidence — a way to
 * correct it without leaving the churn desk.
 */
function ProtectedRenewal({ customer, renewal, signal, canManage, onAlign }: {
  customer: string
  renewal: Renewal
  signal: RenewalSignal
  canManage: boolean
  onAlign: () => void
}) {
  const settled = !isRenewalOpen(renewal.stage)
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
      <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-ink-500">
        <CalendarClock className="h-3.5 w-3.5" />Protecting renewal
      </span>
      <Badge tone={stageTone[renewal.stage]} dot>{renewal.stage}</Badge>
      <span className="text-xs tabular-nums text-ink-600">${(renewal.arr / 1000).toFixed(0)}k · {renewal.renewalDate}</span>
      {!settled && (
        <span className="flex items-center gap-1.5 text-xs text-ink-600">
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
            <span className={clsx('block h-full', signal.delta < 0 ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${signal.adjusted}%` }} />
          </span>
          <span className="tabular-nums">{signal.adjusted}% to close</span>
          {signal.delta !== 0 && (
            <span className={clsx('text-[11px] font-medium tabular-nums', signal.delta < 0 ? 'text-rose-600' : 'text-emerald-600')} title={`Recorded ${renewal.probability}% · adjusted for health, this case, and open work`}>
              {signal.delta > 0 ? '+' : ''}{signal.delta}
            </span>
          )}
        </span>
      )}
      <span className="text-[11px] text-ink-400">owner {renewal.owner}</span>

      <span className="ml-auto flex items-center gap-2">
        {signal.mismatch && (
          <GatedButton
            cap="customer.manage"
            showLock={false}
            disabled={!canManage}
            onClick={onAlign}
            title={`The pipeline says ${renewal.stage}; health and this case say ${signal.suggested}`}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
          >
            Pipeline says {renewal.stage} — move to {signal.suggested}
          </GatedButton>
        )}
        <Link to={`/success?tab=renewals&customer=${encodeURIComponent(customer)}`} className="text-[11px] text-ink-500 hover:text-brand-700 hover:underline">
          View in pipeline
        </Link>
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Alert card                                                          */
/* ------------------------------------------------------------------ */
function ChurnCard({ alert: a, kase, can, logAction, hasFollowUp, renewal, tasks }: {
  alert: ChurnAlert
  kase: ChurnCase
  can: (c: 'customer.manage') => boolean
  logAction: (i: { action: string; target: string; category?: string }) => void
  hasFollowUp: boolean
  renewal?: Renewal
  tasks: CSTask[]
}) {
  const [note, setNote] = useState('')
  const manage = can('customer.manage')
  const closed = isChurnClosed(kase.status)
  // The account's CSM owns the case by default; an explicit reassignment overrides.
  const owner = kase.owner ?? a.csm
  const responded = kase.status !== 'New'
  const ageH = churnAgeHours(a, CHURN_NOW)
  const breached = churnSlaBreached(a, responded) && !closed
  const manager = escalationManager()
  // The renewal this case exists to protect, scored with the case folded in.
  const signal = renewal ? renewalSignal(renewal, tasks, kase.status, AS_OF) : undefined

  const assign = (rep: string) => {
    if (!rep || rep === owner) return
    assignChurnOwner(a.customer, rep)
    addActivity(a.customer, 'note', `Churn case reassigned from ${owner} to ${rep}`, 'system')
    logAction({ action: 'churn.assign', target: `${a.customer} → ${rep}`, category: 'customer' })
    if (!hasFollowUp) {
      addTask({ customer: a.customer, title: `Work churn save play — ${a.customer}`, play: 'save', priority: a.severity === 'Critical' ? 'Urgent' : 'High', due: dueInDays(3), status: 'open', owner: rep })
      logAction({ action: 'churn.followup.create', target: a.customer, category: 'customer' })
    }
  }
  const notify = () => {
    notifyChurnTeam(a.customer, [...CHURN_NOTIFY_CHANNELS])
    addActivity(a.customer, 'note', `Churn alert sent to ${CHURN_NOTIFY_CHANNELS.join(', ')}`, 'system')
    logAction({ action: 'churn.notify', target: a.customer, category: 'customer' })
  }
  const escalate = (manual = false) => {
    escalateChurn(a.customer, manager)
    if (kase.status === 'New') setChurnStatus(a.customer, 'Acknowledged') // escalating is a response
    const summary = manual
      ? `${owner} escalated the case to ${manager} for review`
      : `SLA breached (no response in ${fmtAge(ageH)}) — auto-escalated to ${manager}`
    addActivity(a.customer, 'milestone', summary, 'system')
    logAction({ action: manual ? 'churn.escalate.manual' : 'churn.escalate.sla', target: `${a.customer} → ${manager}`, category: 'customer' })
  }
  /** Move the renewal's recorded stage and leave a trail on the account. */
  const alignStage = (stage: RenewalStage, why: string) => {
    if (!renewal || renewal.stage === stage) return
    setRenewalStage(a.customer, stage)
    addActivity(a.customer, 'renewal', `Renewal stage moved to ${stage} — ${why}`, 'system')
    logAction({ action: 'churn.renewal.align', target: `${a.customer} → ${stage}`, category: 'customer' })
  }
  const status = (s: ChurnCaseStatus) => {
    setChurnStatus(a.customer, s)
    logAction({ action: 'churn.status', target: `${a.customer} → ${s}`, category: 'customer' })
    // Closing a case is a verdict on the renewal — carry it through to the
    // pipeline so retention maths and the forecast can't drift apart.
    if (s === 'Lost') alignStage('Churning', 'churn case marked Lost')
    else if (s === 'Saved' && renewal && isRenewalAtRisk(renewal.stage)) alignStage('On track', 'churn case marked Saved')
  }
  const saveNote = () => { const t = note.trim(); if (!t) return; addChurnNote(a.customer, t); logAction({ action: 'churn.note', target: a.customer, category: 'customer' }); setNote('') }

  return (
    <div className={clsx('rounded-xl border p-4', closed ? 'border-slate-200 bg-slate-50/50' : breached ? 'border-rose-300 bg-rose-50/60' : a.severity === 'Critical' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200')}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink-900">{a.customer}</span>
          <Badge tone={churnSeverityTone[a.severity]} dot>{a.severity}</Badge>
          <Badge tone={churnStatusTone[kase.status]}>{kase.status}</Badge>
          <span className="flex items-center gap-1 text-[11px] text-ink-400"><Clock className="h-3 w-3" />raised {fmtAge(ageH)} ago</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-500">
          <span>Health <span className={clsx('font-semibold', healthTone(a.health) === 'green' ? 'text-emerald-600' : healthTone(a.health) === 'yellow' ? 'text-amber-600' : 'text-rose-600')}>{a.health}</span></span>
          <Badge tone={churnTone[a.churn]} dot>{a.churn}</Badge>
          <span className="tabular-nums">${(a.arr / 1000).toFixed(0)}k ARR</span>
          <span className={clsx('tabular-nums', a.daysToRenewal <= 30 ? 'font-semibold text-rose-600' : a.daysToRenewal <= 90 ? 'text-amber-600' : '')}>renewal {a.daysToRenewal < 0 ? 'past' : `in ${a.daysToRenewal}d`}</span>
        </div>
      </div>

      {/* SLA escalation banner */}
      {breached && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-rose-300 bg-rose-100/70 px-3 py-2">
          <Siren className="h-4 w-4 shrink-0 text-rose-600" />
          <span className="text-xs font-medium text-rose-800">
            First-response SLA breached — no response in {fmtAge(ageH)} (SLA {CHURN_SLA_HOURS[a.severity]}h).
          </span>
          {kase.escalatedTo ? (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-rose-700"><ArrowUpRight className="h-3.5 w-3.5" />Escalated to {kase.escalatedTo}</span>
          ) : (
            <GatedButton cap="customer.manage" showLock={false} disabled={!manage} onClick={() => escalate(false)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700">
              <ArrowUpRight className="h-3.5 w-3.5" />Page {manager}
            </GatedButton>
          )}
        </div>
      )}
      {!breached && kase.escalatedTo && (
        <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-ink-500"><ArrowUpRight className="h-3.5 w-3.5" />Escalated to {kase.escalatedTo}{kase.escalatedAt ? ` · ${kase.escalatedAt}` : ''}</div>
      )}

      {/* Reasons */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {a.reasons.map((r, i) => (
          <span key={i} className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] text-ink-600 ring-1 ring-inset ring-slate-200">{r}</span>
        ))}
      </div>

      {/* The renewal this case is protecting */}
      {renewal && signal && (
        <ProtectedRenewal
          customer={a.customer}
          renewal={renewal}
          signal={signal}
          canManage={manage}
          onAlign={() => alignStage(signal.suggested, 'aligned with health & churn signals')}
        />
      )}

      {/* Owner + actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <span className="text-xs font-medium text-ink-500">Owner</span>
        {manage ? (
          <select value={owner} onChange={(e) => assign(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-ink-700">
            {Array.from(new Set([owner, ...CS_REPS])).map((r) => <option key={r} value={r}>{r === a.csm ? `${r} (CSM)` : r}</option>)}
          </select>
        ) : (
          <span className="text-xs text-ink-700">{owner}{owner === a.csm ? ' (CSM)' : ''}</span>
        )}

        <span className="ml-1 text-xs font-medium text-ink-500">Status</span>
        {manage ? (
          <select value={kase.status} onChange={(e) => status(e.target.value as ChurnCaseStatus)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-ink-700">
            {CHURN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : <Badge tone={churnStatusTone[kase.status]}>{kase.status}</Badge>}

        <div className="ml-auto flex items-center gap-2">
          {!closed && !kase.escalatedTo && !breached && (
            <GatedButton cap="customer.manage" showLock={false} disabled={!manage} onClick={() => escalate(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50">
              <ArrowUpRight className="h-3.5 w-3.5" />Escalate
            </GatedButton>
          )}
          <GatedButton cap="customer.manage" showLock={false} disabled={!manage} onClick={notify}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-slate-50">
            <Send className="h-3.5 w-3.5" />Notify team
          </GatedButton>
        </div>
      </div>

      {/* Follow-up + notified state */}
      {(kase.owner || kase.notifiedChannels.length > 0 || hasFollowUp) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-500">
          {hasFollowUp && <span className="inline-flex items-center gap-1 text-emerald-700"><PlayCircle className="h-3.5 w-3.5" />Save-play follow-up created — see Tasks &amp; Plays</span>}
          {kase.notifiedChannels.length > 0 && <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-600" />Notified {kase.notifiedChannels.join(', ')}</span>}
        </div>
      )}

      {/* Notes */}
      {manage && !closed && (
        <div className="mt-3 flex items-center gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveNote()}
            placeholder="Add an investigation note…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm placeholder:text-ink-400" />
          <button onClick={saveNote} disabled={!note.trim()} className="btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-50">Log note</button>
        </div>
      )}
      {kase.notes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {kase.notes.map((n, i) => (
            <li key={i} className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-ink-600"><span className="text-ink-400">{n.at} · {n.by} — </span>{n.text}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
