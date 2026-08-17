/**
 * Developer handover notes — the single source for both the in-app "Dev Notes"
 * panel and `docs/plcy_admin_console-developer-notes.md`.
 *
 * The markdown file is GENERATED from this module (`npm run docs:dev-notes`).
 * Edit the notes here, never in the markdown, or the two will drift — which is
 * the exact failure this file exists to prevent.
 *
 * Written for a developer who has never seen this codebase. Where a rule is a
 * real business decision it says so; where a number is a placeholder waiting on
 * real contracts it says that too, because the distinction is the single most
 * important thing to carry out of this prototype.
 */

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

/** How much of what you see should be trusted as a specification. */
export type Fidelity =
  /** The rule is a real business decision. Reimplement it faithfully. */
  | 'rule-real'
  /** The mechanism is real; the specific number is a dial awaiting real input. */
  | 'value-placeholder'
  /** Illustrative only. Do not carry it forward. */
  | 'illustrative'

export const FIDELITY_LABEL: Record<Fidelity, string> = {
  'rule-real': 'Rule is real',
  'value-placeholder': 'Value is a placeholder',
  illustrative: 'Illustrative only',
}

export interface DevRule {
  rule: string
  /** A concrete walk-through, because rules stated abstractly get misread. */
  example?: string
  fidelity: Fidelity
  /** Where it lives. */
  source?: string
}

export interface DevField {
  field: string
  type: string
  /** Where the value comes from today, and where it must come from later. */
  source: string
  note?: string
}

export interface DevIntegration {
  name: string
  /** Every integration in this console is currently faked. This says what's behind it. */
  note: string
}

export interface DevPermission {
  action: string
  /** The `Capability` string the UI gates on, if any. */
  capability?: string
  note: string
}

export interface DevModule {
  key: string
  title: string
  /** One line for the panel header. */
  summary: string
  /** Route prefixes this module covers, so the panel can follow the user. */
  match: string[]
  /** The files a developer should open first. */
  files: string[]
  overview: string[]
  rules: DevRule[]
  fields: DevField[]
  edgeCases: string[]
  integrations: DevIntegration[]
  permissions: DevPermission[]
  openQuestions: string[]
}

/* ------------------------------------------------------------------ */
/* Platform preamble — read this before any module                     */
/* ------------------------------------------------------------------ */

export const PLATFORM = {
  product: [
    'PLCY is runtime governance and policy enforcement for AI. It sits **in the live traffic path** between customer applications, agents, and models — classifying sensitive data, enforcing policy, routing to approved providers, and validating outputs at request time, while producing audit-ready evidence.',
    'This repository is the **internal admin console**: the surface the PLCY team uses to operate that platform across every customer. It is not the enforcement point itself and it is not a customer-facing product. Its users are PLCY staff — customer success, engineering, security/compliance, finance.',
    'Because enforcement is inline, two properties drive most of the design. First, **every decision is per-request and latency-bearing** — the console reports enforcement overhead as a first-class number because it is a cost the customer pays on every call. Second, **every decision must be explainable after the fact** — the decision log resolves each outcome back through the composite pack the customer deployed, the primitive pack, the atomic control, its detector, its decision, and the evidence it emitted.',
  ],
  deploymentModes: [
    '**SaaS** — multi-tenant, PLCY-hosted. Reachable from the control plane.',
    '**Sovereign Cloud** — single-tenant in a specified region, customer-managed keys. Reachable from the control plane.',
    '**Air-gapped** — single-tenant with no network path to PLCY. **Architecturally unreachable from the control plane.** This is a hard rule across the whole product, not a red-team constraint: anything that tries to reach an air-gapped instance live must reject it server-side. Air-gapped deployments are served by offline bundles and validated by a separate offline certification process.',
  ],
  architecture: [
    'React 18 · TypeScript (strict) · Vite · Tailwind · React Router · Recharts. No backend, no network calls, no tests.',
    '**Data lives in `src/data/*`.** Seed data and the pure functions that derive things from it. These modules are the closest thing to a specification in this repo — the rules in them are real even where the numbers are not.',
    '**Mutable state lives in stores.** Two patterns coexist: React context providers (`src/context/*`, e.g. `Customers`, `Employees`, `Policy`) and standalone observable stores built on `useSyncExternalStore` (`src/data/*Store.ts`, e.g. `enforcementStore`, `evalsStore`, `policyChangesStore`). Both persist to `localStorage` and merge new seeds on load. Prefer the observable-store pattern for new work: it avoids provider nesting and can be read from non-React code.',
    '**`localStorage` is the persistence layer.** Every "save" in this app writes to the browser. Keys are namespaced and versioned (`plcy.employees.v2`, `plcy.activity.v1`, `plcy.evals.v1`). When a stored shape changes incompatibly, bump the key rather than writing a migration — a prototype has no data worth migrating.',
    '**UI primitives are in `src/components/ui.tsx`.** `Table` is the one to know: it caps rows, renders the "Show all" toggle, and supports per-column hover descriptions. Behaviour added there lands on all ~64 tables at once.',
  ],
  conventions: [
    'Path alias `@/` → `src/`.',
    'Hubs (`src/pages/hubs.tsx`) group related pages under one route with a `?tab=` query param. Ten hubs cover most of the ~70 pages. Old flat routes still exist and `<Navigate>` to the hub equivalent — keep them, they are linked from elsewhere.',
    'Any action a role might not be allowed to take is wrapped in `<GatedButton cap="...">`, never a bare `<button>`.',
    'Any state-changing action calls `logAction(...)` from `useSession()`, which appends to the audit trail and stamps the actor as active.',
    'Derived values are computed at render from the store, not cached in state. The data volumes here are trivial; correctness beats memoisation.',
  ],
  doNotTreatAsSpec: [
    'All seeded telemetry: the enforcement decision log, latency samples, uptime figures, RPS, token counts, MRR, service-credit amounts, dates. **Illustrative.**',
    'All threshold *values*: latency ceilings, SLA targets, false-positive counts, budgets, row caps. **The mechanisms are real; the numbers are dials.** Every one is a named constant so it can be set from real contracts without hunting through the code.',
    'The RBAC model in `src/data/access.ts` — 7 roles × 86 features. **Invented for this prototype**, not copied from production. Treat it as a proposal to review, not as authority. (A stale comment in `permissions.ts` previously implied otherwise; it has been corrected.)',
    'Every integration. Stripe, PagerDuty, OpenTelemetry, Terraform/Helm, the container registry, cosign/SLSA, SSO/SCIM are all placeholders standing in for integrations that still need to be built.',
  ],
  knownGaps: [
    '**No error handling anywhere.** No loading states, no failure paths, no retries, no optimistic-update rollback. Every action succeeds instantly because nothing crosses a network. This is the single largest piece of work when wiring a backend. Recommended pattern: give each store an explicit `status: idle | loading | error` alongside its data, render a skeleton on `loading` and an inline retry on `error`, and make mutations optimistic with rollback on rejection — the stores already centralise state, so this fits without restructuring pages.',
    '**No tests.** Not one. The pure functions in `src/data/*` (`percentile`, `tuningRecommendations`, `hardeningRecommendations`, `latencyStatus`, `roleCan`, `scoreSecurity`) are the highest-value place to start: they hold the business rules and have no React dependency.',
    '**No i18n, no timezone handling.** Dates are formatted ad hoc; some are ISO strings, some are display strings. `Employee.lastActiveAt` is the one field deliberately stored as an ISO instant — copy that approach, not the others.',
    '**No accessibility audit.** Gated buttons and column hints carry ARIA, but the app has not been tested with a screen reader end to end.',
    '**Bundle is one chunk (~2 MB).** No code splitting; the build warns about it. Route-level `React.lazy` is the obvious fix.',
  ],
}

