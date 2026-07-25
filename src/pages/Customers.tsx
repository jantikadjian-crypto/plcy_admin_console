import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateIntent } from '@/hooks/useCreateIntent'
import { Search, Plus, Eye, Users, UserCheck, DollarSign, ShieldCheck, MoreVertical, FileBarChart, Settings2, Building2, ExternalLink, X, Server, AlertOctagon, Gauge } from 'lucide-react'
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
import {
  Card,
  CardTitle,
  PageHeader,
  StatCard,
  Badge,
  StatusBadge,
  Table,
  Tr,
  Td,
  Progress,
  Avatar,
  Modal,
  EmptyState,
} from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useCustomers } from '@/context/Customers'
import { useCustomerScope } from '@/context/CustomerScope'
import { useDeploymentConfig } from '@/context/DeploymentConfig'
import { fmtMoney, instances, incidents } from '@/data/mock'
import type { Customer } from '@/data/mock'
import { slaByCustomer } from '@/data/sla'

const AWS_FROM_REGION: Record<string, string> = {
  'US-East': 'us-east-1', 'US-West': 'us-west-2', 'EU-Central': 'eu-central-1', 'EU-West': 'eu-west-1', APAC: 'ap-southeast-1',
}
const slaTone: Record<string, 'green' | 'orange' | 'red'> = { Meeting: 'green', 'At risk': 'orange', Breached: 'red' }

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const planTone: Record<Customer['plan'], 'purple' | 'blue' | 'green' | 'slate'> = {
  Enterprise: 'purple',
  Business: 'blue',
  Growth: 'green',
  Trial: 'slate',
}

const planColors: Record<string, string> = {
  Enterprise: '#8b5cf6',
  Business: '#3366ff',
  Growth: '#10b981',
  Trial: '#94a3b8',
}

function complianceTone(score: number): 'green' | 'blue' | 'orange' | 'red' {
  if (score >= 90) return 'green'
  if (score >= 80) return 'blue'
  if (score >= 70) return 'orange'
  return 'red'
}

const planOrder: Customer['plan'][] = ['Enterprise', 'Business', 'Growth', 'Trial']

