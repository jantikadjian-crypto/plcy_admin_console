/**
 * Policy change management — the controlled path a policy edit takes from draft
 * to production: version history, a control-level diff, an approval workflow
 * with segregation of duties, a dry-run impact estimate, and rollback.
 *
 * Operator-internal. Change requests reference real packs/controls from
 * policy.ts so the diff and impact line up with the catalog the rest of the
 * Policy hub shows.
 */

export type CRStatus = 'Draft' | 'In review' | 'Approved' | 'Rejected' | 'Scheduled' | 'Applied' | 'Rolled back'
export type Risk = 'Low' | 'Medium' | 'High'

export const crStatusTone: Record<CRStatus, 'slate' | 'blue' | 'green' | 'red' | 'purple' | 'yellow'> = {
  Draft: 'slate', 'In review': 'blue', Approved: 'green', Rejected: 'red', Scheduled: 'purple', Applied: 'green', 'Rolled back': 'yellow',
}
export const riskTone: Record<Risk, 'green' | 'yellow' | 'red'> = { Low: 'green', Medium: 'yellow', High: 'red' }

/** One line of a control-level diff. */
export interface ChangeLine {
  op: 'add' | 'remove' | 'modify'
  controlId: string
  controlName: string
  field?: string
  before?: string
  after?: string
}

/** Estimated blast radius of a change, before it ships. */
export interface Impact {
  instances: number
  requestsPerDay: number
  risk: Risk
  /** Decision mix shift (% of decisions), before → after. */
  decisionDelta: { label: string; before: number; after: number }[]
  notes: string[]
  lastRun?: string
}

export interface Review {
  approver: string
  role: string
  decision: 'pending' | 'approved' | 'rejected'
  at?: string
  comment?: string
}

export interface CREvent {
  at: string
  who: string
  text: string
}

export interface ChangeRequest {
  id: string
  packId: string
  packName: string
  title: string
  summary: string
  author: string
  createdAt: string
  status: CRStatus
  fromVersion: string
  toVersion: string
  risk: Risk
  changes: ChangeLine[]
  impact: Impact
  reviews: Review[]
  scheduledFor?: string
  appliedAt?: string
  rolledBackAt?: string
  history: CREvent[]
}

/* ------------------------------------------------------------------ */
/* Seeded version history (baseline, before any in-session applies)    */
/* ------------------------------------------------------------------ */
export interface VersionEntry {
  version: string
  date: string
  author: string
  summary: string
  crId?: string
  rolledBack?: boolean
}

export const versionBaseline: Record<string, VersionEntry[]> = {
  P2: [{ version: '1.0', date: '2026-01-12', author: 'System', summary: 'Initial Consent & Purpose Gate' }],
  P5: [
    { version: '1.2', date: '2026-05-02', author: 'M. Chen', summary: 'Added registry hard-fail (SP-04)', crId: 'CR-101' },
    { version: '1.1', date: '2026-03-18', author: 'M. Chen', summary: 'Block training-on-data providers (SP-02)', crId: 'CR-098' },
    { version: '1.0', date: '2026-01-12', author: 'System', summary: 'Initial Provider / Model Allowlist' },
  ],
  P10: [{ version: '1.0', date: '2026-01-12', author: 'System', summary: 'Initial Cost-Aware Model Router' }],
  F1: [{ version: '1.0', date: '2026-01-12', author: 'System', summary: 'Initial GDPR Privacy Pack' }],
  F13: [{ version: '1.0', date: '2026-01-12', author: 'System', summary: 'Initial HIPAA PHI Protection Pack' }],
}

