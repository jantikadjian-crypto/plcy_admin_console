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
import { dunningQueue, failedPayments, disputes } from './billingHealth'
import type { DunningStage } from './billingHealth'
import { loadDevices, postureSummary } from './devices'
import { terraformFor, imageDriftForDeployment } from './clusters'
import { registryImages, currentTagOf } from './registry'
import { channels as defaultChannels, onCall } from './notifications'
import type { RoutingRule, ChannelType, AlertSeverity, ChannelConfig } from './notifications'

/** Dunning escalates severity as retries are exhausted. */
const DUNNING_SEV: Record<DunningStage, AlertSeverity> = { Retrying: 'Medium', 'Final notice': 'High', Uncollectible: 'Critical' }

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

  // Billing health → operational signals: recurring charges being retried
  // (dunning), discrete failed payments, and open disputes with a hard
  // evidence deadline. This closes the billing↔ops loop — money problems now
  // flow through the same routing rules as cluster and CVE signals.
  for (const d of dunningQueue) {
    out.push({
      id: `dun-${d.id}`,
      event: `${d.customer} dunning · ${d.stage.toLowerCase()} (${d.attempts}/${d.maxAttempts})`,
      category: 'Billing',
      severity: DUNNING_SEV[d.stage],
      target: d.customer,
      to: '/billing-health',
    })
  }
  for (const f of failedPayments) {
    out.push({
      id: `pay-${f.id}`,
      event: `${f.customer} payment failed · ${f.reason.replace(/_/g, ' ')}`,
      // A declined charge on real revenue is High; a $0 trial card is Low.
      category: 'Billing',
      severity: f.amount === 0 ? 'Low' : 'High',
      target: f.customer,
      to: '/billing-health',
    })
  }
  for (const dp of disputes) {
    if (dp.status === 'Needs response') {
      out.push({
        id: `dsp-${dp.id}`,
        event: `${dp.customer} chargeback · needs response by ${dp.evidenceDue}`,
        category: 'Disputes',
        severity: 'High',
        target: dp.customer,
        to: '/billing-health',
      })
    }
  }

  // Device trust → a non-compliant device that is blocked, or a Trusted device
  // that has drifted out of posture (stale OS, off the VPN, encryption off).
  for (const d of loadDevices()) {
    if (d.status === 'Blocked') {
      out.push({ id: `dev-${d.id}`, event: `${d.name} blocked — non-compliant device (${d.owner})`, category: 'Device', severity: 'High', target: d.owner, to: '/settings?tab=Security' })
    } else if (d.status === 'At risk') {
      const fail = postureSummary(d).failing[0]
      out.push({ id: `dev-${d.id}`, event: `${d.name} failing posture${fail ? ` · ${fail.toLowerCase()}` : ''}`, category: 'Device', severity: 'Medium', target: d.owner, to: '/settings?tab=Security' })
    }
  }

  return out.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity])
}

/** Resolve a signal against the (possibly edited) rule set → who gets paged. */
export function evaluateRouting(signal: LiveSignal, rules: RoutingRule[], channels: ChannelConfig[] = defaultChannels): RoutingOutcome {
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
  const muted = rule.channels.filter((c) => !channels.find((ch) => ch.type === c)?.connected)
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
export function routingSummary(signals: LiveSignal[], rules: RoutingRule[], channels: ChannelConfig[] = defaultChannels): RoutingSummary {
  let routed = 0
  let gaps = 0
  let paged = 0
  for (const s of signals) {
    const o = evaluateRouting(s, rules, channels)
    if (o.status === 'routed') {
      routed++
      if (o.pages) paged++
    } else {
      gaps++
    }
  }
  return { total: signals.length, routed, gaps, paged }
}
