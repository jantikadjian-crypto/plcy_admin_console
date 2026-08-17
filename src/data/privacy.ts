/**
 * Privacy, data-transfer, sub-processor and privileged-access data for the
 * PLCY control plane. Supports the Sovereignty & Privacy track: cross-border
 * transfer register, sub-processor registry, data-subject requests (DSAR),
 * and break-glass access to client environments.
 */

/* ------------------------------------------------------------------ */
/* Cross-border data transfers                                         */
/* ------------------------------------------------------------------ */
export type TransferMechanism = 'In-region only' | 'Adequacy decision' | 'SCCs' | 'Air-gapped (no egress)' | 'Blocked'
export type TransferStatus = 'Approved' | 'Under review' | 'Blocked'

/**
 * Full names for the acronym transfer-safeguard mechanisms (shared by the
 * Transfers register and the Residency policy editor). Only genuine acronyms
 * are expanded — self-describing values (e.g. "Adequacy decision") return
 * undefined so callers can skip the redundant label.
 */
export const MECHANISM_FULL: Record<string, string> = {
  SCCs: 'Standard Contractual Clauses',
  BCRs: 'Binding Corporate Rules',
}
export const mechanismFull = (m: string): string | undefined => MECHANISM_FULL[m]
export type TIA = 'Complete' | 'Pending' | 'N/A'

export interface Transfer {
  id: string
  customer: string
  from: string
  to: string
  dataCategory: string
  mechanism: TransferMechanism
  status: TransferStatus
  tia: TIA
  reviewed: string
}

export const transfers: Transfer[] = [
  { id: 'TR-2041', customer: 'Northwind Retail', from: 'eu-central-1', to: 'eu-central-1', dataCategory: 'Prompts · PII', mechanism: 'In-region only', status: 'Approved', tia: 'Complete', reviewed: '2026-06-30' },
  { id: 'TR-2039', customer: 'Meridian Bank', from: 'us-east-1', to: 'us-west-2', dataCategory: 'Backups (DR)', mechanism: 'In-region only', status: 'Approved', tia: 'N/A', reviewed: '2026-06-28' },
  { id: 'TR-2036', customer: 'Saffron Foods', from: 'eu-west-1', to: 'us-east-1', dataCategory: 'Model inference', mechanism: 'Blocked', status: 'Blocked', tia: 'Pending', reviewed: '2026-07-02' },
  { id: 'TR-2030', customer: 'Vertex Capital', from: 'ap-southeast-1', to: 'ap-southeast-1', dataCategory: 'Prompts · Financial', mechanism: 'In-region only', status: 'Approved', tia: 'Complete', reviewed: '2026-06-20' },
  { id: 'TR-2028', customer: 'Global (all clients)', from: 'All regions', to: 'us-east-1', dataCategory: 'Operational metadata', mechanism: 'Adequacy decision', status: 'Approved', tia: 'Complete', reviewed: '2026-06-15' },
  { id: 'TR-2024', customer: 'Helix Health', from: 'de-sov-1', to: 'de-sov-1', dataCategory: 'PHI', mechanism: 'Air-gapped (no egress)', status: 'Approved', tia: 'N/A', reviewed: '2026-06-10' },
  { id: 'TR-2019', customer: 'Atlas Logistics', from: 'us-east-1', to: 'eu-central-1', dataCategory: 'Analytics export', mechanism: 'SCCs', status: 'Under review', tia: 'Pending', reviewed: '2026-07-04' },
]

/* ------------------------------------------------------------------ */
/* Sub-processors                                                      */
/* ------------------------------------------------------------------ */
export type SubprocStatus = 'Approved' | 'Under review' | 'Restricted'

export interface Subprocessor {
  id: string
  name: string
  purpose: string
  location: string
  dataAccess: 'Content' | 'PII' | 'Metadata' | 'None'
  status: SubprocStatus
  dpa: boolean
  restrictedRegions: string[]
}

export const subprocessors: Subprocessor[] = [
  { id: 'sp_aws', name: 'Amazon Web Services', purpose: 'Cloud infrastructure (region-pinned)', location: 'Global · in-region', dataAccess: 'Content', status: 'Approved', dpa: true, restrictedRegions: [] },
  { id: 'sp_openai', name: 'OpenAI', purpose: 'LLM inference', location: 'United States', dataAccess: 'Content', status: 'Restricted', dpa: true, restrictedRegions: ['eu-central-1', 'eu-west-1', 'de-sov-1'] },
  { id: 'sp_anthropic', name: 'Anthropic', purpose: 'LLM inference', location: 'United States', dataAccess: 'Content', status: 'Restricted', dpa: true, restrictedRegions: ['de-sov-1'] },
  { id: 'sp_aleph', name: 'Aleph Alpha', purpose: 'EU-sovereign LLM inference', location: 'European Union', dataAccess: 'Content', status: 'Approved', dpa: true, restrictedRegions: [] },
  { id: 'sp_datadog', name: 'Datadog', purpose: 'Observability (metrics/traces)', location: 'US · EU instances', dataAccess: 'Metadata', status: 'Approved', dpa: true, restrictedRegions: ['de-sov-1'] },
  { id: 'sp_okta', name: 'Okta', purpose: 'SSO / identity (SAML, SCIM)', location: 'United States', dataAccess: 'PII', status: 'Approved', dpa: true, restrictedRegions: ['de-sov-1'] },
  { id: 'sp_pagerduty', name: 'PagerDuty', purpose: 'Incident alerting', location: 'United States', dataAccess: 'Metadata', status: 'Approved', dpa: true, restrictedRegions: [] },
]

/* ------------------------------------------------------------------ */
/* Data-subject requests (DSAR)                                        */
/* ------------------------------------------------------------------ */
export type DSARType = 'Access' | 'Erasure' | 'Portability' | 'Rectification' | 'Objection'
export type DSARStatus = 'New' | 'In progress' | 'Completed' | 'Overdue'

