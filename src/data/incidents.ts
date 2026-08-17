/**
 * AI-governance incident model + seed register, and the regulatory reporting
 * obligations those incidents trigger. Shared by the Incident Management page
 * and the Incident Post-Mortem report so both read the same source of truth.
 */
export type IncidentSeverity = 'Critical' | 'High' | 'Medium' | 'Low'
export type IncidentStatus = 'Open' | 'Triage' | 'Investigating' | 'Remediation' | 'Resolved'

export interface TimelineEvent {
  phase: 'Detection' | 'Triage' | 'Investigation' | 'Remediation' | 'Resolved'
  time: string
  text: string
  by: string
}

export interface Incident {
  id: string
  title: string
  desc: string
  severity: IncidentSeverity
  status: IncidentStatus
  app: string
  model: string
  customer: string
  riskScore: number
  assignedTo: string
  reported: string
  usersAffected: number
  requestsImpacted: number
  dataExposure: boolean
  timeline: TimelineEvent[]
  rootCause: string
  remediation: string[]
}

export const incidents: Incident[] = [
  {
    id: 'INC-2026-001',
    title: 'Unauthorized PII Exposure in Customer Support Model',
    desc: 'GPT-4 model exposed customer email addresses and phone numbers in responses without proper redaction.',
    severity: 'Critical',
    status: 'Remediation',
    app: 'Customer Support',
    model: 'GPT-4 Turbo',
    customer: 'Meridian Bank',
    riskScore: 92,
    assignedTo: 'dana.cole@plcy.app',
    reported: '2026-07-05 02:15',
    usersAffected: 47,
    requestsImpacted: 143,
    dataExposure: true,
    timeline: [
      { phase: 'Detection', time: '2026-07-05 02:15', text: 'Automated policy violation detected — PII exposed in 12 responses.', by: 'system-monitor' },
      { phase: 'Triage', time: '2026-07-05 02:18', text: 'Incident triaged as CRITICAL — immediate action required.', by: 'dana.cole@plcy.app' },
      { phase: 'Investigation', time: '2026-07-05 02:25', text: 'Root cause identified: PII redaction policy not applied to new model version.', by: 'dana.cole@plcy.app' },
      { phase: 'Remediation', time: '2026-07-05 03:00', text: 'Applied PII redaction policy to GPT-4 Turbo, blocked affected endpoints.', by: 'dana.cole@plcy.app' },
    ],
    rootCause:
      'New model version (GPT-4 Turbo) was deployed without PII redaction policy validation. Configuration drift allowed unredacted responses.',
    remediation: [
      'Applied PII redaction policy to GPT-4 Turbo',
      'Blocked affected API endpoints',
      'Implemented mandatory policy validation in the deployment pipeline',
      'Notified affected customer accounts',
    ],
  },
  {
    id: 'INC-2026-002',
    title: 'High-Risk Content Generation Bypassed Policy',
    desc: 'Claude Opus generated potentially harmful clinical advice that bypassed the content safety policy.',
    severity: 'High',
    status: 'Investigating',
    app: 'Clinical Assistant',
    model: 'Claude Opus 4',
    customer: 'Helix Health',
    riskScore: 78,
    assignedTo: 'marcus.ihde@plcy.app',
    reported: '2026-07-05 05:30',
    usersAffected: 4,
    requestsImpacted: 22,
    dataExposure: false,
    timeline: [
      { phase: 'Detection', time: '2026-07-05 05:30', text: 'Content Safety Filter flagged 3 responses exceeding the harm threshold.', by: 'system-monitor' },
      { phase: 'Triage', time: '2026-07-05 05:41', text: 'Incident triaged as HIGH — safety review opened.', by: 'marcus.ihde@plcy.app' },
      { phase: 'Investigation', time: '2026-07-05 06:10', text: 'Reviewing prompt patterns that bypassed the safety classifier.', by: 'marcus.ihde@plcy.app' },
    ],
    rootCause:
      'A multi-turn jailbreak pattern gradually shifted context past the single-turn safety classifier threshold.',
    remediation: [
      'Raised Content Safety Filter sensitivity for clinical workloads',
      'Enabled multi-turn context evaluation',
      'Queued a fine-tune of the safety classifier on the bypass patterns',
    ],
  },
  {
    id: 'INC-2026-003',
    title: 'Rate Limit Exceeded — Potential Abuse',
    desc: 'Single user exceeded rate limits by 450% in a 10-minute window, indicating possible automated abuse.',
    severity: 'Medium',
    status: 'Resolved',
    app: 'Financial Analysis',
    model: 'GPT-4 Turbo',
    customer: 'Vertex Capital',
    riskScore: 45,
    assignedTo: 'priya.nair@plcy.app',
    reported: '2026-07-04 01:00',
    usersAffected: 1,
    requestsImpacted: 4100,
    dataExposure: false,
    timeline: [
      { phase: 'Detection', time: '2026-07-04 01:00', text: 'Throughput anomaly detected — 450% over the configured limit.', by: 'system-monitor' },
      { phase: 'Triage', time: '2026-07-04 01:07', text: 'Triaged as MEDIUM — suspected credential sharing.', by: 'priya.nair@plcy.app' },
      { phase: 'Remediation', time: '2026-07-04 01:20', text: 'Throttled the API key and required re-authentication.', by: 'priya.nair@plcy.app' },
      { phase: 'Resolved', time: '2026-07-04 02:05', text: 'Confirmed benign batch job; adjusted limit and closed.', by: 'priya.nair@plcy.app' },
    ],
    rootCause: 'A scheduled batch export used an interactive API key without a dedicated rate-limit tier.',
    remediation: ['Issued a dedicated batch key with an appropriate tier', 'Added burst alerting at 200% of limit'],
  },
  {
    id: 'INC-2026-004',
    title: 'Prompt Injection Attempt Blocked',
    desc: 'Prompt Injection Defense blocked an attempt to exfiltrate the system prompt and connected tools.',
    severity: 'High',
    status: 'Resolved',
    app: 'Support Bot',
    model: 'Llama 3.1 70B',
    customer: 'Northwind Retail',
    riskScore: 71,
    assignedTo: 'marcus.ihde@plcy.app',
    reported: '2026-07-03 16:44',
    usersAffected: 0,
    requestsImpacted: 3,
    dataExposure: false,
    timeline: [
      { phase: 'Detection', time: '2026-07-03 16:44', text: 'Prompt Injection Defense blocked 3 exfiltration attempts.', by: 'system-monitor' },
      { phase: 'Triage', time: '2026-07-03 16:50', text: 'Triaged as HIGH — targeted attack pattern.', by: 'marcus.ihde@plcy.app' },
      { phase: 'Resolved', time: '2026-07-03 17:30', text: 'Confirmed all attempts blocked; added signature to the rule pack.', by: 'marcus.ihde@plcy.app' },
    ],
    rootCause: 'Externally-sourced attacker probed the assistant with a known injection template.',
    remediation: ['Added the attack signature to Prompt Injection Defense v1.9', 'Enabled source-IP rate limiting'],
  },
  {
    id: 'INC-2026-005',
    title: 'Fairness Drift Detected in Underwriting Model',
    desc: 'Bias & Fairness Monitor flagged demographic parity drift beyond the configured threshold.',
    severity: 'High',
    status: 'Investigating',
    app: 'Underwriting',
    model: 'FraudScan-v2',
    customer: 'Pinecrest Insurance',
    riskScore: 66,
    assignedTo: 'priya.nair@plcy.app',
    reported: '2026-07-02 16:30',
    usersAffected: 0,
    requestsImpacted: 0,
    dataExposure: false,
    timeline: [
      { phase: 'Detection', time: '2026-07-02 16:30', text: 'Fairness monitor: demographic parity gap exceeded 5%.', by: 'system-monitor' },
      { phase: 'Triage', time: '2026-07-02 17:02', text: 'Triaged as HIGH — model quality review opened.', by: 'priya.nair@plcy.app' },
      { phase: 'Investigation', time: '2026-07-02 18:15', text: 'Evaluating training-data shift across recent underwriting cohorts.', by: 'priya.nair@plcy.app' },
    ],
    rootCause: 'Seasonal shift in applicant mix skewed a feature the model over-weights.',
    remediation: ['Paused auto-decisioning above the risk band', 'Scheduled re-training with reweighted features'],
  },
]

