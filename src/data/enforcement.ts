/**
 * Enforcement decision log — the record of what the Policy Enforcement Point
 * actually did, request by request.
 *
 * The aggregate counters on the Enforcement page say *how much* was blocked;
 * this says *why*. Every decision resolves to a real control in the policy
 * catalog (`@/data/policy`), so the drill-down can walk the full chain —
 * composite pack the customer deployed → primitive pack → atomic control →
 * detector, decision, obligation, and the evidence fields emitted.
 *
 * Request content is never stored: `subject` is a redacted one-line summary and
 * `matched` lists entity *types* the detector hit, not their values.
 */
import { controls, packs, familyOf } from './policy'
import type { Control, PolicyPack } from './policy'

export type DecisionOutcome = 'Allowed' | 'Flagged' | 'Blocked'
/** Which leg of the exchange the control evaluated. */
export type Direction = 'prompt' | 'response'

export const outcomeTone: Record<DecisionOutcome, 'green' | 'yellow' | 'red'> = { Allowed: 'green', Flagged: 'yellow', Blocked: 'red' }

export interface EnforcementDecision {
  id: string
  at: string
  customer: string
  instance: string
  model: string
  region: string
  direction: Direction
  outcome: DecisionOutcome
  /** Atomic control that fired — joins to `controls` in the policy catalog. */
  controlId: string
  /** Composite pack the customer deployed that pulled this control in. */
  viaPackId: string
  /** Entity/type names the detector matched. Never raw values. */
  matched: string[]
  /** Redacted one-line summary of the request. */
  subject: string
  actor: string
  latencyMs: number
}

/* ------------------------------------------------------------------ */
/* Operator triage                                                     */
/* ------------------------------------------------------------------ */
/**
 * What a reviewer concluded about a decision. `correct` and `false-positive`
 * are the two verdicts that matter — the ratio between them is the enforcement
 * quality signal the team actually steers on.
 */
export type Verdict = 'correct' | 'false-positive'
export const verdictTone: Record<Verdict, 'green' | 'orange'> = { correct: 'green', 'false-positive': 'orange' }
export const verdictLabel: Record<Verdict, string> = { correct: 'Correct', 'false-positive': 'False positive' }

export interface Triage {
  verdict: Verdict
  by: string
  at: string
  note?: string
}

/* ------------------------------------------------------------------ */
/* Seed — deterministic, derived from the live catalog                 */
/* ------------------------------------------------------------------ */
/**
 * Deterministic [0,1) mixer (mulberry32). A plain string hash clusters badly on
 * sequential inputs — every decision landed on the same handful of controls —
 * so field selection runs through this instead.
 */
