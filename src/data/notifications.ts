/**
 * Notification routing, channels, on-call schedule and delivery log for the
 * PLCY control plane. Fleet events (failed backups, critical CVEs, license
 * expiry, access requests, SLA breaches) are routed to channels per rule.
 */

export type ChannelType = 'Slack' | 'PagerDuty' | 'Email' | 'Webhook'

export interface ChannelConfig {
  id: string
  type: ChannelType
  /** Human-facing destination (channel / service / recipients / name). */
  target: string
  /** Technical connection string (webhook URL, routing key, endpoint). */
  endpoint: string
  desc: string
  connected: boolean
}

export const channels: ChannelConfig[] = [
  { id: 'ch_slack', type: 'Slack', target: '#plcy-alerts', endpoint: 'https://hooks.slack.com/services/T024/B071/XXXXXXXX', desc: 'Team channel for fleet alerts', connected: true },
  { id: 'ch_pd', type: 'PagerDuty', target: 'PLCY On-Call · P1', endpoint: 'R0ABCD1234EFGH5678IJKL', desc: 'Pages the on-call engineer', connected: true },
  { id: 'ch_email', type: 'Email', target: 'oncall@plcy.app', endpoint: '', desc: 'Email distribution list', connected: true },
  { id: 'ch_webhook', type: 'Webhook', target: 'SIEM', endpoint: 'https://hooks.plcy.app/incoming', desc: 'Outbound webhook (SIEM)', connected: false },
]

export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export interface RoutingRule {
  id: string
  event: string
  category: string
  minSeverity: AlertSeverity
  channels: ChannelType[]
  enabled: boolean
}

export const routingRules: RoutingRule[] = [
  { id: 'r_cve', event: 'Critical CVE detected', category: 'Supply chain', minSeverity: 'Critical', channels: ['PagerDuty', 'Slack'], enabled: true },
  { id: 'r_backup', event: 'Backup failed', category: 'Backup', minSeverity: 'High', channels: ['Slack', 'Email'], enabled: true },
  { id: 'r_cluster', event: 'Cluster offline / degraded', category: 'Cluster', minSeverity: 'High', channels: ['PagerDuty', 'Slack'], enabled: true },
  { id: 'r_access', event: 'Break-glass access requested', category: 'Access', minSeverity: 'High', channels: ['Slack', 'PagerDuty'], enabled: true },
  { id: 'r_sla', event: 'SLA breach', category: 'Reliability', minSeverity: 'Critical', channels: ['PagerDuty', 'Slack', 'Email'], enabled: true },
  { id: 'r_billing', event: 'Payment failed / dunning', category: 'Billing', minSeverity: 'Medium', channels: ['Slack', 'Email'], enabled: true },
  { id: 'r_dispute', event: 'Chargeback / dispute filed', category: 'Disputes', minSeverity: 'High', channels: ['PagerDuty', 'Slack', 'Email'], enabled: true },
  { id: 'r_device', event: 'Untrusted / non-compliant device', category: 'Device', minSeverity: 'Medium', channels: ['Slack', 'Email'], enabled: true },
  { id: 'r_license', event: 'License expiring / expired', category: 'License', minSeverity: 'Medium', channels: ['Email'], enabled: true },
  { id: 'r_dsar', event: 'DSAR approaching deadline', category: 'DSAR', minSeverity: 'High', channels: ['Email', 'Slack'], enabled: true },
  { id: 'r_transfer', event: 'Cross-border transfer blocked', category: 'Sovereignty', minSeverity: 'High', channels: ['Slack'], enabled: false },
]

export interface OnCallShift {
  name: string
  role: 'Primary' | 'Secondary' | 'Manager'
  window: string
  active: boolean
}

export const onCall: OnCallShift[] = [
  { name: 'Dana Cole', role: 'Primary', window: 'Jul 7 – Jul 14', active: true },
  { name: 'Marcus Ihde', role: 'Secondary', window: 'Jul 7 – Jul 14', active: true },
  { name: 'Priya Nair', role: 'Manager', window: 'Escalation owner', active: true },
]

