import { useState } from 'react'
import { ShieldAlert, UserPlus, Send, DollarSign, Siren, BellRing, PlayCircle, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader, StatCard, Card, CardTitle, Badge } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import {
  deriveChurnAlerts, churnSeverityTone, churnStatusTone, isChurnClosed,
  CHURN_STATUSES, CS_REPS, CHURN_NOTIFY_CHANNELS, healthTone, churnTone,
} from '@/data/success'
import type { ChurnAlert, ChurnCaseStatus } from '@/data/success'
import {
  useSuccess, churnCaseFor, assignChurnOwner, setChurnStatus,
  notifyChurnTeam, addChurnNote, addTask, addActivity,
} from '@/data/successStore'

const AS_OF = '2026-07-24'
const dueInDays = (n: number) => new Date(Date.parse(AS_OF) + n * 86400000).toISOString().slice(0, 10)

export function ChurnWatch() {
  const { churn, tasks } = useSuccess()
  const { can, logAction } = useSession()
  const alerts = deriveChurnAlerts(AS_OF)

  const caseOf = (c: string) => churnCaseFor(c, churn)
  const openAlerts = alerts.filter((a) => !isChurnClosed(caseOf(a.customer).status))
  const unassigned = openAlerts.filter((a) => !caseOf(a.customer).owner).length
  const critical = openAlerts.filter((a) => a.severity === 'Critical').length
  const arrAtRisk = openAlerts.reduce((s, a) => s + a.arr, 0)

  return (
    <div>
      <PageHeader title="Churn Watch" description="Health- and risk-driven early warning. Every at-risk account raises an alert the team is notified about — assign a CS rep to actively work the save." />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs text-amber-900">
          Churn-risk alerts fan out to <span className="font-semibold">{CHURN_NOTIFY_CHANNELS.join(' · ')}</span> through the
          {' '}<span className="font-semibold">Customer Success</span> notification routing rule. Manage channels &amp; escalation under <span className="font-medium">Notifications</span>.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open cases" value={openAlerts.length} icon={ShieldAlert} tone={openAlerts.length ? 'orange' : 'green'} footer={`${alerts.length} accounts flagged`} />
        <StatCard label="Unassigned" value={unassigned} icon={UserPlus} tone={unassigned ? 'red' : 'green'} footer="No rep working it" />
        <StatCard label="Critical" value={critical} icon={Siren} tone={critical ? 'red' : 'green'} footer="Highest severity" />
        <StatCard label="ARR at risk" value={`$${(arrAtRisk / 1000).toFixed(0)}k`} icon={DollarSign} tone={arrAtRisk ? 'orange' : 'green'} footer="Open churn cases" />
      </div>

      <Card>
        <CardTitle title="Active alerts" subtitle="Sorted by severity — assign a rep, notify the team, and work the save play." />
        <div className="space-y-3">
          {alerts.map((a) => (
            <ChurnCard key={a.customer} alert={a} kase={caseOf(a.customer)} can={can} logAction={logAction}
              hasFollowUp={tasks.some((t) => t.customer === a.customer && t.play === 'save' && t.status === 'open')} />
          ))}
          {alerts.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No accounts are tripping the churn watch. 🎉</p>}
        </div>
      </Card>
    </div>
  )
}

function ChurnCard({ alert: a, kase, can, logAction, hasFollowUp }: {
  alert: ChurnAlert
  kase: ReturnType<typeof churnCaseFor>
  can: (c: 'customer.manage') => boolean
  logAction: (i: { action: string; target: string; category?: string }) => void
  hasFollowUp: boolean
}) {
  const [note, setNote] = useState('')
  const manage = can('customer.manage')
  const closed = isChurnClosed(kase.status)

  const assign = (rep: string) => {
    if (!rep) return
    const firstOwner = !kase.owner
    assignChurnOwner(a.customer, rep)
    addActivity(a.customer, 'note', `Churn case assigned to ${rep} for active follow-up`, 'system')
    logAction({ action: 'churn.assign', target: `${a.customer} → ${rep}`, category: 'customer' })
    if (firstOwner && !hasFollowUp) {
      addTask({ customer: a.customer, title: `Work churn save play — ${a.customer}`, play: 'save', priority: a.severity === 'Critical' ? 'Urgent' : 'High', due: dueInDays(3), status: 'open', owner: rep })
      logAction({ action: 'churn.followup.create', target: a.customer, category: 'customer' })
    }
  }
  const notify = () => {
    notifyChurnTeam(a.customer, [...CHURN_NOTIFY_CHANNELS])
    addActivity(a.customer, 'note', `Churn alert sent to ${CHURN_NOTIFY_CHANNELS.join(', ')}`, 'system')
    logAction({ action: 'churn.notify', target: a.customer, category: 'customer' })
  }
  const status = (s: ChurnCaseStatus) => { setChurnStatus(a.customer, s); logAction({ action: 'churn.status', target: `${a.customer} → ${s}`, category: 'customer' }) }
  const saveNote = () => { const t = note.trim(); if (!t) return; addChurnNote(a.customer, t); logAction({ action: 'churn.note', target: a.customer, category: 'customer' }); setNote('') }

  return (
    <div className={clsx('rounded-xl border p-4', closed ? 'border-slate-200 bg-slate-50/50' : a.severity === 'Critical' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200')}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink-900">{a.customer}</span>
          <Badge tone={churnSeverityTone[a.severity]} dot>{a.severity}</Badge>
          <Badge tone={churnStatusTone[kase.status]}>{kase.status}</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-500">
          <span>Health <span className={clsx('font-semibold', healthTone(a.health) === 'green' ? 'text-emerald-600' : healthTone(a.health) === 'yellow' ? 'text-amber-600' : 'text-rose-600')}>{a.health}</span></span>
          <Badge tone={churnTone[a.churn]} dot>{a.churn}</Badge>
          <span className="tabular-nums">${(a.arr / 1000).toFixed(0)}k ARR</span>
          <span className={clsx('tabular-nums', a.daysToRenewal <= 30 ? 'font-semibold text-rose-600' : a.daysToRenewal <= 90 ? 'text-amber-600' : '')}>renewal {a.daysToRenewal < 0 ? 'past' : `in ${a.daysToRenewal}d`}</span>
        </div>
      </div>

      {/* Reasons */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {a.reasons.map((r, i) => (
          <span key={i} className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] text-ink-600 ring-1 ring-inset ring-slate-200">{r}</span>
        ))}
      </div>

      {/* Owner + actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <span className="text-xs font-medium text-ink-500">Owner</span>
        {manage ? (
          <select value={kase.owner ?? ''} onChange={(e) => assign(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-ink-700">
            <option value="">Assign a rep…</option>
            {CS_REPS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <span className="text-xs text-ink-700">{kase.owner ?? <span className="text-ink-400">Unassigned</span>}</span>
        )}

        <span className="ml-1 text-xs font-medium text-ink-500">Status</span>
        {manage ? (
          <select value={kase.status} onChange={(e) => status(e.target.value as ChurnCaseStatus)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-ink-700">
            {CHURN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : <Badge tone={churnStatusTone[kase.status]}>{kase.status}</Badge>}

        <GatedButton cap="customer.manage" showLock={false} disabled={!manage} onClick={notify}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-slate-50">
          <Send className="h-3.5 w-3.5" />Notify team
        </GatedButton>
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
