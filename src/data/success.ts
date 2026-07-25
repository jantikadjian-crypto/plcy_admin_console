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

/* ------------------------------------------------------------------ */
/* Explainable health — weighted sub-scores                            */
/* ------------------------------------------------------------------ */
/**
 * The composite `health` above isn't a black box: it rolls up five weighted
 * sub-scores. `healthComposite` reproduces the seeded number exactly, so the
 * drill-down can show *why* an account scores what it does.
 */
export type HealthDimKey = 'usage' | 'adoption' | 'support' | 'sentiment' | 'financial'
export interface HealthDim { key: HealthDimKey; label: string; weight: number; hint: string }

export const HEALTH_WEIGHTS: HealthDim[] = [
  { key: 'usage', label: 'Product usage', weight: 30, hint: 'Request volume & active-seat trend vs. plan' },
  { key: 'adoption', label: 'Feature adoption', weight: 25, hint: 'Breadth of governance features in active use' },
  { key: 'support', label: 'Support health', weight: 20, hint: 'Ticket load, SLA attainment, escalations' },
  { key: 'sentiment', label: 'Sentiment', weight: 15, hint: 'Exec engagement, NPS, champion strength' },
  { key: 'financial', label: 'Financial', weight: 10, hint: 'Payment standing & contract commitment' },
]

export type HealthBreakdown = Record<HealthDimKey, number>

export const healthScores: Record<string, HealthBreakdown> = {
  'Meridian Bank': { usage: 94, adoption: 88, support: 94, sentiment: 90, financial: 92 },
  'Vertex Capital': { usage: 88, adoption: 82, support: 88, sentiment: 86, financial: 90 },
  'Atlas Logistics': { usage: 82, adoption: 74, support: 84, sentiment: 80, financial: 82 },
  'Lumen Media': { usage: 84, adoption: 77, support: 86, sentiment: 88, financial: 82 },
  'Pinecrest Insurance': { usage: 80, adoption: 66, support: 82, sentiment: 82, financial: 88 },
  'Helix Health': { usage: 74, adoption: 70, support: 70, sentiment: 76, financial: 84 },
  'Ferro Manufacturing': { usage: 64, adoption: 55, support: 74, sentiment: 68, financial: 80 },
  'Northwind Retail': { usage: 58, adoption: 54, support: 56, sentiment: 54, financial: 80 },
}

export const healthComposite = (b: HealthBreakdown) =>
  Math.round(HEALTH_WEIGHTS.reduce((sum, d) => sum + d.weight * b[d.key], 0) / 100)

export const dimTone = (v: number) => (v >= 80 ? 'green' : v >= 65 ? 'yellow' : 'red')

/* ------------------------------------------------------------------ */
/* Account 360 — contacts & feature adoption                           */
/* ------------------------------------------------------------------ */
export type ContactStatus = 'active' | 'departed'
export interface Contact { name: string; role: string; email: string; champion?: boolean; status: ContactStatus }

export const contactsByCustomer: Record<string, Contact[]> = {
  'Meridian Bank': [
    { name: 'Dana Whitfield', role: 'VP, Risk & Compliance', email: 'dana.whitfield@meridianbank.com', champion: true, status: 'active' },
    { name: 'Omar Haddad', role: 'Head of ML Platform', email: 'omar.haddad@meridianbank.com', status: 'active' },
  ],
  'Vertex Capital': [
    { name: 'Priya Nair', role: 'CISO', email: 'priya.nair@vertexcap.com', champion: true, status: 'active' },
    { name: 'Tom Beck', role: 'Data Governance Lead', email: 'tom.beck@vertexcap.com', status: 'active' },
  ],
  'Atlas Logistics': [
    { name: 'Marta Kovač', role: 'Director of IT', email: 'marta.kovac@atlaslog.com', champion: true, status: 'active' },
  ],
  'Lumen Media': [
    { name: 'Chris Anand', role: 'Head of AI', email: 'chris.anand@lumenmedia.com', champion: true, status: 'active' },
  ],
  'Pinecrest Insurance': [
    { name: 'Gail Fenn', role: 'Compliance Officer', email: 'gail.fenn@pinecrest.com', champion: true, status: 'active' },
    { name: 'Raymond Ortiz', role: 'IT Security', email: 'raymond.ortiz@pinecrest.com', status: 'active' },
  ],
  'Helix Health': [
    { name: 'Dr. Susan Vale', role: 'Chief Medical Information Officer', email: 'susan.vale@helixhealth.org', champion: true, status: 'active' },
    { name: 'Nathan Cole', role: 'Infrastructure Lead', email: 'nathan.cole@helixhealth.org', status: 'active' },
  ],
  'Ferro Manufacturing': [
    { name: 'Luis Moreno', role: 'IT Manager', email: 'luis.moreno@ferromfg.com', status: 'active' },
  ],
  'Northwind Retail': [
    { name: 'Karen Doyle', role: 'VP Digital (former sponsor)', email: 'karen.doyle@northwind.com', champion: true, status: 'departed' },
    { name: 'Ben Sato', role: 'Interim IT Lead', email: 'ben.sato@northwind.com', status: 'active' },
  ],
}

