import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { Activity, Users, ShieldOff, Archive, Search, Eye, Download } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import {
  Card,
  CardTitle,
  PageHeader,
  StatCard,
  StatusBadge,
  Table,
  Tr,
  Td,
  Avatar,
  Modal,
  EmptyState,
} from '@/components/ui'
import { useSession } from '@/context/Session'
import type { AuditItem } from '@/context/Session'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const eventsByHour = [
  { hour: '00', events: 8 }, { hour: '02', events: 5 }, { hour: '04', events: 3 },
  { hour: '06', events: 11 }, { hour: '08', events: 34 }, { hour: '10', events: 52 },
  { hour: '12', events: 41 }, { hour: '14', events: 47 }, { hour: '16', events: 38 },
  { hour: '18', events: 22 }, { hour: '20', events: 14 }, { hour: '22', events: 9 },
]

const isSystemActor = (actor: string) => !actor.includes('@')

function exportAudit(entries: AuditItem[]) {
  const data = JSON.stringify(entries, null, 2)
  const href = `data:application/json;charset=utf-8,${encodeURIComponent(data)}`
  const a = document.createElement('a')
  a.href = href
  a.download = `plcy-audit-log-${entries.length}-events.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function AuditLog() {
  const { audit } = useSession()
  const [sel, setSel] = useState<AuditItem | null>(null)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('All')
  const [actor, setActor] = useState('All')
  const [res, setRes] = useState<'All' | 'Success' | 'Denied'>('All')

  const categories = useMemo(() => ['All', ...Array.from(new Set(audit.map((a) => a.category))).sort()], [audit])
  const actors = useMemo(() => ['All', ...Array.from(new Set(audit.map((a) => a.actor))).sort()], [audit])
  const q = query.trim().toLowerCase()
  const filtered = audit.filter((e) => {
    const matchesQ = !q || [e.actor, e.action, e.target, e.category].some((f) => f.toLowerCase().includes(q))
    const matchesCat = cat === 'All' || e.category === cat
    const matchesActor = actor === 'All' || e.actor === actor
    const matchesRes = res === 'All' || e.result === res
    return matchesQ && matchesCat && matchesActor && matchesRes
  })

  const distinctActors = new Set(audit.map((a) => a.actor)).size
  const deniedCount = audit.filter((a) => a.result === 'Denied').length

  // Activity by category, derived from the full trail.
  const byCategory = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of audit) counts.set(a.category, (counts.get(a.category) ?? 0) + 1)
    return Array.from(counts, ([category, events]) => ({ category, events })).sort((a, b) => b.events - a.events)
  }, [audit])

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Immutable record of every privileged action across the PLCY platform"
        actions={
          <button className="btn-secondary" onClick={() => exportAudit(filtered)}>
            <Download className="h-4 w-4" />
            Export log
          </button>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Events" value={audit.length} icon={Activity} tone="blue" footer="This session + seeded" />
        <StatCard label="Distinct actors" value={distinctActors} icon={Users} tone="purple" footer="Users & integrations" />
        <StatCard label="Denied actions" value={deniedCount} icon={ShieldOff} tone="red" footer="Blocked by policy" />
        <StatCard label="Retention" value="400d" icon={Archive} tone="slate" footer="SOC 2 aligned" />
      </div>

      {/* Filter row */}
      <Card className="mt-6" padded={false}>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                className="input pl-9"
                placeholder="Search by actor, action, target, or category…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select className="input sm:w-56" value={actor} onChange={(e) => setActor(e.target.value)}>
              {actors.map((a) => <option key={a} value={a}>{a === 'All' ? 'All actors' : a}</option>)}
            </select>
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              {(['All', 'Success', 'Denied'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRes(r)}
                  className={clsx('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', res === r ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800')}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((f) => (
              <button
                key={f}
                onClick={() => setCat(f)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
                  cat === f
                    ? 'bg-brand-50 text-brand-700 ring-brand-600/20'
                    : 'bg-slate-100 text-ink-700 ring-slate-500/10 hover:bg-slate-200/70',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Breakdown charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="Activity by Category" subtitle="Where privileged actions are happening" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="category" width={92} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => `${v} events`} />
                <Bar dataKey="events" fill="#3366ff" radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle title="Events by Hour" subtitle="Privileged action volume over the last 24 hours" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventsByHour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => `${v} events`} />
                <Bar dataKey="events" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="mt-6">
        <CardTitle title="Recent Events" subtitle={`${filtered.length} of ${audit.length} entries`} />
        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="No matching events" description="Adjust your search or category filter." />
        ) : (
          <Table columns={['Time', 'Actor', 'Action', 'Target', 'Category', 'Result', '']}>
            {filtered.map((e) => {
              const sys = isSystemActor(e.actor)
              return (
                <Tr key={e.id}>
                  <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{e.time}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={sys ? 'SY' : e.actor} className={sys ? 'bg-slate-100 text-slate-500' : undefined} />
                      <span className="text-sm text-ink-700">{e.actor}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-ink-700">{e.action}</span>
                  </Td>
                  <Td className="text-ink-700">{e.target}</Td>
                  <Td className="text-xs text-ink-500">{e.category}</Td>
                  <Td><StatusBadge status={e.result} /></Td>
                  <Td>
                    <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${e.action}`} onClick={() => setSel(e)}>
                      <Eye className="h-4 w-4" />
                    </button>
                  </Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </Card>

      {sel && <AuditModal entry={sel} onClose={() => setSel(null)} />}
    </>
  )
}

function AuditModal({ entry: e, onClose }: { entry: AuditItem; onClose: () => void }) {
  const sys = isSystemActor(e.actor)
  const facts: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Actor', value: e.actor },
    { label: 'Action', value: e.action, mono: true },
    { label: 'Target', value: e.target },
    { label: 'Category', value: e.category },
    { label: 'Source IP', value: e.ip ?? '—', mono: true },
    { label: 'Time', value: e.time, mono: true },
    { label: 'Result', value: e.result },
  ]
  const raw = {
    event_id: e.id,
    actor: e.actor,
    action: e.action,
    target: e.target,
    category: e.category,
    source_ip: e.ip ?? null,
    time: e.time,
    result: e.result,
    user_agent: sys ? 'plcy-internal/1.0' : 'PLCY-Console/4.8.2',
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={<span className="font-mono text-base">{e.action}</span>}
      subtitle={`${e.actor} · ${e.time}`}
      headerRight={<StatusBadge status={e.result} />}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Avatar name={sys ? 'SY' : e.actor} className={sys ? 'h-12 w-12 bg-slate-100 text-sm text-slate-500' : 'h-12 w-12 text-sm'} />
          <div>
            <p className="font-semibold text-ink-900">{e.actor}</p>
            <p className="text-sm text-ink-500">{e.target}</p>
          </div>
          <div className="ml-auto"><StatusBadge status={e.result} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-medium text-ink-500">{f.label}</p>
              <p className={`mt-0.5 font-semibold text-ink-900 ${f.mono ? 'font-mono text-sm' : ''}`}>{f.value}</p>
            </div>
          ))}
        </div>
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Raw event</h4>
          <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-[12px] text-slate-100">
{JSON.stringify(raw, null, 2)}
          </pre>
        </section>
      </div>
    </Modal>
  )
}