/** Editable, persisted on-call assignment (defaults to the seed above). */
const ONCALL_KEY = 'plcy_oncall'
export function loadOnCall(): OnCallShift[] {
  try {
    const raw = localStorage.getItem(ONCALL_KEY)
    if (!raw) return onCall.map((o) => ({ ...o }))
    return JSON.parse(raw) as OnCallShift[]
  } catch {
    return onCall.map((o) => ({ ...o }))
  }
}
export function saveOnCall(list: OnCallShift[]) {
  try {
    localStorage.setItem(ONCALL_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}
/** Primary responder from the current (possibly edited) on-call assignment. */
export function primaryResponder(): string {
  return loadOnCall().find((o) => o.role === 'Primary' && o.active)?.name ?? '—'
}

export const rotation = [
  { week: 'This week (Jul 7)', primary: 'Dana Cole', secondary: 'Marcus Ihde' },
  { week: 'Jul 14', primary: 'Marcus Ihde', secondary: 'Priya Nair' },
  { week: 'Jul 21', primary: 'Priya Nair', secondary: 'Dana Cole' },
]

export const escalation = [
  'Notify Primary on-call',
  'No ack in 5 min → page Secondary',
  'No ack in 15 min → escalate to Manager',
]

export type DeliveryStatus = 'Delivered' | 'Muted' | 'Failed'

export interface AlertEvent {
  id: string
  time: string
  event: string
  category: string
  severity: AlertSeverity
  channels: ChannelType[]
  status: DeliveryStatus
}

export const recentAlerts: AlertEvent[] = [
  { id: 'al_1', time: '10:41', event: 'Orbit Telecom cluster offline (14d)', category: 'Cluster', severity: 'Critical', channels: ['PagerDuty', 'Slack'], status: 'Delivered' },
  { id: 'al_2', time: '10:38', event: 'plcy/model-gateway — 1 critical CVE', category: 'Supply chain', severity: 'Critical', channels: ['PagerDuty', 'Slack'], status: 'Delivered' },
  { id: 'al_b1', time: '10:36', event: 'Lumen Media chargeback — needs response', category: 'Disputes', severity: 'High', channels: ['PagerDuty', 'Slack', 'Email'], status: 'Delivered' },
  { id: 'al_3', time: '10:22', event: 'Break-glass root requested — Helix Health', category: 'Access', severity: 'High', channels: ['Slack', 'PagerDuty'], status: 'Delivered' },
  { id: 'al_b2', time: '10:18', event: 'Northwind Retail payment failed — insufficient funds', category: 'Billing', severity: 'High', channels: ['Slack', 'Email'], status: 'Delivered' },
  { id: 'al_dev1', time: '10:02', event: 'Unmanaged Linux host blocked — off VPN, no MDM', category: 'Device', severity: 'High', channels: ['Slack', 'Email'], status: 'Delivered' },
  { id: 'al_4', time: '09:55', event: 'Orbit Telecom backup failed', category: 'Backup', severity: 'High', channels: ['Slack', 'Email'], status: 'Delivered' },
  { id: 'al_b3', time: '09:48', event: 'Orbit Telecom dunning — final notice', category: 'Billing', severity: 'High', channels: ['Slack', 'Email'], status: 'Delivered' },
  { id: 'al_5', time: '09:40', event: 'Northwind Retail license expiring (Aug 1)', category: 'License', severity: 'Medium', channels: ['Email'], status: 'Delivered' },
  { id: 'al_6', time: '09:12', event: 'DSAR-4809 overdue — Saffron Foods', category: 'DSAR', severity: 'High', channels: ['Email', 'Slack'], status: 'Delivered' },
  { id: 'al_7', time: '08:47', event: 'Transfer blocked — Saffron → us-east-1', category: 'Sovereignty', severity: 'High', channels: ['Slack'], status: 'Muted' },
  { id: 'al_8', time: '08:30', event: 'SIEM webhook delivery', category: 'System', severity: 'Low', channels: ['Webhook'], status: 'Failed' },
]

export const notifTotals = {
  today: 128,
  channelsConnected: channels.filter((c) => c.connected).length,
  channelsTotal: channels.length,
  onCall: onCall.find((o) => o.role === 'Primary')?.name ?? '—',
  rulesEnabled: routingRules.filter((r) => r.enabled).length,
}
