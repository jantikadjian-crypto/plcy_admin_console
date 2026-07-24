import { useState } from 'react'
import { HeartPulse, AlertTriangle, Gauge, DollarSign, Crown, UserMinus, Check, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import {
  customerHealth, churnTone, healthTone, usageArrow,
  HEALTH_WEIGHTS, healthScores, healthComposite, dimTone,
  contactsByCustomer, FEATURES, featureAdoption, playById,
} from '@/data/success'
import type { CustomerHealth as CH, ActivityType } from '@/data/success'
import { activityTone } from '@/data/success'
import { useSuccess, addActivity, toggleTask } from '@/data/successStore'

function Spark({ data, tone }: { data: number[]; tone: string }) {
  const w = 72, h = 22
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * (h - 4) - 2}`).join(' ')
  const color = tone === 'green' ? 'text-emerald-500' : tone === 'yellow' ? 'text-amber-500' : 'text-rose-500'
  return <svg width={w} height={h} className={color}><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" /></svg>
}

export function CustomerHealthTab() {
  const { tickets } = useSuccess()
  const [sel, setSel] = useState<CH | null>(null)
  const openFor = (c: string) => tickets.filter((t) => t.customer === c && t.status !== 'Resolved').length

  const rows = [...customerHealth].sort((a, b) => a.health - b.health) // worst first
  const atRisk = customerHealth.filter((c) => c.churn !== 'Low').length
  const avg = Math.round(customerHealth.reduce((a, c) => a + c.health, 0) / customerHealth.length)
  const mrr = customerHealth.reduce((a, c) => a + c.mrr, 0)

  return (
    <div>
      <PageHeader title="Customer Health" description="Portfolio health across every customer — who's thriving, who's slipping, and who's at risk of churn." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={customerHealth.length} icon={HeartPulse} tone="blue" footer="Active accounts" />
        <StatCard label="At churn risk" value={atRisk} icon={AlertTriangle} tone={atRisk ? 'orange' : 'green'} footer="Medium or high risk" />
        <StatCard label="Avg health" value={avg} icon={Gauge} tone={avg >= 80 ? 'green' : 'orange'} footer="Portfolio composite" />
        <StatCard label="MRR" value={`$${(mrr / 1000).toFixed(0)}k`} icon={DollarSign} tone="purple" footer="Monthly recurring" />
      </div>

      <Card>
        <CardTitle title="Accounts" subtitle="Sorted by health — lowest first. Click a customer for the full Account 360." />
        <Table columns={['Customer', 'Plan', 'MRR', 'Health', 'Churn', 'Adoption', 'Usage', 'Open', 'Renewal', 'CSM']}>
          {rows.map((c) => (
            <Tr key={c.customer} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setSel(c)}>
              <Td className="font-medium text-ink-900">{c.customer}</Td>
              <Td className="text-xs text-ink-600">{c.plan}</Td>
              <Td className="tabular-nums text-ink-600">${(c.mrr / 1000).toFixed(0)}k</Td>
              <Td>
                <span className="flex items-center gap-2">
                  <Badge tone={healthTone(c.health)}>{c.health}</Badge>
                  <Spark data={c.trend} tone={healthTone(c.health)} />
                </span>
              </Td>
              <Td><Badge tone={churnTone[c.churn]} dot>{c.churn}</Badge></Td>
              <Td className="tabular-nums text-ink-600">{c.adoption}%</Td>
              <Td className={c.usageTrend === 'up' ? 'text-emerald-600' : c.usageTrend === 'down' ? 'text-rose-600' : 'text-ink-400'}>{usageArrow(c.usageTrend)}</Td>
              <Td className="tabular-nums text-ink-700">{openFor(c.customer)}</Td>
              <Td className="whitespace-nowrap text-xs text-ink-500">{c.renewalDate}</Td>
              <Td className="text-xs text-ink-500">{c.csm}</Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {sel && <Account360 c={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Account 360 — the full drill-down                                   */
/* ------------------------------------------------------------------ */
function Account360({ c, onClose }: { c: CH; onClose: () => void }) {
  const { tickets, activities, tasks } = useSuccess()
  const { can, logAction } = useSession()
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState<ActivityType>('note')

  const breakdown = healthScores[c.customer]
  const contacts = contactsByCustomer[c.customer] ?? []
  const adopted = new Set(featureAdoption[c.customer] ?? [])
  const openTickets = tickets.filter((t) => t.customer === c.customer && t.status !== 'Resolved')
  const acts = activities.filter((a) => a.customer === c.customer)
  const openTasks = tasks.filter((t) => t.customer === c.customer && t.status === 'open')

  const logNote = () => {
    const text = note.trim()
    if (!text) return
    addActivity(c.customer, noteType, text)
    logAction({ action: 'success.activity.add', target: `${c.customer} · ${noteType}`, category: 'customer' })
    setNote('')
  }

  return (
    <Modal
      open onClose={onClose}
      title={c.customer}
      subtitle={`${c.plan} · $${(c.mrr / 1000).toFixed(0)}k MRR · CSM ${c.csm} · renewal ${c.renewalDate}`}
      maxWidth="max-w-3xl"
      headerRight={<Badge tone={churnTone[c.churn]} dot>{c.churn} churn risk</Badge>}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="space-y-6">
        {/* Explainable health */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-ink-900">Health breakdown</h4>
            <span className="text-xs text-ink-500">Composite <span className="font-semibold text-ink-800">{breakdown ? healthComposite(breakdown) : c.health}</span> / 100</span>
          </div>
          <div className="space-y-2">
            {breakdown && HEALTH_WEIGHTS.map((d) => {
              const v = breakdown[d.key]
              const tone = dimTone(v)
              const bar = tone === 'green' ? 'bg-emerald-500' : tone === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'
              return (
                <div key={d.key} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <p className="text-xs font-medium text-ink-700" title={d.hint}>{d.label}</p>
                    <p className="text-[10px] text-ink-400">weight {d.weight}%</p>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={clsx('h-full rounded-full', bar)} style={{ width: `${v}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-700">{v}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Contacts + Feature adoption */}
        <div className="grid gap-5 sm:grid-cols-2">
          <section>
            <h4 className="mb-2 text-sm font-semibold text-ink-900">Key contacts</h4>
            <div className="space-y-2">
              {contacts.map((p) => (
                <div key={p.email} className={clsx('rounded-lg border px-3 py-2', p.status === 'departed' ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200')}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-ink-900">{p.name}</span>
                    {p.champion && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Champion" />}
                    {p.status === 'departed' && <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600"><UserMinus className="h-3 w-3" />departed</span>}
                  </div>
                  <p className="text-xs text-ink-600">{p.role}</p>
                  <p className="text-[11px] text-ink-400">{p.email}</p>
                </div>
              ))}
              {contacts.length === 0 && <p className="text-xs text-ink-400">No contacts on file.</p>}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold text-ink-900">Feature adoption <span className="font-normal text-ink-400">({adopted.size}/{FEATURES.length})</span></h4>
            <div className="flex flex-wrap gap-1.5">
              {FEATURES.map((f) => {
                const on = adopted.has(f)
                return (
                  <span key={f} className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset', on ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-50 text-ink-400 ring-slate-300')}>
                    {on && <Check className="h-3 w-3" />}{f}
                  </span>
                )
              })}
            </div>
          </section>
        </div>

        {/* Recommended plays */}
        {openTasks.length > 0 && (
          <section>
            <h4 className="mb-2 text-sm font-semibold text-ink-900">Open plays &amp; tasks</h4>
            <div className="space-y-1.5">
              {openTasks.map((t) => {
                const play = playById(t.play)
                return (
                  <div key={t.id} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <GatedButton cap="customer.manage" showLock={false} disabled={!can('customer.manage')}
                      onClick={() => { toggleTask(t.id); logAction({ action: 'success.task.toggle', target: t.id, category: 'customer' }) }}
                      className="mt-0.5 flex h-4 w-4 items-center justify-center rounded border border-slate-300 hover:bg-slate-50" aria-label="Complete task"><span className="sr-only">Complete</span></GatedButton>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink-800">{t.title}</p>
                      <p className="text-[11px] text-ink-400">{play ? `${play.title} · ` : ''}due {t.due}{t.owner ? ` · ${t.owner}` : ''}</p>
                    </div>
                    <Badge tone={t.priority === 'Urgent' ? 'red' : t.priority === 'High' ? 'orange' : 'slate'}>{t.priority}</Badge>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Open tickets */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Open tickets <span className="font-normal text-ink-400">({openTickets.length})</span></h4>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {openTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-xs last:border-0">
                <span className="min-w-0"><span className="font-mono font-semibold text-ink-700">{t.id}</span> <span className="text-ink-600">{t.subject}</span></span>
                <Badge tone={t.priority === 'Urgent' ? 'red' : t.priority === 'High' ? 'orange' : 'slate'}>{t.priority}</Badge>
              </div>
            ))}
            {openTickets.length === 0 && <p className="p-3 text-center text-xs text-ink-400">No open tickets.</p>}
          </div>
        </section>

        {/* Activity timeline + add note */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Activity timeline</h4>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select value={noteType} onChange={(e) => setNoteType(e.target.value as ActivityType)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-ink-700">
              {(['note', 'call', 'email', 'milestone'] as ActivityType[]).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && logNote()}
              placeholder={can('customer.manage') ? 'Log a note, call, or milestone…' : 'Requires customer.manage'} disabled={!can('customer.manage')}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm placeholder:text-ink-400 disabled:bg-slate-50" />
            <GatedButton cap="customer.manage" showLock={false} disabled={!can('customer.manage') || !note.trim()} onClick={logNote} className="btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />Add
            </GatedButton>
          </div>
          <ol className="relative space-y-3 border-l border-slate-200 pl-4">
            {acts.map((a) => (
              <li key={a.id} className="relative">
                <span className={clsx('absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white',
                  activityTone[a.type] === 'green' ? 'bg-emerald-500' : activityTone[a.type] === 'red' ? 'bg-rose-500' : activityTone[a.type] === 'yellow' ? 'bg-amber-500' : activityTone[a.type] === 'purple' ? 'bg-violet-500' : activityTone[a.type] === 'blue' ? 'bg-blue-500' : 'bg-slate-400')} />
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-ink-700">{a.summary}</p>
                  <Badge tone={activityTone[a.type]}>{a.type}</Badge>
                </div>
                <p className="text-[11px] text-ink-400">{a.at} · {a.by}</p>
              </li>
            ))}
            {acts.length === 0 && <li className="text-xs text-ink-400">No activity logged yet.</li>}
          </ol>
        </section>
      </div>
    </Modal>
  )
}
