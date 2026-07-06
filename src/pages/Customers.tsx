import { Search, Filter, Plus, Eye, MoreHorizontal, Users, UserCheck, DollarSign, ShieldCheck } from 'lucide-react'
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
} from '@/components/ui'
import { customers, totals, fmtMoney } from '@/data/mock'
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
const mrrByPlan = planOrder.map((plan) => ({
  plan,
  mrr: customers.filter((c) => c.plan === plan).reduce((s, c) => s + c.mrr, 0),
  count: customers.filter((c) => c.plan === plan).length,
}))

export default function Customers() {
  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage every organization governed by the PLCY platform"
        actions={
          <>
            <button className="btn-secondary">
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button className="btn-primary">
              <Plus className="h-4 w-4" />
              Add customer
            </button>
          </>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={totals.customers} icon={Users} tone="blue" footer="Across all plans" />
        <StatCard label="Active" value={totals.activeCustomers} icon={UserCheck} tone="green" footer={`${totals.customers - totals.activeCustomers} inactive`} />
        <StatCard label="Platform MRR" value={fmtMoney(totals.mrr)} icon={DollarSign} tone="purple" footer="Recurring monthly" />
        <StatCard label="Avg compliance" value={`${totals.avgCompliance}%`} icon={ShieldCheck} tone="orange" footer="Fleet-wide score" />
      </div>

      {/* Search / filter bar */}
      <Card className="mt-6" padded={false}>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9" placeholder="Search customers by name, domain, or CSM…" />
          </div>
          <button className="btn-secondary">
            <Filter className="h-4 w-4" />
            Filter
          </button>
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
        <CardTitle title="All Customers" subtitle={`${customers.length} organizations`} />
        <Table columns={['Customer', 'Plan', 'Status', 'Seats', 'Instances', 'MRR', 'Compliance', 'CSM', '']}>
          {customers.map((c) => (
            <Tr key={c.id}>
              <Td>
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{c.name}</p>
                    <p className="text-xs text-ink-500">{c.domain}</p>
                  </div>
                </div>
              </Td>
              <Td>
                <Badge tone={planTone[c.plan]}>{c.plan}</Badge>
              </Td>
              <Td>
                <StatusBadge status={c.status} />
              </Td>
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
                  <button className="btn-ghost px-2" aria-label="View customer">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="btn-ghost px-2" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
