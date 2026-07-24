import { useState } from 'react'
import { ListTodo, AlarmClock, CheckCircle2, PlayCircle, Check, Plus, Pencil, Trash2, ArrowRight, Activity, Trophy } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader, StatCard, Card, CardTitle, Badge, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useSuccess, toggleTask, assignCSTask, addTask, updateTask, deleteTask, addPlay, updatePlay } from '@/data/successStore'
import { priorityTone, customerHealth, CS_REPS } from '@/data/success'
import type { Play, CSTask, TicketPriority } from '@/data/success'

const AS_OF = '2026-07-24'
const NOW = Date.parse(AS_OF)
const daysTo = (d: string) => Math.round((Date.parse(d) - NOW) / 86400000)
const dueInDays = (n: number) => new Date(NOW + n * 86400000).toISOString().slice(0, 10)
const PRIORITIES: TicketPriority[] = ['Urgent', 'High', 'Normal', 'Low']
const CUSTOMERS = customerHealth.map((c) => c.customer)
const STATUS_FILTERS = ['Open', 'Done', 'All']

export function CSTasks() {
  const { tasks, plays } = useSuccess()
  const { can, logAction } = useSession()
  const manage = can('customer.manage')
  const [status, setStatus] = useState('Open')
  const [owner, setOwner] = useState('All')
  const [customer, setCustomer] = useState('All')
  const [play, setPlay] = useState<Play | null>(null)
  const [editTask, setEditTask] = useState<CSTask | 'new' | null>(null)
  const [editPlay, setEditPlay] = useState<Play | 'new' | null>(null)

  const open = tasks.filter((t) => t.status === 'open')
  const overdue = open.filter((t) => daysTo(t.due) < 0).length
  const done = tasks.filter((t) => t.status === 'done').length
  const playName = (id?: string) => plays.find((p) => p.id === id)

  const rows = tasks
    .filter((t) => (status === 'All' ? true : status === 'Done' ? t.status === 'done' : t.status === 'open'))
    .filter((t) => (owner === 'All' ? true : owner === 'Mine' ? t.owner === 'You' : owner === 'Unassigned' ? !t.owner : t.owner === owner))
    .filter((t) => (customer === 'All' ? true : t.customer === customer))
    .sort((a, b) => a.due.localeCompare(b.due))

  const complete = (id: string) => { toggleTask(id); logAction({ action: 'success.task.toggle', target: id, category: 'customer' }) }
  const claim = (id: string) => { assignCSTask(id, 'You'); logAction({ action: 'success.task.assign', target: `${id} → You`, category: 'customer' }) }

  return (
    <div>
      <PageHeader title="Tasks & Plays" description="Where Customer Success turns signals into action. Health scores and churn alerts surface what needs attention; a play is the repeatable how; a task is one owned commitment with a due date. Run the play, check off the task, move the account." />

      {/* How it works */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs">
        <FlowChip icon={Activity} label="Signal" sub="health · churn" tone="rose" />
        <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
        <FlowChip icon={PlayCircle} label="Play" sub="repeatable how" tone="violet" />
        <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
        <FlowChip icon={ListTodo} label="Task" sub="owned commitment" tone="blue" />
        <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
        <FlowChip icon={Trophy} label="Outcome" sub="saved · adopted · expanded" tone="emerald" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open tasks" value={open.length} icon={ListTodo} tone="blue" footer={`${tasks.length} total`} />
        <StatCard label="Overdue" value={overdue} icon={AlarmClock} tone={overdue ? 'red' : 'green'} footer="Past due date" />
        <StatCard label="Completed" value={done} icon={CheckCircle2} tone="green" footer="Marked done" />
        <StatCard label="Playbooks" value={plays.length} icon={PlayCircle} tone="purple" footer="Reusable plays" />
      </div>

      <Card className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <CardTitle title="Task queue" subtitle="Check off a task when the play is run · click a row to edit" />
          <GatedButton cap="customer.manage" showLock={false} disabled={!manage} onClick={() => setEditTask('new')} className="btn-primary px-3 py-1.5 text-xs"><Plus className="h-3.5 w-3.5" />New task</GatedButton>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={clsx('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors', status === s ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-slate-100 text-ink-700 ring-slate-500/10 hover:bg-slate-200/70')}>{s}</button>
            ))}
          </div>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-ink-700">
            <option value="All">All owners</option>
            <option value="Mine">My tasks</option>
            <option value="Unassigned">Unassigned</option>
            {CS_REPS.filter((r) => r !== 'You').map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={customer} onChange={(e) => setCustomer(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-ink-700">
            <option value="All">All customers</option>
            {CUSTOMERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="ml-auto text-xs text-ink-400">{rows.length} shown</span>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((t) => {
            const p = playName(t.play)
            const d = daysTo(t.due)
            const isDone = t.status === 'done'
            return (
              <div key={t.id} className="group flex items-start gap-3 py-3">
                <GatedButton cap="customer.manage" showLock={false} disabled={!manage} onClick={() => complete(t.id)} aria-label="Toggle complete"
                  className={clsx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors', isDone ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:bg-slate-50')}>
                  {isDone && <Check className="h-3.5 w-3.5" />}
                </GatedButton>
                <button onClick={() => manage && setEditTask(t)} className="min-w-0 flex-1 text-left">
                  <p className={clsx('text-sm', isDone ? 'text-ink-400 line-through' : 'text-ink-800')}>{t.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
                    <span className="font-medium text-ink-600">{t.customer}</span>
                    {p && <span onClick={(e) => { e.stopPropagation(); setPlay(p) }} className="inline-flex cursor-pointer items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20 hover:bg-violet-100"><PlayCircle className="h-3 w-3" />{p.title}</span>}
                    <span className={clsx(!isDone && d < 0 ? 'font-semibold text-rose-600' : !isDone && d <= 3 ? 'text-amber-600' : 'text-ink-400')}>{d < 0 ? `${-d}d overdue` : `due in ${d}d`}</span>
                    <span className="font-mono text-ink-300">{t.id}</span>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                  {t.owner
                    ? <span className="text-xs text-ink-500">{t.owner}</span>
                    : <GatedButton cap="customer.manage" showLock={false} disabled={!manage} onClick={() => claim(t.id)} className="rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-300 text-ink-600 hover:bg-slate-50">Claim</GatedButton>}
                  {manage && <button onClick={() => setEditTask(t)} className="text-ink-300 opacity-0 transition-opacity hover:text-ink-600 group-hover:opacity-100" aria-label="Edit task"><Pencil className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
            )
          })}
          {rows.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No tasks match these filters.</p>}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle title="Playbook library" subtitle="Standard plays the team runs against an account — reusable across tasks." />
          <GatedButton cap="customer.manage" showLock={false} disabled={!manage} onClick={() => setEditPlay('new')} className="btn-secondary px-2.5 py-1.5 text-xs"><Plus className="h-3.5 w-3.5" />New play</GatedButton>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {plays.map((p) => (
            <div key={p.id} className="group relative rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/30">
              <button onClick={() => setPlay(p)} className="block w-full text-left">
                <div className="flex items-center gap-2 pr-8">
                  <PlayCircle className="h-4 w-4 shrink-0 text-violet-500" />
                  <span className="text-sm font-semibold text-ink-900">{p.title}</span>
                </div>
                <p className="mt-1 text-xs text-ink-500">{p.when}</p>
                <p className="mt-2 text-xs text-ink-400">{p.steps.length} steps</p>
              </button>
              {manage && <button onClick={() => setEditPlay(p)} className="absolute right-3 top-3 text-ink-300 opacity-0 transition-opacity hover:text-ink-600 group-hover:opacity-100" aria-label="Edit play"><Pencil className="h-3.5 w-3.5" /></button>}
            </div>
          ))}
        </div>
      </Card>

      {play && <PlayDetail play={play} canEdit={manage} onEdit={() => { setEditPlay(play); setPlay(null) }} onClose={() => setPlay(null)} />}
      {editTask && <TaskEditor task={editTask === 'new' ? null : editTask} plays={plays} onClose={() => setEditTask(null)} logAction={logAction} />}
      {editPlay && <PlayEditor play={editPlay === 'new' ? null : editPlay} onClose={() => setEditPlay(null)} logAction={logAction} />}
    </div>
  )
}

function FlowChip({ icon: Icon, label, sub, tone }: { icon: typeof Activity; label: string; sub: string; tone: 'rose' | 'violet' | 'blue' | 'emerald' }) {
  const c = tone === 'rose' ? 'text-rose-600 bg-rose-50 ring-rose-600/20' : tone === 'violet' ? 'text-violet-600 bg-violet-50 ring-violet-600/20' : tone === 'blue' ? 'text-blue-600 bg-blue-50 ring-blue-600/20' : 'text-emerald-600 bg-emerald-50 ring-emerald-600/20'
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 ring-1 ring-inset', c)}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-semibold">{label}</span>
      <span className="text-ink-400">· {sub}</span>
    </span>
  )
}

function PlayDetail({ play, canEdit, onEdit, onClose }: { play: Play; canEdit: boolean; onEdit: () => void; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={play.title} subtitle={`Run when: ${play.when}`} maxWidth="max-w-lg"
      headerRight={canEdit ? <button onClick={onEdit} className="btn-secondary px-2.5 py-1 text-xs"><Pencil className="h-3.5 w-3.5" />Edit</button> : undefined}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}>
      <ol className="space-y-2">
        {play.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink-700">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Task editor (create / edit)                                         */
/* ------------------------------------------------------------------ */
function TaskEditor({ task, plays, onClose, logAction }: { task: CSTask | null; plays: Play[]; onClose: () => void; logAction: (i: { action: string; target: string; category?: string }) => void }) {
  const editing = !!task
  const [customer, setCustomer] = useState(task?.customer ?? CUSTOMERS[0])
  const [title, setTitle] = useState(task?.title ?? '')
  const [playId, setPlayId] = useState(task?.play ?? '')
  const [priority, setPriority] = useState<TicketPriority>(task?.priority ?? 'Normal')
  const [due, setDue] = useState(task?.due ?? dueInDays(7))
  const [owner, setOwner] = useState(task?.owner ?? '')
  const valid = title.trim().length > 0

  const save = () => {
    if (!valid) return
    const patch = { customer, title: title.trim(), play: playId || undefined, priority, due, owner: owner || undefined }
    if (editing && task) { updateTask(task.id, patch); logAction({ action: 'success.task.update', target: task.id, category: 'customer' }) }
    else { const id = addTask({ ...patch, status: 'open' }); logAction({ action: 'success.task.create', target: `${id} · ${customer}`, category: 'customer' }) }
    onClose()
  }
  const remove = () => { if (task) { deleteTask(task.id); logAction({ action: 'success.task.delete', target: task.id, category: 'customer' }); onClose() } }

  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${task!.id}` : 'New task'} subtitle={editing ? task!.customer : 'Create a follow-up commitment'} maxWidth="max-w-lg"
      footer={
        <div className="flex w-full items-center justify-between">
          {editing ? <button onClick={remove} className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" />Delete</button> : <span />}
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary disabled:opacity-50" disabled={!valid} onClick={save}>{editing ? 'Save' : 'Create task'}</button>
          </div>
        </div>
      }>
      <div className="space-y-4">
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Book QBR with the champion" className="input" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer"><select value={customer} onChange={(e) => setCustomer(e.target.value)} className="input">{CUSTOMERS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Play (optional)"><select value={playId} onChange={(e) => setPlayId(e.target.value)} className="input"><option value="">— none —</option>{plays.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
          <Field label="Priority"><select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className="input">{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Due"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="input" /></Field>
          <Field label="Owner"><select value={owner} onChange={(e) => setOwner(e.target.value)} className="input"><option value="">Unassigned</option>{CS_REPS.map((r) => <option key={r}>{r}</option>)}</select></Field>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Play editor (create / edit)                                         */
/* ------------------------------------------------------------------ */
function PlayEditor({ play, onClose, logAction }: { play: Play | null; onClose: () => void; logAction: (i: { action: string; target: string; category?: string }) => void }) {
  const editing = !!play
  const [title, setTitle] = useState(play?.title ?? '')
  const [when, setWhen] = useState(play?.when ?? '')
  const [steps, setSteps] = useState<string[]>(play?.steps ?? [''])
  const validSteps = steps.map((s) => s.trim()).filter(Boolean)
  const valid = title.trim() && when.trim() && validSteps.length > 0

  const setStep = (i: number, v: string) => setSteps((ss) => ss.map((s, j) => (j === i ? v : s)))
  const addStep = () => setSteps((ss) => [...ss, ''])
  const removeStep = (i: number) => setSteps((ss) => (ss.length > 1 ? ss.filter((_, j) => j !== i) : ss))

  const save = () => {
    if (!valid) return
    const body = { title: title.trim(), when: when.trim(), steps: validSteps }
    if (editing && play) { updatePlay(play.id, body); logAction({ action: 'success.play.update', target: play.id, category: 'customer' }) }
    else { const id = addPlay(body); logAction({ action: 'success.play.create', target: id, category: 'customer' }) }
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit play' : 'New play'} subtitle="A reusable playbook the team runs against an account" maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary disabled:opacity-50" disabled={!valid} onClick={save}>{editing ? 'Save play' : 'Create play'}</button>
        </div>
      }>
      <div className="space-y-4">
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Executive re-engagement play" className="input" /></Field>
        <Field label="Run when"><input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="e.g. Champion goes quiet for 30+ days" className="input" /></Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-ink-500">Steps</label>
            <button onClick={addStep} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"><Plus className="h-3.5 w-3.5" />Add step</button>
          </div>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{i + 1}</span>
                <input value={s} onChange={(e) => setStep(i, e.target.value)} placeholder="Describe the step" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                <button onClick={() => removeStep(i)} className="text-ink-300 hover:text-rose-600" aria-label="Remove step"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-medium text-ink-500">{label}</label>{children}</div>
}
