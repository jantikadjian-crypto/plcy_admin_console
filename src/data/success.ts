/**
 * Customer Success & Support — the PLCY team's view of customer *health* (not
 * just billing): who's thriving, who's about to churn, what issues are open, and
 * what's up for renewal. Operator-internal; spans the whole customer base.
 *
 * Seeded from the fleet's customers so health/support/renewals line up with the
 * instances, licensing, and billing the rest of the console already shows.
 */

export type ChurnRisk = 'Low' | 'Medium' | 'High'
export type UsageTrend = 'up' | 'flat' | 'down'

export interface CustomerHealth {
  customer: string
  plan: string
  mrr: number
  health: number // 0-100 composite
  churn: ChurnRisk
  adoption: number // 0-100 feature adoption
  usageTrend: UsageTrend
  renewalDate: string
  csm: string // customer success manager
  trend: number[] // health over the last 8 weeks
  signals: string[] // why the health score is what it is
}

export const churnTone: Record<ChurnRisk, 'green' | 'yellow' | 'red'> = { Low: 'green', Medium: 'yellow', High: 'red' }
export const healthTone = (h: number) => (h >= 80 ? 'green' : h >= 65 ? 'yellow' : 'red')
export const usageArrow = (t: UsageTrend) => (t === 'up' ? '▲' : t === 'down' ? '▼' : '▬')

export const customerHealth: CustomerHealth[] = [
  { customer: 'Meridian Bank', plan: 'Enterprise', mrr: 25000, health: 92, churn: 'Low', adoption: 88, usageTrend: 'up', renewalDate: '2026-11-30', csm: 'A. Rivera', trend: [86, 87, 88, 89, 90, 90, 91, 92], signals: ['Usage up 12% MoM', 'All seats active', 'No open incidents'] },
  { customer: 'Vertex Capital', plan: 'Enterprise', mrr: 20000, health: 86, churn: 'Low', adoption: 82, usageTrend: 'up', renewalDate: '2026-11-30', csm: 'A. Rivera', trend: [80, 81, 82, 83, 84, 85, 85, 86], signals: ['Expanding to a 2nd region', 'Strong policy adoption'] },
  { customer: 'Atlas Logistics', plan: 'Business', mrr: 7000, health: 80, churn: 'Low', adoption: 74, usageTrend: 'up', renewalDate: '2027-03-08', csm: 'S. Okafor', trend: [74, 75, 76, 77, 78, 79, 79, 80], signals: ['Steady growth', 'Recently upgraded'] },
  { customer: 'Lumen Media', plan: 'Growth', mrr: 3000, health: 83, churn: 'Low', adoption: 77, usageTrend: 'up', renewalDate: '2026-12-22', csm: 'S. Okafor', trend: [78, 79, 80, 80, 81, 82, 82, 83], signals: ['High engagement for plan tier'] },
  { customer: 'Pinecrest Insurance', plan: 'Business', mrr: 8000, health: 78, churn: 'Medium', adoption: 66, usageTrend: 'flat', renewalDate: '2026-10-06', csm: 'A. Rivera', trend: [80, 79, 79, 78, 78, 78, 78, 78], signals: ['Adoption plateaued', 'Renewal in <90 days', '2 open tickets'] },
  { customer: 'Helix Health', plan: 'Enterprise', mrr: 18000, health: 74, churn: 'Medium', adoption: 70, usageTrend: 'flat', renewalDate: '2026-09-15', csm: 'S. Okafor', trend: [78, 77, 76, 75, 75, 74, 74, 74], signals: ['Air-gapped — slow bundle uptake', 'Renewal in <60 days', 'Support load rising'] },
  { customer: 'Ferro Manufacturing', plan: 'Growth', mrr: 3000, health: 66, churn: 'Medium', adoption: 55, usageTrend: 'down', renewalDate: '2026-09-14', csm: 'S. Okafor', trend: [72, 71, 70, 69, 68, 67, 67, 66], signals: ['Usage down 8%', 'Behind on updates (v4.7.9)', 'Low seat utilisation'] },
  { customer: 'Northwind Retail', plan: 'Business', mrr: 9000, health: 58, churn: 'High', adoption: 52, usageTrend: 'down', renewalDate: '2026-08-01', csm: 'A. Rivera', trend: [70, 68, 66, 64, 62, 60, 59, 58], signals: ['Usage down 18% over 2 months', 'Renewal in <30 days', '5 open tickets, 1 breached SLA', 'Exec sponsor left'] },
]
export const healthByCustomer = (c: string) => customerHealth.find((h) => h.customer === c)

