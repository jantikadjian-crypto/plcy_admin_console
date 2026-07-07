import { useState } from 'react'
import { Activity, Users, ShieldOff, Archive, Search, Eye } from 'lucide-react'
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
} from '@/components/ui'
import { auditLog } from '@/data/mock'
import type { AuditEntry } from '@/data/mock'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const actionFilters = [
  'All actions',
  'policy_pack',
  'customer',
  'model',
  'user',
  'enforcement',
  'api.key',
]

const eventsByHour = [
  { hour: '00', events: 8 },
  { hour: '02', events: 5 },
  { hour: '04', events: 3 },
  { hour: '06', events: 11 },
  { hour: '08', events: 34 },
  { hour: '10', events: 52 },
  { hour: '12', events: 41 },
  { hour: '14', events: 47 },
  { hour: '16', events: 38 },
  { hour: '18', events: 22 },
  { hour: '20', events: 14 },
  { hour: '22', events: 9 },
]

const systemActors = ['system', 'external.integration']

const distinctActors = new Set(auditLog.map((a) => a.actor)).size
const deniedCount = auditLog.filter((a) => a.result === 'Denied').length
const eventsToday = eventsByHour.reduce((s, h) => s + h.events, 0)

export default function AuditLog() {
  const [sel, setSel] = useState<AuditEntry | null>(null)
  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Immutable record of every privileged action across the PLCY platform"
        actions={
          <button className="btn-secondary">
            <Archive className="h-4 w-4" />
            Export log
          </button>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Events today" value={eventsToday} icon={Activity} tone="blue" footer="Across all services" />
        <StatCard label="Distinct actors" value={distinctActors} icon={Users} tone="purple" footer="Users & integrations" />
        <StatCard label="Denied actions" value={deniedCount} icon={ShieldOff} tone="red" footer="Blocked by policy" />
        <StatCard label="Retention" value="400d" icon={Archive} tone="slate" footer="SOC 2 aligned" />
      </div>

      {/* Filter row */}
      <Card className="mt-6" padded={false}>
        <div className="flex flex-col gap-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9" placeholder="Search by actor, action, target, or IP…" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actionFilters.map((f, i) => (
              <button
                key={f}
                className={
                  i === 0
                    ? 'rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-600/20'
                    : 'rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-medium text-ink-700 ring-1 ring-inset ring-slate-500/10 hover:bg-slate-200/70'
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Events by hour */}
      <Card className="mt-6">
        <CardTitle title="Events by Hour" subtitle="Privileged action volume over the last 24 hours" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={eventsByHour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => `${v} events`} />
              <Bar dataKey="events" fill="#3366ff" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Table */}
      <Card className="mt-6">
        <CardTitle title="Recent Events" subtitle={`${auditLog.length} entries`} />
        <Table columns={['Time', 'Actor', 'Action', 'Target', 'IP', 'Result', '']}>
          {auditLog.map((e) => {
            const isSystem = systemActors.includes(e.actor)
            return (
              <Tr key={e.id}>
                <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{e.time}</Td>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={isSystem ? 'SY' : e.actor}
                      className={isSystem ? 'bg-slate-100 text-slate-500' : undefined}
                    />
                    <span className="text-sm text-ink-700">{e.actor}</span>
                  </div>
                </Td>
                <Td>
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-ink-700">
                    {e.action}
                  </span>
                </Td>
                <Td className="text-ink-700">{e.target}</Td>
                <Td className="font-mono text-xs text-ink-500">{e.ip}</Td>
                <Td>
                  <StatusBadge status={e.result} />
                </Td>
                <Td>
                  <button
                    className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600"
                    aria-label={`View ${e.action}`}
                    onClick={() => setSel(e)}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

      {sel && <AuditModal entry={sel} onClose={() => setSel(null)} />}
    </>
  )
}

function AuditModal({ entry: e, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const isSystem = systemActors.includes(e.actor)
  const facts: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Actor', value: e.actor },
    { label: 'Action', value: e.action, mono: true },
    { label: 'Target', value: e.target },
    { label: 'IP address', value: e.ip, mono: true },
    { label: 'Time', value: e.time, mono: true },
    { label: 'Result', value: e.result },
  ]

  const raw = {
    request_id: `req_${e.id}_${e.time.replace(/[^0-9]/g, '').slice(-8)}`,
    actor: e.actor,
    action: e.action,
    target: e.target,
    ip: e.ip,
    time: e.time,
    result: e.result,
    user_agent: isSystem ? 'plcy-internal/1.0' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) PLCY-Console/4.8.2',
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
          <Avatar
            name={isSystem ? 'SY' : e.actor}
            className={isSystem ? 'h-12 w-12 bg-slate-100 text-sm text-slate-500' : 'h-12 w-12 text-sm'}
          />
          <div>
            <p className="font-semibold text-ink-900">{e.actor}</p>
            <p className="text-sm text-ink-500">{e.target}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={e.result} />
          </div>
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-medium text-ink-500">{f.label}</p>
              <p className={`mt-0.5 font-semibold text-ink-900 ${f.mono ? 'font-mono text-sm' : ''}`}>{f.value}</p>
            </div>
          ))}
        </div>

        {/* Raw event */}
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
