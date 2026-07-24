import { useState } from 'react'
import {
  GitBranch, GitCompare, FlaskConical, CheckCircle2, XCircle, RotateCcw,
  Send, CalendarClock, History, ClipboardCheck, ShieldCheck, AlertTriangle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import {
  crStatusTone, riskTone, changeLineTone, changeLineSign, isCROpen, allApproved,
  versionBaseline,
} from '@/data/policyChanges'
import type { ChangeRequest, VersionEntry } from '@/data/policyChanges'
import {
  usePolicyChanges, submitForReview, recordReview, scheduleChange,
  applyChange, rollbackChange, runDryRun, canApply,
} from '@/data/policyChangesStore'

function versionHistory(packId: string, crs: ChangeRequest[]): VersionEntry[] {
  const applied = crs
    .filter((c) => c.packId === packId && (c.status === 'Applied' || c.status === 'Rolled back'))
    .map<VersionEntry>((c) => ({ version: c.toVersion, date: c.appliedAt ?? c.createdAt, author: c.author, summary: c.title, crId: c.id, rolledBack: c.status === 'Rolled back' }))
  return [...applied, ...(versionBaseline[packId] ?? [])].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
}

export function PolicyChanges() {
  const { crs } = usePolicyChanges()
  const [selId, setSelId] = useState<string | null>(null)
  const sel = crs.find((c) => c.id === selId)

  const open = crs.filter((c) => isCROpen(c.status))
  const awaiting = crs.filter((c) => c.status === 'In review').length
  const applied = crs.filter((c) => c.status === 'Applied').length
  const rolledBack = crs.filter((c) => c.status === 'Rolled back').length
  const rows = [...crs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div>
      <PageHeader title="Change Management" description="The controlled path a policy edit takes to production — version history, a control-level diff, an approval workflow, a dry-run impact estimate, and rollback." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open changes" value={open.length} icon={GitBranch} tone={open.length ? 'blue' : 'green'} footer={`${crs.length} total`} />
        <StatCard label="Awaiting approval" value={awaiting} icon={ClipboardCheck} tone={awaiting ? 'orange' : 'green'} footer="In review" />
        <StatCard label="Applied" value={applied} icon={CheckCircle2} tone="green" footer="Live in production" />
        <StatCard label="Rolled back" value={rolledBack} icon={RotateCcw} tone={rolledBack ? 'orange' : 'slate'} footer="Reverted" />
      </div>

      <Card>
        <CardTitle title="Change requests" subtitle="Click a change to see the diff, dry-run impact, approvals, and version history." />
        <Table columns={['ID', 'Pack', 'Change', 'Version', 'Risk', 'Status', 'Author', 'Updated']}>
          {rows.map((c) => (
            <Tr key={c.id} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setSelId(c.id)}>
              <Td className="font-mono text-xs font-semibold text-ink-900">{c.id}</Td>
              <Td className="text-xs text-ink-600">{c.packName}</Td>
              <Td className="max-w-xs truncate text-ink-800">{c.title}</Td>
              <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{c.fromVersion} → {c.toVersion}</Td>
              <Td><Badge tone={riskTone[c.risk]} dot>{c.risk}</Badge></Td>
              <Td><Badge tone={crStatusTone[c.status]} dot>{c.status}</Badge></Td>
              <Td className="text-xs text-ink-500">{c.author}</Td>
              <Td className="whitespace-nowrap text-xs text-ink-400">{c.history[c.history.length - 1]?.at ?? c.createdAt}</Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {sel && <ChangeDrawer cr={sel} history={versionHistory(sel.packId, crs)} onClose={() => setSelId(null)} />}
    </div>
  )
}

function ChangeDrawer({ cr, history, onClose }: { cr: ChangeRequest; history: VersionEntry[]; onClose: () => void }) {
  const { can, logAction } = useSession()
  const canManage = can('policy.manage')
  const canApprove = can('policy.approve')
  const [comment, setComment] = useState('')
  const [when, setWhen] = useState('')

  const audit = (action: string, extra = '') => logAction({ action, target: `${cr.id}${extra ? ` · ${extra}` : ''}`, category: 'policy' })
  const submit = () => { submitForReview(cr.id); audit('policy.change.submit') }
  const review = (approver: string, decision: 'approved' | 'rejected') => {
    recordReview(cr.id, approver, decision, decision === 'rejected' ? comment.trim() || undefined : undefined)
    audit(decision === 'approved' ? 'policy.change.approve' : 'policy.change.reject', approver)
    setComment('')
  }
  const dryRun = () => { runDryRun(cr.id); audit('policy.change.dryrun') }
  const schedule = () => { if (!when) return; scheduleChange(cr.id, when); audit('policy.change.schedule', when) }
  const apply = () => { applyChange(cr.id); audit('policy.change.apply', `v${cr.toVersion}`) }
  const rollback = () => { rollbackChange(cr.id); audit('policy.change.rollback', `v${cr.fromVersion}`) }

  const selfApprove = (approver: string) => approver === cr.author // segregation of duties

  return (
    <Modal
      open onClose={onClose}
      title={<span className="flex items-baseline gap-2"><span className="font-mono text-base">{cr.id}</span><span className="text-sm font-normal text-ink-500">{cr.packName}</span></span>}
      subtitle={cr.title}
      maxWidth="max-w-3xl"
      headerRight={<span className="flex items-center gap-2"><Badge tone={riskTone[cr.risk]} dot>{cr.risk} risk</Badge><Badge tone={crStatusTone[cr.status]} dot>{cr.status}</Badge></span>}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
          <span>Author <span className="font-medium text-ink-700">{cr.author}</span></span>
          <span className="font-mono">v{cr.fromVersion} → v{cr.toVersion}</span>
          <span>Opened {cr.createdAt}</span>
          {cr.scheduledFor && <span className="text-violet-600">Scheduled {cr.scheduledFor}</span>}
          {cr.appliedAt && <span className="text-emerald-600">Applied {cr.appliedAt}</span>}
          {cr.rolledBackAt && <span className="text-amber-600">Rolled back {cr.rolledBackAt}</span>}
        </div>
        <p className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-ink-700">{cr.summary}</p>

        {/* Diff */}
        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900"><GitCompare className="h-4 w-4 text-ink-400" />Control diff</h4>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {cr.changes.map((ch, i) => (
              <div key={i} className={clsx('flex items-start gap-3 border-b border-slate-100 px-3 py-2 last:border-0', ch.op === 'add' ? 'bg-emerald-50/40' : ch.op === 'remove' ? 'bg-rose-50/40' : 'bg-white')}>
                <span className={clsx('mt-0.5 font-mono text-sm font-bold', changeLineTone(ch.op) === 'green' ? 'text-emerald-600' : changeLineTone(ch.op) === 'red' ? 'text-rose-600' : 'text-blue-600')}>{changeLineSign(ch.op)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm"><span className="font-mono font-semibold text-ink-800">{ch.controlId}</span> <span className="text-ink-600">{ch.controlName}</span></p>
                  {ch.field && (
                    <p className="mt-0.5 text-xs text-ink-500">
                      <span className="font-medium">{ch.field}:</span>{' '}
                      {ch.before && <span className="rounded bg-rose-100 px-1 text-rose-700 line-through">{ch.before}</span>}
                      {ch.before && ch.after && <span className="mx-1">→</span>}
                      {ch.after && <span className="rounded bg-emerald-100 px-1 text-emerald-700">{ch.after}</span>}
                    </p>
                  )}
                </div>
                <Badge tone={changeLineTone(ch.op)}>{ch.op}</Badge>
              </div>
            ))}
          </div>
        </section>

        {/* Dry-run impact */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><FlaskConical className="h-4 w-4 text-ink-400" />Dry-run impact</h4>
            <GatedButton cap="policy.manage" showLock={false} disabled={!canManage} onClick={dryRun} className="btn-secondary px-2.5 py-1 text-xs">
              Run dry-run{cr.impact.lastRun ? ` · ${cr.impact.lastRun}` : ''}
            </GatedButton>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-600">
              <span><span className="font-semibold text-ink-800">{cr.impact.instances}</span> instances affected</span>
              <span><span className="font-semibold text-ink-800">{(cr.impact.requestsPerDay / 1_000_000).toFixed(1)}M</span> requests/day</span>
              <span className="flex items-center gap-1">Risk <Badge tone={riskTone[cr.impact.risk]} dot>{cr.impact.risk}</Badge></span>
            </div>
            <div className="space-y-1.5">
              {cr.impact.decisionDelta.map((d) => {
                const delta = d.after - d.before
                return (
                  <div key={d.label} className="flex items-center gap-3 text-xs">
                    <span className="w-24 shrink-0 text-ink-600">{d.label}</span>
                    <div className="flex flex-1 items-center gap-1">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-300" style={{ width: `${d.before}%` }} /></div>
                      <span className="w-8 text-right tabular-nums text-ink-400">{d.before}%</span>
                      <span className="mx-1 text-ink-300">→</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={clsx('h-full rounded-full', delta > 0 ? 'bg-amber-500' : delta < 0 ? 'bg-emerald-500' : 'bg-slate-400')} style={{ width: `${d.after}%` }} /></div>
                      <span className="w-8 text-right font-semibold tabular-nums text-ink-700">{d.after}%</span>
                    </div>
                    <span className={clsx('w-10 text-right tabular-nums', delta > 0 ? 'text-amber-600' : delta < 0 ? 'text-emerald-600' : 'text-ink-400')}>{delta > 0 ? '+' : ''}{delta}%</span>
                  </div>
                )
              })}
            </div>
            {cr.impact.notes.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2">
                {cr.impact.notes.map((n, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-ink-600"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />{n}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Approval workflow */}
        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900"><ShieldCheck className="h-4 w-4 text-ink-400" />Approvals
            {allApproved(cr) && <span className="text-xs font-normal text-emerald-600">· all approved</span>}
          </h4>
          <div className="space-y-2">
            {cr.reviews.map((r) => (
              <div key={r.approver} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800">{r.approver} <span className="text-xs font-normal text-ink-400">· {r.role}</span></p>
                  {r.comment && <p className="text-xs text-ink-500">“{r.comment}”</p>}
                  {r.at && <p className="text-[11px] text-ink-400">{r.at}</p>}
                </div>
                {r.decision === 'pending' && cr.status === 'In review' ? (
                  <div className="flex items-center gap-1.5">
                    {selfApprove(r.approver) ? (
                      <span className="text-[11px] italic text-ink-400">author — can't self-approve</span>
                    ) : (
                      <>
                        <GatedButton cap="policy.approve" showLock={false} disabled={!canApprove} onClick={() => review(r.approver, 'approved')}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-3.5 w-3.5" />Approve</GatedButton>
                        <GatedButton cap="policy.approve" showLock={false} disabled={!canApprove} onClick={() => review(r.approver, 'rejected')}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"><XCircle className="h-3.5 w-3.5" />Reject</GatedButton>
                      </>
                    )}
                  </div>
                ) : (
                  <Badge tone={r.decision === 'approved' ? 'green' : r.decision === 'rejected' ? 'red' : 'slate'} dot>{r.decision}</Badge>
                )}
              </div>
            ))}
          </div>
          {cr.status === 'In review' && canApprove && (
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment (attached on reject)…"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm placeholder:text-ink-400" />
          )}
        </section>

        {/* Lifecycle actions */}
        <section className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {cr.status === 'Draft' && (
            <GatedButton cap="policy.manage" showLock={false} disabled={!canManage} onClick={submit} className="btn-primary px-3 py-1.5 text-xs"><Send className="h-3.5 w-3.5" />Submit for review</GatedButton>
          )}
          {(cr.status === 'Approved' || cr.status === 'Scheduled') && (
            <>
              <input type="date" value={when} onChange={(e) => setWhen(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-ink-700" />
              <GatedButton cap="policy.manage" showLock={false} disabled={!canManage || !when} onClick={schedule} className="btn-secondary px-2.5 py-1.5 text-xs"><CalendarClock className="h-3.5 w-3.5" />Schedule</GatedButton>
              <GatedButton cap="policy.manage" showLock={false} disabled={!canManage || !canApply(cr.status)} onClick={apply} className="btn-primary px-3 py-1.5 text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Apply to production</GatedButton>
            </>
          )}
          {cr.status === 'Applied' && (
            <GatedButton cap="policy.manage" showLock={false} disabled={!canManage} onClick={rollback} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"><RotateCcw className="h-3.5 w-3.5" />Roll back to v{cr.fromVersion}</GatedButton>
          )}
          {cr.status === 'In review' && !canApprove && <p className="text-xs text-ink-400">Approval requires the <span className="font-mono">policy.approve</span> capability.</p>}
          {cr.status === 'Rejected' && <p className="text-xs text-rose-600">This change was rejected and is closed. Open a new change request to revise.</p>}
        </section>

        {/* Version history */}
        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900"><History className="h-4 w-4 text-ink-400" />Version history · {cr.packName}</h4>
          <ol className="relative space-y-3 border-l border-slate-200 pl-4">
            {history.map((v) => (
              <li key={v.version + v.date} className="relative">
                <span className={clsx('absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white', v.rolledBack ? 'bg-amber-500' : 'bg-brand-500')} />
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-ink-800">v{v.version}</span>
                  {v.crId && <span className="font-mono text-[11px] text-ink-400">{v.crId}</span>}
                  {v.rolledBack && <Badge tone="yellow">rolled back</Badge>}
                </div>
                <p className="text-sm text-ink-600">{v.summary}</p>
                <p className="text-[11px] text-ink-400">{v.date} · {v.author}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* CR activity trail */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Change log</h4>
          <ul className="space-y-1">
            {[...cr.history].reverse().map((h, i) => (
              <li key={i} className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-ink-600"><span className="text-ink-400">{h.at} · {h.who} — </span>{h.text}</li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  )
}
