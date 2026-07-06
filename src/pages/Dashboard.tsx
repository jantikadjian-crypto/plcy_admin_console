import {
  Bot,
  ShieldCheck,
  AlertOctagon,
  TrendingUp,
  Users,
  Server,
  ArrowUpRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import { Card, CardTitle, StatCard, PageHeader } from '@/components/ui'
import {
  usageTrend,
  riskDistribution,
  complianceScores,
  recentActivity,
  totals,
  fmtCompact,
  fmtMoney,
} from '@/data/mock'

const activityTone: Record<string, string> = {
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  red: 'bg-rose-500',
  orange: 'bg-orange-500',
  purple: 'bg-violet-500',
}

export default function Dashboard() {
  return (
    <>
      <PageHeader
        title="AI Governance Dashboard"
        description="Monitor and manage AI systems across every PLCY customer"
        actions={
          <button className="btn-primary">
            <TrendingUp className="h-4 w-4" />
            Generate report
          </button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Models"
          value={totals.models}
          icon={Bot}
          tone="blue"
          footer={
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <ArrowUpRight className="h-3.5 w-3.5" /> +3 this month
            </span>
          }
        />
        <StatCard
          label="Avg. Compliance"
          value={`${totals.avgCompliance}%`}
          icon={ShieldCheck}
          tone="green"
          footer={<span className="text-emerald-600">✓ Excellent</span>}
        />
        <StatCard
          label="Open Incidents"
          value={totals.openIncidents}
          icon={AlertOctagon}
          tone="orange"
          footer={<span className="text-orange-600">⚠ Requires attention</span>}
        />
        <StatCard
          label="Daily Requests"
          value={fmtCompact(totals.dailyRequests)}
          icon={TrendingUp}
          tone="purple"
          footer={<span>{fmtCompact(totals.dailyTokens)} tokens</span>}
        />
      </div>

      {/* Secondary stat row */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={totals.customers} icon={Users} tone="slate" footer={`${totals.activeCustomers} active`} />
        <StatCard label="Instances" value={totals.instances} icon={Server} tone="slate" footer={`${totals.healthyInstances} healthy`} />
        <StatCard label="Policy Packs" value={totals.policyPacks} icon={ShieldCheck} tone="slate" footer="Published & enforced" />
        <StatCard label="Platform MRR" value={fmtMoney(totals.mrr)} icon={TrendingUp} tone="slate" footer="Across all plans" />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Usage trend */}
        <Card>
          <CardTitle title="Model Usage Trend" subtitle="API requests and tokens over the last 7 days" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Line yAxisId="left" type="monotone" dataKey="requests" name="API Requests" stroke="#3366ff" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line yAxisId="right" type="monotone" dataKey="tokens" name="Tokens Used" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Risk distribution */}
        <Card>
          <CardTitle title="Risk Distribution" subtitle="Model risk classification across the fleet" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={95} paddingAngle={2} stroke="none">
                  {riskDistribution.map((r) => (
                    <Cell key={r.name} fill={r.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Compliance scores */}
      <Card className="mt-6">
        <CardTitle title="Compliance Policy Scores" subtitle="Aggregate scores by governance domain" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={complianceScores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="score" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={90} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent activity */}
      <Card className="mt-6">
        <CardTitle title="Recent Activity" subtitle="Latest platform events" />
        <ul className="divide-y divide-slate-100">
          {recentActivity.map((a, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${activityTone[a.tone]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{a.title}</p>
                <p className="truncate text-xs text-ink-500">{a.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-ink-400">{a.time}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}