/** The governance features we track adoption of, in rollout order. */
export const FEATURES = ['Policy Packs', 'Enforcement', 'Model Routing', 'Residency Controls', 'Red-Team Evals', 'SSO / SCIM', 'Audit Export', 'DSAR Automation'] as const
export type Feature = (typeof FEATURES)[number]

/** Features each customer actively uses (subset of FEATURES). */
export const featureAdoption: Record<string, Feature[]> = {
  'Meridian Bank': ['Policy Packs', 'Enforcement', 'Model Routing', 'Residency Controls', 'Red-Team Evals', 'SSO / SCIM', 'Audit Export'],
  'Vertex Capital': ['Policy Packs', 'Enforcement', 'Model Routing', 'Residency Controls', 'SSO / SCIM', 'Audit Export'],
  'Atlas Logistics': ['Policy Packs', 'Enforcement', 'Model Routing', 'SSO / SCIM'],
  'Lumen Media': ['Policy Packs', 'Enforcement', 'Model Routing', 'Audit Export'],
  'Pinecrest Insurance': ['Policy Packs', 'Enforcement', 'SSO / SCIM'],
  'Helix Health': ['Policy Packs', 'Enforcement', 'Residency Controls', 'Audit Export'],
  'Ferro Manufacturing': ['Policy Packs', 'Enforcement'],
  'Northwind Retail': ['Policy Packs', 'Enforcement', 'SSO / SCIM'],
}

/* ------------------------------------------------------------------ */
/* Activity timeline                                                   */
/* ------------------------------------------------------------------ */
export type ActivityType = 'note' | 'call' | 'email' | 'ticket' | 'renewal' | 'usage' | 'milestone'
export interface Activity { id: string; customer: string; type: ActivityType; summary: string; at: string; by: string }

export const activityTone: Record<ActivityType, 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'slate'> = {
  note: 'slate', call: 'blue', email: 'blue', ticket: 'yellow', renewal: 'purple', usage: 'green', milestone: 'green',
}

export const activitySeed: Activity[] = [
  { id: 'ACT-201', customer: 'Northwind Retail', type: 'usage', summary: 'Weekly active seats fell below 40% of licensed seats', at: '2026-07-22', by: 'system' },
  { id: 'ACT-202', customer: 'Northwind Retail', type: 'milestone', summary: 'Exec sponsor Karen Doyle marked as departed — champion lost', at: '2026-07-20', by: 'A. Rivera' },
  { id: 'ACT-203', customer: 'Northwind Retail', type: 'call', summary: 'Escalation call with interim IT lead; committed to a save plan', at: '2026-07-18', by: 'A. Rivera' },
  { id: 'ACT-204', customer: 'Helix Health', type: 'ticket', summary: 'Air-gapped bundle sync failure escalated to deployment eng', at: '2026-07-24', by: 'S. Okafor' },
  { id: 'ACT-205', customer: 'Pinecrest Insurance', type: 'email', summary: 'Shared consent-gate tuning guide; awaiting confirmation', at: '2026-07-23', by: 'A. Rivera' },
  { id: 'ACT-206', customer: 'Meridian Bank', type: 'usage', summary: 'Request volume up 12% MoM — expansion signal', at: '2026-07-21', by: 'system' },
  { id: 'ACT-207', customer: 'Vertex Capital', type: 'renewal', summary: 'Second-region expansion added to renewal scope (+$40k ARR)', at: '2026-07-19', by: 'A. Rivera' },
  { id: 'ACT-208', customer: 'Ferro Manufacturing', type: 'note', summary: 'Two releases behind (v4.7.9); low seat utilisation persists', at: '2026-07-15', by: 'S. Okafor' },
]

