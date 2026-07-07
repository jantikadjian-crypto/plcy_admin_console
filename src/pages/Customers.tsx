import { useState } from 'react'
import type { ReactNode } from 'react'
import { Search, Plus, Eye, Users, UserCheck, DollarSign, ShieldCheck, Server, Bot } from 'lucide-react'
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
import { customers, instances, models, fmtMoney, fmtCompact } from '@/data/mock'
import type { Customer } from '@/data/mock'

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
  const [rows, setRows] = useState<Customer[]>(customers)
  const [query, setQuery] = useState('')
  const [plan, setPlan] = useState<'All' | Customer['plan']>('All')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [adding, setAdding] = useState(false)

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
          <Table columns={['Customer', 'Plan', 'Status', 'Seats', 'Instances', 'MRR', 'Compliance', 'CSM', '']}>
            {filtered.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <button className="flex items-center gap-3 text-left" onClick={() => setSelected(c)}>
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
                  <button className="btn-ghost px-2" aria-label={`View ${c.name}`} onClick={() => setSelected(c)}>
                    <Eye className="h-4 w-4" />
                  </button>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {selected && <CustomerModal customer={selected} onClose={() => setSelected(null)} />}

      <AddCustomerModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreate={(c) => {
          logAction({ action: 'customer.create', target: c.name, category: 'customer' })
          setRows((prev) => [c, ...prev])
          setAdding(false)
          setQuery('')
          setPlan('All')
          setSelected(c)
        }}
      />
    </>
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

/* ------------------------------------------------------------------ */
/* Customer detail modal                                               */
/* ------------------------------------------------------------------ */
function CustomerModal({ customer: c, onClose }: { customer: Customer; onClose: () => void }) {
  const custInstances = instances.filter((i) => i.customer === c.name)
  const custModels = models.filter((m) => m.customer === c.name)

  const stats: { label: string; value: string }[] = [
    { label: 'Plan', value: c.plan },
    { label: 'MRR', value: fmtMoney(c.mrr) },
    { label: 'Seats', value: String(c.seats) },
    { label: 'Region', value: c.region },
    { label: 'CSM', value: c.csm },
    { label: 'Customer since', value: c.since },
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title={c.name}
      subtitle={c.domain}
      headerRight={<Badge tone={planTone[c.plan]}>{c.plan}</Badge>}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary">Open account</button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Avatar name={c.name} className="h-12 w-12 text-sm" />
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={c.status} />
              <span className="text-sm text-ink-500">{c.region}</span>
            </div>
            <p className="mt-1 text-sm text-ink-600">Managed by {c.csm}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs font-medium text-ink-500">Compliance</p>
            <p className={`text-2xl font-bold tabular-nums ${c.complianceScore >= 90 ? 'text-emerald-600' : c.complianceScore >= 80 ? 'text-blue-600' : c.complianceScore >= 70 ? 'text-orange-600' : 'text-rose-600'}`}>
              {c.complianceScore}%
            </p>
          </div>
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-medium text-ink-500">{s.label}</p>
              <p className="mt-0.5 font-semibold text-ink-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Instances */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Server className="h-4 w-4 text-ink-400" />
            <h4 className="text-sm font-semibold text-ink-900">Instances ({custInstances.length})</h4>
          </div>
          {custInstances.length === 0 ? (
            <p className="text-sm text-ink-400">No deployed instances.</p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {custInstances.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-ink-900">{i.name}</p>
                    <p className="text-xs text-ink-500">{i.environment} · {i.region} · {i.version}</p>
                  </div>
                  <StatusBadge status={i.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Models */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-ink-400" />
            <h4 className="text-sm font-semibold text-ink-900">Governed models ({custModels.length})</h4>
          </div>
          {custModels.length === 0 ? (
            <p className="text-sm text-ink-400">No models under governance.</p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {custModels.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">{m.name}</p>
                    <p className="text-xs text-ink-500">{m.provider} · {m.type} · {fmtCompact(m.requests)} req</p>
                  </div>
                  <Badge tone={m.risk === 'High' ? 'red' : m.risk === 'Medium' ? 'orange' : 'green'}>{m.risk} risk</Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}
