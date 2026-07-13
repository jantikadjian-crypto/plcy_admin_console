/**
 * DSAR Fulfilment report — data-subject requests reviewed against their
 * statutory SLA, with type / jurisdiction breakdowns and the overdue and
 * at-risk queue surfaced first. Scope-aware: the whole fleet under "All
 * Customers", or a single customer when one is selected. Reads the same
 * dsarRequests the Data Requests page uses.
 */
import { dsarRequests } from '@/data/privacy'
import type { DSAR, DSARType, DSARStatus } from '@/data/privacy'

export type DsarRag = 'green' | 'amber' | 'red'
export type SlaState = 'Breached' | 'At risk' | 'On track' | 'Closed'

export interface DsarKpi { label: string; value: string; sub: string }
export interface DsarBucket { label: string; count: number }
export interface DsarRow {
  req: DSAR
  slaState: SlaState
  daysToDue: number | null
}

export interface DsarReport {
  scope: string
  isAll: boolean
  generatedBy: string
  generatedAt: string
  overall: DsarRag
  overallLabel: string
  kpis: DsarKpi[]
  byType: DsarBucket[]
  byJurisdiction: DsarBucket[]
  rows: DsarRow[]
  totals: {
    total: number
    open: number
    overdue: number
    atRisk: number
    completed: number
    slaCompliancePct: number
  }
}

const OPEN_STATUSES = new Set<DSARStatus>(['New', 'In progress', 'Overdue'])
const AT_RISK_DAYS = 7
const TYPE_ORDER: DSARType[] = ['Access', 'Erasure', 'Portability', 'Rectification', 'Objection']

/** Days between a 'YYYY-MM-DD' due date and now (negative = past due). */
function daysBetween(dueISO: string, now: Date): number {
  const due = new Date(`${dueISO}T00:00:00`)
  return Math.round((due.getTime() - now.getTime()) / 86_400_000)
}

const jurisdictionOf = (law: string) => law.split(/[\s§]/)[0] || law

const stateRank: Record<SlaState, number> = { Breached: 4, 'At risk': 3, 'On track': 2, Closed: 1 }

export function buildDsarReport(scope: string, isAll: boolean, generatedBy: string, generatedAt: string, now: Date = new Date()): DsarReport {
  const scoped = isAll ? dsarRequests : dsarRequests.filter((d) => d.customer === scope)

  const rows: DsarRow[] = scoped
    .map((req) => {
      if (req.status === 'Completed') return { req, slaState: 'Closed' as SlaState, daysToDue: null }
      const daysToDue = daysBetween(req.due, now)
      const slaState: SlaState = req.status === 'Overdue' || daysToDue < 0 ? 'Breached' : daysToDue <= AT_RISK_DAYS ? 'At risk' : 'On track'
      return { req, slaState, daysToDue }
    })
    .sort((a, b) => stateRank[b.slaState] - stateRank[a.slaState] || (a.daysToDue ?? 999) - (b.daysToDue ?? 999))

  const total = rows.length
  const open = rows.filter((r) => OPEN_STATUSES.has(r.req.status)).length
  const overdue = rows.filter((r) => r.slaState === 'Breached').length
  const atRisk = rows.filter((r) => r.slaState === 'At risk').length
  const completed = rows.filter((r) => r.req.status === 'Completed').length
  const slaCompliancePct = total === 0 ? 100 : Math.round(((total - overdue) / total) * 100)

  const overall: DsarRag = overdue > 0 ? 'red' : atRisk > 0 ? 'amber' : 'green'
  const overallLabel = overall === 'red' ? 'Statutory SLA breached' : overall === 'amber' ? 'Deadlines approaching' : 'All within SLA'

  const byType: DsarBucket[] = TYPE_ORDER.map((t) => ({ label: t, count: rows.filter((r) => r.req.type === t).length })).filter((b) => b.count > 0)

  const jurisdictions = [...new Set(scoped.map((d) => jurisdictionOf(d.law)))]
  const byJurisdiction: DsarBucket[] = jurisdictions
    .map((j) => ({ label: j, count: rows.filter((r) => jurisdictionOf(r.req.law) === j).length }))
    .sort((a, b) => b.count - a.count)

  const kpis: DsarKpi[] = [
    { label: 'Requests', value: String(total), sub: 'In scope' },
    { label: 'Open', value: String(open), sub: 'Awaiting fulfilment' },
    { label: 'Overdue', value: String(overdue), sub: 'Past statutory SLA' },
    { label: 'At risk', value: String(atRisk), sub: `Due within ${AT_RISK_DAYS} days` },
    { label: 'Completed', value: String(completed), sub: 'Fulfilled & closed' },
    { label: 'SLA compliance', value: `${slaCompliancePct}%`, sub: 'Within deadline' },
  ]

  return {
    scope,
    isAll,
    generatedBy,
    generatedAt,
    overall,
    overallLabel,
    kpis,
    byType,
    byJurisdiction,
    rows,
    totals: { total, open, overdue, atRisk, completed, slaCompliancePct },
  }
}