/* ------------------------------------------------------------------ */
/* CS tasks & recommended plays                                        */
/* ------------------------------------------------------------------ */
export type TaskStatus = 'open' | 'done'
export interface CSTask { id: string; customer: string; title: string; play?: string; priority: TicketPriority; due: string; status: TaskStatus; owner?: string }

/** Reusable playbooks the CSM can run against an account. */
export interface Play { id: string; title: string; when: string; steps: string[] }
export const RECOMMENDED_PLAYS: Play[] = [
  { id: 'save', title: 'Churn save play', when: 'Health < 65 or renewal < 30 days at risk', steps: ['Book an exec business review within 5 days', 'Rebuild the champion — identify a new economic buyer', 'Agree a 30-day value plan with measurable adoption goals', 'Offer temporary onboarding / enablement support'] },
  { id: 'adopt', title: 'Adoption uplift play', when: 'Adoption plateaued or usage flat/down', steps: ['Run a feature-gap workshop against unused governance features', 'Enable one high-value feature (e.g. Red-Team Evals) as a pilot', 'Set a 2-week activation checkpoint', 'Share a peer benchmark from a similar account'] },
  { id: 'expand', title: 'Expansion play', when: 'Health ≥ 80 and usage trending up', steps: ['Quantify overage / seat growth vs. contract', 'Propose the next plan tier or a second region', 'Loop in the champion for an internal business case', 'Time the proposal to the renewal window'] },
  { id: 'upgrade', title: 'Version upgrade play', when: 'Two or more releases behind', steps: ['Share the low-risk upgrade path and changelog', 'Schedule a staged upgrade with a rollback checkpoint', 'Verify policy packs re-apply post-upgrade'] },
]
export const playById = (id?: string) => RECOMMENDED_PLAYS.find((p) => p.id === id)

export const taskSeed: CSTask[] = [
  { id: 'CST-31', customer: 'Northwind Retail', title: 'Run churn save play before 2026-08-01 renewal', play: 'save', priority: 'Urgent', due: '2026-07-28', status: 'open', owner: 'A. Rivera' },
  { id: 'CST-32', customer: 'Northwind Retail', title: 'Identify & recruit a new exec sponsor', play: 'save', priority: 'High', due: '2026-07-30', status: 'open' },
  { id: 'CST-33', customer: 'Ferro Manufacturing', title: 'Guide upgrade off v4.7.9', play: 'upgrade', priority: 'High', due: '2026-08-05', status: 'open', owner: 'S. Okafor' },
  { id: 'CST-34', customer: 'Ferro Manufacturing', title: 'Adoption workshop — lift seat utilisation', play: 'adopt', priority: 'Normal', due: '2026-08-12', status: 'open' },
  { id: 'CST-35', customer: 'Pinecrest Insurance', title: 'Close out consent-gate false positives', priority: 'Normal', due: '2026-07-29', status: 'open', owner: 'A. Rivera' },
  { id: 'CST-36', customer: 'Helix Health', title: 'Confirm air-gapped bundle sync fix landed', priority: 'High', due: '2026-07-26', status: 'open', owner: 'S. Okafor' },
  { id: 'CST-37', customer: 'Vertex Capital', title: 'Draft expansion proposal for 2nd region', play: 'expand', priority: 'Normal', due: '2026-08-15', status: 'open', owner: 'A. Rivera' },
  { id: 'CST-38', customer: 'Meridian Bank', title: 'Prep QBR deck — usage up 12%', play: 'expand', priority: 'Low', due: '2026-08-20', status: 'done', owner: 'A. Rivera' },
]

export const taskStatusTone: Record<TaskStatus, 'yellow' | 'green'> = { open: 'yellow', done: 'green' }

/* ------------------------------------------------------------------ */
/* Churn Watch — early-warning derived from health + renewal risk      */
/* ------------------------------------------------------------------ */
export type ChurnSeverity = 'Critical' | 'High' | 'Medium'
export const churnSeverityTone: Record<ChurnSeverity, 'red' | 'orange' | 'yellow'> = { Critical: 'red', High: 'orange', Medium: 'yellow' }
export const CHURN_SEVERITY_RANK: Record<ChurnSeverity, number> = { Critical: 0, High: 1, Medium: 2 }