/* ------------------------------------------------------------------ */
/* Support tickets                                                     */
/* ------------------------------------------------------------------ */
export type TicketPriority = 'Urgent' | 'High' | 'Normal' | 'Low'
export type TicketStatus = 'Open' | 'In progress' | 'Waiting' | 'Resolved'
export type SLA = 'On track' | 'Due soon' | 'Breached'

export interface Ticket {
  id: string
  customer: string
  subject: string
  priority: TicketPriority
  status: TicketStatus
  category: string
  assignee?: string
  opened: string
  updated: string
  sla: SLA
  description: string
}

export const priorityTone: Record<TicketPriority, 'red' | 'orange' | 'blue' | 'slate'> = { Urgent: 'red', High: 'orange', Normal: 'blue', Low: 'slate' }
export const ticketStatusTone: Record<TicketStatus, 'red' | 'blue' | 'yellow' | 'green'> = { Open: 'red', 'In progress': 'blue', Waiting: 'yellow', Resolved: 'green' }
export const slaTone: Record<SLA, 'green' | 'yellow' | 'red'> = { 'On track': 'green', 'Due soon': 'yellow', Breached: 'red' }

export const ticketSeed: Ticket[] = [
  { id: 'TKT-4012', customer: 'Northwind Retail', subject: 'Policy pack update stuck — enforcement not applying', priority: 'Urgent', status: 'Open', category: 'Policy', opened: '2026-07-23', updated: '2026-07-24', sla: 'Breached', description: 'Customer reports the latest policy pack rolled out but enforcement decisions still use the prior version on 2 clusters.' },
  { id: 'TKT-4011', customer: 'Northwind Retail', subject: 'Requesting export of 6 months of audit logs', priority: 'Normal', status: 'Waiting', category: 'Compliance', assignee: 'A. Rivera', opened: '2026-07-22', updated: '2026-07-23', sla: 'On track', description: 'DSAR-adjacent request; waiting on the customer to confirm the date range.' },
  { id: 'TKT-4009', customer: 'Helix Health', subject: 'Air-gapped bundle sync failing checksum', priority: 'High', status: 'In progress', category: 'Deployment', assignee: 'S. Okafor', opened: '2026-07-21', updated: '2026-07-24', sla: 'Due soon', description: 'Offline update bundle fails integrity check on import. Investigating signing key mismatch.' },
  { id: 'TKT-4008', customer: 'Helix Health', subject: 'How to scope a model to a single department', priority: 'Low', status: 'Open', category: 'How-to', opened: '2026-07-20', updated: '2026-07-20', sla: 'On track', description: 'Guidance request on per-department model allowlists.' },
  { id: 'TKT-4006', customer: 'Pinecrest Insurance', subject: 'False positives on the consent gate', priority: 'High', status: 'In progress', category: 'Policy', assignee: 'A. Rivera', opened: '2026-07-19', updated: '2026-07-23', sla: 'On track', description: 'Benign requests being blocked by CP-02. Tuning sensitivity with the customer.' },
  { id: 'TKT-4005', customer: 'Pinecrest Insurance', subject: 'Add two admin seats', priority: 'Normal', status: 'Resolved', category: 'Billing', assignee: 'A. Rivera', opened: '2026-07-18', updated: '2026-07-19', sla: 'On track', description: 'Seat expansion processed and invoiced.' },
  { id: 'TKT-4003', customer: 'Meridian Bank', subject: 'SSO metadata refresh', priority: 'Normal', status: 'Resolved', category: 'Integration', assignee: 'S. Okafor', opened: '2026-07-16', updated: '2026-07-17', sla: 'On track', description: 'Rotated SAML certificate; verified login.' },
  { id: 'TKT-4001', customer: 'Ferro Manufacturing', subject: 'Upgrade guidance from v4.7.9', priority: 'Normal', status: 'Open', category: 'Deployment', opened: '2026-07-15', updated: '2026-07-15', sla: 'Due soon', description: 'Customer is two releases behind; wants a low-risk upgrade path.' },
  { id: 'TKT-3998', customer: 'Atlas Logistics', subject: 'API key rotation question', priority: 'Low', status: 'Resolved', category: 'How-to', assignee: 'S. Okafor', opened: '2026-07-12', updated: '2026-07-13', sla: 'On track', description: 'Walked through programmatic key rotation.' },
  { id: 'TKT-3995', customer: 'Vertex Capital', subject: 'Add ap-southeast-1 residency policy', priority: 'Normal', status: 'In progress', category: 'Residency', assignee: 'A. Rivera', opened: '2026-07-11', updated: '2026-07-22', sla: 'On track', description: 'Second-region expansion; configuring residency + transfer rules.' },
]

