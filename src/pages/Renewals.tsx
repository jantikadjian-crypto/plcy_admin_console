import { CalendarClock, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge } from '@/components/ui'
import { useSession } from '@/context/Session'
import { useSuccess, setRenewalStage } from '@/data/successStore'
import { RENEWAL_STAGES, stageTone } from '@/data/success'
import type { RenewalStage } from '@/data/success'

const NOW = Date.parse('2026-07-24')
const daysTo = (d: string) => Math.round((Date.parse(d) - NOW) / 86400000)

export function Renewals() {
  const { renewals } = useSuccess()
  const { logAction, can } = useSession()
  const rows = [...renewals].sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))

  const in90 = renewals.filter((r) => daysTo(r.renewalDate) <= 90 && r.stage !== 'Renewed').length
  const atRiskArr = renewals.filter((r) => r.stage === 'At risk' || r.stage === 'Churning').reduce((a, r) => a + r.arr, 0)
  const weighted = renewals.filter((r) => r.stage !== 'Renewed').reduce((a, r) => a + (r.arr * r.probability) / 100, 0)
  const totalArr = renewals.reduce((a, r) => a + r.arr, 0)

  const change = (customer: string, stage: RenewalStage) => {
    setRenewalStage(customer, stage)
    logAction({ action: 'renewal.stage', target: `${customer} → ${stage}`, category: 'customer' })
  }

  return (
    <div>
      <PageHeader title="Renewals" description="The renewal pipeline — what's coming up, what's at risk, and the weighted value in play." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Renewals ≤ 90 days" value={in90} icon={CalendarClock} tone="blue" footer="Approaching" />
        <StatCard label="ARR at risk" value={`$${(atRiskArr / 1000).toFixed(0)}k`} icon={AlertTriangle} tone={atRiskArr ? 'red' : 'green'} footer="At-risk + churning" />
        <StatCard label="Weighted pipeline" value={`$${(weighted / 1000).toFixed(0)}k`} icon={TrendingUp} tone="purple" footer="ARR × probability" />
        <StatCard label="Total ARR up" value={`$${(totalArr / 1000).toFixed(0)}k`} icon={DollarSign} tone="green" footer="All open renewals" />
      </div>

      <Card>
        <CardTitle title="Pipeline" subtitle="Sorted by renewal date · set the stage as the deal progresses" />
        <Table columns={['Customer', 'Plan', 'ARR', 'Renewal', 'Days', 'Probability', 'Stage', 'Owner']}>
          {rows.map((r) => {
            const d = daysTo(r.renewalDate)
            return (
              <Tr key={r.customer}>
                <Td className="font-medium text-ink-900">{r.customer}</Td>
                <Td className="text-xs text-ink-600">{r.plan}</Td>
                <Td className="tabular-nums text-ink-700">${(r.arr / 1000).toFixed(0)}k</Td>
                <Td className="whitespace-nowrap text-xs text-ink-500">{r.renewalDate}</Td>
                <Td className={`tabular-nums text-xs ${d <= 30 ? 'font-semibold text-rose-600' : d <= 90 ? 'text-amber-600' : 'text-ink-400'}`}>{d < 0 ? 'past' : `${d}d`}</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-16 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-brand-500" style={{ width: `${r.probability}%` }} /></span>
                    <span className="text-xs tabular-nums text-ink-500">{r.probability}%</span>
                  </span>
                </Td>
                <Td>
                  {can('customer.manage') ? (
                    <select value={r.stage} onChange={(e) => change(r.customer, e.target.value as RenewalStage)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-ink-700">
                      {RENEWAL_STAGES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : <Badge tone={stageTone[r.stage]} dot>{r.stage}</Badge>}
                </Td>
                <Td className="text-xs text-ink-500">{r.owner}</Td>
              </Tr>
            )
          })}
        </Table>
      </Card>
    </div>
  )
}
