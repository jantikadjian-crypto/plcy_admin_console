/**
 * Policy packs & controls catalog.
 *
 * PLCY ships governance as two pack types:
 *  - Primitive packs (P1–P10): single-purpose, composable runtime guardrails,
 *    each made of atomic controls enforced at the Policy Enforcement Point (OPA
 *    Rego rules + detectors + OpenTelemetry evidence).
 *  - Composite packs: framework-aligned (F1–F12) or industry (I1–I6) bundles
 *    that compose primitives to satisfy a standard or vertical.
 *
 * Modelled after the source workbook (PACKS / CONTROLS / DEPENDENCIES / tag
 * tables). Kept separate from mock.ts so the existing search catalog is intact.
 */

export type PackType = 'primitive' | 'composite'
export type CompositeKind = 'framework' | 'industry'
export type PackCategory = 'Sovereignty' | 'Privacy' | 'Security' | 'Safety' | 'Governance' | 'Cost' | 'Compliance'
export type Lifecycle = 'live' | 'proposed' | 'deprecated'

/** OPA decision an atomic control emits. */
export type Decision = 'Allow' | 'Deny' | 'Transform' | 'Route' | 'Review' | 'Log' | 'Throttle' | 'Emit'
export type DetectorType = 'Metadata' | 'Classifier' | 'Regex' | 'LLM' | 'Heuristic' | 'Policy' | 'OTel' | 'Event' | 'Registry' | 'Rate limiter' | 'Anomaly' | 'Orchestrator'
export type ControlMode = 'monitor' | 'enforce'

export interface Control {
  id: string
  packId: string
  prefix: string
  name: string
  detector: DetectorType
  decision: Decision
  obligation: string
  evidence: string[]
  mode: ControlMode
}

export interface PolicyPack {
  id: string
  name: string
  type: PackType
  kind?: CompositeKind
  category: PackCategory
  description: string
  frameworks: string[]
  industries: string[]
  region: string
  /** Pack ids this pack composes (primitives, and sometimes other composites). */
  dependencies: string[]
  status: Lifecycle
  version: string
}

/* ------------------------------------------------------------------ */
/* Control codebook — prefix → family                                  */
/* ------------------------------------------------------------------ */
export const CONTROL_FAMILIES: { prefix: string; family: string }[] = [
  { prefix: 'DR', family: 'Data Residency & Sovereignty' },
  { prefix: 'CP', family: 'Consent & Purpose' },
  { prefix: 'RD', family: 'Retention & Deletion' },
  { prefix: 'DS', family: 'DSAR / Data Principal Rights' },
  { prefix: 'SP', family: 'Provider / Model Allowlist' },
  { prefix: 'RG', family: 'Retrieval / RAG Source Guard' },
  { prefix: 'TL', family: 'Tool Access & Egress Firewall' },
  { prefix: 'HI', family: 'Human-in-the-Loop Review' },
  { prefix: 'IR', family: 'Incident Alerting & Reporting' },
  { prefix: 'CR', family: 'Cost-Aware Model Router' },
]
export const familyOf = (prefix: string) => CONTROL_FAMILIES.find((f) => f.prefix === prefix)?.family ?? prefix

/* ------------------------------------------------------------------ */
/* Tag catalogs                                                        */
/* ------------------------------------------------------------------ */
export const FRAMEWORK_TAGS = [
  'GDPR', 'Directive 2002/58/EC (ePrivacy)', 'EU NIS2', 'EU DSA', 'India DPDP', 'CERT-In Directions',
  'ISO/IEC 27001', 'SOC 2', 'ISO/IEC 27701', 'OWASP LLM Top 10', 'CIS Controls v8', 'PCI DSS',
  'EU AI Act', 'NIST AI RMF', 'HIPAA',
]
export const INDUSTRY_TAGS = [
  'Retail', 'E-commerce', 'Education', 'Government/Public Sector', 'HR/Recruiting',
  'Manufacturing', 'OT', 'Critical Infrastructure', 'Media/Marketing', 'AdTech',
  'Healthcare', 'Financial Services', 'Insurance',
]

/* ------------------------------------------------------------------ */
/* Atomic controls (P1–P10 · 50 controls)                              */
/* ------------------------------------------------------------------ */
const c = (
  id: string, packId: string, name: string, detector: DetectorType, decision: Decision, obligation: string, evidence: string[], mode: ControlMode = 'enforce',
): Control => ({ id, packId, prefix: id.split('-')[0], name, detector, decision, obligation, evidence, mode })

