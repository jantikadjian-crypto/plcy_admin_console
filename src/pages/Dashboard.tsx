import { Link, useNavigate } from 'react-router-dom'
import {
  Bot,
  ShieldCheck,
  AlertOctagon,
  TrendingUp,
  Users,
  Server,
  Gauge,
  Receipt,
  GitBranch,
  ShieldAlert,
  Ban,
  Boxes,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
import { Card, CardTitle, StatCard, PageHeader, Badge } from '@/components/ui'
import {
  usageTrend,
  riskDistribution,
  complianceScores,
  totals,
  incidents,
  fmtCompact,
  fmtMoney,
} from '@/data/mock'
import { slaTargets, slaTotals } from '@/data/sla'
import { billingTotals, customerBilling } from '@/data/billing'
import { deployments } from '@/data/fleet'
import { clusterTotals, terraformFor, imageDriftForDeployment } from '@/data/clusters'
import { registryImages, currentTagOf } from '@/data/registry'
import { useRegistryPromoted } from '@/data/registryStore'
import { policyTotals } from '@/data/policy'

/* ------------------------------------------------------------------ */
/* Live command-center signals                                          */
/* ------------------------------------------------------------------ */
type Sev = 'critical' | 'high' | 'medium'
const sevRank: Record<Sev, number> = { critical: 0, high: 1, medium: 2 }
const sevTone: Record<Sev, 'red' | 'orange' | 'yellow'> = { critical: 'red', high: 'orange', medium: 'yellow' }

interface Signal {
  key: string
  label: string
  value: string
  icon: LucideIcon
  tone: 'red' | 'orange' | 'yellow' | 'blue' | 'green' | 'purple'
  footer: string
  to: string
}
interface AttentionItem {
  sev: Sev
  title: string
  detail: string
  to: string
}

const drift = clusterTotals(deployments)
const criticalImages = registryImages.filter((i) => currentTagOf(i).criticalCves > 0)
const quarantined = registryImages.filter((i) => i.quarantined)
const openIncidents = incidents.filter((i) => i.status !== 'Resolved')
const pastDueCustomers = customerBilling.filter((b) => b.status === 'Past due')

const baseSignals: Signal[] = [
  { key: 'sla', label: 'SLA breaches', value: String(slaTotals.breached), icon: Gauge, tone: slaTotals.breached ? 'red' : 'green', footer: `${slaTotals.atRisk} at risk`, to: '/sla' },
  { key: 'billing', label: 'Past due', value: fmtMoney(billingTotals.pastDue), icon: Receipt, tone: billingTotals.pastDue ? 'red' : 'green', footer: `${billingTotals.pastDueCount} invoices`, to: '/billing' },
  { key: 'drift', label: 'Terraform drift', value: String(drift.drifted), icon: GitBranch, tone: drift.drifted ? 'orange' : 'green', footer: 'Clusters out of sync', to: '/fleet-posture' },
  { key: 'cve', label: 'Critical CVEs', value: String(criticalImages.length), icon: ShieldAlert, tone: criticalImages.length ? 'red' : 'green', footer: 'Images on current tag', to: '/registry' },
  { key: 'incidents', label: 'Open incidents', value: String(openIncidents.length), icon: AlertOctagon, tone: openIncidents.length ? 'orange' : 'green', footer: 'Across the fleet', to: '/incidents' },
  { key: 'quarantine', label: 'Quarantined', value: String(quarantined.length), icon: Ban, tone: quarantined.length ? 'orange' : 'green', footer: 'Images blocked', to: '/registry' },
]

const baseAttention: AttentionItem[] = [
  ...slaTargets
    .filter((s) => s.status !== 'Meeting')
    .map<AttentionItem>((s) => ({
      sev: s.status === 'Breached' ? 'critical' : 'high',
      title: `${s.customer} — SLA ${s.status.toLowerCase()}`,
      detail: `${s.uptimeMtd}% vs ${s.uptimeTarget}% target${s.creditsOwed ? ` · ${fmtMoney(s.creditsOwed)} credits` : ''}`,
      to: '/sla',
    })),
  ...pastDueCustomers.map<AttentionItem>((b) => ({
    sev: 'high',
    title: `${b.customer} — billing past due`,
    detail: `${b.plan} · next invoice ${b.nextInvoice}`,
    to: '/billing',
  })),
  ...deployments
    .filter((d) => terraformFor(d).drift === 'Drift detected')
    .map<AttentionItem>((d) => ({
      sev: 'medium',
      title: `${d.customer} — Terraform drift`,
      detail: `${terraformFor(d).driftedResources} resources differ · plan pending`,
      to: `/clusters/${d.id}`,
    })),
  ...criticalImages.map<AttentionItem>((i) => ({
    sev: 'critical',
    title: `${i.name} — critical CVE`,
    detail: `on ${i.currentTag} · re-scan or quarantine`,
    to: '/registry',
  })),
  ...openIncidents.map<AttentionItem>((i) => ({
    sev: i.severity === 'Critical' ? 'critical' : i.severity === 'High' ? 'high' : 'medium',
    title: i.title,
    detail: `${i.customer} · ${i.severity} · ${i.status}`,
    to: '/incidents',
  })),
]

const toneBox: Record<Signal['tone'], string> = {
  red: 'bg-rose-50 text-rose-600',
  orange: 'bg-orange-50 text-orange-600',
  yellow: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-violet-50 text-violet-600',
}

function SignalCard({ s }: { s: Signal }) {
  const Icon = s.icon
  return (
    <Link to={s.to} className="card card-pad group block transition-shadow hover:shadow-cardhover">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-ink-500">{s.label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneBox[s.tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink-900">{s.value}</p>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-500">{s.footer}</span>
        <ChevronRight className="h-4 w-4 text-ink-300 transition-colors group-hover:text-brand-500" />
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const promoted = useRegistryPromoted()
  // Clusters running an image tag behind what's been promoted in the registry.
  const imageDriftItems: AttentionItem[] = deployments
    .map((d) => ({ d, r: imageDriftForDeployment(d, promoted) }))
    .filter(({ r }) => !r.offline && r.behind > 0)
    .map(({ d, r }) => ({
      sev: 'medium' as Sev,
      title: `${d.customer} — image drift`,
      detail: `${r.behind} workload${r.behind === 1 ? '' : 's'} behind promoted tag`,
      to: `/clusters/${d.id}`,
    }))
  const attention = [...baseAttention, ...imageDriftItems].sort((a, b) => sevRank[a.sev] - sevRank[b.sev])

  const clustersBehind = imageDriftItems.length
  const signals: Signal[] = [
    ...baseSignals,
    {
      key: 'imgdrift',
      label: 'Image drift',
      value: String(clustersBehind),
      icon: Boxes,
      tone: clustersBehind ? 'orange' : 'green',
      footer: 'Clusters behind promoted',
      to: '/registry',
    },
  ]

  return (
    <>
      <PageHeader
        title="AI Governance Dashboard"
        description="Live posture across every PLCY customer, cluster, and control"
        actions={
          <button className="btn-primary" onClick={() => navigate('/reports/posture')}>
            <TrendingUp className="h-4 w-4" />
            Generate report
          </button>
        }
      />

      {/* Command-center signals */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {signals.map((s) => (
          <SignalCard key={s.key} s={s} />
        ))}
      </div>

      {/* Needs attention + fleet snapshot */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle title="Needs Attention" subtitle="Prioritized across SLA, billing, security, and infrastructure" />
          {attention.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">All clear — nothing needs attention.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {attention.slice(0, 9).map((a, i) => (
                <li key={i}>
                  <Link to={a.to} className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50">
                    <Badge tone={sevTone[a.sev]} dot>{a.sev}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{a.title}</p>
                      <p className="truncate text-xs text-ink-500">{a.detail}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-300 transition-colors group-hover:text-brand-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle title="Fleet Snapshot" subtitle="Estate at a glance" />
          <div className="grid grid-cols-2 gap-4">
            <Mini label="Customers" value={String(totals.customers)} sub={`${totals.activeCustomers} active`} />
            <Mini label="Instances" value={String(totals.instances)} sub={`${totals.healthyInstances} healthy`} />
            <Mini label="Models" value={String(totals.models)} sub="Governed" />
            <Mini label="Policy packs" value={String(policyTotals.packs)} sub={`${policyTotals.controls} controls`} />
            <Mini label="Avg compliance" value={`${totals.avgCompliance}%`} sub="Fleet score" />
            <Mini label="MRR" value={fmtMoney(totals.mrr)} sub="Recurring" />
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
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
    </>
  )
}

function Mini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-ink-900">{value}</p>
      <p className="text-[11px] text-ink-400">{sub}</p>
    </div>
  )
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}