export default function Customers() {
  const { logAction } = useSession()
  const navigate = useNavigate()
  const { list: rows, add } = useCustomers()
  const { setScope } = useCustomerScope()
  const [query, setQuery] = useState('')
  const [plan, setPlan] = useState<'All' | Customer['plan']>('All')
  const [adding, setAdding] = useState(false)
  const [peek, setPeek] = useState<Customer | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  useCreateIntent(() => setAdding(true))
  const openCustomer = (c: Customer) => navigate(`/customers/${c.id}`)
  const openReport = (c: Customer) => navigate(`/reports/customer/${c.id}`)
  const editConfig = (c: Customer) => navigate(`/customers/${c.id}`, { state: { tab: 'deployment', openConfig: true } })
  const setCurrent = (c: Customer) => { setScope(c.name); logAction({ action: 'customer.set-scope', target: c.name, category: 'customer' }) }

  const q = query.trim().toLowerCase()
  const filtered = rows.filter((c) => {
    const matchesQuery = !q || [c.name, c.domain, c.csm, c.region].some((f) => f.toLowerCase().includes(q))
    const matchesPlan = plan === 'All' || c.plan === plan
    return matchesQuery && matchesPlan
  })

  // Live aggregates derived from current rows.
  const totalCust = rows.length
  const activeCust = rows.filter((c) => c.status === 'Active').length
  const mrrSum = rows.reduce((s, c) => s + c.mrr, 0)
  const avgComp = Math.round(rows.reduce((s, c) => s + c.complianceScore, 0) / (rows.length || 1))
  const mrrByPlan = planOrder.map((p) => ({
    plan: p,
    mrr: rows.filter((c) => c.plan === p).reduce((s, c) => s + c.mrr, 0),
    count: rows.filter((c) => c.plan === p).length,
  }))

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage every organization governed by the PLCY platform"
        actions={
          <GatedButton cap="customer.manage" className="btn-primary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add customer
          </GatedButton>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={totalCust} icon={Users} tone="blue" footer="Across all plans" />
        <StatCard label="Active" value={activeCust} icon={UserCheck} tone="green" footer={`${totalCust - activeCust} inactive`} />
        <StatCard label="Platform MRR" value={fmtMoney(mrrSum)} icon={DollarSign} tone="purple" footer="Recurring monthly" />
        <StatCard label="Avg compliance" value={`${avgComp}%`} icon={ShieldCheck} tone="orange" footer="Fleet-wide score" />
      </div>

      {/* Search / filter bar */}
      <Card className="mt-6" padded={false}>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              placeholder="Search customers by name, domain, CSM, or region…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="input w-auto" value={plan} onChange={(e) => setPlan(e.target.value as 'All' | Customer['plan'])} aria-label="Filter by plan">
            <option value="All">All plans</option>
            {planOrder.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Chart */}
      <Card className="mt-6">
        <CardTitle title="MRR by Plan" subtitle="Monthly recurring revenue distribution across plan tiers" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mrrByPlan} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="plan" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => fmtMoney(v)} />
              <Bar dataKey="mrr" radius={[6, 6, 0, 0]} maxBarSize={80}>
                {mrrByPlan.map((d) => (
                  <Cell key={d.plan} fill={planColors[d.plan]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Table */}
      <Card className="mt-6">
        <CardTitle
          title="All Customers"
          subtitle={`${filtered.length} of ${rows.length} organizations`}
        />
        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="No customers match" description="Try a different search term or plan filter." />
        ) : (
          <Table columns={['Customer', 'Plan', 'Status', 'Seats', 'Instances', 'MRR', 'Compliance', 'CSM', '']} noun="customers">
            {filtered.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <button className="flex items-center gap-3 text-left" onClick={() => openCustomer(c)}>
                    <Avatar name={c.name} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900 hover:text-brand-600">{c.name}</p>
                      <p className="text-xs text-ink-500">{c.domain}</p>
                    </div>
                  </button>
                </Td>
                <Td><Badge tone={planTone[c.plan]}>{c.plan}</Badge></Td>
                <Td><StatusBadge status={c.status} /></Td>
                <Td>{c.seats}</Td>
                <Td>{c.instances}</Td>
                <Td className="font-medium text-ink-900">{fmtMoney(c.mrr)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-20">
                      <Progress value={c.complianceScore} tone={complianceTone(c.complianceScore)} />
                    </div>
                    <span className="text-xs font-medium text-ink-700">{c.complianceScore}%</span>
                  </div>
                </Td>
                <Td>{c.csm}</Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="btn-ghost px-2" aria-label={`Quick view ${c.name}`} title="Quick view" onClick={() => setPeek(c)}>
                      <Eye className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      <button
                        className="btn-ghost px-2"
                        aria-label={`Actions for ${c.name}`}
                        aria-haspopup="menu"
                        onClick={() => setMenuFor((m) => (m === c.id ? null : c.id))}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuFor === c.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setMenuFor(null)} />
                          <div className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-cardhover">
                            <RowMenuItem icon={ExternalLink} label="Open profile" onClick={() => { setMenuFor(null); openCustomer(c) }} />
                            <RowMenuItem icon={Eye} label="Quick view" onClick={() => { setMenuFor(null); setPeek(c) }} />
                            <RowMenuItem icon={FileBarChart} label="Generate report" onClick={() => { setMenuFor(null); openReport(c) }} />
                            <RowMenuItem icon={Settings2} label="Edit configuration" onClick={() => { setMenuFor(null); editConfig(c) }} />
                            <RowMenuItem icon={Building2} label="Set as current customer" onClick={() => { setMenuFor(null); setCurrent(c) }} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <AddCustomerModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreate={(c) => {
          logAction({ action: 'customer.create', target: c.name, category: 'customer' })
          add(c)
          setAdding(false)
          setQuery('')
          setPlan('All')
          navigate(`/customers/${c.id}`)
        }}
      />

      {peek && (
        <CustomerPeek
          c={peek}
          onClose={() => setPeek(null)}
          onOpen={() => { const c = peek; setPeek(null); openCustomer(c) }}
          onReport={() => { const c = peek; setPeek(null); openReport(c) }}
          onEditConfig={() => { const c = peek; setPeek(null); editConfig(c) }}
          onSetCurrent={() => { setCurrent(peek); setPeek(null) }}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Row actions menu item                                               */
/* ------------------------------------------------------------------ */
function RowMenuItem({ icon: Icon, label, onClick }: { icon: typeof Eye; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-800 transition-colors hover:bg-slate-100"
    >
      <Icon className="h-4 w-4 shrink-0 text-ink-500" />
      {label}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Customer peek panel — quick stats + actions without leaving the list*/
/* ------------------------------------------------------------------ */
function CustomerPeek({
  c,
  onClose,
  onOpen,
  onReport,
  onEditConfig,
  onSetCurrent,
}: {
  c: Customer
  onClose: () => void
  onOpen: () => void
  onReport: () => void
  onEditConfig: () => void
  onSetCurrent: () => void
}) {
  const { getConfig } = useDeploymentConfig()
  const config = getConfig(c.name, AWS_FROM_REGION[c.region] ?? 'us-east-1')
  const sla = slaByCustomer(c.name)
  const custInstances = instances.filter((i) => i.customer === c.name)
  const up = custInstances.filter((i) => i.uptime > 0)
  const avgUptime = up.length ? up.reduce((s, i) => s + i.uptime, 0) / up.length : 0
  const openIncidents = incidents.filter((i) => i.customer === c.name && i.status !== 'Resolved').length

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <Avatar name={c.name} className="h-12 w-12 text-base" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-ink-900">{c.name}</h2>
                <Badge tone={planTone[c.plan]}>{c.plan}</Badge>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-0.5 text-xs text-ink-500">{c.domain} · {c.region} · CSM {c.csm}</p>
            </div>
          </div>
          <button className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-slate-100 hover:text-ink-800" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3">
            <PeekStat icon={DollarSign} label="MRR" value={fmtMoney(c.mrr)} />
            <PeekStat icon={ShieldCheck} label="Compliance" value={`${c.complianceScore}%`} tone={complianceTone(c.complianceScore) === 'red' ? 'text-rose-600' : undefined} />
            <PeekStat icon={Gauge} label="Uptime MTD" value={avgUptime ? `${avgUptime.toFixed(2)}%` : '—'} />
            <PeekStat icon={Server} label="Instances" value={String(custInstances.length)} />
            <PeekStat icon={ShieldCheck} label="SLA" value={sla ? sla.status : '—'} tone={sla ? (slaTone[sla.status] === 'red' ? 'text-rose-600' : slaTone[sla.status] === 'orange' ? 'text-orange-600' : undefined) : undefined} />
            <PeekStat icon={AlertOctagon} label="Open incidents" value={String(openIncidents)} tone={openIncidents ? 'text-rose-600' : undefined} />
          </div>

          {/* Config summary */}
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Deployment configuration</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-ink-500">AWS region</dt><dd className="font-mono font-semibold text-ink-900">{config.regionCode}</dd></div>
              <div><dt className="text-xs text-ink-500">Connectivity</dt><dd className="font-semibold text-ink-900">{config.connectivity}</dd></div>
              <div><dt className="text-xs text-ink-500">Nodes</dt><dd className="font-semibold text-ink-900">{config.nodes} ({config.gpuNodes} GPU)</dd></div>
              <div><dt className="text-xs text-ink-500">Memory</dt><dd className="font-semibold text-ink-900">{config.memoryGb} GB</dd></div>
            </dl>
          </div>
        </div>

        {/* Action bar */}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
          <button className="btn-secondary" onClick={onReport}><FileBarChart className="h-4 w-4" />Generate report</button>
          <button className="btn-secondary" onClick={onEditConfig}><Settings2 className="h-4 w-4" />Edit configuration</button>
          <button className="btn-secondary" onClick={onSetCurrent}><Building2 className="h-4 w-4" />Set as current</button>
          <button className="btn-primary" onClick={onOpen}><ExternalLink className="h-4 w-4" />Open profile</button>
        </div>
      </aside>
    </>
  )
}

function PeekStat({ icon: Icon, label, value, tone }: { icon: typeof Eye; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <Icon className="h-4 w-4 text-ink-400" />
      <p className={`mt-1.5 text-lg font-bold ${tone ?? 'text-ink-900'}`}>{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Add customer form                                                   */
/* ------------------------------------------------------------------ */
const CSMS = ['Dana Cole', 'Marcus Ihde', 'Priya Nair']
const REGIONS = ['US-East', 'US-West', 'EU-Central', 'EU-West', 'APAC']

function AddCustomerModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (c: Customer) => void }) {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [customerPlan, setCustomerPlan] = useState<Customer['plan']>('Business')
  const [status, setStatus] = useState<Customer['status']>('Active')
  const [seats, setSeats] = useState(25)
  const [mrr, setMrr] = useState(5000)
  const [region, setRegion] = useState(REGIONS[0])
  const [csm, setCsm] = useState(CSMS[0])

  const reset = () => {
    setName(''); setDomain(''); setCustomerPlan('Business'); setStatus('Active')
    setSeats(25); setMrr(5000); setRegion(REGIONS[0]); setCsm(CSMS[0])
  }

  const submit = () => {
    if (!name.trim()) return
    const now = new Date()
    const since = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    onCreate({
      id: `cus_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20)}`,
      name: name.trim(),
      domain: domain.trim() || `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
      plan: customerPlan,
      status,
      seats,
      instances: 0,
      models: 0,
      mrr: status === 'Trial' ? 0 : mrr,
      complianceScore: 70,
      region,
      csm,
      since,
    })
    reset()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add customer"
      subtitle="Onboard a new organization to the PLCY platform"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!name.trim()}>Create customer</button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CustField label="Organization name" className="sm:col-span-2">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aurora Systems" />
        </CustField>
        <CustField label="Domain">
          <input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="aurora.com" />
        </CustField>
        <CustField label="Plan">
          <select className="input" value={customerPlan} onChange={(e) => setCustomerPlan(e.target.value as Customer['plan'])}>
            {planOrder.map((p) => <option key={p}>{p}</option>)}
          </select>
        </CustField>
        <CustField label="Status">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Customer['status'])}>
            {(['Active', 'Trial', 'Suspended', 'Churned'] as Customer['status'][]).map((s) => <option key={s}>{s}</option>)}
          </select>
        </CustField>
        <CustField label="Seats">
          <input type="number" min={1} className="input" value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
        </CustField>
        <CustField label="MRR (USD)">
          <input type="number" min={0} step={500} className="input" value={mrr} onChange={(e) => setMrr(Number(e.target.value))} disabled={status === 'Trial'} />
        </CustField>
        <CustField label="Region">
          <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </CustField>
        <CustField label="Assigned CSM" className="sm:col-span-2">
          <select className="input" value={csm} onChange={(e) => setCsm(e.target.value)}>
            {CSMS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </CustField>
      </div>
    </Modal>
  )
}

function CustField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  )
}

