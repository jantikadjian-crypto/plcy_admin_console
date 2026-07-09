import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, TrendingUp, TrendingDown, Server, AlertTriangle, ArrowUpRight, Receipt } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from 'recharts'
import { Card, CardTitle, PageHeader, StatCard, Badge, Modal, Progress } from '@/components/ui'
import { finopsRows, finopsTotals, costByComponent } from '@/data/finops'
import type { FinOpsRow, CostBreakdown } from '@/data/finops'
import { customers } from '@/data/mock'
import { regionByCode } from '@/data/fleet'
import { fmtMoney } from '@/data/mock'
import { useCustomerScope } from '@/context/CustomerScope'

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)', fontSize: 12 }
const sovTone = (s: string) => (s === 'Air-gapped' ? 'red' : s === 'Sovereign Cloud' ? 'purple' : 'slate') as 'red' | 'purple' | 'slate'
const marginTone = (pct: number | null) => (pct === null || pct < 0 ? 'red' : pct < 30 ? 'orange' : 'green') as 'red' | 'orange' | 'green'
const money0 = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString()}`

const COST_LABELS: { key: keyof CostBreakdown; label: string; tone: 'blue' | 'purple' | 'orange' }[] = [
  { key: 'compute', label: 'Compute (nodes)', tone: 'blue' },
  { key: 'support', label: 'GPU / support', tone: 'purple' },
  { key: 'storage', label: 'Storage & backup', tone: 'blue' },
  { key: 'hsm', label: 'HSM / BYOK', tone: 'orange' },
  { key: 'egress', label: 'Egress', tone: 'blue' },
]

export default function FinOps() {
  const { scope, isAll } = useCustomerScope()
  const [sel, setSel] = useState<FinOpsRow | null>(null)

  const allRows = useMemo(() => finopsRows(), [])
  const rows = isAll ? allRows : allRows.filter((r) => r.customer === scope)
  const totals = finopsTotals(rows)
  const components = useMemo(() => costByComponent(rows), [rows])

  // Margin-by-tenant chart (worst first, already sorted).
  const marginData = rows.map((r) => ({ customer: r.customer.split(' ')[0], margin: r.margin }))

  return (
    <>
      <PageHeader
        title="Cost & Margin"
        description={isAll
          ? 'What each single-tenant deployment costs to run, next to the revenue it pays — so margin per customer is visible. Monthly figures; worst margin first.'
          : `Cost & margin for ${scope}`}
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly revenue" value={fmtMoney(totals.mrr)} icon={Receipt} tone="green" footer="MRR across tenants" />
        <StatCard label="Infra cost / mo" value={fmtMoney(totals.cost)} icon={Server} tone="blue" footer="Compute, storage, support" />
        <StatCard label="Gross margin" value={money0(totals.margin)} icon={totals.margin >= 0 ? TrendingUp : TrendingDown} tone={totals.margin >= 0 ? 'green' : 'red'} footer={`${totals.marginPct}% of revenue`} />
        <StatCard label="Unprofitable" value={totals.unprofitable} icon={AlertTriangle} tone={totals.unprofitable ? 'red' : 'green'} footer="Tenants below cost" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle title="Margin by Tenant" subtitle="Monthly gross margin — red bars run at a loss" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marginData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="customer" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(v: number) => [money0(v), 'Margin']} />
                <Bar dataKey="margin" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {marginData.map((d) => (
                    <Cell key={d.customer} fill={d.margin < 0 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle title="Cost by Component" subtitle="Where the infra spend goes" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={components} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={90} paddingAngle={2} stroke="none">
                  {components.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [money0(v), n as string]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="mt-6">
        <CardTitle title="Per-Tenant Economics" subtitle="Revenue vs infra cost · click a tenant for the cost breakdown" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3">Tenant</th>
                <th className="py-2 pr-3">Mode</th>
                <th className="py-2 pr-3 text-right">MRR</th>
                <th className="py-2 pr-3 text-right">Infra cost</th>
                <th className="py-2 pr-3 text-right">Margin</th>
                <th className="py-2 pr-3">Margin %</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.customer} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50" onClick={() => setSel(r)}>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-ink-900">{r.customer}</p>
                    <p className="text-xs text-ink-400">{r.plan} · {regionByCode(r.regionCode)?.name ?? r.regionCode}</p>
                  </td>
                  <td className="py-2.5 pr-3"><Badge tone={sovTone(r.sovereignty)}>{r.sovereignty}</Badge></td>
                  <td className="py-2.5 pr-3 text-right font-mono text-xs text-ink-700">{money0(r.mrr)}</td>
                  <td className="py-2.5 pr-3 text-right font-mono text-xs text-ink-700">{money0(r.cost)}</td>
                  <td className={`py-2.5 pr-3 text-right font-mono text-xs font-semibold ${r.margin < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{money0(r.margin)}</td>
                  <td className="py-2.5 pr-3">
                    <Badge tone={marginTone(r.marginPct)} dot>{r.marginPct === null ? 'no revenue' : `${r.marginPct}%`}</Badge>
                  </td>
                  <td className="py-2.5 pr-3 text-right"><ArrowUpRight className="h-4 w-4 text-ink-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {sel && <TenantDrawer row={sel} onClose={() => setSel(null)} />}
    </>
  )
}

