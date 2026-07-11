/**
 * SLA & Credits Report — a customer-facing service-level artifact for QBRs and
 * account reviews. Scope-aware: the whole fleet under "All Customers", or a
 * single customer when one is selected in the sidebar scope. Built from the same
 * SLA data the /sla page reads (@/data/sla).
 */
import { slaTargets, maintenanceWindows } from '@/data/sla'
import type { SlaTarget, SlaStatus, MaintenanceWindow } from '@/data/sla'

export type SlaRag = 'green' | 'amber' | 'red'

export interface SlaKpi { label: string; value: string; sub: string }
export interface SlaReport {
  scope: string
  isAll: boolean
  generatedBy: string
  generatedAt: string
  overall: SlaRag
  overallLabel: string
  kpis: SlaKpi[]
  rows: SlaTarget[]
  windows: MaintenanceWindow[]
  creditsTotal: number
}

const statusRank: Record<SlaStatus, number> = { Breached: 0, 'At risk': 1, Meeting: 2 }
const money = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`)

export const slaStatusRag: Record<SlaStatus, SlaRag> = { Meeting: 'green', 'At risk': 'amber', Breached: 'red' }

export function buildSlaReport(scope: string, isAll: boolean, generatedBy: string, generatedAt: string): SlaReport {
  const rows = (isAll ? slaTargets : slaTargets.filter((t) => t.customer === scope))
    .slice()
    .sort((a, b) => statusRank[a.status] - statusRank[b.status])

  // Maintenance windows in scope: a customer's own windows plus fleet-wide ('All') windows.
  const windows = (isAll ? maintenanceWindows : maintenanceWindows.filter((w) => w.customer === scope || w.customer === 'All'))
    .filter((w) => w.status !== 'Cancelled')

  const creditsTotal = rows.reduce((s, t) => s + t.creditsOwed, 0)
  const breached = rows.filter((t) => t.status === 'Breached').length
  const atRisk = rows.filter((t) => t.status === 'At risk').length
  const meeting = rows.filter((t) => t.status === 'Meeting').length
  const avgAttainment = rows.length ? Math.round((rows.reduce((s, t) => s + t.uptimeMtd, 0) / rows.length) * 100) / 100 : 0

  const overall: SlaRag = breached ? 'red' : atRisk ? 'amber' : 'green'
  const overallLabel = breached ? 'Breach — credits owed' : atRisk ? 'At-risk accounts' : 'All SLAs met'

  let kpis: SlaKpi[]
  if (isAll) {
    kpis = [
      { label: 'Avg attainment', value: `${avgAttainment}%`, sub: 'Uptime MTD' },
      { label: 'Meeting SLA', value: `${meeting}/${rows.length}`, sub: 'Accounts on target' },
      { label: 'At risk', value: String(atRisk), sub: 'Below target trend' },
      { label: 'Breached', value: String(breached), sub: 'Missed commitment' },
      { label: 'Credits owed', value: money(creditsTotal), sub: 'Month-to-date' },
      { label: 'Upcoming windows', value: String(windows.filter((w) => w.status === 'Scheduled').length), sub: 'Planned changes' },
    ]
  } else {
    const t = rows[0]
    kpis = t
      ? [
          { label: 'SLA tier', value: t.tier, sub: `${t.uptimeTarget}% target` },
          { label: 'Attainment MTD', value: `${t.uptimeMtd}%`, sub: t.status },
          { label: 'Breaches MTD', value: String(t.breachesMtd), sub: 'This month' },
          { label: 'Credits owed', value: money(t.creditsOwed), sub: 'Month-to-date' },
          { label: 'Response / restore', value: `${t.responseTarget} / ${t.restoreTarget}`, sub: 'Commitment' },
          { label: 'Upcoming windows', value: String(windows.filter((w) => w.status === 'Scheduled').length), sub: 'Planned changes' },
        ]
      : []
  }

  return {
    scope,
    isAll,
    generatedBy,
    generatedAt,
    overall,
    overallLabel,
    kpis,
    rows,
    windows,
    creditsTotal,
  }
}

export { money as fmtSlaMoney }