/* ------------------------------------------------------------------ */
/* Renewals pipeline                                                   */
/* ------------------------------------------------------------------ */
export type RenewalStage = 'On track' | 'At risk' | 'In negotiation' | 'Churning' | 'Renewed'

export interface Renewal {
  customer: string
  plan: string
  arr: number
  renewalDate: string
  stage: RenewalStage
  owner: string
  probability: number // 0-100
}

export const RENEWAL_STAGES: RenewalStage[] = ['On track', 'In negotiation', 'At risk', 'Churning', 'Renewed']
export const stageTone: Record<RenewalStage, 'green' | 'blue' | 'yellow' | 'red' | 'slate'> = { 'On track': 'green', 'In negotiation': 'blue', 'At risk': 'yellow', Churning: 'red', Renewed: 'slate' }

export const renewalSeed: Renewal[] = [
  { customer: 'Northwind Retail', plan: 'Business', arr: 108000, renewalDate: '2026-08-01', stage: 'At risk', owner: 'A. Rivera', probability: 45 },
  { customer: 'Ferro Manufacturing', plan: 'Growth', arr: 36000, renewalDate: '2026-09-14', stage: 'At risk', owner: 'S. Okafor', probability: 55 },
  { customer: 'Helix Health', plan: 'Enterprise', arr: 216000, renewalDate: '2026-09-15', stage: 'In negotiation', owner: 'S. Okafor', probability: 70 },
  { customer: 'Pinecrest Insurance', plan: 'Business', arr: 96000, renewalDate: '2026-10-06', stage: 'On track', owner: 'A. Rivera', probability: 82 },
  { customer: 'Meridian Bank', plan: 'Enterprise', arr: 300000, renewalDate: '2026-11-30', stage: 'On track', owner: 'A. Rivera', probability: 95 },
  { customer: 'Vertex Capital', plan: 'Enterprise', arr: 240000, renewalDate: '2026-11-30', stage: 'In negotiation', owner: 'A. Rivera', probability: 88 },
  { customer: 'Lumen Media', plan: 'Growth', arr: 36000, renewalDate: '2026-12-22', stage: 'On track', owner: 'S. Okafor', probability: 90 },
  { customer: 'Atlas Logistics', plan: 'Business', arr: 84000, renewalDate: '2027-03-08', stage: 'On track', owner: 'S. Okafor', probability: 92 },
]