/* ------------------------------------------------------------------ */
/* Modules                                                             */
/* ------------------------------------------------------------------ */

export const DEV_MODULES: DevModule[] = [
  /* ---------------------------------------------------------------- */
  {
    key: 'policy',
    title: 'Policy — packs, controls, change management, enforcement',
    summary: 'The catalog of what gets enforced, the workflow for changing it, and the record of what it did.',
    match: ['/policy', '/policy-packs', '/policy-editor', '/enforcement'],
    files: [
      'src/data/policy.ts — the control catalog',
      'src/data/enforcement.ts — decision log, triage, tuning proposals',
      'src/data/hardening.ts — red-team bypasses → tightening proposals',
      'src/data/policyChanges.ts — change-request lifecycle',
      'src/pages/Enforcement.tsx, PolicyPacks.tsx, PolicyChanges.tsx',
    ],
    overview: [
      'The policy catalog has three levels. **Atomic controls** (51 of them, ids like `DR-01`, `RG-02`) are the unit of enforcement: each has a *detector* (what it inspects), a *decision* (what it does), an *obligation* (what it guarantees), *evidence* fields (what it emits), and a *mode* (`enforce` or `monitor`). Controls group into **primitive packs** (single-purpose guardrails, `P1`…`P10`), which compose into **composite packs** — framework bundles (GDPR, SOC 2) and industry bundles. Customers deploy composites.',
      'The **decision log** is the record of what the enforcement point actually did, request by request. Each entry resolves back through the whole chain, which is what makes an outcome explainable to a customer or an auditor.',
      'The most important flow in the console closes a loop: an operator reviews decisions and marks them correct or false-positive → accumulated verdicts produce a **tuning recommendation** → that becomes a real **change request** carrying its evidence → the CR goes through review, approval, dry-run, schedule, apply. The same queue receives **hardening** proposals from the opposite direction (see the Evaluations module). One path loosens a control that over-fires; the other tightens one that under-fires.',
    ],
    rules: [
      {
        rule: 'A decision\'s outcome is a pure function of the control\'s mode and decision type. `monitor` mode never blocks. `Deny` blocks; `Review` and `Log` flag; everything else (`Route`, `Transform`, `Throttle`, `Emit`) resolves and is recorded as allowed.',
        example: 'RG-02 is `Deny` in `enforce` mode → Blocked. Flip it to `monitor` and the same request is Flagged, not Blocked. This function (`outcomeFor`) is also what powers blast-radius replay.',
        fidelity: 'rule-real',
        source: 'src/data/enforcement.ts → outcomeFor()',
      },
      {
        rule: 'A control needs a *pattern* of reviewed false positives before the console proposes changing it — a single bad call is noise.',
        example: 'Threshold is `TUNING_MIN_FALSE_POSITIVES = 2`. Mark one decision on HI-02 as a false positive and nothing happens; mark a second and a recommendation appears.',
        fidelity: 'value-placeholder',
        source: 'src/data/enforcement.ts → tuningRecommendations()',
      },
      {
        rule: 'The *shape* of a tuning proposal depends on how badly the control is misfiring. Overwhelming (≥75% of reviews false) → drop it to `monitor` so it keeps logging while retuned, rather than blocking traffic it shouldn\'t. Persistent but partial → keep enforcing, narrow the obligation to exclude the accounts that tripped it.',
        example: 'HI-02 at 2 false of 2 reviewed = 100% → proposes `mode: enforce → monitor`, filed at High risk. RD-05 at 2 false of 3 = 67% → proposes `obligation: "Sign logs / enforce WORM" → "… except Lumen Media, Meridian Bank"`, filed at Medium.',
        fidelity: 'rule-real',
      },
      {
        rule: 'A proposal is remembered per control once raised, so the same recommendation cannot be filed twice.',
        example: 'After filing, the card shows "Raised as CR-201" with a link instead of the button. Survives reload — stored in `enforcementStore.proposals`.',
        fidelity: 'rule-real',
      },
      {
        rule: 'Change requests carry a version bump derived from the pack\'s history, computed in one shared place so every surface that raises a CR numbers it identically.',
        example: 'A pack at 1.0 → the CR targets 1.1. `nextVersion()` is used by both the Enforcement and Red-Team paths.',
        fidelity: 'rule-real',
        source: 'src/data/policyChanges.ts → nextVersion()',
      },
      {
        rule: 'Authoring a change and approving it are separate capabilities — deliberate separation of duties.',
        example: '`policy.manage` lets you open and edit a CR; `policy.approve` is the approval board. A role with only the former cannot approve its own change.',
        fidelity: 'rule-real',
      },
      {
        rule: 'Request content is never stored. The decision log holds a redacted one-line `subject` and a list of *entity types* the detector matched — never the values.',
        example: '`matched: ["PII:name", "PII:national_id"]`, not the name or the number. This is a privacy guarantee, not a display choice, and must survive the move to a real backend.',
        fidelity: 'rule-real',
      },
    ],
    fields: [
      { field: 'Control.mode', type: "'enforce' | 'monitor'", source: 'src/data/policy.ts', note: 'Monitor-mode controls log without acting. The single most consequential field on a control.' },
      { field: 'Control.decision', type: "'Allow' | 'Deny' | 'Transform' | 'Route' | 'Review' | 'Log' | 'Throttle' | 'Emit'", source: 'src/data/policy.ts', note: 'Drives outcome. Ranked by strictness in hardening.ts.' },
      { field: 'Control.detector', type: 'DetectorType', source: 'src/data/policy.ts', note: 'What the control can actually see. Metadata/Policy detectors cannot inspect request content — central to the hardening logic.' },
      { field: 'EnforcementDecision.viaPackId', type: 'string', source: 'Generated; must come from the enforcement point', note: 'The composite pack the customer deployed that pulled this control in. Without it the explanation chain breaks.' },
      { field: 'EnforcementDecision.latencyMs', type: 'number', source: 'Generated (right-skewed); must be real per-decision timing', note: 'Feeds the p95 enforcement-overhead figure.' },
      { field: 'Triage.verdict', type: "'correct' | 'false-positive'", source: 'enforcementStore, operator-entered', note: 'The only human input in the loop. Drives false-positive rate and all tuning.' },
      { field: 'ChangeLine', type: '{ op, controlId, controlName, field, before, after }', source: 'src/data/policyChanges.ts', note: 'The universal diff shape. Both tuning and hardening emit it, so Change Management needs no translation.' },
    ],
    edgeCases: [
      'Global enforcement can be switched off. Controls still evaluate and log, but nothing is blocked — the page says so explicitly rather than silently showing a stale log.',
      'A control with zero decisions in the log window has no blast radius. The UI says "hasn\'t fired in the last N decisions" rather than implying zero risk.',
      'The decision log is capped at 25 rows with an explicit "Show all" toggle; changing a filter collapses it back, because "most recent 25" means something different per filter.',
      'Packs can be created and cloned in the editor. Ids must be unique — the form blocks a clash rather than silently overwriting.',
    ],
    integrations: [
      { name: 'Enforcement point (the gateway itself)', note: 'The decision log is generated from the control catalog. Real source: a stream or query API from the enforcement point. This is the single most important integration in the product.' },
      { name: 'OpenTelemetry', note: 'Controls declare `evidence` fields they emit to traces. Nothing is actually emitted. Placeholder for the real evidence pipeline.' },
    ],
    permissions: [
      { action: 'Toggle global enforcement, set pack mode, add exception, triage a decision, file a tuning CR', capability: 'policy.manage', note: 'One capability covers all policy mutation.' },
      { action: 'Approve a change request', capability: 'policy.approve', note: 'Deliberately distinct from authoring.' },
    ],
    openQuestions: [
      'What are the real thresholds — how many false positives justify a change, and at what rate does a control get demoted rather than narrowed?',
      'Who owns approving a policy change in practice, and is one approver enough or does risk level change the quorum?',
      'Should an applied CR automatically re-open if the control regresses, or is that a fresh proposal?',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    key: 'evaluations',
    title: 'Evaluations — efficacy, red-team, hardening, review queue',
    summary: 'Adversarial testing of the platform, and turning what gets through into policy changes.',
    match: ['/evaluations'],
    files: [
      'src/data/evals.ts — campaigns, findings, attempts, attack library, OWASP/ATLAS taxonomy',
      'src/data/hardening.ts — bypass → tightening proposal',
      'src/pages/RedTeam.tsx, Efficacy.tsx, EvalSuites.tsx, ModelScorecards.tsx, ReviewQueue.tsx',
      'docs/red-team-runner-spec.md — the backend contract for actually running campaigns',
    ],
    overview: [
      'Red-team campaigns attack the platform and connected instances with techniques drawn from an attack library, tagged against OWASP LLM Top-10 and MITRE ATLAS. A campaign produces **attempts** (the forensic record of each prompt fired) and **findings** (the ones that got through, with a reproduction).',
      'A finding is not a dead end. When a bypass defeats a control family, the console produces a **hardening recommendation** against that family\'s primary guard and hands it to Policy Change Management as a change request — the mirror image of the tuning flow that Enforcement produces.',
      '`docs/red-team-runner-spec.md` already specifies the backend that would run campaigns for real. Read it alongside this module.',
    ],
    rules: [
      {
        rule: 'A finding counts as evidence only while it is live. `accepted` findings are excluded — someone explicitly signed off on that risk, and re-proposing would relitigate a closed decision. `mitigated` findings are excluded *unless* their latest retest bypassed again, which means the mitigation did not hold.',
        example: 'f_301 is `accepted` → never proposes. f_102 is `mitigated` with a passing retest → excluded. Fail its retest and it returns as evidence.',
        fidelity: 'rule-real',
        source: 'src/data/hardening.ts → isLiveBypass()',
      },
      {
        rule: 'One Critical or High bypass justifies a proposal on its own; anything lower needs a pattern. A proven bypass is not noise the way a single false positive is — the asymmetry against the tuning threshold is deliberate.',
        example: 'A single High finding on RG produces a recommendation immediately. Two Mediums also would; one Medium would not.',
        fidelity: 'rule-real',
      },
      {
        rule: 'The control to tighten is the family\'s **primary guard**: the strictest *acting* decision, with ties broken toward the **weakest detector** — within a tier, that is the link an attack walks through. Controls whose decision only records (`Log`, `Emit`) are never the target, because enforcing a logger changes nothing.',
        example: 'RG has RG-01 (Deny, Policy detector) and RG-02 (Deny, Metadata). Both Deny; Metadata is the weaker detector, so RG-02 is picked. Worth knowing: this rule picks the weakest link, which is not always the control a human would have named.',
        fidelity: 'rule-real',
        source: 'src/data/hardening.ts → primaryGuard()',
      },
      {
        rule: 'Three tightening shapes, chosen by where the gap is. Guard in `monitor` → promote to `enforce` (it was only watching). Guard whose detector cannot read content → give it a content-aware detector (a payload shaped to look ordinary walks past metadata). Guard that saw the request and still allowed it → raise its decision one step (`Transform → Review → Deny`). Every shape also writes the technique into the control\'s obligation.',
        example: 'A High bypass past RG-02 (Metadata detector) proposes `detector: Metadata → Classifier` plus an obligation extension naming the technique. Two diff lines, one CR.',
        fidelity: 'rule-real',
      },
      {
        rule: 'Tightening can break customer traffic in a way loosening cannot, so every hardening proposal carries a **blast radius** replayed against the real decision log: how many recent decisions it touches, on which accounts, and how many would newly block. Where a change moves no outcome, it says so rather than inventing a number.',
        example: 'A detector change alters what is *seen*, not the verdict, so `wouldChange` is 0. The UI reports "no decision outcome changes… re-evaluates 1 recent decision on Meridian Bank with a detector that reads content" instead of implying zero risk.',
        fidelity: 'rule-real',
        source: 'src/data/hardening.ts → blastRadius()',
      },
      {
        rule: 'A finding only passes retest once it has actually been worked — a remediation note or a mitigated status. An untouched open finding still bypasses.',
        example: 'This is a deliberate honesty constraint on the mock: you cannot make a finding disappear by clicking Retest.',
        fidelity: 'rule-real',
        source: 'src/data/evalsStore.ts → retestFinding()',
      },
      {
        rule: 'Air-gapped targets must be rejected server-side. The console can express a campaign against them; the runner must refuse.',
        fidelity: 'rule-real',
        source: 'docs/red-team-runner-spec.md',
      },
    ],
    fields: [
      { field: 'Finding.linkedControlPrefix', type: 'string (family prefix, e.g. "RG")', source: 'evals seed; must come from the runner', note: 'A family, not a control id. The hardening logic resolves the specific control itself.' },
      { field: 'Finding.repro', type: '{ prompt, model }', source: 'evals seed', note: 'The exact attack, so a retest is a real re-run rather than a status flip.' },
      { field: 'Finding.retestResult', type: "'blocked' | 'bypassed'", source: 'evalsStore', note: 'Decides whether a mitigated finding re-enters the evidence pool.' },
      { field: 'TargetSpec', type: 'union — all / selection / filter', source: 'src/data/evals.ts', note: 'What a campaign attacks. Resolves to concrete deployments; the runner must re-resolve server-side, never trust the client list.' },
      { field: 'evalsStore.hardening', type: 'Record<controlId, crId>', source: 'localStorage', note: 'Prevents double-filing a hardening CR.' },
    ],
    edgeCases: [
      'A control family with no acting control produces no recommendation rather than a broken one.',
      'A recommendation disappears once its finding is genuinely resolved — work the finding, pass the retest, and it drops off the list.',
      'The recommendations card has a real empty state; it is evidence-driven and shows nothing when nothing qualifies.',
    ],
    integrations: [
      { name: 'Red-team runner', note: 'Does not exist. `docs/red-team-runner-spec.md` defines the orchestrator, scheduler, and result stream that would replace the seeded campaigns.' },
      { name: 'Model providers', note: 'Attempts name real models (GPT-4 Turbo, Claude Opus 4, Llama 3.1). No calls are made.' },
    ],
    permissions: [
      { action: 'View efficacy and eval surfaces', capability: 'evals.view', note: '' },
      { action: 'Launch campaigns, run evals, retest findings', capability: 'evals.run', note: 'Treated as a governance mutation.' },
      { action: 'Label QA review decisions', capability: 'evals.review', note: '' },
      { action: 'File a hardening change request', capability: 'policy.manage', note: 'Deliberately the policy capability, not an evals one — it creates a policy change.' },
    ],
    openQuestions: [
      'Is "weakest link in the strictest tier" the right target-selection rule, or should a finding name its control directly?',
      'Should hardening proposals require a dry-run before they can be approved, given they can block live traffic?',
      'What is the real severity threshold for auto-proposing, and does it differ by customer tier?',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    key: 'sla',
    title: 'SLA, Observability & Incidents',
    summary: 'Contractual commitments — uptime and latency — and the operational surfaces behind them.',
    match: ['/sla', '/observability', '/incidents', '/risk', '/notifications'],
    files: [
      'src/data/latency.ts — the one percentile definition',
      'src/data/sla.ts — targets, latency objective, credits',
      'src/pages/Sla.tsx, Observability.tsx, Incidents.tsx, Notifications.tsx',
    ],
    overview: [
      'An SLA record commits to uptime *and*, as of recently, latency. Latency is the number a customer challenges you on, so it belongs on the contract next to uptime rather than living as a decorative chart.',
      '`src/data/latency.ts` is the single definition of a percentile for the whole app. Before it existed, four surfaces invented latency independently and "p95" meant something different on each. Anything that reports a percentile must go through `percentile()` here.',
    ],
    rules: [
      {
        rule: 'Percentiles use **nearest rank**: `ceil(p × n)`, one-based. Not `floor(p × n)`, which over-reports whenever `p × n` is a whole number.',
        example: 'At n=20, p95 is the 19th of 20 sorted values, not the 20th. The old implementation returned the maximum and called it p95.',
        fidelity: 'rule-real',
        source: 'src/data/latency.ts → percentile()',
      },
      {
        rule: 'A latency objective is judged at p95 against a ceiling set by SLA tier. Over the ceiling is Breached; within the last 10% of it is At risk — the band where you want to know before the customer does.',
        example: 'A Gold account with a 400 ms ceiling reading 439 ms is Breached by 39 ms. At 366 ms it is At risk. At 294 ms it is Meeting.',
        fidelity: 'rule-real',
        source: 'src/data/latency.ts → latencyStatus()',
      },
      {
        rule: 'Tier ceilings and the enforcement-overhead budget are named constants precisely because they are placeholders.',
        example: '`LATENCY_TARGET_MS = { Platinum: 250, Gold: 400, Silver: 600 }` and `ENFORCEMENT_BUDGET_MS = 50`. Every one of these must be set from real contracts. The mechanism around them is real; the numbers are not.',
        fidelity: 'value-placeholder',
      },
      {
        rule: 'Enforcement overhead is tracked separately from gateway latency. It is PLCY\'s own tax on every governed request, and a customer will challenge it independently of end-to-end latency.',
        fidelity: 'rule-real',
      },
      {
        rule: 'A percentile over a period is computed from the period\'s samples, never by averaging per-bucket percentiles — averaging percentiles is statistically meaningless.',
        example: 'The Observability headline reduces all 9,600 of the day\'s samples through `percentile()`. It does not average the 24 hourly p95s.',
        fidelity: 'rule-real',
      },
      {
        rule: 'Latency samples are right-skewed, not uniform. Most requests sit near the median and a thin tail runs long.',
        example: 'This is not cosmetic. When the decision log sampled uniformly over 4-41 ms, p50 and p95 were nearly identical and the page\'s "warn above 50 ms" threshold could never fire — the tail it existed to catch did not exist. Calibrated so p95 ≈ 2.1× median, p99 ≈ 3×.',
        fidelity: 'rule-real',
        source: 'src/data/latency.ts → skewedLatency()',
      },
    ],
    fields: [
      { field: 'SlaTarget.latencyMedianMs', type: 'number', source: 'sla seed; must come from real telemetry', note: 'How the account actually runs. The judged p95 is derived from it so the two cannot contradict each other.' },
      { field: 'SlaTarget.uptimeTarget / uptimeMtd', type: 'number', source: 'sla seed', note: 'Illustrative figures.' },
      { field: 'SlaTarget.creditsOwed', type: 'number', source: 'sla seed', note: 'Accrues from uptime misses only. Latency breaches are declared chargeable in the UI but do not yet accrue credits — see open questions.' },
      { field: 'Percentiles.count', type: 'number', source: 'computed', note: 'Sample size behind the percentile. Always surface it; a p99 over 12 requests is not a p99.' },
    ],
    edgeCases: [
      'A customer with no traffic in the window reports no blast radius and no percentile rather than zero.',
      'Latency and uptime status are computed independently and can disagree — latency is often the leading indicator. Vertex Capital breaches latency while uptime is only wobbling.',
      'Column headings on this page carry hover descriptions, because "Attainment", "p95 latency" and "Notice" are contractual terms rather than plain English.',
    ],
    integrations: [
      { name: 'Telemetry / metrics backend', note: 'All latency is generated deterministically from a seeded stream. Real source: the gateway\'s own metrics pipeline. Percentiles should ideally be computed server-side over full data rather than client-side over a sample.' },
      { name: 'PagerDuty', note: 'On-call tiers, rotations, and services are modelled on the Notifications page. No integration exists.' },
    ],
    permissions: [
      { action: 'Schedule a maintenance window', capability: 'provision.manage', note: '' },
      { action: 'Manage incidents', capability: 'incident.manage', note: '' },
    ],
    openQuestions: [
      'What are the real p95 ceilings per tier, and are they negotiated per contract rather than fixed by tier?',
      'Should a latency breach accrue service credits like an uptime miss? The UI says it is chargeable; the credit maths is not wired, deliberately — it changes billing numbers.',
      'Is p95 the right contractual percentile, or do enterprise customers negotiate p99?',
      'Over what window is the objective judged — calendar month, rolling 30 days?',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    key: 'customers',
    title: 'Customers, Instances & Provisioning',
    summary: 'Accounts, their deployments, and how a new environment is stood up.',
    match: ['/customers', '/instances', '/provisioning', '/bulk-ops', '/pricing'],
    files: [
      'src/data/mock.ts — Customer/Instance shapes, makeCustomer()',
      'src/context/Customers.tsx — the customer store',
      'src/components/CustomerPicker.tsx — picker with inline create',
      'src/pages/Customers.tsx, Instances.tsx, Provisioning.tsx, BulkOps.tsx',
    ],
    overview: [
      '`Customer` is the root record almost everything joins to. `Instance.customer` is a **name string**, not an id — billing, health, renewals, residency, and scoping all resolve through it, which is why an unrecognised name produces a deployment nobody can bill or report on. Moving to a real backend, this should become a foreign key.',
      'Provisioning has two entry points: **Instances → Provision instance** (creates an instance directly) and **Provisioning → Onboard a new environment** (a three-step wizard that raises a provisioning job with compliance prerequisites). Both now share one customer picker.',
    ],
    rules: [
      {
        rule: 'You can only provision for a customer that exists. The picker reads the live customer store and offers an inline create; free text is not accepted.',
        example: 'Previously the wizard took free text and would happily raise a job for an account with no record behind it. The picker replaced that.',
        fidelity: 'rule-real',
      },
      {
        rule: 'A customer created mid-provisioning is a real record, identical to one created the long way — same factory, same id derivation.',
        example: '`makeCustomer({ name: "Beacon Financial" })` → id `cus_beacon_financial`, domain `beaconfinancial.com`. The same name always resolves to the same id.',
        fidelity: 'rule-real',
        source: 'src/data/mock.ts → makeCustomer()',
      },
      { rule: 'Duplicate customer names are refused and the user is pointed at the existing account.', fidelity: 'rule-real' },
      { rule: 'A Trial customer has zero MRR regardless of what the form carried.', example: 'Set status Trial with MRR 5000 and the record stores 0.', fidelity: 'rule-real' },
      { rule: 'Provisioning an instance increments the owning customer\'s instance count.', example: 'Without this a customer read "0 instances" however many they ran.', fidelity: 'rule-real' },
      { rule: 'Deployment mode steers compliance prerequisites. Air-gapped defaults BYOK, residency, offline licence and escorted access on; Sovereign Cloud defaults BYOK and residency.', fidelity: 'rule-real' },
      { rule: 'A customer-scope selector in the sidebar filters most pages to one account. "All Customers" is the unscoped default.', fidelity: 'rule-real', source: 'src/context/CustomerScope.tsx' },
    ],
    fields: [
      { field: 'Customer.id', type: 'string', source: 'derived from name', note: '`cus_<slugged name>`. Deterministic, so re-creating the same name collides — which is why duplicates are blocked.' },
      { field: 'Customer.instances', type: 'number', source: 'incremented on provision', note: 'Denormalised count. In a real backend, derive it rather than store it.' },
      { field: 'Instance.customer', type: 'string (name)', source: 'user selection', note: 'Should be a customer id. The single worst modelling decision in this prototype.' },
      { field: 'Instance.status', type: "'Healthy' | 'Degraded' | 'Provisioning' | 'Offline'", source: 'seed / set on create', note: 'New instances start `Provisioning` and never advance — no lifecycle simulation.' },
    ],
    edgeCases: [
      'Provision is disabled until a customer is chosen, rather than defaulting to whoever is first in the list.',
      'There is no decommission path. Instances can be created but not removed, so the instance count only ever goes up.',
      'Bulk operations select targets from data, not from rendered rows — so a capped table does not silently change what "select all eligible" means.',
    ],
    integrations: [
      { name: 'Provisioning / orchestration backend', note: 'Jobs are local state with a fake progress value. Real source: whatever actually stands up a tenant.' },
      { name: 'Terraform / Helm', note: 'Cluster IaC state and Helm releases are displayed on the Clusters pages. Read-only fiction.' },
    ],
    permissions: [
      { action: 'Provision an instance, run bulk operations, schedule windows', capability: 'provision.manage', note: '' },
      { action: 'Create or edit a customer', capability: 'customer.manage', note: 'Note: the inline create in the picker currently gates on the surrounding form, not on `customer.manage` — flagged in open questions.' },
    ],
    openQuestions: [
      'Should `Instance.customer` become a customer id before or during backend integration? It touches every joining page.',
      'Should the inline customer create require `customer.manage` separately from `provision.manage`? Today someone who can provision can create an account.',
      'What is the real instance lifecycle — who moves Provisioning → Healthy, and what does the console do while it waits?',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    key: 'residency',
    title: 'Residency & Privacy',
    summary: 'Where data may live, how it moves, and data-subject rights.',
    match: ['/residency', '/transfers', '/subprocessors', '/dsar', '/regions'],
    files: ['src/data/residency.ts, privacy.ts, fleet.ts', 'src/pages/Residency.tsx, Transfers.tsx, Subprocessors.tsx, DSAR.tsx'],
    overview: [
      'Residency is a real compliance surface, not decoration. The control families it draws on — data residency, consent and purpose, retention and deletion, DSAR rights — are grounded in **real regimes** (GDPR, India DPDP, EU AI Act, CERT-In). The *data* is illustrative; the regimes and the obligations they impose are not.',
      'Regions carry a sovereignty classification that determines which deployment modes and providers are permissible.',
    ],
    rules: [
      { rule: 'A transfer between regions requires a lawful mechanism (SCCs, adequacy decision, or explicit derogation). Transfers without one are flagged.', fidelity: 'rule-real' },
      { rule: 'Sub-processors are a registry with data-access scope and DPA status — a GDPR Article 28 obligation, not a nice-to-have.', fidelity: 'rule-real' },
      { rule: 'DSAR requests carry a statutory due date driven by the governing law, not a uniform SLA.', fidelity: 'rule-real' },
      { rule: 'Residency controls (the `DR` family) route or deny at request time rather than auditing after the fact — consistent with inline enforcement.', example: 'DR-01 routes EU data to EU-only endpoints or denies; DR-05 denies outright when residency is required but absent.', fidelity: 'rule-real' },
    ],
    fields: [
      { field: 'Region.sovereignty', type: "'SaaS' | 'Sovereign' | 'Air-gapped'", source: 'src/data/fleet.ts', note: 'Gates which deployment modes and providers are offered.' },
      { field: 'Transfer.mechanism', type: 'string', source: 'seed', note: 'The lawful basis for a cross-border transfer.' },
      { field: 'Dsar.law / due', type: 'string', source: 'seed', note: 'Statutory clock. Different regimes, different deadlines.' },
    ],
    edgeCases: [
      'Air-gapped regions cannot participate in live transfers by construction.',
      'A DSAR touching a live index is a distinct case from one over archived history — modelled as separate controls (DS-01 vs DS-03).',
    ],
    integrations: [
      { name: 'Regional infrastructure', note: 'Region list is static. Real source: the actual deployment inventory.' },
      { name: 'DSAR intake', note: 'No intake channel exists. Requests are seeded.' },
    ],
    permissions: [
      { action: 'Manage DSAR requests', capability: 'dsar.manage', note: '' },
      { action: 'Approve a cross-border transfer', capability: 'transfer.approve', note: '' },
    ],
    openQuestions: [
      'Which regimes are in scope for launch, and which are aspirational?',
      'Who is the accountable approver for a transfer — is it a compliance role that does not exist in the current model?',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    key: 'billing',
    title: 'Billing, Licensing & FinOps',
    summary: 'Subscriptions, invoices, unit economics, and licence lifecycle.',
    match: ['/billing', '/licensing', '/finops', '/billing-integration', '/billing-health'],
    files: ['src/data/billing.ts, stripe.ts, subscriptions.ts, finops.ts, billingHealth.ts', 'src/pages/Billing.tsx, Licensing.tsx, FinOps.tsx, BillingIntegration.tsx'],
    overview: [
      'Billing models a Stripe-backed subscription business: products and prices mapped to PLCY plans, invoices with a lifecycle, dunning for failed charges, and per-tenant unit economics (revenue vs infrastructure cost).',
      'This is the one area with real pagination rather than the app-wide row cap, because invoices are a ledger people page through.',
    ],
    rules: [
      { rule: 'An invoice moves Draft → Open → Paid. Finalising a draft issues it; only an issued invoice can be marked paid.', fidelity: 'rule-real' },
      { rule: 'Margin is revenue minus infrastructure cost per tenant; a tenant with no revenue reports no margin percentage rather than a misleading zero.', fidelity: 'rule-real' },
      { rule: 'Licences carry an expiry and a seat utilisation; renewal extends from the current expiry.', fidelity: 'rule-real' },
      { rule: 'The dunning queue is driven by failed charges with attempt counts and a next-retry time.', fidelity: 'value-placeholder' },
    ],
    fields: [
      { field: 'Invoice.status', type: "'Draft' | 'Open' | 'Paid'", source: 'local state', note: '' },
      { field: 'FinopsRow.margin / marginPct', type: 'number | null', source: 'computed', note: 'Null when there is no revenue — do not coerce to 0.' },
      { field: 'Customer.mrr', type: 'number', source: 'customer record', note: 'Illustrative. Real source: Stripe.' },
    ],
    edgeCases: [
      'The invoice table opts out of the global row cap because it has its own pager — two mechanisms would fight.',
      'Trial customers carry zero MRR by rule, so they appear in counts but not revenue.',
    ],
    integrations: [
      { name: 'Stripe', note: 'The most fully modelled placeholder: products, prices, webhooks with delivery status, dunning. Nothing calls Stripe. This is the first integration to make real.' },
    ],
    permissions: [
      { action: 'Manage licences, finalise/mark invoices', capability: 'license.manage', note: '' },
    ],
    openQuestions: [
      'Is Stripe the billing system of record, or does an internal ledger own subscriptions with Stripe only taking payment?',
      'Where do infrastructure costs come from for the margin calculation — cloud billing export, or an internal allocation model?',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    key: 'fleet',
    title: 'Fleet — Releases, Clusters, Supply Chain',
    summary: 'What version each customer runs, the infrastructure under it, and the provenance of the artifacts.',
    match: ['/fleet', '/releases', '/bundles', '/clusters', '/backups', '/supply-chain', '/registry', '/fleet-posture'],
    files: ['src/data/fleet.ts, clusters.ts, registry.ts, ops.ts, clusterConfig.ts', 'src/pages/Releases.tsx, Clusters.tsx, ClusterDetail.tsx, SupplyChain.tsx, Registry.tsx, Backups.tsx'],
    overview: [
      'The fleet view answers "what is every customer running, and is it healthy". Releases roll out by ring; clusters expose workloads, node pools, Helm releases and Terraform state; supply chain covers signed images, SBOMs, CVEs and SLSA levels.',
      'Air-gapped customers receive **update bundles** rather than live rollouts — the offline path that exists because the control plane cannot reach them.',
    ],
    rules: [
      { rule: 'Air-gapped deployments are updated by signed offline bundle, never by live rollout. A bundle carries a checksum and a signature that must verify before import.', fidelity: 'rule-real' },
      { rule: 'An image is promoted through environments; a workload running behind the promoted tag is drift and is flagged.', fidelity: 'rule-real' },
      { rule: 'Container images carry signing status, SLSA level, and open CVE count. Unsigned or high-CVE images are surfaced as supply-chain risk.', fidelity: 'rule-real' },
      { rule: 'Backup posture is judged against RPO per customer, with residency of the backup location tracked separately from the primary region.', fidelity: 'rule-real' },
    ],
    fields: [
      { field: 'Deployment.version / regionCode', type: 'string', source: 'src/data/fleet.ts', note: 'The fleet matrix joins nearly everything on these.' },
      { field: 'Workload.signed / cves', type: 'boolean / number', source: 'clusters seed', note: 'Real source: registry attestations and a scanner.' },
      { field: 'Bundle.checksum / signed', type: 'string / boolean', source: 'seed', note: 'The offline trust anchor for air-gapped customers.' },
    ],
    edgeCases: [
      'A rollout must skip air-gapped targets rather than fail on them.',
      'Cluster detail tabs each carry their own row caps; workloads can run to hundreds.',
    ],
    integrations: [
      { name: 'Container registry + cosign/SLSA', note: 'Signing, SBOM and provenance are displayed, not verified. Placeholder.' },
      { name: 'Kubernetes / Helm / Terraform', note: 'Workloads, node pools, releases and IaC state are static fiction.' },
      { name: 'Vulnerability scanner', note: 'CVE lists are seeded.' },
    ],
    permissions: [
      { action: 'Roll out a release', capability: 'release.rollout', note: '' },
      { action: 'Cluster mutations (restart, scale, sync, roll back)', capability: 'provision.manage', note: 'Read-only roles see the data but not the actions.' },
    ],
    openQuestions: [
      'What is the real promotion pipeline, and does the console drive it or observe it?',
      'How is an air-gapped bundle actually delivered and its import confirmed back to PLCY?',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    key: 'success',
    title: 'Customer Success — health, churn, renewals',
    summary: 'Whether accounts are healthy, at risk, and whether anyone is working them.',
    match: ['/success', '/customer-health', '/churn', '/renewals'],
    files: ['src/data/success.ts, successStore.ts', 'src/pages/CustomerHealth.tsx, ChurnWatch.tsx, CSTasks.tsx, Renewals.tsx, Support.tsx'],
    overview: [
      'Health, churn risk and renewal probability are derived signals, not typed-in numbers. The design principle throughout: a risk with nobody working it is worse than a risk with an open task, so the UI consistently answers "is this being worked".',
    ],
    rules: [
      { rule: 'A renewal whose recorded stage is rosier than its evidence is flagged as a mismatch.', example: 'Stage says "Committed" while health is poor and no work is open → the row carries a warning dot and the drawer explains why.', fidelity: 'rule-real' },
      { rule: 'An at-risk renewal with no open tasks is flagged "Nobody working it" — the absence of work is itself the signal.', fidelity: 'rule-real' },
      { rule: 'Suggested plays are derived from the signal, and accepting one creates a real task assigned to someone.', fidelity: 'rule-real' },
      { rule: 'Renewal rows render one Fragment per customer so an expanded evidence panel does not count as a row in the table cap.', fidelity: 'rule-real' },
    ],
    fields: [
      { field: 'RenewalSignal', type: 'derived', source: 'src/data/success.ts → renewalSignal()', note: 'Combines health, open/overdue tasks, case status and stage into mismatch/unworked flags.' },
      { field: 'Task.dueDate / overdue', type: 'string / derived', source: 'successStore', note: '' },
    ],
    edgeCases: [
      'A customer with no health score shows "—" rather than defaulting to a number that implies measurement.',
      'Tasks and renewals cross-link by customer name, inheriting the name-as-key weakness noted under Customers.',
    ],
    integrations: [
      { name: 'Support ticketing', note: 'Tickets are seeded. Real source: Zendesk/Intercom or equivalent.' },
      { name: 'CRM', note: 'Renewal stages and ARR would normally live in a CRM. No integration.' },
    ],
    permissions: [
      { action: 'Advance a renewal stage, create tasks, start plays', capability: 'customer.manage', note: '' },
    ],
    openQuestions: [
      'What actually computes health score in production — usage, support load, compliance posture, or a blend?',
      'Is the CRM or this console the system of record for renewal stage?',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    key: 'security',
    title: 'Admin Security, Settings, Team & RBAC',
    summary: 'Who can do what, the org security posture, and the audit trail.',
    match: ['/admin-security', '/settings', '/team', '/privileged-access', '/audit-log', '/super-admin'],
    files: [
      'src/data/access.ts — roles, features, AccessMap',
      'src/data/permissions.ts — UI capabilities → features',
      'src/data/security.ts — posture policy + scoring',
      'src/data/activity.ts — last-active tracking',
      'src/context/Session.tsx — acting role, audit log',
    ],
    overview: [
      '**Read this before trusting anything in this module.** The RBAC model — 7 roles, 86 features, and the `AccessMap` between them — was **invented for this prototype**. It is a proposal to review against your real access model, not a copy of it.',
      'The design intent is sound and worth keeping: pages gate on a small set of coarse **capabilities** (16 of them, e.g. `policy.manage`), each of which resolves to a concrete **feature** in a single access map. That avoids a second parallel permission table drifting from the real one. The mapping table is the part that needs review — several entries are best-guess (`evals.run` → `InstanceManagePackage`, `policy.approve` → `UserManageRoles` for separation of duties).',
      'A role switcher lets you preview the console as any role. Gated actions disable with an explanatory tooltip rather than disappearing, so an operator can see that a capability exists and who to ask.',
    ],
    rules: [
      { rule: 'Every mutating action gates on a capability via `<GatedButton cap="…">`. A bare `<button>` for a mutation is a bug.', fidelity: 'rule-real' },
      { rule: 'Capability checks resolve through `effectiveAccessMap()`, which layers any locally-saved overrides on top of the base map — so editing the roles matrix in Settings immediately changes what the UI permits.', fidelity: 'rule-real', source: 'src/data/permissions.ts → roleCan()' },
      { rule: 'Break-glass access (`access.breakglass`) is Superuser-only and maps to the most privileged feature.', fidelity: 'rule-real' },
      { rule: 'Every audited action stamps the actor as active. "Last active" is an ISO instant rendered through a relative formatter on a 30-second tick — never a stored display string.', example: 'Act anywhere in the console and your own row on Settings → Team resets to "just now", then counts up on its own.', fidelity: 'rule-real', source: 'src/data/activity.ts' },
      { rule: 'Activity writes are throttled to once a minute so a burst of clicks does not re-render every table that reads it.', fidelity: 'rule-real' },
      { rule: 'Security posture is scored from the org policy by weighted checks; each failing check carries the remediation that would fix it.', fidelity: 'rule-real', source: 'src/data/security.ts → scoreSecurity()' },
    ],
    fields: [
      { field: 'EAccessRole', type: 'enum (7)', source: 'src/data/access.ts', note: 'Superuser, CS Admin, CS User, Billing, Engineer, Analyst, Dev Advocate. **Invented.**' },
      { field: 'EAccessFeature', type: 'enum (86)', source: 'src/data/access.ts', note: 'Fine-grained feature list. **Invented.**' },
      { field: 'Capability', type: 'union (16)', source: 'src/data/permissions.ts', note: 'What the UI actually gates on. The abstraction is worth keeping even if the map under it changes.' },
      { field: 'Employee.lastActiveAt', type: 'string | null (ISO)', source: 'seed offset + live activity store', note: 'Null means never signed in. The one date field in the app modelled correctly — copy this, not the others.' },
      { field: 'SecurityPolicy.sessionTimeoutHours / idleLockMinutes / maxConcurrentSessions', type: 'number', source: 'localStorage', note: '**These persist and feed the posture score but enforce nothing.** No session is timed out, nothing locks on idle. A visible gap between what the settings imply and what happens.' },
    ],
    edgeCases: [
      'A role with no capability for a page still sees the page — gating is per-action, not per-route. Whether that is right is an open question.',
      'The roles matrix can be edited and reset; overrides live in `localStorage` and silently change gating for that browser only.',
      'The audit trail is in-memory per session on top of a seeded list; it is not persisted.',
    ],
    integrations: [
      { name: 'SSO / SCIM', note: 'Configuration UI exists; no identity provider is wired. There is no real authentication anywhere in this app — the "signed-in user" is a constant.' },
      { name: 'Device management (MDM)', note: 'Managed device inventory and posture are modelled in `src/data/devices.ts`. Placeholder.' },
      { name: 'SIEM / audit sink', note: 'The audit trail goes nowhere. In production it must be append-only and exportable.' },
    ],
    permissions: [
      { action: 'Modify org settings, edit the roles matrix', capability: 'settings.modify', note: '' },
      { action: 'Approve access requests, invite employees', capability: 'access.approve', note: '' },
      { action: 'Break-glass elevation', capability: 'access.breakglass', note: 'Superuser only.' },
    ],
    openQuestions: [
      'What is the real role and feature model? Everything here must be reconciled against it.',
      'Should the capability→feature mappings stand? Several are guesses — `evals.run`, `evals.review`, `policy.approve`, `incident.manage` especially.',
      'Should gating be per-route as well as per-action? Today every role can navigate everywhere.',
      'Do the session settings (timeout, idle lock, concurrent sessions) need to become real, or are they configuration the enforcement layer consumes elsewhere?',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    key: 'docs',
    title: 'Docs, Glossary & Reports',
    summary: 'In-app documentation, the term glossary, and generated customer/compliance reports.',
    match: ['/docs', '/reports'],
    files: ['src/data/docs.ts, docsStore.ts, glossary.ts, glossaryStore.ts, report.ts, reports.ts', 'src/pages/Docs.tsx, Reports.tsx, *Report.tsx'],
    overview: [
      'The console ships its own help centre: ~34 articles and an ~80-term glossary, both editable in-app and persisted locally. Reports are print-oriented documents generated from live console data — posture, compliance, security, SLA, FinOps, incidents, DSAR, and per-customer.',
    ],
    rules: [
      { rule: 'Reports are documents, not dashboards. They deliberately opt out of the app-wide row cap — a report must print whole.', fidelity: 'rule-real' },
      { rule: 'Glossary terms deep-link by id (`?term=`), and a deep link narrows the view to that term rather than scrolling a long list.', fidelity: 'rule-real' },
      { rule: 'Docs and glossary content are editable at runtime and stored locally — useful for demos, not a CMS.', fidelity: 'illustrative' },
    ],
    fields: [
      { field: 'Doc.slug / category / type', type: 'string', source: 'src/data/docs.ts', note: 'Drives the index, filters and routing.' },
      { field: 'StoredTerm', type: 'glossary entry', source: 'glossaryStore', note: '' },
    ],
    edgeCases: [
      'The docs index sidebar is a scrolling pane with its own height limit, so it is exempt from the row cap — it never lengthens the page.',
      'Reports read from live stores, so an edit elsewhere changes the next report.',
    ],
    integrations: [
      { name: 'Document generation / export', note: 'Reports render as HTML for print. No PDF pipeline, no delivery, no signing.' },
    ],
    permissions: [{ action: 'Edit docs and glossary terms', capability: 'settings.modify', note: '' }],
    openQuestions: ['Should docs be authored in-app or sourced from a real CMS/repo?', 'Do compliance reports need to be signed or timestamped to be audit-admissible?'],
  },
]

/* ------------------------------------------------------------------ */
/* Lookup                                                              */
/* ------------------------------------------------------------------ */

/**
 * The module covering a given route, for the page-aware panel. Longest match
 * wins so `/policy` doesn't shadow a more specific prefix.
 */
export function moduleForPath(pathname: string): DevModule | undefined {
  let best: { mod: DevModule; len: number } | undefined
  for (const mod of DEV_MODULES) {
    for (const m of mod.match) {
      if ((pathname === m || pathname.startsWith(`${m}/`) || pathname.startsWith(`${m}?`)) && (!best || m.length > best.len)) {
        best = { mod, len: m.length }
      }
    }
  }
  return best?.mod
}

export const moduleByKey = (key: string) => DEV_MODULES.find((m) => m.key === key)
