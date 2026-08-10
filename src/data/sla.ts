/**
 * SLA attainment and scheduled maintenance windows across the fleet.
 *
 * Each single-tenant customer carries a contractual SLA tier (uptime target,
 * response/restore commitments). Attainment is tracked month-to-date; breaches
 * accrue service credits. Maintenance windows are planned changes with a
 * customer-facing notice period.
 */

import { customerLatency, latencyStatus, LATENCY_TARGET_MS } from './latency'
import type { Percentiles, LatencyStatus } from './latency'

export type SlaTier = 'Platinum' | 'Gold' | 'Silver'
export type SlaStatus = 'Meeting' | 'At risk' | 'Breached'

export interface SlaTarget {
  customer: string
  region: string
  tier: SlaTier
  uptimeTarget: number
  uptimeMtd: number
  responseTarget: string
  restoreTarget: string
  breachesMtd: number
  creditsOwed: number
  status: SlaStatus
  /**
   * Observed gateway p50 for the month — how this account actually runs. The
   * p95 judged against the contractual ceiling is derived from it in
   * `latencyFor`, rather than being a second number that could contradict it.
   */
  latencyMedianMs: number
}

export const slaTargets: SlaTarget[] = [
  { customer: 'Meridian Bank', region: 'us-east-1', tier: 'Platinum', uptimeTarget: 99.99, uptimeMtd: 99.98, responseTarget: '15 min', restoreTarget: '2 h', breachesMtd: 0, creditsOwed: 0, status: 'Meeting', latencyMedianMs: 92 },
  { customer: 'Helix Health', region: 'de-sov-1', tier: 'Platinum', uptimeTarget: 99.99, uptimeMtd: 99.99, responseTarget: '15 min', restoreTarget: '2 h', breachesMtd: 0, creditsOwed: 0, status: 'Meeting', latencyMedianMs: 112 },
  { customer: 'Vertex Capital', region: 'ap-southeast-1', tier: 'Platinum', uptimeTarget: 99.95, uptimeMtd: 99.90, responseTarget: '30 min', restoreTarget: '4 h', breachesMtd: 0, creditsOwed: 0, status: 'At risk', latencyMedianMs: 118 },
  { customer: 'Northwind Retail', region: 'eu-central-1', tier: 'Gold', uptimeTarget: 99.9, uptimeMtd: 99.90, responseTarget: '30 min', restoreTarget: '4 h', breachesMtd: 0, creditsOwed: 0, status: 'Meeting', latencyMedianMs: 140 },
  { customer: 'Pinecrest Insurance', region: 'us-east-1', tier: 'Gold', uptimeTarget: 99.9, uptimeMtd: 99.92, responseTarget: '30 min', restoreTarget: '4 h', breachesMtd: 0, creditsOwed: 0, status: 'Meeting', latencyMedianMs: 130 },
  { customer: 'Atlas Logistics', region: 'us-east-1', tier: 'Gold', uptimeTarget: 99.9, uptimeMtd: 99.72, responseTarget: '30 min', restoreTarget: '4 h', breachesMtd: 1, creditsOwed: 1180, status: 'At risk', latencyMedianMs: 182 },
  { customer: 'Ferro Manufacturing', region: 'de-sov-1', tier: 'Silver', uptimeTarget: 99.5, uptimeMtd: 99.61, responseTarget: '1 h', restoreTarget: '8 h', breachesMtd: 0, creditsOwed: 0, status: 'Meeting', latencyMedianMs: 205 },
  { customer: 'Lumen Media', region: 'us-west-2', tier: 'Silver', uptimeTarget: 99.5, uptimeMtd: 99.55, responseTarget: '1 h', restoreTarget: '8 h', breachesMtd: 0, creditsOwed: 0, status: 'Meeting', latencyMedianMs: 188 },
  { customer: 'Orbit Telecom', region: 'ap-southeast-1', tier: 'Gold', uptimeTarget: 99.9, uptimeMtd: 96.20, responseTarget: '30 min', restoreTarget: '4 h', breachesMtd: 3, creditsOwed: 6400, status: 'Breached', latencyMedianMs: 214 },
]

export const slaByCustomer = (customer: string) => slaTargets.find((s) => s.customer === customer)

/* ------------------------------------------------------------------ */
/* Latency objective                                                   */
/* ------------------------------------------------------------------ */