export const controls: Control[] = [
  // P1 · Data Residency
  c('DR-01', 'P1', 'Route EU data to EU-only endpoints', 'Metadata', 'Route', 'Route to EU region or deny', ['residency', 'region', 'decision']),
  c('DR-02', 'P1', 'Route India data to India region', 'Metadata', 'Route', 'Route to India region or deny', ['residency', 'region', 'decision']),
  c('DR-03', 'P1', 'Block restricted-data egress via proxy', 'Metadata', 'Deny', 'Block PLCY-hosted proxy egress', ['classification', 'provider', 'action']),
  c('DR-04', 'P1', 'Force audit-log storage in request region', 'Metadata', 'Transform', 'Store OTel logs in matching region', ['audit_region', 'residency']),
  c('DR-05', 'P1', 'Deny if residency required but missing', 'Metadata', 'Deny', 'Reject request', ['required_field', 'present']),
  // P2 · Consent & Purpose
  c('CP-01', 'P2', 'Require purpose tag for PII/PHI/PCI', 'Classifier', 'Deny', 'Reject if no purpose tag', ['classification', 'purpose', 'decision']),
  c('CP-02', 'P2', 'Require lawful basis or consent', 'Metadata', 'Deny', 'Reject if missing', ['lawful_basis', 'consent_state']),
  c('CP-03', 'P2', 'Block training use if opted out', 'Metadata', 'Deny', 'Deny request', ['purpose', 'opt_out_flag']),
  c('CP-04', 'P2', 'Strip PII when consent missing', 'Classifier', 'Transform', 'Redact PII entities', ['stripped_entities_count']),
  c('CP-05', 'P2', 'OTel evidence linkage', 'OTel', 'Log', 'Emit purpose/consent/lawful_basis to traces', ['purpose', 'lawful_basis', 'consent_state'], 'monitor'),
  // P3 · Retention & Deletion
  c('RD-01', 'P3', 'Enforce per-pack retention policy', 'Policy', 'Transform', 'Set retention (30d/180d/365d)', ['retention_days', 'pack_id']),
  c('RD-02', 'P3', 'No raw-payload retention mode', 'Policy', 'Transform', 'Store hash + metadata only', ['hash_only_mode']),
  c('RD-03', 'P3', 'Delete on DSAR webhook', 'Event', 'Transform', 'Emit deletion job', ['subject_id', 'deletion_job_id']),
  c('RD-04', 'P3', 'Freeze retention on incident', 'Event', 'Transform', 'Apply legal hold', ['incident_id', 'hold_start']),
  c('RD-05', 'P3', 'Require tamper-evident logs', 'Policy', 'Deny', 'Sign logs / enforce WORM', ['log_signing_enabled']),
  // P4 · DSAR
  c('DS-01', 'P4', 'Require subject_id for personal-data flows', 'Metadata', 'Deny', 'Reject if missing', ['subject_id_present']),
  c('DS-02', 'P4', 'Emit linkable trace IDs per subject', 'OTel', 'Log', 'Link subject_id → trace_id', ['subject_id', 'trace_id'], 'monitor'),
  c('DS-03', 'P4', 'Export conversation-record pointer', 'Event', 'Transform', 'Return pointer, not raw data', ['record_pointer', 'retrieval_url']),
  c('DS-04', 'P4', 'Support erase: emit deletion job', 'Event', 'Transform', 'Emit OTel deletion event', ['subject_id', 'deletion_job_id']),
  c('DS-05', 'P4', 'Deny if under active restriction', 'Metadata', 'Deny', 'Reject request', ['subject_restriction_flag']),
  // P5 · Provider / Model Allowlist
  c('SP-01', 'P5', 'Allow only approved providers/models', 'Policy', 'Deny', 'Reject unapproved', ['provider', 'model', 'allowed']),
  c('SP-02', 'P5', 'Block training-on-data providers', 'Metadata', 'Deny', 'Deny unless override', ['provider', 'training_on_data']),
  c('SP-03', 'P5', 'Deny tool calls on untrusted models', 'Metadata', 'Route', 'Route to trusted or deny', ['model', 'trust_level', 'tool_call']),
  c('SP-04', 'P5', 'Hard-fail on unknown model', 'Registry', 'Deny', 'Reject unverified model', ['model_id', 'registry_status']),
  c('SP-05', 'P5', 'Emit provider evidence', 'OTel', 'Log', 'Include provider/model/region/pack version', ['provider', 'model', 'region', 'pack_version'], 'monitor'),
  // P6 · RAG Source Guard
  c('RG-01', 'P6', 'Allowlist knowledge bases per app', 'Policy', 'Deny', 'Reject retrieval from unlisted KB', ['kb_id', 'allowed']),
  c('RG-02', 'P6', 'Deny restricted KB for non-admin', 'Metadata', 'Deny', 'Deny retrieval', ['kb_id', 'user_role']),
  c('RG-03', 'P6', 'Redact retrieved snippets before model', 'Classifier', 'Transform', 'Strip sensitive data from chunks', ['redacted_chunks_count']),
  c('RG-04', 'P6', 'Require provenance in responses', 'Policy', 'Transform', 'Include source IDs in output', ['source_ids', 'doc_ids']),
  c('RG-05', 'P6', 'Log retrieval decisions', 'OTel', 'Log', 'Emit kb_id/doc_count/reason', ['kb_id', 'doc_count', 'reason'], 'monitor'),
  // P7 · Tool Access & Egress Firewall
  c('TL-01', 'P7', 'Role-based tool allowlist', 'Metadata', 'Deny', 'Reject unlisted tool', ['tool_id', 'user_role', 'allowed']),
  c('TL-02', 'P7', 'Deny external network tools unless whitelisted', 'Metadata', 'Deny', 'Deny unlisted domain', ['domain', 'allowed_domains']),
  c('TL-03', 'P7', 'Require HITL for high-risk tools', 'Policy', 'Review', 'Route to human queue', ['tool_risk_level', 'review_required']),
  c('TL-04', 'P7', 'Rate-limit tool calls separately', 'Rate limiter', 'Throttle', 'Enforce per-tool rate limit', ['tool_id', 'rate_limit_window']),
  c('TL-05', 'P7', 'Full tool I/O audit capture', 'OTel', 'Log', 'Capture inputs/outputs (configurable redaction)', ['tool_call_id', 'input', 'output'], 'monitor'),
  // P8 · Human-in-the-Loop
  c('HI-01', 'P8', 'Route high-risk to review if risk ≥ threshold', 'LLM', 'Review', 'Return require_review flag', ['risk_score', 'threshold', 'decision']),
  c('HI-02', 'P8', 'Approve/deny with reason codes', 'Event', 'Transform', 'Update request status + reason', ['review_decision', 'reason_code']),
  c('HI-03', 'P8', 'Enforce 4-eyes for specific actions', 'Policy', 'Review', 'Route to 2nd reviewer', ['action_type', 'reviewers_count']),
  c('HI-04', 'P8', 'Break-glass requires MFA + reason + timebox', 'Event', 'Transform', 'Enforce MFA + audit trail', ['mfa_verified', 'reason', 'timebox_minutes']),
  c('HI-05', 'P8', 'Link request → review → action in spans', 'OTel', 'Log', 'Emit linked span chain', ['request_id', 'review_id', 'action_id'], 'monitor'),
  // P9 · Incident Alerting & Reporting
  c('IR-01', 'P9', 'Trigger incident on leak/injection/bypass', 'Regex', 'Emit', 'Create incident event', ['incident_type', 'severity', 'signals']),
  c('IR-02', 'P9', 'Rate-based alerting on deny spikes', 'Anomaly', 'Emit', 'Alert if deny rate > threshold', ['metric', 'threshold', 'current_rate']),
  c('IR-03', 'P9', 'Emit OTel security events to SIEM', 'OTel', 'Log', 'Send to OTLP endpoint (SIEM receiver)', ['event_type', 'severity', 'siem_endpoint'], 'monitor'),
  c('IR-04', 'P9', 'Auto-enable safe mode on high-severity incident', 'Orchestrator', 'Transform', 'Tighten all thresholds', ['incident_id', 'safe_mode_enabled']),
  c('IR-05', 'P9', 'Generate incident bundle (traces + decisions)', 'Orchestrator', 'Transform', 'Export incident_id → bundle file', ['incident_id', 'bundle_url']),
  // P10 · Cost-Aware Model Router
  c('CR-01', 'P10', 'Route low-risk cheap, high-risk premium', 'Classifier', 'Route', 'Route by risk category', ['risk_level', 'model_tier']),
  c('CR-02', 'P10', 'Enforce per-tenant monthly budget', 'Policy', 'Throttle', 'Enforce soft/hard cap', ['budget_usd', 'spent_usd', 'action']),
  c('CR-03', 'P10', 'Downgrade response when budget tight', 'Orchestrator', 'Transform', 'Shorten responses, fewer tool calls', ['budget_state', 'downgrade_level']),
  c('CR-04', 'P10', 'Track cost savings in OTel metrics', 'OTel', 'Log', 'Emit plcy.cost.saved_usd metric', ['saved_usd', 'routing_decision'], 'monitor'),
  c('CR-05', 'P10', 'Never route PCI/PHI/restricted to cheap providers', 'Classifier', 'Deny', 'Deny routing to unapproved cheap tier', ['classification', 'provider_tier']),
]

