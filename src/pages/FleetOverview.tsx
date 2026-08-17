import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  ServerCog,
  ArrowUpCircle,
  CloudOff,
  DatabaseBackup,
  ShieldAlert,
  Fingerprint,
  Inbox,
  ArrowLeftRight,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardTitle, PageHeader, Badge, Table, Tr, Td } from '@/components/ui'
import {
  deployments,
  versionDistribution,
  fleetTotals,
  regionByCode,
  LATEST_STABLE,
} from '@/data/fleet'
import { accessRequests, dsarRequests, transfers, privacyTotals } from '@/data/privacy'
import { provisions, backups, images, opsTotals } from '@/data/ops'

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)', fontSize: 12 }

type Sev = 'critical' | 'high' | 'medium'
interface Alert {
  severity: Sev
  category: string
  title: string
  detail: string
  to: string
}
const sevRank: Record<Sev, number> = { critical: 0, high: 1, medium: 2 }
const sevTone: Record<Sev, 'red' | 'orange' | 'yellow'> = { critical: 'red', high: 'orange', medium: 'yellow' }
const sevDot: Record<Sev, string> = { critical: 'bg-rose-500', high: 'bg-orange-500', medium: 'bg-amber-500' }

/* ------------------------------------------------------------------ */
/* Derive cross-fleet alerts                                           */
/* ------------------------------------------------------------------ */
function buildAlerts(): Alert[] {
  const a: Alert[] = []
  const rname = (code: string) => regionByCode(code)?.name ?? code

  deployments.forEach((d) => {
    if (d.status === 'Offline') a.push({ severity: 'critical', category: 'Cluster', title: `${d.customer} cluster offline`, detail: `Last seen ${d.lastSync} · ${rname(d.regionCode)}`, to: '/clusters' })
    else if (d.podsHealthy < d.podsTotal) a.push({ severity: 'high', category: 'Cluster', title: `${d.customer} degraded`, detail: `${d.podsHealthy}/${d.podsTotal} pods healthy`, to: '/clusters' })
    if (d.status === 'Update available') a.push({ severity: d.version.startsWith('v4.6') ? 'high' : 'medium', category: 'Release', title: `${d.customer} update available`, detail: `${d.version} → ${LATEST_STABLE}${d.connectivity === 'Air-gapped' ? ' (bundle)' : ''}`, to: '/releases' })
    if (d.license.status === 'Expired') a.push({ severity: 'high', category: 'License', title: `${d.customer} license expired`, detail: `Expired ${d.license.expiry}`, to: '/licensing' })
    else if (d.license.status === 'Expiring') a.push({ severity: 'medium', category: 'License', title: `${d.customer} license expiring`, detail: `Expires ${d.license.expiry}`, to: '/licensing' })
  })
  backups.forEach((b) => {
    if (b.status === 'Failed') a.push({ severity: 'critical', category: 'Backup', title: `${b.customer} backup failed`, detail: `Last backup ${b.lastBackup}`, to: '/backups' })
    else if (b.status === 'Warning') a.push({ severity: 'medium', category: 'Backup', title: `${b.customer} backup degraded`, detail: `DR test ${b.lastDrTest}`, to: '/backups' })
  })
  images.forEach((im) => {
    if (im.criticalCves > 0) a.push({ severity: 'critical', category: 'Supply chain', title: `${im.name} — ${im.criticalCves} critical CVE`, detail: im.patchStatus, to: '/supply-chain' })
  })
  accessRequests.forEach((r) => {
    if (r.status === 'Pending approval') a.push({ severity: r.scope === 'Break-glass root' ? 'critical' : 'high', category: 'Access', title: `${r.engineer} → ${r.customer}`, detail: `${r.scope} · awaiting approval`, to: '/privileged-access' })
  })
  dsarRequests.forEach((d) => {
    if (d.status === 'Overdue') a.push({ severity: 'high', category: 'DSAR', title: `${d.id} overdue`, detail: `${d.type} · ${d.customer}`, to: '/dsar' })
  })
  transfers.forEach((t) => {
    if (t.status === 'Blocked') a.push({ severity: 'high', category: 'Sovereignty', title: `Transfer blocked — ${t.customer}`, detail: `${t.from} → ${t.to} · ${t.dataCategory}`, to: '/transfers' })
  })
  provisions.forEach((p) => {
    if (p.status === 'Failed') a.push({ severity: 'high', category: 'Provisioning', title: `${p.customer} provisioning failed`, detail: `${p.template} · ${rname(p.regionCode)}`, to: '/provisioning' })
  })
  return a.sort((x, y) => sevRank[x.severity] - sevRank[y.severity])
}