function mix(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
/** Independent pseudo-random stream per (index, field). */
const rand = (i: number, salt: number) => mix(Math.imul(i + 1, 2654435761) ^ Math.imul(salt, 40503))
/** Deterministic pick from a list. */
const pick = <T,>(list: T[], i: number, salt: number): T => list[Math.floor(rand(i, salt) * list.length) % list.length]

const FLEET: { customer: string; instance: string; model: string; region: string }[] = [
  { customer: 'Meridian Bank', instance: 'meridian-prod-us1', model: 'GPT-4 Turbo', region: 'us-east-1' },
  { customer: 'Meridian Bank', instance: 'meridian-prod-eu1', model: 'GPT-4 Turbo', region: 'eu-central-1' },
  { customer: 'Helix Health', instance: 'helix-prod-us1', model: 'Claude Opus 4', region: 'us-west-2' },
  { customer: 'Northwind Retail', instance: 'northwind-prod-eu1', model: 'Llama 3.1 70B', region: 'eu-central-1' },
  { customer: 'Atlas Logistics', instance: 'atlas-prod-us1', model: 'Mistral Large', region: 'us-east-1' },
  { customer: 'Vertex Capital', instance: 'vertex-prod-us1', model: 'Claude Sonnet 4', region: 'us-east-1' },
  { customer: 'Pinecrest Insurance', instance: 'pinecrest-prod-us1', model: 'GPT-4o', region: 'us-east-1' },
  { customer: 'Lumen Media', instance: 'lumen-prod-us1', model: 'Gemini 1.5 Pro', region: 'us-west-2' },
]

const ACTORS = ['svc-claims-api', 'a.okonkwo@', 'batch-etl', 'r.mehta@', 'support-copilot', 'j.lindqvist@', 'risk-agent', 'm.duarte@']

/** Redacted request summaries, chosen per control family so they read true. */
const SUBJECTS: Record<string, string[]> = {
  DR: ['Customer record lookup routed to a non-EU endpoint', 'Batch embedding job targeting a US inference region', 'Claim summary request with residency tag absent'],
  CP: ['Claims triage prompt containing policyholder PII', 'Marketing summarisation over a customer list', 'Support transcript sent without a purpose tag'],
  RD: ['Retrieval over a corpus past its retention window', 'Export request spanning archived conversations'],
  DS: ['Data-subject erasure request touching a live index', 'Access request over stored prompt history'],
  SP: ['Completion requested from an unlisted provider', 'Model call pinned to a deprecated version'],
  RG: ['RAG retrieval reaching an unapproved source', 'Retrieval joining two tenants’ corpora'],
  TL: ['Agent tool call attempting an outbound HTTP fetch', 'Tool invocation writing to an external bucket'],
  HI: ['High-risk underwriting decision issued without review', 'Clinical summary returned to an end user'],
  IR: ['Anomalous burst of denied requests from one actor', 'Repeated jailbreak-shaped prompts from a session'],
  CR: ['Long-context request routed to a premium model', 'Retry storm against a high-cost endpoint'],
}

/** Entity/type names a detector reports. Values are never captured. */
const MATCHES: Record<string, string[][]> = {
  DR: [['residency:EU', 'endpoint:us-east-1'], ['residency:IN', 'region_mismatch']],
  CP: [['PII:name', 'PII:national_id'], ['PHI:diagnosis_code'], ['purpose:absent', 'lawful_basis:absent']],
  RD: [['retention:expired', 'age_days:412'], ['corpus:archived']],
  DS: [['dsar:erasure', 'index:live'], ['dsar:access']],
  SP: [['provider:unlisted'], ['model:deprecated', 'version:2023-06']],
  RG: [['source:unapproved'], ['tenant_boundary:crossed']],
  TL: [['egress:http', 'domain:unlisted'], ['tool:filesystem_write']],
  HI: [['risk:high', 'review:absent'], ['domain:clinical']],
  IR: [['rate:anomalous', 'denials:37'], ['pattern:jailbreak']],
  CR: [['tokens:184k', 'tier:premium'], ['retries:14']],
}

/** Composite packs a customer would actually have deployed. */
const liveComposites = packs.filter((p) => p.type === 'composite' && p.status === 'live')

/**
 * A control's decision type determines the outcome: Deny blocks, Review/Log
 * flags, everything else (Route, Transform, Throttle, Emit) resolves the
 * request and is recorded as allowed. Monitor-mode controls never block.
 */
function outcomeFor(control: Control): DecisionOutcome {
  if (control.mode === 'monitor') return control.decision === 'Deny' ? 'Flagged' : 'Allowed'
  if (control.decision === 'Deny') return 'Blocked'
  if (control.decision === 'Review' || control.decision === 'Log') return 'Flagged'
  return 'Allowed'
}

/** Reference "now" for the decision stream. */
export const ENFORCEMENT_NOW = '2026-07-24T14:00:00'

/**
 * Build the log from the real control catalog. Every field is a deterministic
 * function of the control id and index, so the stream is stable across renders
 * while still reading like live traffic.
 *
 * Control selection is deliberately skewed: real enforcement traffic is a power
 * law, where a handful of controls account for most decisions. Striding evenly
 * through the catalog would give every control one hit and make "top firing
 * controls" meaningless.
 */
function buildLog(count = 48): EnforcementDecision[] {
  const now = Date.parse(ENFORCEMENT_NOW)
  const out: EnforcementDecision[] = []
  const pool = controls.filter((c) => ['Deny', 'Review', 'Transform', 'Route', 'Log', 'Throttle'].includes(c.decision))
  for (let i = 0; i < count; i++) {
    // Skewed toward the front of the pool so a few controls dominate.
    const control = pool[Math.min(pool.length - 1, Math.floor(pool.length * Math.pow(rand(i, 1), 1.8)))]
    const fleet = pick(FLEET, i, 2)
    const subjects = SUBJECTS[control.prefix] ?? ['Governed request evaluated at the enforcement point']
    const matches = MATCHES[control.prefix] ?? [['policy:matched']]
    // Composite that pulls in this control's primitive pack, else any live one.
    const via = liveComposites.find((p) => p.dependencies.includes(control.packId)) ?? pick(liveComposites, i, 3)
    out.push({
      id: `DEC-${9000 + i}`,
      at: new Date(now - Math.round(i * 137 + rand(i, 4) * 90) * 1000).toISOString(),
      customer: fleet.customer,
      instance: fleet.instance,
      model: fleet.model,
      region: fleet.region,
      direction: control.prefix === 'HI' || control.prefix === 'RG' ? 'response' : rand(i, 5) < 0.25 ? 'response' : 'prompt',
      outcome: outcomeFor(control),
      controlId: control.id,
      viaPackId: via?.id ?? 'F1',
      matched: pick(matches, i, 6),
      subject: pick(subjects, i, 7),
      actor: pick(ACTORS, i, 8),
      latencyMs: 4 + Math.floor(rand(i, 9) * 38),
    })
  }
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

export const decisionSeed: EnforcementDecision[] = buildLog()

/* ------------------------------------------------------------------ */
/* Lookups & derived metrics                                           */
/* ------------------------------------------------------------------ */
export const controlById = (id: string): Control | undefined => controls.find((c) => c.id === id)
export const packById = (id: string): PolicyPack | undefined => packs.find((p) => p.id === id)
/** The human-readable family a control belongs to (e.g. "Consent & Purpose"). */
export const familyOfControl = (id: string) => familyOf(id.split('-')[0])

export interface EnforcementMetrics {
  total: number
  blocked: number
  flagged: number
  allowed: number
  allowRate: number
  /** Share of *reviewed* decisions judged false positives. */
  falsePositiveRate: number
  reviewed: number
  p95Latency: number
}

export function enforcementMetrics(log: EnforcementDecision[], triage: Record<string, Triage>): EnforcementMetrics {
  const blocked = log.filter((d) => d.outcome === 'Blocked').length
  const flagged = log.filter((d) => d.outcome === 'Flagged').length
  const allowed = log.length - blocked - flagged
  const verdicts = log.map((d) => triage[d.id]).filter(Boolean) as Triage[]
  const fp = verdicts.filter((t) => t.verdict === 'false-positive').length
  const sorted = [...log].map((d) => d.latencyMs).sort((a, b) => a - b)
  return {
    total: log.length,
    blocked,
    flagged,
    allowed,
    allowRate: log.length ? (allowed / log.length) * 100 : 100,
    falsePositiveRate: verdicts.length ? (fp / verdicts.length) * 100 : 0,
    reviewed: verdicts.length,
    p95Latency: sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0,
  }
}

/** Controls firing most often — where enforcement pressure actually sits. */
export function topControls(log: EnforcementDecision[], limit = 5) {
  const counts = new Map<string, { id: string; hits: number; blocked: number }>()
  for (const d of log) {
    const e = counts.get(d.controlId) ?? { id: d.controlId, hits: 0, blocked: 0 }
    e.hits++
    if (d.outcome === 'Blocked') e.blocked++
    counts.set(d.controlId, e)
  }
  return [...counts.values()].sort((a, b) => b.hits - a.hits).slice(0, limit)
}
