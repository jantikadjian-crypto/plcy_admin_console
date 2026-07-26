/**
 * Hardening recommendations — red-team bypasses as evidence for tightening a
 * control.
 *
 * This is the mirror image of `tuningRecommendations` in `./enforcement`. There,
 * a pattern of reviewer-confirmed false positives argues a control is too
 * aggressive and should be loosened. Here, a red-team finding that got *past* a
 * control argues the opposite: the guard that should have caught it didn't, and
 * the policy needs to move the other way.
 *
 * Both produce the same `ChangeLine` shape Policy Change Management consumes, so
 * a proposal from either direction enters the same review → approval → dry-run →
 * apply path rather than living as an observation nobody actions.
 *
 * Tightening carries risk that loosening does not: dropping a control to monitor
 * mode cannot break customer traffic, but raising enforcement can. Every
 * recommendation therefore carries a blast radius computed against the real
 * decision log — what this change would have done to traffic already seen.
 */
import { controls, familyOf } from './policy'
import type { Control, Decision, DetectorType } from './policy'
import { controlById, packById, outcomeFor } from './enforcement'
import type { EnforcementDecision } from './enforcement'
import type { Finding, RedTeamCampaign, Severity } from './evals'
import type { ChangeLine, Risk } from './policyChanges'

/* ------------------------------------------------------------------ */
/* Which findings count as evidence                                    */
/* ------------------------------------------------------------------ */

/**
 * A finding argues for a policy change when it is still live and still names a
 * control family. `accepted` is excluded on purpose — someone has explicitly
 * signed off on that risk, and re-proposing a change would relitigate a decision
 * that was already made. A `mitigated` finding is excluded unless its last
 * retest still bypassed, which means the mitigation didn't hold.
 */
export function isLiveBypass(f: Finding): boolean {
  if (!f.linkedControlPrefix) return false
  if (f.status === 'accepted') return false
  if (f.status === 'mitigated') return f.retestResult === 'bypassed'
  return true
}

/**
 * One Critical/High bypass is already a case — a proven bypass is not noise the
 * way a single false positive is. Anything lower needs a pattern.
 */
export const HARDENING_MIN_LOW_SEVERITY = 2
const isSevere = (s: Severity) => s === 'Critical' || s === 'High'

/* ------------------------------------------------------------------ */
/* Picking the control to tighten                                      */
/* ------------------------------------------------------------------ */

/** How much a decision actually restrains a request. */
const DECISION_RANK: Record<Decision, number> = {
  Emit: 0, Log: 1, Throttle: 2, Transform: 3, Route: 4, Review: 5, Allow: 5, Deny: 6,
}

/** How much of the request a detector can actually see. */
const DETECTOR_RANK: Record<DetectorType, number> = {
  Registry: 0, Metadata: 1, Event: 1, OTel: 1, 'Rate limiter': 1, Policy: 2,
  Regex: 3, Heuristic: 4, Anomaly: 4, Orchestrator: 4, Classifier: 5, LLM: 6,
}

/** A decision that stops or diverts a request, as opposed to one that only records it. */
const acts = (c: Control) => DECISION_RANK[c.decision] >= DECISION_RANK.Transform

/** The next step up the decision ladder — what "enforce this harder" means. */
const STRICTER: Partial<Record<Decision, Decision>> = {
  Log: 'Review', Emit: 'Log', Throttle: 'Review', Transform: 'Review', Route: 'Review', Review: 'Deny',
}

/**
 * The family's primary guard — the control actually meant to stop this class of
 * request. Strictest acting decision wins; ties break toward the *weakest*
 * detector, because within a tier that is the link a bypass would have walked
 * through.
 */
export function primaryGuard(prefix: string): Control | undefined {
  const family = controls.filter((c) => c.prefix === prefix && acts(c))
  if (family.length === 0) return undefined
  return [...family].sort(
    (a, b) =>
      DECISION_RANK[b.decision] - DECISION_RANK[a.decision] ||
      DETECTOR_RANK[a.detector] - DETECTOR_RANK[b.detector] ||
      a.id.localeCompare(b.id),
  )[0]
}