/** The state a CS rep drives a churn case through. */
export type ChurnCaseStatus = 'New' | 'Acknowledged' | 'Investigating' | 'Contained' | 'Saved' | 'Lost'
export const CHURN_STATUSES: ChurnCaseStatus[] = ['New', 'Acknowledged', 'Investigating', 'Contained', 'Saved', 'Lost']
export const churnStatusTone: Record<ChurnCaseStatus, 'red' | 'orange' | 'blue' | 'yellow' | 'green' | 'slate'> = {
  New: 'red', Acknowledged: 'orange', Investigating: 'blue', Contained: 'yellow', Saved: 'green', Lost: 'slate',
}
/** A closed case no longer counts as open work. */
export const isChurnClosed = (s: ChurnCaseStatus) => s === 'Saved' || s === 'Lost'

/** The reps a churn case can be routed to for active follow-up. */
export const CS_REPS = ['A. Rivera', 'S. Okafor', 'You']

/** The channels a churn-risk alert fans out to (mirrors the notification routing rule). */
export const CHURN_NOTIFY_CHANNELS = ['#cs-churn-watch', 'CS on-call', 'Email'] as const

export interface ChurnAlert {
  customer: string
  severity: ChurnSeverity
  health: number
  churn: ChurnRisk
  arr: number
  renewalDate: string
  daysToRenewal: number
  csm: string
  reasons: string[]
  raisedAt: string
}

export const renewalArr = (c: string) => renewalSeed.find((r) => r.customer === c)?.arr ?? 0
const arrFor = renewalArr

/** Reference "now" for the churn desk (date + time so SLA ages compute in hours). */
export const CHURN_NOW = '2026-07-24T14:00:00'
/** First-response SLA — hours a case may sit unassigned before it escalates. */
export const CHURN_SLA_HOURS: Record<ChurnSeverity, number> = { Critical: 4, High: 24, Medium: 72 }
/** When each alert was first raised (drives SLA aging). Defaults to midday if unlisted. */
const CHURN_RAISED: Record<string, string> = {
  'Northwind Retail': '2026-07-24T06:00:00',
  'Ferro Manufacturing': '2026-07-24T02:00:00',
  'Helix Health': '2026-07-24T09:00:00',
  'Pinecrest Insurance': '2026-07-23T20:00:00',
}

export const hoursBetween = (from: string, to: string) => Math.max(0, (Date.parse(to) - Date.parse(from)) / 3_600_000)
export const churnAgeHours = (a: ChurnAlert, now = CHURN_NOW) => hoursBetween(a.raisedAt, now)
/**
 * A case breaches when its owning CSM hasn't responded past the severity SLA.
 * The account's CSM owns it from the moment it's raised; "responded" means the
 * case has moved off New (acknowledged / notified / assigned / worked).
 */
export const churnSlaBreached = (a: ChurnAlert, responded: boolean, now = CHURN_NOW) =>
  !responded && churnAgeHours(a, now) > CHURN_SLA_HOURS[a.severity]
