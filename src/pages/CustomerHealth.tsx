import { useState } from 'react'
import { HeartPulse, AlertTriangle, Gauge, DollarSign } from 'lucide-react'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge, Modal } from '@/components/ui'
import { customerHealth, churnTone, healthTone, usageArrow } from '@/data/success'
import type { CustomerHealth as CH } from '@/data/success'
import { useSuccess } from '@/data/successStore'

function Spark({ data, tone }: { data: number[]; tone: string }) {
  const w = 72, h = 22
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * (h - 4) - 2}`).join(' ')
  const color = tone === 'green' ? 'text-emerald-500' : tone === 'yellow' ? 'text-amber-500' : 'text-rose-500'
  return <svg width={w} height={h} className={color}><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" /></svg>
}

export function CustomerHealthTab() {
  const { tickets } = useSuccess()
  const [sel, setSel] = useState<CH | null>(null)
  const openFor = (c: string) => tickets.filter((t) => t.customer === c && t.status !== 'Resolved').length

  const rows = [...customerHealth].sort((a, b) => a.health - b.health) // worst first
  const atRisk = customerHealth.filter((c) => c.churn !== 'Low').length
  const avg = Math.round(customerHealth.reduce((a, c) => a + c.health, 0) / customerHealth.length)
  const mrr = customerHealth.reduce((a, c) => a + c.mrr, 0)

  return (
    <div>
      <PageHeader title="Customer Health" description="Portfolio health across every customer — who's thriving, who's slipping, and who's at risk of churn." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={customerHealth.length} icon={HeartPulse} tone="blue" footer="Active accounts" />
        <StatCard label="At churn risk" value={atRisk} icon={AlertTriangle} tone={atRisk ? 'orange' : 'green'} footer="Medium or high risk" />
        <StatCard label="Avg health" value={avg} icon={Gauge} tone={avg >= 80 ? 'green' : 'orange'} footer="Portfolio composite" />
        <StatCard label="MRR" value={`$${(mrr / 1000).toFixed(0)}k`} icon={DollarSign} tone="purple" footer="Monthly recurring" />
      </div>

      <Card>
        <CardTitle title="Accounts" subtitle="Sorted by health — lowest first. Click a customer for the full breakdown." />
        <Table columns={['Customer', 'Plan', 'MRR', 'Health', 'Churn', 'Adoption', 'Usage', 'Open', 'Renewal', 'CSM']}>
          {rows.map((c) => (
            <Tr key={c.customer} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setSel(c)}>
              <Td className="font-medium text-ink-900">{c.customer}</Td>
              <Td className="text-xs text-ink-600">{c.plan}</Td>
              <Td className="tabular-nums text-ink-600">${(c.mrr / 1000).toFixed(0)}k</Td>
              <Td>
                <span className="flex items-center gap-2">
                  <Badge tone={healthTone(c.health)}>{c.health}</Badge>
                  <Spark data={c.trend} tone={healthTone(c.health)} />
                </span>
              </Td>
              <Td><Badge tone={churnTone[c.churn]} dot>{c.churn}</Badge></Td>
              <Td className="tabular-nums text-ink-600">{c.adoption}%</Td>
              <Td className={c.usageTrend === 'up' ? 'text-emerald-600' : c.usageTrend === 'down' ? 'text-rose-600' : 'text-ink-400'}>{usageArrow(c.usageTrend)}</Td>
              <Td className="tabular-nums text-ink-700">{openFor(c.customer)}</Td>
              <Td className="whitespace-nowrap text-xs text-ink-500">{c.renewalDate}</Td>
              <Td className="text-xs text-ink-500">{c.csm}</Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {sel && (
        <Modal
          open onClose={() => setSel(null)}
          title={sel.customer}
          subtitle={`${sel.plan} · $${(sel.mrr / 1000).toFixed(0)}k MRR · CSM ${sel.csm}`}
          maxWidth="max-w-2xl"
          headerRight={<Badge tone={churnTone[sel.churn]} dot>{sel.churn} churn risk</Badge>}
          footer={<button className="btn-secondary" onClick={() => setSel(null)}>Close</button>}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Health" value={`${sel.health}`} tone={healthTone(sel.health)} />
              <Metric label="Adoption" value={`${sel.adoption}%`} />
              <Metric label="Usage trend" value={usageArrow(sel.usageTrend)} />
              <Metric label="Open tickets" value={`${openFor(sel.customer)}`} />
            </div>
            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink-900">Health signals</h4>
              <ul className="space-y-1.5">
                {sel.signals.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink-700">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${sel.churn === 'Low' ? 'bg-emerald-400' : sel.churn === 'Medium' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                    {s}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink-900">Open tickets</h4>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                {tickets.filter((t) => t.customer === sel.customer && t.status !== 'Resolved').map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-xs last:border-0">
                    <span className="min-w-0"><span className="font-mono font-semibold text-ink-700">{t.id}</span> <span className="text-ink-600">{t.subject}</span></span>
                    <Badge tone={t.priority === 'Urgent' ? 'red' : t.priority === 'High' ? 'orange' : 'slate'}>{t.priority}</Badge>
                  </div>
                ))}
                {tickets.filter((t) => t.customer === sel.customer && t.status !== 'Resolved').length === 0 && <p className="p-3 text-center text-xs text-ink-400">No open tickets.</p>}
              </div>
            </section>
            <p className="text-xs text-ink-500">Renewal due <span className="font-medium text-ink-700">{sel.renewalDate}</span>.</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const color = tone === 'green' ? 'text-emerald-600' : tone === 'yellow' ? 'text-amber-600' : tone === 'red' ? 'text-rose-600' : 'text-ink-900'
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}