export interface SlaLatency extends Percentiles {
  /** Contractual p95 ceiling for the customer's tier. */
  targetMs: number
  status: LatencyStatus
  /** How far over the ceiling, in ms — 0 when meeting it. */
  overBy: number
}

/**
 * A customer's latency objective: observed percentiles against the ceiling
 * their tier buys them.
 *
 * Uptime was the only thing the SLA record could be judged on, which left every
 * latency number in the console decorative — nothing changed when one moved.
 * This is the number a customer raises on a call, so it belongs on the contract
 * next to uptime.
 */
export function latencyFor(t: SlaTarget): SlaLatency {
  const observed = customerLatency(t.customer, t.region, t.latencyMedianMs)
  const targetMs = LATENCY_TARGET_MS[t.tier]
  return {
    ...observed,
    targetMs,
    status: latencyStatus(observed.p95, targetMs),
    overBy: Math.max(0, observed.p95 - targetMs),
  }
}

export type WindowType = 'Patch' | 'Upgrade' | 'Infra' | 'DR test'
export type WindowImpact = 'No downtime' | 'Brief downtime' | 'Read-only'
export type WindowStatus = 'Scheduled' | 'In progress' | 'Completed' | 'Cancelled'

export interface MaintenanceWindow {
  id: string
  title: string
  /** A specific customer, or 'All' for a region-wide window. */
  customer: string
  region: string
  start: string
  duration: string
  type: WindowType
  impact: WindowImpact
  noticeDays: number
  notified: boolean
  status: WindowStatus
}

export const maintenanceWindows: MaintenanceWindow[] = [
  { id: 'mw_1', title: 'Security patch v4.8.3', customer: 'All', region: 'eu-central-1', start: '2026-07-11 02:00 UTC', duration: '2 h', type: 'Patch', impact: 'No downtime', noticeDays: 3, notified: true, status: 'Scheduled' },
  { id: 'mw_2', title: 'Upgrade to v4.8.2', customer: 'Atlas Logistics', region: 'us-east-1', start: '2026-07-12 06:00 UTC', duration: '1 h', type: 'Upgrade', impact: 'Brief downtime', noticeDays: 5, notified: true, status: 'Scheduled' },
  { id: 'mw_3', title: 'GPU node pool expansion', customer: 'Vertex Capital', region: 'ap-southeast-1', start: '2026-07-14 18:00 UTC', duration: '3 h', type: 'Infra', impact: 'No downtime', noticeDays: 7, notified: false, status: 'Scheduled' },
  { id: 'mw_4', title: 'Quarterly DR failover test', customer: 'Helix Health', region: 'de-sov-1', start: '2026-07-19 01:00 UTC', duration: '4 h', type: 'DR test', impact: 'Read-only', noticeDays: 10, notified: true, status: 'Scheduled' },
  { id: 'mw_5', title: 'Bundle re-import', customer: 'Ferro Manufacturing', region: 'de-sov-1', start: '2026-07-09 03:00 UTC', duration: '1 h', type: 'Upgrade', impact: 'Brief downtime', noticeDays: 2, notified: true, status: 'In progress' },
  { id: 'mw_6', title: 'PII redaction v3.2 rollout', customer: 'Meridian Bank', region: 'us-east-1', start: '2026-07-02 05:00 UTC', duration: '1 h', type: 'Upgrade', impact: 'No downtime', noticeDays: 5, notified: true, status: 'Completed' },
]

const attainment = slaTargets.reduce((s, t) => s + t.uptimeMtd, 0) / slaTargets.length
const latencies = slaTargets.map(latencyFor)

export const slaTotals = {
  avgAttainment: Math.round(attainment * 100) / 100,
  meeting: slaTargets.filter((s) => s.status === 'Meeting').length,
  atRisk: slaTargets.filter((s) => s.status === 'At risk').length,
  breached: slaTargets.filter((s) => s.status === 'Breached').length,
  creditsOwed: slaTargets.reduce((s, t) => s + t.creditsOwed, 0),
  upcoming: maintenanceWindows.filter((w) => w.status === 'Scheduled').length,
  total: slaTargets.length,
  latencyMeeting: latencies.filter((l) => l.status === 'Meeting').length,
  latencyAtRisk: latencies.filter((l) => l.status === 'At risk').length,
  latencyBreached: latencies.filter((l) => l.status === 'Breached').length,
  /** Worst p95 overshoot on the fleet — the account to look at first. */
  worstOverBy: Math.max(0, ...latencies.map((l) => l.overBy)),
}
