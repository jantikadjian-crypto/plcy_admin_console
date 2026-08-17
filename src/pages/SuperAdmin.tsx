import { useState } from 'react'
import {
  Building2,
  Server,
  Activity,
  Globe,
  Trash2,
  KeyRound,
  Power,
  AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
  Progress,
} from '@/components/ui'
import { totals, fmtCompact, fmtMoney } from '@/data/mock'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const platformGrowth = [
  { month: 'Dec', customers: 4, mrr: 68000 },
  { month: 'Jan', customers: 5, mrr: 79000 },
  { month: 'Feb', customers: 6, mrr: 96000 },
  { month: 'Mar', customers: 7, mrr: 108000 },
  { month: 'Apr', customers: 8, mrr: 121000 },
  { month: 'May', customers: 9, mrr: 149000 },
  { month: 'Jun', customers: 10, mrr: 172000 },
  { month: 'Jul', customers: 10, mrr: 189000 },
]

const requestsByRegion = [
  { region: 'US-East', requests: 4200000 },
  { region: 'US-West', requests: 2900000 },
  { region: 'EU-Central', requests: 2100000 },
  { region: 'EU-West', requests: 1200000 },
  { region: 'APAC', requests: 1650000 },
]

interface Service {
  name: string
  status: string
  latency: string
  uptime: string
}

const services: Service[] = [
  { name: 'API Gateway', status: 'Operational', latency: '38 ms', uptime: '99.99%' },
  { name: 'Policy Engine', status: 'Operational', latency: '52 ms', uptime: '99.98%' },
  { name: 'Model Gateway', status: 'Degraded', latency: '410 ms', uptime: '99.71%' },
  { name: 'Data Pipeline', status: 'Operational', latency: '120 ms', uptime: '99.95%' },
  { name: 'Billing', status: 'Operational', latency: '64 ms', uptime: '99.97%' },
  { name: 'Notifications', status: 'Operational', latency: '88 ms', uptime: '99.96%' },
]

interface Flag {
  name: string
  description: string
  rollout: number
  tone: 'green' | 'blue' | 'orange' | 'purple'
}

const initialFlags: Flag[] = [
  { name: 'streaming_evaluate', description: 'Stream policy verdicts over SSE', rollout: 100, tone: 'green' },
  { name: 'eu_ai_act_pack', description: 'EU AI Act conformity pack (beta)', rollout: 35, tone: 'orange' },
  { name: 'model_gateway_v2', description: 'Next-gen model routing layer', rollout: 60, tone: 'blue' },
  { name: 'shadow_ai_scanner', description: 'Auto-detect unapproved models', rollout: 15, tone: 'purple' },
]

export default function SuperAdmin() {
  const [flagOn, setFlagOn] = useState<Record<string, boolean>>({
    streaming_evaluate: true,
    eu_ai_act_pack: true,
    model_gateway_v2: true,
    shadow_ai_scanner: false,
  })
  const [maintenance, setMaintenance] = useState(false)

  const globalRequests = requestsByRegion.reduce((s, r) => s + r.requests, 0)

  return (
    <>
      <PageHeader
        title="Super Admin"
        description="Platform-wide operations and controls for the PLCY internal team"
        actions={
          <button className="btn-secondary">
            <Activity className="h-4 w-4" />
            Status page
          </button>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={totals.customers} icon={Building2} tone="blue" footer={`${totals.activeCustomers} active`} />
        <StatCard label="Total instances" value={totals.instances} icon={Server} tone="purple" footer={`${totals.healthyInstances} healthy`} />
        <StatCard label="Platform uptime" value="99.98%" icon={Activity} tone="green" footer="Trailing 30 days" />
        <StatCard label="Global requests" value={`${fmtCompact(globalRequests)}/day`} icon={Globe} tone="orange" footer="All regions" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="Platform Growth" subtitle="Customers and MRR over the last 8 months" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={platformGrowth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3366ff" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3366ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => (n === 'MRR' ? fmtMoney(v) : v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Area yAxisId="right" type="monotone" dataKey="mrr" name="MRR" stroke="#3366ff" strokeWidth={2.5} fill="url(#mrrFill)" />
                <Area yAxisId="left" type="monotone" dataKey="customers" name="Customers" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle title="Requests by Region" subtitle="Daily evaluation volume across regions" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={requestsByRegion} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtCompact(v)} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => fmtCompact(v)} />
                <Bar dataKey="requests" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Services health + Feature flags */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="System Services" subtitle="Live health of core platform services" />
          <ul className="divide-y divide-slate-100">
            {services.map((s) => (
              <li key={s.name} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{s.name}</p>
                  <p className="text-xs text-ink-500">{s.latency} · {s.uptime} uptime</p>
                </div>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle title="Feature Flags" subtitle="Platform-wide rollout controls" />
          <Table columns={['Flag', 'Rollout', '']} noun="flags">
            {initialFlags.map((f) => (
              <Tr key={f.name}>
                <Td>
                  <span className="font-mono text-xs font-medium text-ink-900">{f.name}</span>
                  <p className="mt-0.5 text-xs text-ink-500">{f.description}</p>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-20">
                      <Progress value={f.rollout} tone={f.tone} />
                    </div>
                    <span className="text-xs font-medium text-ink-700">{f.rollout}%</span>
                  </div>
                </Td>
                <Td className="text-right">
                  <button
                    onClick={() => setFlagOn((p) => ({ ...p, [f.name]: !p[f.name] }))}
                    aria-label={`Toggle ${f.name}`}
                    className={`inline-flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${
                      flagOn[f.name] ? 'justify-end bg-brand-600' : 'justify-start bg-slate-200'
                    }`}
                  >
                    <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                  </button>
                </Td>
              </Tr>
            ))}
          </Table>
        </Card>
      </div>

      {/* Danger zone */}
      <Card className="mt-6 border-rose-200 bg-rose-50/40">
        <CardTitle
          title={
            <span className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </span>
          }
          subtitle="Irreversible and high-impact platform operations"
        />
        <div className="divide-y divide-rose-100">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Power className="h-4 w-4 text-rose-500" />
              <div>
                <p className="text-sm font-semibold text-ink-900">Maintenance mode</p>
                <p className="text-xs text-ink-500">
                  {maintenance ? 'Platform is serving a maintenance banner to all tenants.' : 'Take the platform offline for scheduled work.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMaintenance((v) => !v)}
              aria-label="Toggle maintenance mode"
              className={`inline-flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${
                maintenance ? 'justify-end bg-rose-500' : 'justify-start bg-slate-200'
              }`}
            >
              <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Trash2 className="h-4 w-4 text-rose-500" />
              <div>
                <p className="text-sm font-semibold text-ink-900">Purge edge cache</p>
                <p className="text-xs text-ink-500">Invalidate all CDN and policy caches globally.</p>
              </div>
            </div>
            <button className="btn-secondary border-rose-200 text-rose-600 hover:bg-rose-50">Purge cache</button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <KeyRound className="h-4 w-4 text-rose-500" />
              <div>
                <p className="text-sm font-semibold text-ink-900">Rotate platform keys</p>
                <p className="text-xs text-ink-500">Regenerate root signing keys. Invalidates all sessions.</p>
              </div>
            </div>
            <button className="btn-secondary border-rose-200 text-rose-600 hover:bg-rose-50">Rotate keys</button>
          </div>
        </div>
      </Card>
    </>
  )
}
