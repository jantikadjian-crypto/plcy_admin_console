import { useState } from 'react'
import { ListTodo, AlarmClock, CheckCircle2, PlayCircle, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader, StatCard, Card, CardTitle, Badge, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useSuccess, toggleTask, assignCSTask } from '@/data/successStore'
import { RECOMMENDED_PLAYS, playById, priorityTone } from '@/data/success'
import type { Play } from '@/data/success'

const NOW = Date.parse('2026-07-24')
const daysTo = (d: string) => Math.round((Date.parse(d) - NOW) / 86400000)
const FILTERS = ['Open', 'Done', 'All']

export function CSTasks() {
  const { tasks } = useSuccess()
  const { can, logAction } = useSession()
  const [filter, setFilter] = useState('Open')
  const [play, setPlay] = useState<Play | null>(null)

  const open = tasks.filter((t) => t.status === 'open')
  const overdue = open.filter((t) => daysTo(t.due) < 0).length
  const done = tasks.filter((t) => t.status === 'done').length
  const rows = tasks
    .filter((t) => (filter === 'All' ? true : filter === 'Done' ? t.status === 'done' : t.status === 'open'))
    .sort((a, b) => a.due.localeCompare(b.due))

  const complete = (id: string) => { toggleTask(id); logAction({ action: 'success.task.toggle', target: id, category: 'customer' }) }
  const claim = (id: string) => { assignCSTask(id, 'You'); logAction({ action: 'success.task.assign', target: `${id} → You`, category: 'customer' }) }

  return (
    <div>
      <PageHeader title="Tasks & Plays" description="The CS team's action queue — save plays, adoption pushes, and follow-ups, one row per commitment." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open tasks" value={open.length} icon={ListTodo} tone="blue" footer={`${tasks.length} total`} />
        <StatCard label="Overdue" value={overdue} icon={AlarmClock} tone={overdue ? 'red' : 'green'} footer="Past due date" />
        <StatCard label="Completed" value={done} icon={CheckCircle2} tone="green" footer="Marked done" />
        <StatCard label="Playbooks" value={RECOMMENDED_PLAYS.length} icon={PlayCircle} tone="purple" footer="Reusable plays" />
      </div>

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle title="Task queue" subtitle="Check off a task when the play is run" />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={clsx('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors', filter === s ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-slate-100 text-ink-700 ring-slate-500/10 hover:bg-slate-200/70')}>{s}</button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((t) => {
            const p = playById(t.play)
            const d = daysTo(t.due)
            const done = t.status === 'done'
            return (
              <div key={t.id} className="flex items-start gap-3 py-3">
                <GatedButton cap="customer.manage" showLock={false} disabled={!can('customer.manage')} onClick={() => complete(t.id)} aria-label="Toggle complete"
                  className={clsx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors', done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:bg-slate-50')}>
                  {done && <Check className="h-3.5 w-3.5" />}
                </GatedButton>
                <div className="min-w-0 flex-1">
                  <p className={clsx('text-sm', done ? 'text-ink-400 line-through' : 'text-ink-800')}>{t.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
                    <span className="font-medium text-ink-600">{t.customer}</span>
                    {p && <button onClick={() => setPlay(p)} className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20 hover:bg-violet-100"><PlayCircle className="h-3 w-3" />{p.title}</button>}
                    <span className={clsx(!done && d < 0 ? 'font-semibold text-rose-600' : !done && d <= 3 ? 'text-amber-600' : 'text-ink-400')}>{d < 0 ? `${-d}d overdue` : `due in ${d}d`}</span>
                    <span className="font-mono text-ink-300">{t.id}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                  {t.owner
                    ? <span className="text-xs text-ink-500">{t.owner}</span>
                    : <GatedButton cap="customer.manage" showLock={false} disabled={!can('customer.manage')} onClick={() => claim(t.id)} className="rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-300 text-ink-600 hover:bg-slate-50">Claim</GatedButton>}
                </div>
              </div>
            )
          })}
          {rows.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No tasks match this filter.</p>}
        </div>
      </Card>

      <Card>
        <CardTitle title="Playbook library" subtitle="Standard plays the team runs against an account — click a task's play, or reference here." />
        <div className="grid gap-3 sm:grid-cols-2">
          {RECOMMENDED_PLAYS.map((p) => (
            <button key={p.id} onClick={() => setPlay(p)} className="rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/30">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-semibold text-ink-900">{p.title}</span>
              </div>
              <p className="mt-1 text-xs text-ink-500">{p.when}</p>
              <p className="mt-2 text-xs text-ink-400">{p.steps.length} steps</p>
            </button>
          ))}
        </div>
      </Card>

      {play && (
        <Modal open onClose={() => setPlay(null)} title={play.title} subtitle={`Run when: ${play.when}`} maxWidth="max-w-lg"
          footer={<button className="btn-secondary" onClick={() => setPlay(null)}>Close</button>}>
          <ol className="space-y-2">
            {play.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </Modal>
      )}
    </div>
  )
}
