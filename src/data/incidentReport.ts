/**
 * Incident Post-Mortem report — a period review of AI-governance incidents with
 * the root-cause and remediation narrative for each significant one, plus the
 * regulatory reporting obligations they triggered. Scope-aware: the whole fleet
 * under "All Customers", or a single customer when one is selected.
 */
import { incidents, regulatoryNotices } from '@/data/incidents'
import type { Incident, IncidentSeverity, RegNotice } from '@/data/incidents'

export type IncRag = 'green' | 'amber' | 'red'

export interface IncKpi { label: string; value: string; sub: string }
export interface SevBucket { severity: IncidentSeverity; count: number }

export interface IncidentReport {
  scope: string
  isAll: boolean
  generatedBy: string
  generatedAt: string
  overall: IncRag
  overallLabel: string
  kpis: IncKpi[]
  severityMix: SevBucket[]
  rows: Incident[]
  /** Significant incidents (Critical/High) get the full post-mortem write-up. */
  postmortems: Incident[]
  notices: RegNotice[]
  totals: {
    total: number
    open: number
    critical: number
    dataExposure: number
    usersAffected: number
    requestsImpacted: number
    resolved: number
    noticesOpen: number
  }
}

const OPEN_STATUSES = new Set(['Open', 'Triage', 'Investigating', 'Remediation'])
const SEV_ORDER: IncidentSeverity[] = ['Critical', 'High', 'Medium', 'Low']
const SEV_RANK: Record<IncidentSeverity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }

export function buildIncidentReport(scope: string, isAll: boolean, generatedBy: string, generatedAt: string): IncidentReport {
  const rows = (isAll ? incidents : incidents.filter((i) => i.customer === scope))
    .slice()
    .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || b.riskScore - a.riskScore)

  const scopedIds = new Set(rows.map((i) => i.id))
  const notices = regulatoryNotices.filter((n) => scopedIds.has(n.incident))

  const open = rows.filter((i) => OPEN_STATUSES.has(i.status)).length
  const critical = rows.filter((i) => i.severity === 'Critical').length
  const dataExposure = rows.filter((i) => i.dataExposure).length
  const usersAffected = rows.reduce((s, i) => s + i.usersAffected, 0)
  const requestsImpacted = rows.reduce((s, i) => s + i.requestsImpacted, 0)
  const resolved = rows.filter((i) => i.status === 'Resolved').length
  const noticesOpen = notices.filter((n) => n.status === 'Pending' || n.status === 'Overdue').length

  const totals = { total: rows.length, open, critical, dataExposure, usersAffected, requestsImpacted, resolved, noticesOpen }

  // RAG: red if a data-exposure breach, a Critical is still open, or a
  // regulatory notice is overdue; amber if anything is still open or pending.
  const noticeOverdue = notices.some((n) => n.status === 'Overdue')
  const criticalOpen = rows.some((i) => i.severity === 'Critical' && OPEN_STATUSES.has(i.status))
  const overall: IncRag = dataExposure > 0 || criticalOpen || noticeOverdue ? 'red' : open > 0 || noticesOpen > 0 ? 'amber' : 'green'
  const overallLabel = overall === 'red' ? 'Active breach exposure' : overall === 'amber' ? 'Incidents in progress' : 'All incidents resolved'

  const severityMix: SevBucket[] = SEV_ORDER.map((severity) => ({ severity, count: rows.filter((i) => i.severity === severity).length })).filter((b) => b.count > 0)

  const kpis: IncKpi[] = [
    { label: 'Incidents', value: String(totals.total), sub: 'In scope' },
    { label: 'Still open', value: String(open), sub: 'Not yet resolved' },
    { label: 'Critical', value: String(critical), sub: 'Highest severity' },
    { label: 'Data exposure', value: String(dataExposure), sub: 'Confirmed breaches' },
    { label: 'Users affected', value: usersAffected.toLocaleString(), sub: 'Across incidents' },
    { label: 'Reg. notices open', value: String(noticesOpen), sub: 'Pending / overdue' },
  ]

  const postmortems = rows.filter((i) => i.severity === 'Critical' || i.severity === 'High')

  return { scope, isAll, generatedBy, generatedAt, overall, overallLabel, kpis, severityMix, rows, postmortems, notices, totals }
}