export const fmtAge = (h: number) => (h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`)

/**
 * Turn the static health portfolio into actionable churn alerts. An account
 * trips the watch when its risk, health, usage, adoption, or renewal timing
 * cross a threshold; severity escalates for High churn, sub-60 health, or an
 * unsecured renewal inside 30 days.
 */
export function deriveChurnAlerts(asOf = '2026-07-24'): ChurnAlert[] {
  const now = Date.parse(asOf)
  const out: ChurnAlert[] = []
  for (const h of customerHealth) {
    const reasons: string[] = []
    const days = Math.round((Date.parse(h.renewalDate) - now) / 86400000)
    if (h.churn === 'High') reasons.push('Churn risk flagged High')
    else if (h.churn === 'Medium') reasons.push('Churn risk flagged Medium')
    if (h.health < 60) reasons.push(`Health critical (${h.health})`)
    else if (h.health < 70) reasons.push(`Health below target (${h.health})`)
    if (h.usageTrend === 'down') reasons.push('Usage trending down')
    if (h.adoption < 60) reasons.push(`Low feature adoption (${h.adoption}%)`)
    const drop = h.trend[0] - h.trend[h.trend.length - 1]
    if (drop >= 8) reasons.push(`Health fell ${drop} pts over 8 weeks`)
    if (days <= 30 && days >= 0 && h.churn !== 'Low') reasons.push(`Renewal in ${days}d and not secured`)
    if (reasons.length === 0) continue // healthy — no alert

    let severity: ChurnSeverity = 'Medium'
    if (h.churn === 'High' || h.health < 60 || (days <= 30 && days >= 0 && h.churn !== 'Low')) severity = 'Critical'
    else if (h.churn === 'Medium' || h.health < 70 || h.usageTrend === 'down') severity = 'High'

    out.push({ customer: h.customer, severity, health: h.health, churn: h.churn, arr: arrFor(h.customer), renewalDate: h.renewalDate, daysToRenewal: days, csm: h.csm, reasons, raisedAt: CHURN_RAISED[h.customer] ?? `${asOf}T12:00:00` })
  }
  return out.sort((a, b) => CHURN_SEVERITY_RANK[a.severity] - CHURN_SEVERITY_RANK[b.severity] || a.health - b.health)
}

/* ------------------------------------------------------------------ */
/* Portfolio retention rollup                                          */
/* ------------------------------------------------------------------ */
/** Portfolio baseline for retention math (annualised, $). */
export const RETENTION_BASE = { baseArr: 1_116_000, expansionArr: 132_000, contractionArr: 24_000 }

/** Saves vs. losses over the trailing 6 months (count of accounts). */
export interface OutcomeMonth { month: string; saved: number; lost: number }
export const saveLossTrend: OutcomeMonth[] = [
  { month: 'Feb', saved: 2, lost: 0 },
  { month: 'Mar', saved: 1, lost: 1 },
  { month: 'Apr', saved: 3, lost: 0 },
  { month: 'May', saved: 2, lost: 1 },
  { month: 'Jun', saved: 2, lost: 0 },
  { month: 'Jul', saved: 1, lost: 1 },
]

export interface RetentionMetrics { base: number; lostArr: number; savedArr: number; nrr: number; gross: number }
/**
 * Net & gross revenue retention, adjusting the baseline by live case outcomes:
 * accounts a rep marks Lost pull retention down, Saved ARR is credited back.
 */
export function retentionMetrics(cases: Record<string, { status: ChurnCaseStatus }>): RetentionMetrics {
  const entries = Object.entries(cases)
  const lostArr = entries.filter(([, c]) => c.status === 'Lost').reduce((s, [cust]) => s + renewalArr(cust), 0)
  const savedArr = entries.filter(([, c]) => c.status === 'Saved').reduce((s, [cust]) => s + renewalArr(cust), 0)
  const { baseArr, expansionArr, contractionArr } = RETENTION_BASE
  const nrr = ((baseArr + expansionArr - contractionArr - lostArr) / baseArr) * 100
  const gross = ((baseArr - contractionArr - lostArr) / baseArr) * 100
  return { base: baseArr, lostArr, savedArr, nrr, gross }
}

/* ------------------------------------------------------------------ */
/* Renewal signals — closing the CS loop back onto the pipeline        */
/* ------------------------------------------------------------------ */
/**
 * A renewal's recorded stage is a *judgement*; health, churn cases, and the task
 * queue are the *evidence*. This derivation puts the two side by side so the
 * pipeline can't quietly drift from what the rest of Customer Success knows:
 *
 *   • `suggested` — the stage the evidence implies, independent of what's recorded.
 *   • `mismatch`  — the recorded stage is more optimistic than the evidence.
 *   • `covered`   — someone has open work on the account (a task = a commitment).
 *   • `adjusted`  — the probability re-scored for health and execution, with the
 *                   reasons kept alongside so the number is never a black box.
 */

/** How rosy each stage reads, so an optimistic call can be compared to the evidence. */
const STAGE_OPTIMISM: Record<RenewalStage, number> = { Renewed: 4, 'On track': 3, 'In negotiation': 2, 'At risk': 1, Churning: 0 }

/** Stages that mean the renewal still needs active work to land. */
export const isRenewalOpen = (s: RenewalStage) => s !== 'Renewed'
/** Stages where losing the account is a live possibility. */
export const isRenewalAtRisk = (s: RenewalStage) => s === 'At risk' || s === 'Churning'

export interface ProbabilityAdjustment { label: string; delta: number }

export interface RenewalSignal {
  customer: string
  health?: number
  churn?: ChurnRisk
  openTasks: number
  overdueTasks: number
  caseStatus?: ChurnCaseStatus
  /** Stage implied by health, churn case, and execution — regardless of what's recorded. */
  suggested: RenewalStage
  /** The recorded stage is rosier than the evidence supports. */
  mismatch: boolean
  /** Someone has open work on this account. */
  covered: boolean
  /** At-risk with nobody working it — the gap the loop is meant to close. */
  unworked: boolean
  /** Recorded probability re-scored for health and execution (5–99). */
  adjusted: number
  /** `adjusted` − recorded, for an at-a-glance delta. */
  delta: number
  /** Every adjustment that moved the number, so it stays explainable. */
  adjustments: ProbabilityAdjustment[]
  /** Why the evidence suggests what it does. */
  reasons: string[]
}

const clampProbability = (n: number) => Math.max(5, Math.min(99, Math.round(n)))

/**
 * Score one renewal against everything Customer Success knows about the account.
 * `tasks` is the full task list (filtered here) and `caseStatus` the Churn Watch
 * case, if a rep has opened one.
 */
export function renewalSignal(
  r: Renewal,
  tasks: CSTask[],
  caseStatus?: ChurnCaseStatus,
  asOf = '2026-07-24',
): RenewalSignal {
  const now = Date.parse(asOf)
  const h = healthByCustomer(r.customer)
  const days = Math.round((Date.parse(r.renewalDate) - now) / 86400000)

  const mine = tasks.filter((t) => t.customer === r.customer && t.status === 'open')
  const overdueTasks = mine.filter((t) => Date.parse(t.due) < now).length
  const covered = mine.length > 0

  /* ---- what the evidence says the stage should be ---- */
  const reasons: string[] = []
  let suggested: RenewalStage = 'On track'
  if (caseStatus === 'Lost') {
    suggested = 'Churning'
    reasons.push('Churn case marked Lost')
  } else if (h) {
    const imminent = days <= 30 && days >= 0
    if (h.churn === 'High' || h.health < 60) {
      suggested = imminent ? 'Churning' : 'At risk'
      reasons.push(h.churn === 'High' ? 'Churn risk flagged High' : `Health critical (${h.health})`)
      if (imminent) reasons.push(`Renewal in ${days}d`)
    } else if (h.churn === 'Medium' || h.health < 70 || h.usageTrend === 'down') {
      suggested = 'At risk'
      if (h.churn === 'Medium') reasons.push('Churn risk flagged Medium')
      if (h.health < 70) reasons.push(`Health below target (${h.health})`)
      if (h.usageTrend === 'down') reasons.push('Usage trending down')
    }
    // A contained or saved case is evidence the slide has been arrested.
    if (suggested !== 'On track' && (caseStatus === 'Contained' || caseStatus === 'Saved')) {
      suggested = caseStatus === 'Saved' ? 'On track' : 'In negotiation'
      reasons.push(`Churn case ${caseStatus.toLowerCase()}`)
    }
  }

  // A renewed deal is settled — no second-guessing it.
  const mismatch = isRenewalOpen(r.stage) && STAGE_OPTIMISM[r.stage] > STAGE_OPTIMISM[suggested]
  const unworked = isRenewalOpen(r.stage) && (isRenewalAtRisk(r.stage) || isRenewalAtRisk(suggested)) && !covered

  /* ---- re-score the probability, keeping every reason ---- */
  const adjustments: ProbabilityAdjustment[] = []
  if (isRenewalOpen(r.stage)) {
    if (h && h.health < 60) adjustments.push({ label: `Health critical (${h.health})`, delta: -15 })
    else if (h && h.health < 70) adjustments.push({ label: `Health below target (${h.health})`, delta: -8 })
    if (overdueTasks > 0) adjustments.push({ label: `${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`, delta: -Math.min(10, overdueTasks * 5) })
    if (unworked) adjustments.push({ label: 'At risk with no open save work', delta: -10 })
    if (caseStatus === 'Contained') adjustments.push({ label: 'Churn case contained', delta: 5 })
    if (caseStatus === 'Saved') adjustments.push({ label: 'Churn case saved', delta: 10 })
    if (caseStatus === 'Lost') adjustments.push({ label: 'Churn case lost', delta: -40 })
    if (covered && overdueTasks === 0 && !unworked) adjustments.push({ label: 'Save work on track', delta: 4 })
  }
  const adjusted = clampProbability(adjustments.reduce((n, a) => n + a.delta, r.probability))

  return {
    customer: r.customer,
    health: h?.health,
    churn: h?.churn,
    openTasks: mine.length,
    overdueTasks,
    caseStatus,
    suggested,
    mismatch,
    covered,
    unworked,
    adjusted,
    delta: adjusted - r.probability,
    adjustments,
    reasons,
  }
}

/** Which play to reach for when a renewal needs work, given the evidence. */
export const suggestedPlayFor = (s: RenewalSignal): string =>
  s.suggested === 'Churning' || (s.health ?? 100) < 65 ? 'save' : s.suggested === 'At risk' ? 'adopt' : 'expand'