/**
 * Three ways to tighten, in the order they're worth trying:
 *  - `promote-to-enforce` — the guard is in monitor mode. It was only watching,
 *    so nothing else matters until it acts. (Inverse of `demote-to-monitor`.)
 *  - `strengthen-detector` — the guard acts, but its detector can't see request
 *    content, so adversarial payloads walk past it. Upgrade what it inspects.
 *  - `raise-decision` — the guard sees the request and still let it through.
 *    Move it a step up the ladder.
 */
export type HardeningKind = 'promote-to-enforce' | 'strengthen-detector' | 'raise-decision'

export interface Hardening {
  controlId: string
  controlName: string
  prefix: string
  family: string
  packId: string
  packName: string
  kind: HardeningKind
  severity: Severity
  /** Finding ids that justify the proposal. */
  evidence: string[]
  /** Campaigns those findings came from. */
  campaigns: string[]
  /** The attack that got through, for the change request's summary. */
  technique: string
  rationale: string
  risk: Risk
  blast: BlastRadius
  /** The proposed edit, in the shape Policy Change Management consumes. */
  changes: ChangeLine[]
}

/* ------------------------------------------------------------------ */
/* Blast radius — what this would have done to traffic already seen    */
/* ------------------------------------------------------------------ */

export interface BlastRadius {
  /** Decisions on this control in the log window. */
  evaluated: number
  /** Size of the log window they were drawn from. */
  window: number
  /** Decisions whose outcome would change under the proposal. */
  wouldChange: number
  /** Of those, how many land on Blocked. */
  wouldBlock: number
  /** Decisions currently resolving as Allowed — the exposure a stronger detector re-examines. */
  currentlyAllowed: number
  customers: string[]
}

/**
 * Replays the log against the proposed control. Outcome is a function of mode
 * and decision, so a detector change moves nothing by itself — that is reported
 * honestly rather than dressed up: what changes is what the detector *sees*,
 * which the log cannot tell us, so we report the exposure it re-examines instead.
 */
export function blastRadius(log: EnforcementDecision[], control: Control, proposed: Control): BlastRadius {
  const hits = log.filter((d) => d.controlId === control.id)
  let wouldChange = 0
  let wouldBlock = 0
  for (const d of hits) {
    const next = outcomeFor(proposed)
    if (next !== d.outcome) {
      wouldChange++
      if (next === 'Blocked') wouldBlock++
    }
  }
  return {
    evaluated: hits.length,
    window: log.length,
    wouldChange,
    wouldBlock,
    currentlyAllowed: hits.filter((d) => d.outcome === 'Allowed').length,
    customers: [...new Set(hits.map((d) => d.customer))].sort(),
  }
}

/* ------------------------------------------------------------------ */
/* The recommendations                                                 */
/* ------------------------------------------------------------------ */