/* ------------------------------------------------------------------ */
/* Tiles                                                               */
/* ------------------------------------------------------------------ */
function Tile({ to, icon: Icon, label, value, danger }: { to: string; icon: LucideIcon; label: string; value: number; danger: boolean }) {
  const tone = danger ? 'text-rose-600' : 'text-ink-900'
  const box = danger ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
  return (
    <Link to={to} className="card card-pad group transition-shadow hover:shadow-cardhover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ink-500">{label}</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${box}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* Chart data                                                          */
/* ------------------------------------------------------------------ */
const health = [
  { name: 'Healthy', value: deployments.filter((d) => d.status !== 'Offline' && d.podsHealthy === d.podsTotal).length, color: '#10b981' },
  { name: 'Degraded', value: deployments.filter((d) => d.status !== 'Offline' && d.podsHealthy < d.podsTotal).length, color: '#f59e0b' },
  { name: 'Offline', value: deployments.filter((d) => d.status === 'Offline').length, color: '#ef4444' },
]

const versionColor = (v: string) => (v.includes('rc') ? '#f59e0b' : v === LATEST_STABLE ? '#10b981' : v.startsWith('v4.6') ? '#ef4444' : '#3366ff')

/* ------------------------------------------------------------------ */
/* Per-client matrix                                                   */
/* ------------------------------------------------------------------ */
const backupOf = (c: string) => backups.find((b) => b.customer === c)
const versionCell = (s: string): 'green' | 'orange' | 'blue' | 'red' | 'slate' =>
  s === 'Up to date' ? 'green' : s === 'Update available' ? 'orange' : s === 'Rolling out' ? 'blue' : s === 'Offline' ? 'red' : 'slate'
const licenseCell = (s: string): 'green' | 'orange' | 'red' | 'purple' =>
  s === 'Active' ? 'green' : s === 'Expiring' ? 'orange' : s === 'Expired' ? 'red' : 'purple'

export default function FleetOverview() {
  const alerts = buildAlerts()
  const offline = deployments.filter((d) => d.status === 'Offline').length
  const updates = deployments.filter((d) => d.status === 'Update available').length

  return (
    <>
      <PageHeader
        title="Fleet Overview"
        description="Cross-fleet operational status — every single-tenant deployment at a glance"
        actions={
          <Link to="/releases" className="btn-primary">
            <ArrowUpCircle className="h-4 w-4" />
            Manage rollouts
          </Link>
        }
      />

      {/* Attention tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
        <Tile to="/clusters" icon={CloudOff} label="Clusters offline" value={offline} danger={offline > 0} />
        <Tile to="/releases" icon={ArrowUpCircle} label="Updates available" value={updates} danger={updates > 0} />
        <Tile to="/backups" icon={DatabaseBackup} label="Failed backups" value={opsTotals.backupsFailed} danger={opsTotals.backupsFailed > 0} />
        <Tile to="/supply-chain" icon={ShieldAlert} label="Critical CVEs" value={opsTotals.criticalCves} danger={opsTotals.criticalCves > 0} />
        <Tile to="/privileged-access" icon={Fingerprint} label="Access pending" value={privacyTotals.accessPending} danger={privacyTotals.accessPending > 0} />
        <Tile to="/dsar" icon={Inbox} label="DSAR overdue" value={privacyTotals.dsarOverdue} danger={privacyTotals.dsarOverdue > 0} />
        <Tile to="/transfers" icon={ArrowLeftRight} label="Transfers blocked" value={privacyTotals.transfersBlocked} danger={privacyTotals.transfersBlocked > 0} />
        <Tile to="/provisioning" icon={ServerCog} label="Provisioning" value={opsTotals.provisioning} danger={false} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Needs attention */}
        <Card className="lg:col-span-2">
          <CardTitle title="Needs Attention" subtitle={`${alerts.length} open item${alerts.length === 1 ? '' : 's'} across the fleet`} />
          <ul className="divide-y divide-slate-100">
            {alerts.slice(0, 10).map((al, i) => (
              <li key={i}>
                <Link to={al.to} className="group flex items-center gap-3 py-2.5 transition-colors hover:bg-slate-50">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${sevDot[al.severity]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{al.title}</p>
                    <p className="truncate text-xs text-ink-500">{al.detail}</p>
                  </div>
                  <Badge tone={sevTone[al.severity]}>{al.category}</Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-300 transition-colors group-hover:text-brand-500" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {/* Health + sovereignty */}
        <Card>
          <CardTitle title="Fleet Health" subtitle={`${fleetTotals.deployments} deployments`} />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={health} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={2} stroke="none">
                  {health.map((h) => (
                    <Cell key={h.name} fill={h.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
            <div>
              <p className="text-lg font-bold text-violet-600">{fleetTotals.sovereign}</p>
              <p className="text-[11px] text-ink-500">Sovereign</p>
            </div>
            <div>
              <p className="text-lg font-bold text-rose-600">{fleetTotals.airgapped}</p>
              <p className="text-[11px] text-ink-500">Air-gapped</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600">{fleetTotals.upToDate}</p>
              <p className="text-[11px] text-ink-500">Up to date</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Version distribution */}
      <Card className="mt-6">
        <CardTitle title="Version Distribution" subtitle="Deployments by platform version" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={versionDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="version" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(v: number) => `${v} deployments`} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {versionDistribution.map((d) => (
                  <Cell key={d.version} fill={versionColor(d.version)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Single-pane matrix */}
      <Card className="mt-6">
        <CardTitle title="Fleet Matrix" subtitle="One row per client — version, health, backup, license, sovereignty" />
        <Table columns={['Customer', 'Region', 'Version', 'Cluster', 'Backup', 'License', 'Sovereignty']} noun="customers">
          {deployments.map((d) => {
            const bak = backupOf(d.customer)
            const cluster = d.status === 'Offline' ? { t: 'red' as const, l: 'Offline' } : d.podsHealthy < d.podsTotal ? { t: 'orange' as const, l: 'Degraded' } : { t: 'green' as const, l: 'Healthy' }
            return (
              <Tr key={d.id}>
                <Td className="font-semibold text-ink-900">{d.customer}</Td>
                <Td className="font-mono text-xs text-ink-500">{d.regionCode}</Td>
                <Td>
                  <Badge tone={versionCell(d.status)} dot>{d.version}</Badge>
                </Td>
                <Td>
                  <Badge tone={cluster.t} dot>{cluster.l}</Badge>
                </Td>
                <Td>{bak ? <Badge tone={bak.status === 'Healthy' ? 'green' : bak.status === 'Warning' ? 'orange' : 'red'} dot>{bak.status}</Badge> : <span className="text-xs text-ink-400">—</span>}</Td>
                <Td>
                  <Badge tone={licenseCell(d.license.status)} dot>{d.license.status}</Badge>
                </Td>
                <Td>
                  <Badge tone={d.sovereignty === 'Air-gapped' ? 'red' : d.sovereignty === 'Sovereign Cloud' ? 'purple' : 'slate'}>{d.sovereignty}</Badge>
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>
    </>
  )
}
