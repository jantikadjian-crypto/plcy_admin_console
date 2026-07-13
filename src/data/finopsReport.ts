/**
 * Cost & Margin (FinOps) report — infrastructure cost vs recurring revenue per
 * customer, with the money-losers surfaced first. Scope-aware: the whole fleet
 * under "All Customers", or a single customer when one is selected. Built from
 * the same finops model the Cost & Margin page reads.
 */
import { finopsRows, finopsTotals, costByComponent } from '@/data/finops'
import type { FinOpsRow } from '@/data/finops'

export type FinRag = 'green' | 'amber' | 'red'

export interface FinKpi { label: string; value: string; sub: string }
export interface FinopsReport {
  scope: string
  isAll: boolean
  generatedBy: string
  generatedAt: string
  overall: FinRag
  overallLabel: string
  kpis: FinKpi[]
  components: { name: string; value: number; color: string }[]
  rows: FinOpsRow[]
  totals: ReturnType<typeof finopsTotals>
}

const money = (n: number) => {
  const neg = n < 0
  const a = Math.abs(n)
  const s = a >= 1000 ? `$${(a / 1000).toFixed(a % 1000 === 0 ? 0 : 1)}k` : `$${a}`
  return neg ? `-${s}` : s
}
export { money as fmtFinMoney }

export function buildFinopsReport(scope: string, isAll: boolean, generatedBy: string, generatedAt: string): FinopsReport {
  const all = finopsRows()
  const rows = isAll ? all : all.filter((r) => r.customer === scope)
  const totals = finopsTotals(rows)
  const components = costByComponent(rows)

  const overall: FinRag = totals.margin < 0 ? 'red' : totals.unprofitable > 0 || totals.marginPct < 50 ? 'amber' : 'green'
  const overallLabel = overall === 'red' ? 'Margin negative' : overall === 'amber' ? 'Margin under review' : 'Healthy margin'

  const kpis: FinKpi[] = [
    { label: 'Recurring revenue', value: money(totals.mrr), sub: 'MRR in scope' },
    { label: 'Infra cost', value: money(totals.cost), sub: 'Monthly run-rate' },
    { label: 'Gross margin', value: money(totals.margin), sub: 'MRR − cost' },
    { label: 'Margin %', value: `${totals.marginPct}%`, sub: 'Blended' },
    { label: 'Unprofitable', value: String(totals.unprofitable), sub: 'Accounts below cost' },
    { label: 'Accounts', value: String(rows.length), sub: 'In scope' },
  ]

  return { scope, isAll, generatedBy, generatedAt, overall, overallLabel, kpis, components, rows, totals }
}