export function hardeningRecommendations(
  campaigns: RedTeamCampaign[],
  log: EnforcementDecision[],
): Hardening[] {
  // Group live bypasses by the control family they defeated.
  const byPrefix = new Map<string, { findings: Finding[]; campaigns: Set<string> }>()
  for (const c of campaigns) {
    for (const f of c.findings) {
      if (!isLiveBypass(f)) continue
      const prefix = f.linkedControlPrefix as string
      const e = byPrefix.get(prefix) ?? { findings: [], campaigns: new Set<string>() }
      e.findings.push(f)
      e.campaigns.add(c.name)
      byPrefix.set(prefix, e)
    }
  }

  const out: Hardening[] = []
  for (const [prefix, { findings, campaigns: camps }] of byPrefix) {
    const severe = findings.filter((f) => isSevere(f.severity))
    if (severe.length === 0 && findings.length < HARDENING_MIN_LOW_SEVERITY) continue

    const guard = primaryGuard(prefix)
    if (!guard) continue
    const pack = packById(guard.packId)

    // Worst severity in the group drives the change request's risk band.
    const severity: Severity = severe.length
      ? severe.some((f) => f.severity === 'Critical') ? 'Critical' : 'High'
      : findings.some((f) => f.severity === 'Medium') ? 'Medium' : 'Low'

    const kind: HardeningKind =
      guard.mode === 'monitor' ? 'promote-to-enforce'
      : DETECTOR_RANK[guard.detector] < DETECTOR_RANK.Classifier ? 'strengthen-detector'
      : 'raise-decision'

    const technique = findings[0].summary
    const proposed: Control = { ...guard }
    const changes: ChangeLine[] = []

    if (kind === 'promote-to-enforce') {
      proposed.mode = 'enforce'
      changes.push({ op: 'modify', controlId: guard.id, controlName: guard.name, field: 'mode', before: guard.mode, after: 'enforce' })
    } else if (kind === 'strengthen-detector') {
      proposed.detector = 'Classifier'
      changes.push({ op: 'modify', controlId: guard.id, controlName: guard.name, field: 'detector', before: guard.detector, after: 'Classifier' })
    } else {
      const next = STRICTER[guard.decision] ?? 'Deny'
      proposed.decision = next
      changes.push({ op: 'modify', controlId: guard.id, controlName: guard.name, field: 'decision', before: guard.decision, after: next })
    }

    // Every shape also names the technique in the obligation, so the control
    // documents what it is now expected to stop.
    changes.push({
      op: 'modify',
      controlId: guard.id,
      controlName: guard.name,
      field: 'obligation',
      before: guard.obligation,
      after: `${guard.obligation} — including ${shortTechnique(technique)}`,
    })

    const rationale =
      kind === 'promote-to-enforce'
        ? `${describeEvidence(findings)} defeated ${familyOf(prefix)}, and ${guard.id} — the control meant to stop it — is in monitor mode. It logged the attack without acting on it. Promote it to enforce.`
        : kind === 'strengthen-detector'
          ? `${describeEvidence(findings)} got past ${guard.id}. Its ${guard.detector} detector inspects request metadata, not content, so a payload shaped to look ordinary walks through. Upgrade it to a classifier that reads the request.`
          : `${describeEvidence(findings)} got past ${guard.id} even though its ${guard.detector} detector saw the request. Detection isn't the gap — the response is. Raise ${guard.decision} to ${STRICTER[guard.decision] ?? 'Deny'}.`

    out.push({
      controlId: guard.id,
      controlName: guard.name,
      prefix,
      family: familyOf(prefix),
      packId: guard.packId,
      packName: pack?.name ?? guard.packId,
      kind,
      severity,
      evidence: findings.map((f) => f.id),
      campaigns: [...camps],
      technique,
      rationale,
      risk: severity === 'Critical' || severity === 'High' ? 'High' : 'Medium',
      blast: blastRadius(log, guard, proposed),
      changes,
    })
  }

  const sev: Record<Severity, number> = { Critical: 3, High: 2, Medium: 1, Low: 0 }
  return out.sort((a, b) => sev[b.severity] - sev[a.severity] || b.evidence.length - a.evidence.length)
}

/** "2 bypasses (1 Critical)" / "A High-severity bypass" — reads in a sentence. */
function describeEvidence(findings: Finding[]): string {
  if (findings.length === 1) return `A ${findings[0].severity}-severity bypass`
  const worst = findings.some((f) => f.severity === 'Critical') ? 'Critical' : findings.some((f) => f.severity === 'High') ? 'High' : 'Medium'
  return `${findings.length} unresolved bypasses (worst ${worst})`
}

/** Trim a finding summary down to something that reads inside an obligation. */
function shortTechnique(summary: string): string {
  const s = summary.replace(/\.$/, '')
  const lower = s.charAt(0).toLowerCase() + s.slice(1)
  if (lower.length <= 72) return lower
  // Cut on a word boundary — a mid-word truncation reads like a broken string.
  return `${lower.slice(0, 72).replace(/\s+\S*$/, '')}…`
}

/** Title for the change request a recommendation becomes. */
export function hardeningTitle(h: Hardening): string {
  switch (h.kind) {
    case 'promote-to-enforce':
      return `Promote ${h.controlId} to enforce — it logged a ${h.severity}-severity bypass without acting`
    case 'strengthen-detector':
      return `Give ${h.controlId} a content-aware detector after a ${h.severity}-severity bypass`
    case 'raise-decision':
      return `Raise ${h.controlId} to ${h.changes[0].after} after a ${h.severity}-severity bypass`
  }
}

export { controlById }