export interface DSAR {
  id: string
  type: DSARType
  subject: string
  customer: string
  region: string
  law: string
  received: string
  due: string
  status: DSARStatus
  assignee: string
}

export const dsarRequests: DSAR[] = [
  { id: 'DSAR-4821', type: 'Access', subject: 'data-subject #4821', customer: 'Northwind Retail', region: 'eu-central-1', law: 'GDPR Art. 15', received: '2026-06-25', due: '2026-07-25', status: 'In progress', assignee: 'priya.nair@plcy.app' },
  { id: 'DSAR-4809', type: 'Erasure', subject: 'data-subject #4809', customer: 'Saffron Foods', region: 'eu-west-1', law: 'GDPR Art. 17', received: '2026-05-20', due: '2026-06-19', status: 'Overdue', assignee: 'dana.cole@plcy.app' },
  { id: 'DSAR-4805', type: 'Access', subject: 'data-subject #4805', customer: 'Meridian Bank', region: 'us-east-1', law: 'CCPA §1798.100', received: '2026-06-28', due: '2026-08-12', status: 'New', assignee: 'unassigned' },
  { id: 'DSAR-4790', type: 'Portability', subject: 'data-subject #4790', customer: 'Ferro Manufacturing', region: 'de-sov-1', law: 'GDPR Art. 20', received: '2026-05-30', due: '2026-06-29', status: 'Completed', assignee: 'marcus.ihde@plcy.app' },
  { id: 'DSAR-4788', type: 'Objection', subject: 'data-subject #4788', customer: 'Pinecrest Insurance', region: 'us-east-1', law: 'CCPA §1798.120', received: '2026-07-01', due: '2026-08-15', status: 'New', assignee: 'unassigned' },
  { id: 'DSAR-4771', type: 'Erasure', subject: 'data-subject #4771', customer: 'Vertex Capital', region: 'ap-southeast-1', law: 'PDPA', received: '2026-06-18', due: '2026-07-18', status: 'In progress', assignee: 'priya.nair@plcy.app' },
]

/* ------------------------------------------------------------------ */
/* Privileged access / break-glass                                     */
/* ------------------------------------------------------------------ */
export type AccessScope = 'Read-only' | 'Operator' | 'Break-glass root'
export type AccessStatus = 'Pending approval' | 'Approved' | 'Active' | 'Expired' | 'Denied'

export interface AccessRequest {
  id: string
  engineer: string
  customer: string
  region: string
  environment: string
  reason: string
  scope: AccessScope
  status: AccessStatus
  requested: string
  approver: string
  expiresIn: string
  recorded: boolean
  airgapped: boolean
}

export const accessRequests: AccessRequest[] = [
  { id: 'AR-3120', engineer: 'marcus.ihde@plcy.app', customer: 'Helix Health', region: 'de-sov-1', environment: 'helix-prod (air-gapped)', reason: 'Investigate INC-2026-002 — safety bypass', scope: 'Break-glass root', status: 'Pending approval', requested: '2026-07-07 08:12', approver: 'dana.cole@plcy.app', expiresIn: '—', recorded: true, airgapped: true },
  { id: 'AR-3118', engineer: 'dana.cole@plcy.app', customer: 'Meridian Bank', region: 'us-east-1', environment: 'meridian-prod-us1', reason: 'PII redaction remediation (INC-2026-001)', scope: 'Operator', status: 'Active', requested: '2026-07-07 03:05', approver: 'jack@plcy.app', expiresIn: '42 min', recorded: true, airgapped: false },
  { id: 'AR-3112', engineer: 'priya.nair@plcy.app', customer: 'Vertex Capital', region: 'ap-southeast-1', environment: 'vertex-prod-ap', reason: 'Fairness drift review', scope: 'Read-only', status: 'Approved', requested: '2026-07-06 18:40', approver: 'dana.cole@plcy.app', expiresIn: '3 h 50 min', recorded: true, airgapped: false },
  { id: 'AR-3101', engineer: 'jack@plcy.app', customer: 'Ferro Manufacturing', region: 'de-sov-1', environment: 'ferro-prod (air-gapped)', reason: 'Scheduled maintenance window', scope: 'Break-glass root', status: 'Expired', requested: '2026-07-04 22:00', approver: 'marcus.ihde@plcy.app', expiresIn: 'expired', recorded: true, airgapped: true },
  { id: 'AR-3096', engineer: 'sofia.alvarez@plcy.app', customer: 'Northwind Retail', region: 'eu-central-1', environment: 'northwind-prod-eu', reason: 'Customer support escalation', scope: 'Read-only', status: 'Denied', requested: '2026-07-05 11:20', approver: 'priya.nair@plcy.app', expiresIn: '—', recorded: false, airgapped: false },
]

/* ------------------------------------------------------------------ */
/* Aggregates                                                          */
/* ------------------------------------------------------------------ */
export const privacyTotals = {
  transfers: transfers.length,
  transfersBlocked: transfers.filter((t) => t.status === 'Blocked').length,
  transfersInRegion: transfers.filter((t) => t.mechanism === 'In-region only' || t.mechanism === 'Air-gapped (no egress)').length,
  subprocessors: subprocessors.length,
  subprocRestricted: subprocessors.filter((s) => s.status === 'Restricted').length,
  dsarOpen: dsarRequests.filter((d) => d.status !== 'Completed').length,
  dsarOverdue: dsarRequests.filter((d) => d.status === 'Overdue').length,
  accessPending: accessRequests.filter((a) => a.status === 'Pending approval').length,
  accessActive: accessRequests.filter((a) => a.status === 'Active').length,
}