function TenantDrawer({ row: r, onClose }: { row: FinOpsRow; onClose: () => void }) {
  const custId = customers.find((c) => c.name === r.customer)?.id
  const maxCost = Math.max(...COST_LABELS.map((c) => r.breakdown[c.key]), 1)
  return (
    <Modal
      open
      onClose={onClose}
      title={r.customer}
      subtitle={`${r.plan} · ${regionByCode(r.regionCode)?.name ?? r.regionCode} · ${r.nodes} nodes (${r.gpuNodes} GPU)`}
      headerRight={<Badge tone={marginTone(r.marginPct)} dot>{r.marginPct === null ? 'no revenue' : `${r.marginPct}% margin`}</Badge>}
      maxWidth="max-w-xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <div className="flex items-center gap-2">
            <Link to="/billing" className="btn-secondary">Billing</Link>
            {custId && <Link to={`/customers/${custId}`} className="btn-primary">Open customer<ArrowUpRight className="h-4 w-4" /></Link>}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <KV label="Revenue (MRR)" value={money0(r.mrr)} />
          <KV label="Infra cost" value={money0(r.cost)} />
          <KV label="Gross margin" value={money0(r.margin)} tone={r.margin < 0 ? 'text-rose-600' : 'text-emerald-600'} />
        </div>

        {r.margin < 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This tenant runs <strong>{money0(-r.margin)}/mo below cost</strong>{r.status === 'Offline' ? ' — the cluster is offline but still incurs support & storage.' : r.plan === 'Trial' ? ' — trial with no revenue yet.' : '.'}</span>
          </div>
        )}

        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Cost breakdown</h4>
          <div className="space-y-2.5">
            {COST_LABELS.map((c) => {
              const v = r.breakdown[c.key]
              return (
                <div key={c.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-ink-600">{c.label}</span>
                    <span className="font-mono text-ink-700">{money0(v)}</span>
                  </div>
                  <Progress value={Math.round((v / maxCost) * 100)} tone={c.tone} />
                </div>
              )
            })}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
              <span className="font-semibold text-ink-900">Total infra cost</span>
              <span className="font-mono font-semibold text-ink-900">{money0(r.cost)}/mo</span>
            </div>
          </div>
        </section>

        {r.sovereignty !== 'Standard' && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-ink-500">
            {r.connectivity === 'Air-gapped'
              ? 'Air-gapped sites carry a heavy support premium (on-site, escorted operations) and customer-managed HSM keys, with no cloud egress.'
              : 'Sovereign Cloud carries an in-region support premium and customer-managed HSM keys (BYOK).'}
          </p>
        )}
      </div>
    </Modal>
  )
}

function KV({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 font-mono text-sm font-semibold ${tone ?? 'text-ink-900'}`}>{value}</p>
    </div>
  )
}
