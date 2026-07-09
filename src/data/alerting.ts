/**
 * Live alert-routing engine.
 *
 * The Dashboard and Fleet Posture surface live fleet signals; this module takes
 * the *same* underlying state and runs each signal through the notification
 * routing rules to answer the operational question "if this is happening right
 * now, who actually gets paged?" — and, just as importantly, which live signals
 * fall through the cracks (no rule, rule disabled, or below its severity floor).
 */
import { deployments } from './fleet'
import { slaTargets } from './sla'
import { customerBilling } from './billing'
import { terraformFor, imageDriftForDeployment } from './clusters'
import { registryImages, currentTagOf } from './registry'
import { channels as channelConfigs, onCall } from './notifications'
import type { RoutingRule, ChannelType, AlertSeverity } from './notifications'

export interface LiveSignal {
  id: string
  event: string
  category: string
  severity: AlertSeverity
  target: string
  to: string
}

export const SEV_RANK: Record<AlertSeverity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }

export type RoutingStatus = 'routed' | 'below' | 'disabled' | 'unrouted'
export interface RoutingOutcome {
  status: RoutingStatus
  rule?: RoutingRule
  channels: ChannelType[]
  mutedChannels: ChannelType[]
  pages: boolean
  responder?: string
  reason: string
}

/** Gather every actionable signal currently true across the fleet. */
export function collectLiveSignals(promoted: Record<string, string>): LiveSignal[] {
  const out: LiveSignal[] = []

  for (const d of deployments) {
    if (d.status === 'Offline') {
      out.push({ id: `clu-${d.id}`, event: `${d.customer} cluster offline`, category: 'Cluster', severity: 'Critical', target: d.customer, to: `/clusters/${d.id}` })
    } else if (d.podsHealthy < d.podsTotal) {
      out.push({ id: `clu-${d.id}`, event: `${d.customer} cluster degraded`, category: 'Cluster', severity: 'High', target: d.customer, to: `/clusters/${d.id}` })
    }
    if (terraformFor(d).drift === 'Drift detected') {
      out.push({ id: `tf-${d.id}`, event: `${d.customer} Terraform drift`, category: 'Cluster', severity: 'Medium', target: d.customer, to: `/clusters/${d.id}` })
    }
    const idr = imageDriftForDeployment(d, promoted)
    if (!idr.offline && idr.behind > 0) {
      out.push({ id: `img-${d.id}`, event: `${d.customer} image drift · ${idr.behind} behind`, category: 'Supply chain', severity: 'Medium', target: d.customer, to: `/clusters/${d.id}` })
    }
    if (d.license?.status === 'Expired') {
      out.push({ id: `lic-${d.id}`, event: `${d.customer} license expired`, category: 'License', severity: 'High', target: d.customer, to: '/licensing' })
    } else if (d.license?.status === 'Expiring') {
      out.push({ id: `lic-${d.id}`, event: `${d.customer} license expiring`, category: 'License', severity: 'Medium', target: d.customer, to: '/licensing' })
    }
  }

  for (const im of registryImages) {
    if (currentTagOf(im).criticalCves > 0) {
      out.push({ id: `cve-${im.id}`, event: `${im.name} — critical CVE`, category: 'Supply chain', severity: 'Critical', target: im.name, to: '/registry' })
    }
    if (im.quarantined) {
      out.push({ id: `qua-${im.id}`, event: `${im.name} quarantined`, category: 'Supply chain', severity: 'High', target: im.name, to: '/registry' })
    }
  }

  for (const s of slaTargets) {
    if (s.status === 'Breached') {
      out.push({ id: `sla-${s.customer}`, event: `${s.customer} SLA breached`, category: 'Reliability', severity: 'Critical', target: s.customer, to: '/sla' })
    } else if (s.status !== 'Meeting') {
      out.push({ id: `sla-${s.customer}`, event: `${s.customer} SLA at risk`, category: 'Reliability', severity: 'High', target: s.customer, to: '/sla' })
    }
  }

  for (const b of customerBilling) {
    if (b.status === 'Past due') {
      out.push({ id: `bill-${b.customer}`, event: `${b.customer} billing past due`, category: 'Billing', severity: 'High', target: b.customer, to: '/billing' })
    }
  }

  return out.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity])
}

/** Resolve a signal against the (possibly edited) rule set → who gets paged. */
export function evaluateRouting(signal: LiveSignal, rules: RoutingRule[]): RoutingOutcome {
  const rule = rules.find((r) => r.category === signal.category)
  if (!rule) {
    return { status: 'unrouted', channels: [], mutedChannels: [], pages: false, reason: 'No rule covers this category — nobody is notified' }
  }
  if (!rule.enabled) {
    return { status: 'disabled', rule, channels: rule.channels, mutedChannels: [], pages: false, reason: `Rule "${rule.event}" is disabled` }
  }
  if (SEV_RANK[signal.severity] < SEV_RANK[rule.minSeverity]) {
    return { status: 'below', rule, channels: rule.channels, mutedChannels: [], pages: false, reason: `Below the rule's ${rule.minSeverity} threshold` }
  }
  const muted = rule.channels.filter((c) => !channelConfigs.find((ch) => ch.type === c)?.connected)
  const pages = rule.channels.includes('PagerDuty')
  const responder = pages ? onCall.find((o) => o.role === 'Primary')?.name : undefined
  return {
    status: 'routed',
    rule,
    channels: rule.channels,
    mutedChannels: muted,
    pages,
    responder,
    reason: pages ? `Pages ${responder ?? 'on-call'}` : 'Notifies channels',
  }
}

export interface RoutingSummary {
  total: number
  routed: number
  gaps: number
  paged: number
}
export function routingSummary(signals: LiveSignal[], rules: RoutingRule[]): RoutingSummary {
  let routed = 0
  let gaps = 0
  let paged = 0
  for (const s of signals) {
    const o = evaluateRouting(s, rules)
    if (o.status === 'routed') {
      routed++
      if (o.pages) paged++
    } else {
      gaps++
    }
  }
  return { total: signals.length, routed, gaps, paged }
}
