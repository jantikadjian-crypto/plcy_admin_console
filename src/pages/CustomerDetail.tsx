import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Server,
  Bot,
  Gauge,
  Receipt,
  ShieldCheck,
  Activity,
  DollarSign,
  Users,
  Cpu,
  Boxes,
  Globe,
  ArrowLeftRight,
  Inbox,
  Fingerprint,
  AlertOctagon,
  Building2,
  CheckCircle2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Card,
  CardTitle,
  StatCard,
  Badge,
  StatusBadge,
  Table,
  Tr,
  Td,
  Progress,
  Avatar,
  EmptyState,
} from '@/components/ui'
import { useSession } from '@/context/Session'
import { useCustomerScope } from '@/context/CustomerScope'
import { customers, instances, models, incidents, fmtMoney, fmtCompact, fmtNum } from '@/data/mock'
import type { Customer } from '@/data/mock'
import { deploymentByCustomer } from '@/data/fleet'
import { slaByCustomer, maintenanceWindows } from '@/data/sla'
import { billingByCustomer, invoices } from '@/data/billing'
import { transfers, dsarRequests, accessRequests } from '@/data/privacy'

const planTone: Record<Customer['plan'], 'purple' | 'blue' | 'green' | 'slate'> = {
  Enterprise: 'purple',
  Business: 'blue',
  Growth: 'green',
  Trial: 'slate',
}

const sevTone: Record<string, 'red' | 'orange' | 'yellow' | 'slate'> = {
  Critical: 'red',
  High: 'orange',
  Medium: 'yellow',
  Low: 'slate',
}

const invoiceTone: Record<string, 'green' | 'blue' | 'red' | 'slate'> = {
  Paid: 'green',
  Open: 'blue',
  'Past due': 'red',
  Draft: 'slate',
}

const slaStatusTone: Record<string, 'green' | 'orange' | 'red'> = {
  Meeting: 'green',
  'At risk': 'orange',
  Breached: 'red',
}

const windowStatusTone: Record<string, 'blue' | 'orange' | 'green' | 'slate'> = {
  Scheduled: 'blue',
  'In progress': 'orange',
  Completed: 'green',
  Cancelled: 'slate',
}

const compTextTone = (n: number) =>
  n >= 90 ? 'text-emerald-600' : n >= 80 ? 'text-blue-600' : n >= 70 ? 'text-orange-600' : 'text-rose-600'
const compBarTone = (n: number): 'green' | 'blue' | 'orange' | 'red' =>
  n >= 90 ? 'green' : n >= 80 ? 'blue' : n >= 70 ? 'orange' : 'red'