/* ------------------------------------------------------------------ */
/* Packs (28)                                                          */
/* ------------------------------------------------------------------ */
const prim = (id: string, name: string, category: PackCategory, region: string, description: string): PolicyPack => ({
  id, name, type: 'primitive', category, description, frameworks: [], industries: [], region, dependencies: [], status: 'live', version: '1.0',
})
const fw = (id: string, name: string, frameworks: string[], region: string, deps: string[], description: string): PolicyPack => ({
  id, name, type: 'composite', kind: 'framework', category: 'Compliance', description, frameworks, industries: [], region, dependencies: deps, status: 'live', version: '1.0',
})
const ind = (id: string, name: string, industries: string[], frameworks: string[], deps: string[], description: string): PolicyPack => ({
  id, name, type: 'composite', kind: 'industry', category: 'Governance', description, frameworks, industries, region: 'Multi-region', dependencies: deps, status: 'live', version: '1.0',
})

export const packs: PolicyPack[] = [
  // Primitives
  prim('P1', 'Data Residency & Sovereignty Router', 'Sovereignty', 'Multi-region', 'Route requests by residency; enforce regional storage & egress controls.'),
  prim('P2', 'Consent & Purpose Gate', 'Privacy', 'Global', 'Require purpose tags & lawful basis for PII/PHI/PCI processing.'),
  prim('P3', 'Retention & Deletion Guard', 'Privacy', 'Global', 'Enforce per-pack retention tiers; support deletion on DSAR.'),
  prim('P4', 'DSAR / Data Principal Rights Hooks', 'Privacy', 'Global', 'Enable subject tracking, export, and erase workflows.'),
  prim('P5', 'Provider / Model Allowlist & Subprocessor Control', 'Security', 'Global', 'Allowlist approved providers/models; block training-on-data unless overridden.'),
  prim('P6', 'Retrieval / RAG Source Guard', 'Security', 'Global', 'Allowlist knowledge bases; redact retrieved snippets before model input.'),
  prim('P7', 'Tool Access Control & Egress Firewall', 'Security', 'Global', 'Role-based tool allowlist; deny external domains unless whitelisted.'),
  prim('P8', 'Human-in-the-Loop Review Gate', 'Governance', 'Global', 'Route high-risk requests to human review; support 4-eyes approval.'),
  prim('P9', 'Incident Alerting & Reporting Hooks', 'Security', 'Global', 'Trigger incidents on leaks/injections; emit OTel security events.'),
  prim('P10', 'Cost-Aware Model Router', 'Cost', 'Global', 'Route low-risk to cheaper models; enforce budget caps; track savings.'),
  // Framework composites
  fw('F1', 'GDPR Privacy Pack', ['GDPR'], 'EU', ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P9'], 'Operationalize GDPR data-protection obligations for AI workloads.'),
  fw('F2', 'EU ePrivacy / Communications Privacy Pack', ['Directive 2002/58/EC (ePrivacy)'], 'EU', ['P1', 'P2', 'P3', 'P5', 'P6', 'P9'], 'Consent and confidentiality controls for electronic communications.'),
  fw('F3', 'EU NIS2 Cybersecurity Pack', ['EU NIS2'], 'EU', ['P3', 'P5', 'P7', 'P9'], 'Cyber-resilience and incident-reporting obligations under NIS2.'),
  fw('F4', 'EU Digital Services Act (DSA) Platform Safety Pack', ['EU DSA'], 'EU', ['P3', 'P7', 'P8', 'P9'], 'Content-safety and transparency duties for online platforms.'),
  fw('F5', 'India DPDP Privacy Pack', ['India DPDP'], 'India', ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P9'], 'Digital Personal Data Protection Act (2023) controls.'),
  fw('F6', 'India CERT-In Directions Pack', ['CERT-In Directions'], 'India', ['P1', 'P3', 'P9'], 'CERT-In logging and incident-reporting obligations.'),
  fw('F7', 'ISO/IEC 27001 ISMS Pack', ['ISO/IEC 27001'], 'Global', ['P3', 'P5', 'P7', 'P9'], 'Information-security management-system control mappings.'),
  fw('F8', 'SOC 2 Trust Services Pack', ['SOC 2'], 'Global', ['P3', 'P5', 'P7', 'P8', 'P9', 'P10'], 'Security, availability, processing integrity, confidentiality, privacy.'),
  fw('F9', 'ISO/IEC 27701 Privacy Management Pack', ['ISO/IEC 27701'], 'Global', ['P2', 'P3', 'P4', 'P5', 'P6', 'P9'], 'Privacy information-management-system (PIMS) controls.'),
  fw('F10', 'OWASP Top 10 for LLM Apps Pack', ['OWASP LLM Top 10'], 'Global', ['P6', 'P7', 'P9', 'P10'], 'Guardrails for the OWASP Top 10 LLM application risks.'),
  fw('F11', 'CIS Controls Baseline Pack', ['CIS Controls v8'], 'Global', ['P3', 'P5', 'P7', 'P9'], 'CIS Controls v8 baseline security hygiene.'),
  fw('F12', 'PCI DSS Payment Data Pack', ['PCI DSS'], 'Global', ['P2', 'P3', 'P5', 'P7', 'P9'], 'Cardholder-data handling controls for AI flows.'),
  // Industry composites
  ind('I1', 'Retail & E-Commerce AI Governance Pack', ['Retail', 'E-commerce'], ['PCI DSS', 'GDPR', 'India DPDP'], ['F12', 'F1', 'P6', 'P7', 'P10'], 'Payment, personalization, and provenance controls for retail AI.'),
  ind('I2', 'Education & Kids Safety Pack', ['Education'], ['GDPR', 'India DPDP'], ['P2', 'P3', 'P6', 'P7'], 'Minor-safety, consent, and content controls for edtech.'),
  ind('I3', 'Government / Public Sector AI Pack', ['Government/Public Sector'], ['ISO/IEC 27001', 'EU NIS2', 'SOC 2'], ['F7', 'F3', 'P1', 'P3', 'P5', 'P7', 'P8'], 'Sovereignty, security, and oversight controls for public sector.'),
  ind('I4', 'HR & Hiring AI Governance Pack', ['HR/Recruiting'], ['GDPR', 'India DPDP'], ['F1', 'F5', 'P2', 'P3', 'P6', 'P7', 'P8'], 'Fairness, consent, and human-oversight controls for hiring AI.'),
  ind('I5', 'Manufacturing / OT & Critical Infrastructure Pack', ['Manufacturing', 'OT', 'Critical Infrastructure'], ['EU NIS2'], ['F3', 'P5', 'P7', 'P8', 'P9'], 'Resilience and egress controls for OT / critical infrastructure.'),
  ind('I6', 'Media / Marketing / AdTech Governance Pack', ['Media/Marketing', 'AdTech'], ['EU DSA', 'Directive 2002/58/EC (ePrivacy)', 'GDPR'], ['F4', 'F2', 'F1'], 'Content-safety, consent, and grounding controls for media/adtech.'),
]

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export const packById = (id: string, allPacks: PolicyPack[] = packs) => allPacks.find((p) => p.id === id)

/** Controls a pack enforces — its own (primitive) or its primitives' (composite, resolved recursively). */
export function controlsForPack(pack: PolicyPack, allPacks: PolicyPack[] = packs, allControls: Control[] = controls, seen = new Set<string>()): Control[] {
  if (seen.has(pack.id)) return []
  seen.add(pack.id)
  if (pack.type === 'primitive') return allControls.filter((ct) => ct.packId === pack.id)
  const out: Control[] = []
  for (const depId of pack.dependencies) {
    const dep = packById(depId, allPacks)
    if (dep) out.push(...controlsForPack(dep, allPacks, allControls, seen))
  }
  // de-dupe by control id
  return Array.from(new Map(out.map((ct) => [ct.id, ct])).values())
}

export const controlCount = (pack: PolicyPack, allPacks: PolicyPack[] = packs, allControls: Control[] = controls) => controlsForPack(pack, allPacks, allControls).length

/** Primitive packs a composite resolves to (flattened, unique). */
export function resolvedPrimitives(pack: PolicyPack, allPacks: PolicyPack[] = packs, seen = new Set<string>()): PolicyPack[] {
  if (pack.type === 'primitive') return [pack]
  const out: PolicyPack[] = []
  for (const depId of pack.dependencies) {
    if (seen.has(depId)) continue
    seen.add(depId)
    const dep = packById(depId, allPacks)
    if (dep) out.push(...resolvedPrimitives(dep, allPacks, seen))
  }
  return Array.from(new Map(out.map((p) => [p.id, p])).values())
}

export function computePolicyTotals(allPacks: PolicyPack[], allControls: Control[]) {
  return {
    packs: allPacks.length,
    primitives: allPacks.filter((p) => p.type === 'primitive').length,
    frameworks: allPacks.filter((p) => p.kind === 'framework').length,
    industries: allPacks.filter((p) => p.kind === 'industry').length,
    controls: allControls.length,
  }
}
export const policyTotals = computePolicyTotals(packs, controls)