/** Persisted incident register (seed above), so triage edits survive a reload. */
const STORAGE_KEY = 'plcy_incidents'

export function loadIncidents(): Incident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return incidents.map((i) => ({ ...i, timeline: [...i.timeline], remediation: [...i.remediation] }))
    return JSON.parse(raw) as Incident[]
  } catch {
    return incidents.map((i) => ({ ...i, timeline: [...i.timeline], remediation: [...i.remediation] }))
  }
}

export function saveIncidents(list: Incident[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export type RegNoticeStatus = 'Filed' | 'Pending' | 'Overdue' | 'Not required'
export interface RegNotice {
  regulator: string
  incident: string
  requirement: string
  deadline: string
  status: RegNoticeStatus
}

export const regulatoryNotices: RegNotice[] = [
  { regulator: 'EU DPA (GDPR)', incident: 'INC-2026-001', requirement: '72-hour breach notification', deadline: '2026-07-08 02:15', status: 'Filed' },
  { regulator: 'HHS OCR (HIPAA)', incident: 'INC-2026-002', requirement: 'PHI incident assessment', deadline: '2026-07-12 00:00', status: 'Pending' },
  { regulator: 'State AG (CCPA)', incident: 'INC-2026-001', requirement: 'Consumer notification', deadline: '2026-07-15 00:00', status: 'Pending' },
  { regulator: 'FINRA', incident: 'INC-2026-003', requirement: 'Supervisory record', deadline: '2026-07-04 00:00', status: 'Not required' },
]