const money = (n: number) => `$${n.toLocaleString()}`
function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1)}K`
  return `${n}`
}

type Tab = 'overview' | 'deployment' | 'models' | 'sla' | 'billing' | 'compliance' | 'activity'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { audit } = useSession()
  const { setScope } = useCustomerScope()
  const [tab, setTab] = useState<Tab>('overview')

  const customer = customers.find((c) => c.id === id)

  if (!customer) {
    return (
      <Card>
        <EmptyState
          icon={Building2}
          title="Customer not found"
          description="This organization is not in the PLCY platform."
        />
        <div className="mt-4 flex justify-center">
          <Link to="/customers" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to customers
          </Link>
        </div>
      </Card>
    )
  }

  const c = customer
  const name = c.name
  const dep = deploymentByCustomer(name)
  const custInstances = instances.filter((i) => i.customer === name)
  const custModels = models.filter((m) => m.customer === name)
  const sla = slaByCustomer(name)
  const windows = maintenanceWindows.filter((w) => w.customer === name || w.customer === 'All')
  const billing = billingByCustomer(name)
  const custInvoices = invoices.filter((i) => i.customer === name)
  const custIncidents = incidents.filter((i) => i.customer === name)
  const custTransfers = transfers.filter((t) => t.customer === name)
  const custDsar = dsarRequests.filter((d) => d.customer === name)
  const custAccess = accessRequests.filter((a) => a.customer === name)
  const custAudit = audit.filter((a) => a.target.toLowerCase().includes(name.toLowerCase()))

  const upInstances = custInstances.filter((i) => i.uptime > 0)
  const avgUptime = upInstances.length ? upInstances.reduce((s, i) => s + i.uptime, 0) / upInstances.length : 0
  const openIncidents = custIncidents.filter((i) => i.status !== 'Resolved').length
  const openDsar = custDsar.filter((d) => d.status !== 'Completed').length

  const tabs: { key: Tab; label: string; icon: LucideIcon; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: Gauge },
    { key: 'deployment', label: 'Deployment', icon: Server, count: custInstances.length },
    { key: 'models', label: 'Models', icon: Bot, count: custModels.length },
    { key: 'sla', label: 'SLA & Uptime', icon: ShieldCheck },
    { key: 'billing', label: 'Billing', icon: Receipt, count: custInvoices.length },
    { key: 'compliance', label: 'Compliance', icon: Globe, count: custTransfers.length + custDsar.length },
    { key: 'activity', label: 'Activity', icon: Activity, count: custIncidents.length },
  ]

  return (
    <>
      {/* Breadcrumb + header */}
      <Link to="/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" />
        Customers
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name} className="h-14 w-14 text-base" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink-900">{name}</h1>
              <Badge tone={planTone[c.plan]}>{c.plan}</Badge>
              <StatusBadge status={c.status} />
            </div>
            <p className="mt-1 text-sm text-ink-500">
              {c.domain} · {c.region} · CSM {c.csm} · since {c.since}
            </p>
          </div>
        </div>
        <button className="btn-secondary self-start" onClick={() => { setScope(name); navigate('/instances') }}>
          <Building2 className="h-4 w-4" />
          Set as current customer
        </button>
      </div>

      {/* Stat row */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR" value={fmtMoney(c.mrr)} icon={DollarSign} tone="blue" footer={`${c.plan} plan`} />
        <StatCard label="Seats" value={fmtNum(c.seats)} icon={Users} tone="purple" footer="Licensed" />
        <StatCard label="Compliance" value={`${c.complianceScore}%`} icon={ShieldCheck} tone={compBarTone(c.complianceScore) === 'red' ? 'red' : 'green'} footer="Posture score" />
        <StatCard label="Uptime (MTD)" value={avgUptime ? `${avgUptime.toFixed(2)}%` : '—'} icon={Gauge} tone="orange" footer={sla ? `${sla.tier} SLA` : 'No SLA'} />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                active ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-ink-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        {/* -------------------- Overview -------------------- */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardTitle title="Deployment" subtitle="Single-tenant environment" />
              {dep ? (
                <dl className="grid grid-cols-2 gap-4">
                  <Fact label="Version" value={dep.version === dep.target ? dep.version : `${dep.version} → ${dep.target}`} />
                  <Fact label="Rollout" value={<StatusBadge status={dep.status} />} />
                  <Fact label="Connectivity" value={<Badge tone={dep.connectivity === 'Air-gapped' ? 'purple' : 'blue'}>{dep.connectivity}</Badge>} />
                  <Fact label="Sovereignty" value={dep.sovereignty} />
                  <Fact label="Region" value={dep.regionCode} />
                  <Fact label="Nodes" value={`${dep.nodes} (${dep.gpuNodes} GPU)`} />
                </dl>
              ) : (
                <p className="text-sm text-ink-400">No deployment on record.</p>
              )}
            </Card>

            <Card>
              <CardTitle title="Service level" subtitle="Commitments & health" />
              {sla ? (
                <dl className="grid grid-cols-2 gap-4">
                  <Fact label="Tier" value={sla.tier} />
                  <Fact label="Status" value={<Badge tone={slaStatusTone[sla.status]} dot>{sla.status}</Badge>} />
                  <Fact label="Uptime target" value={`${sla.uptimeTarget}%`} />
                  <Fact label="Uptime MTD" value={<span className={compTextTone(sla.status === 'Breached' ? 60 : 95)}>{sla.uptimeMtd}%</span>} />
                  <Fact label="Breaches (MTD)" value={String(sla.breachesMtd)} />
                  <Fact label="Credits owed" value={sla.creditsOwed > 0 ? money(sla.creditsOwed) : '—'} />
                </dl>
              ) : (
                <p className="text-sm text-ink-400">No SLA on record.</p>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <CardTitle title="At a glance" subtitle="Governed footprint & open items" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MiniStat icon={Server} label="Instances" value={custInstances.length} />
                <MiniStat icon={Bot} label="Models" value={custModels.length} />
                <MiniStat icon={AlertOctagon} label="Open incidents" value={openIncidents} tone={openIncidents ? 'text-rose-600' : undefined} />
                <MiniStat icon={Inbox} label="Open DSARs" value={openDsar} tone={openDsar ? 'text-orange-600' : undefined} />
              </div>
            </Card>
          </div>
        )}

        {/* -------------------- Deployment -------------------- */}
        {tab === 'deployment' && (
          <div className="space-y-6">
            {dep && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Cluster nodes" value={dep.nodes} icon={Cpu} tone="blue" footer={`${dep.gpuNodes} GPU · K8s ${dep.k8sVersion}`} />
                <StatCard label="Pods healthy" value={`${dep.podsHealthy}/${dep.podsTotal}`} icon={Boxes} tone="green" footer="Running" />
                <StatCard label="CPU / Mem" value={`${dep.cpuPct}% / ${dep.memPct}%`} icon={Activity} tone="orange" footer="Utilization" />
                <StatCard label="License" value={dep.license.plan} icon={ShieldCheck} tone="purple" footer={`${dep.license.seatsUsed}/${dep.license.seats} seats · ${dep.license.status}`} />
              </div>
            )}
            <Card>
              <CardTitle title="Instances" subtitle="Deployed environments" />
              {custInstances.length === 0 ? (
                <EmptyState icon={Server} title="No instances" description="This customer has no deployed environments." />
              ) : (
                <Table columns={['Instance', 'Environment', 'Region', 'Version', 'Uptime', 'RPS', 'Status']}>
                  {custInstances.map((i) => (
                    <Tr key={i.id}>
                      <Td className="font-mono text-xs text-ink-900">{i.name}</Td>
                      <Td className="text-ink-700">{i.environment}</Td>
                      <Td className="font-mono text-xs text-ink-600">{i.region}</Td>
                      <Td className="font-mono text-xs text-ink-600">{i.version}</Td>
                      <Td className="text-ink-700">{i.uptime > 0 ? `${i.uptime}%` : '—'}</Td>
                      <Td className="text-ink-700">{fmtNum(i.rps)}</Td>
                      <Td><StatusBadge status={i.status} /></Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* -------------------- Models -------------------- */}
        {tab === 'models' && (
          <Card>
            <CardTitle title="Governed Models" subtitle="AI models under PLCY policy enforcement" />
            {custModels.length === 0 ? (
              <EmptyState icon={Bot} title="No models" description="This customer has no models under governance." />
            ) : (
              <Table columns={['Model', 'Provider', 'Type', 'Requests', 'Risk', 'Status']}>
                {custModels.map((m) => (
                  <Tr key={m.id}>
                    <Td className="font-semibold text-ink-900">{m.name}</Td>
                    <Td className="text-ink-700">{m.provider}</Td>
                    <Td className="text-ink-700">{m.type}</Td>
                    <Td className="text-ink-700">{fmtCompact(m.requests)}</Td>
                    <Td><Badge tone={m.risk === 'High' ? 'red' : m.risk === 'Medium' ? 'orange' : 'green'}>{m.risk}</Badge></Td>
                    <Td><StatusBadge status={m.status} /></Td>
                  </Tr>
                ))}
              </Table>
            )}
          </Card>
        )}

        {/* -------------------- SLA -------------------- */}
        {tab === 'sla' && (
          <div className="space-y-6">
            {sla ? (
              <Card>
                <CardTitle title="SLA Attainment" subtitle={`${sla.tier} tier`} action={<Badge tone={slaStatusTone[sla.status]} dot>{sla.status}</Badge>} />
                <div className="mb-4">
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink-700">Uptime, month-to-date</span>
                    <span className="font-mono">
                      <span className="font-bold text-ink-900">{sla.uptimeMtd}%</span>
                      <span className="mx-1.5 text-ink-400">/ target</span>
                      <span className="text-ink-600">{sla.uptimeTarget}%</span>
                    </span>
                  </div>
                  <Progress value={Math.min(100, Math.max(0, ((sla.uptimeMtd - (sla.uptimeTarget - 0.5)) / 0.5) * 100))} tone={slaStatusTone[sla.status]} />
                </div>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Fact label="Response" value={sla.responseTarget} />
                  <Fact label="Restore" value={sla.restoreTarget} />
                  <Fact label="Breaches (MTD)" value={String(sla.breachesMtd)} />
                  <Fact label="Credits owed" value={sla.creditsOwed > 0 ? <span className="text-rose-600">{money(sla.creditsOwed)}</span> : '—'} />
                </dl>
              </Card>
            ) : (
              <Card><EmptyState icon={ShieldCheck} title="No SLA" description="This customer has no service-level agreement on record." /></Card>
            )}

            <Card>
              <CardTitle title="Maintenance Windows" subtitle="Planned changes affecting this customer" />
              {windows.length === 0 ? (
                <EmptyState icon={Gauge} title="None scheduled" description="No upcoming maintenance." />
              ) : (
                <Table columns={['Window', 'When', 'Type', 'Impact', 'Notified', 'Status']}>
                  {windows.map((w) => (
                    <Tr key={w.id}>
                      <Td>
                        <div className="font-semibold text-ink-900">{w.title}</div>
                        {w.customer === 'All' && <Badge tone="blue">Fleet-wide</Badge>}
                      </Td>
                      <Td className="whitespace-nowrap font-mono text-xs text-ink-600">{w.start}</Td>
                      <Td><Badge tone="slate">{w.type}</Badge></Td>
                      <Td className="text-ink-700">{w.impact}</Td>
                      <Td>{w.notified ? <Badge tone="green" dot>Yes</Badge> : <Badge tone="slate">No</Badge>}</Td>
                      <Td><Badge tone={windowStatusTone[w.status]} dot>{w.status}</Badge></Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* -------------------- Billing -------------------- */}
        {tab === 'billing' && (
          <div className="space-y-6">
            {billing && (
              <Card>
                <CardTitle title="Usage this cycle" subtitle="Metered consumption against plan-included volumes" action={billing.overage > 0 ? <Badge tone="orange">+{money(billing.overage)} overage</Badge> : undefined} />
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  {billing.meters.map((m) => {
                    const pct = (m.used / m.included) * 100
                    return (
                      <div key={m.label}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-ink-700">{m.label}</span>
                          <span className="whitespace-nowrap font-mono text-xs text-ink-500">
                            {m.unit === '' ? compact(m.used) : `${m.used.toLocaleString()} ${m.unit}`}
                            <span className="mx-1 text-ink-400">/</span>
                            {m.unit === '' ? compact(m.included) : `${m.included.toLocaleString()} ${m.unit}`}
                          </span>
                        </div>
                        <Progress value={pct} tone={pct >= 100 ? 'red' : pct >= 85 ? 'orange' : 'blue'} />
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
            <Card>
              <CardTitle title="Invoices" subtitle="Billing history" />
              {custInvoices.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices" description="No billing activity for this customer." />
              ) : (
                <Table columns={['Invoice', 'Period', 'Amount', 'Status', 'Due']}>
                  {custInvoices.map((inv) => (
                    <Tr key={inv.id}>
                      <Td className="font-mono text-xs text-ink-700">{inv.id}</Td>
                      <Td className="text-ink-700">{inv.period}</Td>
                      <Td className="font-medium text-ink-900">{money(inv.amount)}</Td>
                      <Td><Badge tone={invoiceTone[inv.status]} dot>{inv.status}</Badge></Td>
                      <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{inv.due}</Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* -------------------- Compliance -------------------- */}
        {tab === 'compliance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardTitle title="Posture" subtitle="Compliance & data residency" />
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs font-medium text-ink-500">Compliance score</p>
                    <p className={`text-4xl font-bold tabular-nums ${compTextTone(c.complianceScore)}`}>{c.complianceScore}%</p>
                  </div>
                  <div className="flex-1">
                    <Progress value={c.complianceScore} tone={compBarTone(c.complianceScore)} />
                  </div>
                </div>
                {dep && (
                  <dl className="mt-5 grid grid-cols-2 gap-4">
                    <Fact label="Sovereignty" value={dep.sovereignty} />
                    <Fact label="Connectivity" value={<Badge tone={dep.connectivity === 'Air-gapped' ? 'purple' : 'blue'}>{dep.connectivity}</Badge>} />
                    <Fact label="Data residency" value={dep.regionCode} />
                    <Fact label="Region" value={c.region} />
                  </dl>
                )}
              </Card>
              <Card>
                <CardTitle title="Privileged Access" subtitle="Engineer access to this tenant" />
                {custAccess.length === 0 ? (
                  <EmptyState icon={Fingerprint} title="No access requests" description="No privileged access recorded." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {custAccess.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-900">{a.engineer}</p>
                          <p className="truncate text-xs text-ink-500">{a.scope} · {a.reason}</p>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card>
              <CardTitle title="Data Transfers" subtitle="Cross-border transfer register" />
              {custTransfers.length === 0 ? (
                <EmptyState icon={ArrowLeftRight} title="No transfers" description="No cross-border data transfers on record." />
              ) : (
                <Table columns={['ID', 'From', 'To', 'Data', 'Mechanism', 'Status']}>
                  {custTransfers.map((t) => (
                    <Tr key={t.id}>
                      <Td className="font-mono text-xs text-ink-700">{t.id}</Td>
                      <Td className="font-mono text-xs text-ink-600">{t.from}</Td>
                      <Td className="font-mono text-xs text-ink-600">{t.to}</Td>
                      <Td className="text-ink-700">{t.dataCategory}</Td>
                      <Td className="text-ink-700">{t.mechanism}</Td>
                      <Td><StatusBadge status={t.status} /></Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>

            <Card>
              <CardTitle title="Data-Subject Requests" subtitle="DSARs for this customer" />
              {custDsar.length === 0 ? (
                <EmptyState icon={Inbox} title="No DSARs" description="No data-subject requests on record." />
              ) : (
                <Table columns={['ID', 'Type', 'Law', 'Received', 'Due', 'Status']}>
                  {custDsar.map((d) => (
                    <Tr key={d.id}>
                      <Td className="font-mono text-xs text-ink-700">{d.id}</Td>
                      <Td className="text-ink-700">{d.type}</Td>
                      <Td className="text-ink-700">{d.law}</Td>
                      <Td className="font-mono text-xs text-ink-500">{d.received}</Td>
                      <Td className="font-mono text-xs text-ink-500">{d.due}</Td>
                      <Td><StatusBadge status={d.status} /></Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* -------------------- Activity -------------------- */}
        {tab === 'activity' && (
          <div className="space-y-6">
            <Card>
              <CardTitle title="Incidents" subtitle="Governance & reliability events" />
              {custIncidents.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No incidents" description="No incidents recorded for this customer." />
              ) : (
                <Table columns={['ID', 'Title', 'Severity', 'Category', 'Opened', 'Status']}>
                  {custIncidents.map((i) => (
                    <Tr key={i.id}>
                      <Td className="font-mono text-xs text-ink-700">{i.id}</Td>
                      <Td className="font-medium text-ink-900">{i.title}</Td>
                      <Td><Badge tone={sevTone[i.severity]}>{i.severity}</Badge></Td>
                      <Td className="text-ink-700">{i.category}</Td>
                      <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{i.opened}</Td>
                      <Td><StatusBadge status={i.status} /></Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>

            <Card>
              <CardTitle title="Audit Trail" subtitle="Recent actions referencing this customer" />
              {custAudit.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-400">No audit entries reference this customer yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {custAudit.slice(0, 12).map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.result === 'Denied' ? 'bg-rose-500' : 'bg-brand-500'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink-800"><span className="font-medium">{a.action}</span> · {a.target}</p>
                        <p className="text-xs text-ink-400">{a.actor} · {a.time}</p>
                      </div>
                      <Badge tone={a.result === 'Denied' ? 'red' : 'green'}>{a.result}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink-900">{value}</dd>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <Icon className="h-5 w-5 text-ink-400" />
      <p className={`mt-2 text-2xl font-bold ${tone ?? 'text-ink-900'}`}>{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  )
}