/* ------------------------------------------------------------------ */
/* Seeded change requests                                              */
/* ------------------------------------------------------------------ */
export const changeRequestSeed: ChangeRequest[] = [
  {
    id: 'CR-108', packId: 'P2', packName: 'Consent & Purpose Gate', title: 'Require lawful basis for analytics purposes',
    summary: 'Tighten CP-02 so analytics/model-training purposes must carry an explicit lawful basis, and add a new control to block silent purpose changes.',
    author: 'R. Alvarez', createdAt: '2026-07-22', status: 'In review', fromVersion: '1.0', toVersion: '1.1', risk: 'Medium',
    changes: [
      { op: 'modify', controlId: 'CP-02', controlName: 'Require lawful basis or consent', field: 'obligation', before: 'Reject if missing', after: 'Reject if missing OR purpose ∈ {analytics, training} without lawful_basis' },
      { op: 'modify', controlId: 'CP-02', controlName: 'Require lawful basis or consent', field: 'mode', before: 'enforce', after: 'enforce' },
      { op: 'add', controlId: 'CP-06', controlName: 'Block mid-session purpose escalation', field: 'decision', after: 'Deny' },
    ],
    impact: {
      instances: 42, requestsPerDay: 1_820_000, risk: 'Medium',
      decisionDelta: [
        { label: 'Allow', before: 88, after: 84 },
        { label: 'Deny', before: 6, after: 10 },
        { label: 'Transform', before: 6, after: 6 },
      ],
      notes: ['~4% of requests move from Allow to Deny — mostly untagged analytics traffic.', '3 customers use analytics purposes heavily (Meridian, Vertex, Lumen); notify their CSMs.', 'No PHI/PCI flows affected.'],
    },
    reviews: [
      { approver: 'D. Whitfield', role: 'Policy Lead', decision: 'pending' },
      { approver: 'Priya Nair', role: 'Security Manager', decision: 'pending' },
    ],
    history: [{ at: '2026-07-22', who: 'R. Alvarez', text: 'Opened change request' }, { at: '2026-07-23', who: 'R. Alvarez', text: 'Submitted for review' }],
  },
  {
    id: 'CR-107', packId: 'F1', packName: 'GDPR Privacy Pack', title: 'Add EU AI Act transparency logging',
    summary: 'Compose an additional OTel logging obligation so GDPR-scoped flows also emit EU AI Act transparency evidence.',
    author: 'M. Chen', createdAt: '2026-07-20', status: 'Approved', fromVersion: '1.0', toVersion: '1.1', risk: 'Low',
    changes: [
      { op: 'add', controlId: 'CP-05', controlName: 'OTel evidence linkage', field: 'mode', after: 'monitor' },
      { op: 'modify', controlId: 'DR-04', controlName: 'Force audit-log storage in request region', field: 'evidence', before: 'audit_region, residency', after: 'audit_region, residency, ai_act_transparency' },
    ],
    impact: {
      instances: 55, requestsPerDay: 2_300_000, risk: 'Low',
      decisionDelta: [{ label: 'Allow', before: 90, after: 90 }, { label: 'Deny', before: 5, after: 5 }, { label: 'Log-only', before: 5, after: 5 }],
      notes: ['Monitor-only change — no decision shift.', 'Adds ~1 evidence field per traced request; negligible cost.'],
    },
    reviews: [
      { approver: 'D. Whitfield', role: 'Policy Lead', decision: 'approved', at: '2026-07-21', comment: 'Straightforward evidence add.' },
      { approver: 'Priya Nair', role: 'Security Manager', decision: 'approved', at: '2026-07-21' },
    ],
    history: [
      { at: '2026-07-20', who: 'M. Chen', text: 'Opened change request' },
      { at: '2026-07-20', who: 'M. Chen', text: 'Submitted for review' },
      { at: '2026-07-21', who: 'D. Whitfield', text: 'Approved' },
      { at: '2026-07-21', who: 'Priya Nair', text: 'Approved' },
    ],
  },
  {
    id: 'CR-106', packId: 'P5', packName: 'Provider / Model Allowlist', title: 'Retire deprecated provider, add two approved models',
    summary: 'Remove a sunset provider from the allowlist and register two newly-approved models.',
    author: 'M. Chen', createdAt: '2026-07-08', status: 'Applied', fromVersion: '1.2', toVersion: '1.3', risk: 'Low',
    changes: [
      { op: 'modify', controlId: 'SP-01', controlName: 'Allow only approved providers/models', field: 'allowlist', before: '12 models', after: '13 models (−1 deprecated, +2 approved)' },
    ],
    impact: {
      instances: 61, requestsPerDay: 2_600_000, risk: 'Low',
      decisionDelta: [{ label: 'Allow', before: 92, after: 92 }, { label: 'Deny', before: 8, after: 8 }],
      notes: ['Deprecated provider had 0 live traffic in the last 30 days.', 'Two new models enter routing pools immediately.'],
    },
    reviews: [{ approver: 'D. Whitfield', role: 'Policy Lead', decision: 'approved', at: '2026-07-09' }],
    appliedAt: '2026-07-10',
    history: [
      { at: '2026-07-08', who: 'M. Chen', text: 'Opened change request' },
      { at: '2026-07-09', who: 'D. Whitfield', text: 'Approved' },
      { at: '2026-07-10', who: 'M. Chen', text: 'Applied to production (v1.3)' },
    ],
  },
  {
    id: 'CR-105', packId: 'P10', packName: 'Cost-Aware Model Router', title: 'Lower premium-tier routing threshold',
    summary: 'Route more traffic to cheaper models by lowering the risk threshold that triggers premium routing.',
    author: 'J. Okoro', createdAt: '2026-07-11', status: 'Rejected', fromVersion: '1.0', toVersion: '1.1', risk: 'High',
    changes: [
      { op: 'modify', controlId: 'CR-01', controlName: 'Route low-risk cheap, high-risk premium', field: 'threshold', before: 'risk ≥ 0.6 → premium', after: 'risk ≥ 0.8 → premium' },
    ],
    impact: {
      instances: 61, requestsPerDay: 2_600_000, risk: 'High',
      decisionDelta: [{ label: 'Premium route', before: 34, after: 18 }, { label: 'Cheap route', before: 66, after: 82 }],
      notes: ['Estimated 24% cost reduction — but pushes borderline-risk traffic to cheaper models.', 'CR-05 (never route PCI/PHI cheap) still holds, but medium-risk safety-sensitive prompts would degrade.', 'Conflicts with the safety guardrail baseline.'],
    },
    reviews: [{ approver: 'Priya Nair', role: 'Security Manager', decision: 'rejected', at: '2026-07-12', comment: 'Degrades safety on medium-risk traffic. Bring quality evals before resubmitting.' }],
    history: [
      { at: '2026-07-11', who: 'J. Okoro', text: 'Opened change request' },
      { at: '2026-07-11', who: 'J. Okoro', text: 'Submitted for review' },
      { at: '2026-07-12', who: 'Priya Nair', text: 'Rejected' },
    ],
  },
  {
    id: 'CR-104', packId: 'F13', packName: 'HIPAA PHI Protection Pack', title: 'Raise de-identification confidence to 0.95',
    summary: 'Tighten PHI redaction confidence from 0.90 to 0.95 to reduce residual PHI leakage.',
    author: 'You', createdAt: '2026-07-24', status: 'Draft', fromVersion: '1.0', toVersion: '1.1', risk: 'Medium',
    changes: [
      { op: 'modify', controlId: 'CP-04', controlName: 'Strip PII when consent missing', field: 'confidence', before: '≥ 0.90', after: '≥ 0.95' },
    ],
    impact: {
      instances: 18, requestsPerDay: 540_000, risk: 'Medium',
      decisionDelta: [{ label: 'Redact', before: 22, after: 27 }, { label: 'Pass-through', before: 78, after: 73 }],
      notes: ['Higher confidence catches ~5% more PHI entities.', 'Small latency increase from stricter classifier pass.', 'Helix Health (air-gapped) validates separately.'],
    },
    reviews: [
      { approver: 'D. Whitfield', role: 'Policy Lead', decision: 'pending' },
      { approver: 'Priya Nair', role: 'Security Manager', decision: 'pending' },
    ],
    history: [{ at: '2026-07-24', who: 'You', text: 'Opened change request (draft)' }],
  },
]

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export const changeLineTone = (op: ChangeLine['op']) => (op === 'add' ? 'green' : op === 'remove' ? 'red' : 'blue') as 'green' | 'red' | 'blue'
export const changeLineSign = (op: ChangeLine['op']) => (op === 'add' ? '+' : op === 'remove' ? '−' : '~')

/** A CR is open (still moving through the pipeline) if not terminal. */
export const isCROpen = (s: CRStatus) => s !== 'Applied' && s !== 'Rejected' && s !== 'Rolled back'
/** Approval is complete when every reviewer has approved. */
export const allApproved = (cr: ChangeRequest) => cr.reviews.length > 0 && cr.reviews.every((r) => r.decision === 'approved')
