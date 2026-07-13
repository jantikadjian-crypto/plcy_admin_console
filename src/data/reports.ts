/**
 * Registry of every generatable report in the console. One source of truth for
 * the Reports hub (/reports) and the global ⌘K search, so a new report shows up
 * in both by adding a single entry here.
 */
export type ReportCategory = 'Governance' | 'Compliance' | 'Security' | 'Commercial' | 'Customer'

export interface ReportDef {
  key: string
  title: string
  description: string
  /** Human scope label shown on the card and in search. */
  scope: string
  category: ReportCategory
  /** Fixed route to open the report; omit for per-customer reports. */
  to?: string
  /** True for the customer account report, which needs a customer chosen first. */
  needsCustomer?: boolean
  /** Where the report is also launchable from, for the hint line. */
  launchedFrom: string
  /** lucide icon name (resolved in the page to avoid importing icons here). */
  icon: 'gauge' | 'file-check' | 'shield-alert' | 'timer' | 'building'
}

export const reports: ReportDef[] = [
  {
    key: 'posture',
    title: 'Fleet Governance Posture',
    description: 'Point-in-time posture across SLA, billing, security, and infrastructure with a prioritized risk register.',
    scope: 'Fleet · scope-aware',
    category: 'Governance',
    to: '/reports/posture',
    launchedFrom: 'Dashboard',
    icon: 'gauge',
  },
  {
    key: 'compliance',
    title: 'Compliance Attestation',
    description: 'Framework coverage (SOC 2, GDPR, HIPAA, EU AI Act…) and control evidence for auditors.',
    scope: 'Platform-wide',
    category: 'Compliance',
    to: '/reports/compliance',
    launchedFrom: 'Compliance Reporting',
    icon: 'file-check',
  },
  {
    key: 'security',
    title: 'Security & Vulnerability',
    description: 'Supply-chain integrity and CVE posture across signed platform images.',
    scope: 'Platform images',
    category: 'Security',
    to: '/reports/security',
    launchedFrom: 'Container Registry · Supply Chain',
    icon: 'shield-alert',
  },
  {
    key: 'sla',
    title: 'SLA & Credits',
    description: 'Uptime attainment vs target, breaches, and service credits owed — the QBR artifact.',
    scope: 'Fleet · scope-aware',
    category: 'Commercial',
    to: '/reports/sla',
    launchedFrom: 'SLA & Maintenance',
    icon: 'timer',
  },
  {
    key: 'customer',
    title: 'Customer Account Report',
    description: 'A consolidated one-pager per customer — profile, SLA, billing, deployment, and open items.',
    scope: 'Single customer',
    category: 'Customer',
    needsCustomer: true,
    launchedFrom: 'Customers · customer page',
    icon: 'building',
  },
]

export const reportCategoryTone: Record<ReportCategory, 'blue' | 'green' | 'red' | 'purple' | 'orange'> = {
  Governance: 'blue',
  Compliance: 'green',
  Security: 'red',
  Commercial: 'purple',
  Customer: 'orange',
}
