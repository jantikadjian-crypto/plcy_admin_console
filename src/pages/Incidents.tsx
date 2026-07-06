import { AlertOctagon, Search, CheckCircle2, Timer, Plus } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Card, CardTitle, StatCard, PageHeader, Badge, Table, Tr, Td, StatusBadge } from '@/components/ui'
import { incidents } from '@/data/mock'
import type { Incident } from '@/data/mock'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const severityTone: Record<Incident['severity'], 'red' | 'orange' | 'yellow' | 'slate'> = {
  Critical: 'red',
  High: 'orange',
  Medium: 'yellow',
  Low: 'slate',
}

const severityColor: Record<Incident['severity'], string> = {
  Critical: '#ef4444',
  High: '#f59e0b',
  Medium: '#3366ff',
  Low: '#94a3b8',
}

const severityOrder: Incident['severity'][] = ['Critical', 'High', 'Medium', 'Low']

const severityData = severityOrder.map((sev) => ({
  severity: sev,
  count: incidents.filter((i) => i.severity === sev).length,
}))

const severityFilters = ['All severities', 'Critical', 'High', 'Medium', 'Low']
const statusFilters = ['All statuses', 'Open', 'Investigating', 'Resolved']

interface TimelineEvent {
  time: string
  title: string
  detail: string
  tone: string
}

const timeline: TimelineEvent[] = [
  { time: '14:41', title: 'INC-2041 escalated to Critical', detail: 'PII detected in 1,204 completion log lines · Northwind Retail', tone: 'bg-rose-500' },
  { time: '14:22', title: 'INC-2041 opened', detail: 'Automated PII scanner tripped on redaction bypass', tone: 'bg-orange-500' },
  { time: '11:58', title: 'INC-2039 assigned to Security', detail: 'Prompt injection bypass reproduced on helix-staging', tone: 'bg-blue-500' },
  { time: '10:15', title: 'INC-2030 resolved', detail: 'Policy pack sync restored after autoscale event', tone: 'bg-emerald-500' },
  { time: '09:10', title: 'INC-2039 opened', detail: 'Jailbreak payload passed guardrail on staging build', tone: 'bg-orange-500' },
  { time: '08:30', title: 'INC-2028 mitigated', detail: 'Fairness threshold retuned for Pinecrest loan model', tone: 'bg-emerald-500' },
]

export default function Incidents() {
  const open = incidents.filter((i) => i.status === 'Open').length
  const investigating = incidents.filter((i) => i.status === 'Investigating').length
  const resolved = incidents.filter((i) => i.status === 'Resolved').length

  return (
    <>
      <PageHeader
        title="Incident Management"
        description="Track and resolve governance, safety, and reliability incidents"
        actions={
          <button className="btn-primary">
            <Plus className="h-4 w-4" />
            Declare incident
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open" value={open} icon={AlertOctagon} tone="red" footer="unassigned or new" />
        <StatCard label="Investigating" value={investigating} icon={Search} tone="orange" footer="active response" />
        <StatCard label="Resolved" value={resolved} icon={CheckCircle2} tone="green" footer="last 7 days" />
        <StatCard label="MTTR" value="3.2h" icon={Timer} tone="blue" footer="↓ 18% vs last month" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {severityFilters.map((f, i) => (
          <button
            key={f}
            className={i === 0 ? 'btn-secondary' : 'btn-ghost'}
          >
            {f}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        {statusFilters.map((f, i) => (
          <button
            key={f}
            className={i === 0 ? 'btn-secondary' : 'btn-ghost'}
          >
            {f}
          </button>
        ))}
      </div>

      <Card className="mt-6">
        <CardTitle title="Incidents by Severity" subtitle="Current distribution across all customers" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="severity" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={80}>
                {severityData.map((d) => (
                  <Cell key={d.severity} fill={severityColor[d.severity]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mt-6">
        <CardTitle title="All Incidents" subtitle="Sorted by most recently opened" />
        <Table columns={['ID', 'Title', 'Customer', 'Severity', 'Status', 'Owner', 'Opened', 'Category']}>
          {incidents.map((inc) => (
            <Tr key={inc.id}>
              <Td className="font-mono text-xs text-ink-700">{inc.id}</Td>
              <Td className="font-medium text-ink-900">{inc.title}</Td>
              <Td>{inc.customer}</Td>
              <Td>
                <Badge tone={severityTone[inc.severity]} dot>
                  {inc.severity}
                </Badge>
              </Td>
              <Td>
                <StatusBadge status={inc.status} />
              </Td>
              <Td>{inc.owner}</Td>
              <Td className="text-ink-500">{inc.opened}</Td>
              <Td>{inc.category}</Td>
            </Tr>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <CardTitle title="Activity Timeline" subtitle="Recent incident events" />
        <ol className="relative ml-2 border-l border-slate-200">
          {timeline.map((ev, i) => (
            <li key={i} className="mb-5 ml-5 last:mb-0">
              <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-4 ring-white ${ev.tone}`} />
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-900">{ev.title}</p>
                <span className="shrink-0 text-xs text-ink-400">{ev.time}</span>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">{ev.detail}</p>
            </li>
          ))}
        </ol>
      </Card>
    </>
  )
}
