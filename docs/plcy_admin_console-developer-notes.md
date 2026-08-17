<!--
  GENERATED FILE — DO NOT EDIT.
  Source: src/data/devNotes.ts · Regenerate: npm run docs:dev-notes
  The in-app "Dev Notes" panel renders the same module, so the two cannot drift.
-->

# PLCY Admin Console — Developer Handover Notes

**Status:** handover · **Audience:** developers new to this codebase
**Companion to:** the running console, and `docs/red-team-runner-spec.md`

---

## 1. What this is

PLCY is runtime governance and policy enforcement for AI. It sits **in the live traffic path** between customer applications, agents, and models — classifying sensitive data, enforcing policy, routing to approved providers, and validating outputs at request time, while producing audit-ready evidence.

This repository is the **internal admin console**: the surface the PLCY team uses to operate that platform across every customer. It is not the enforcement point itself and it is not a customer-facing product. Its users are PLCY staff — customer success, engineering, security/compliance, finance.

Because enforcement is inline, two properties drive most of the design. First, **every decision is per-request and latency-bearing** — the console reports enforcement overhead as a first-class number because it is a cost the customer pays on every call. Second, **every decision must be explainable after the fact** — the decision log resolves each outcome back through the composite pack the customer deployed, the primitive pack, the atomic control, its detector, its decision, and the evidence it emitted.

### Deployment modes

- **SaaS** — multi-tenant, PLCY-hosted. Reachable from the control plane.
- **Sovereign Cloud** — single-tenant in a specified region, customer-managed keys. Reachable from the control plane.
- **Air-gapped** — single-tenant with no network path to PLCY. **Architecturally unreachable from the control plane.** This is a hard rule across the whole product, not a red-team constraint: anything that tries to reach an air-gapped instance live must reject it server-side. Air-gapped deployments are served by offline bundles and validated by a separate offline certification process.

### Architecture and state

- React 18 · TypeScript (strict) · Vite · Tailwind · React Router · Recharts. No backend, no network calls, no tests.
- **Data lives in `src/data/*`.** Seed data and the pure functions that derive things from it. These modules are the closest thing to a specification in this repo — the rules in them are real even where the numbers are not.
- **Mutable state lives in stores.** Two patterns coexist: React context providers (`src/context/*`, e.g. `Customers`, `Employees`, `Policy`) and standalone observable stores built on `useSyncExternalStore` (`src/data/*Store.ts`, e.g. `enforcementStore`, `evalsStore`, `policyChangesStore`). Both persist to `localStorage` and merge new seeds on load. Prefer the observable-store pattern for new work: it avoids provider nesting and can be read from non-React code.
- **`localStorage` is the persistence layer.** Every "save" in this app writes to the browser. Keys are namespaced and versioned (`plcy.employees.v2`, `plcy.activity.v1`, `plcy.evals.v1`). When a stored shape changes incompatibly, bump the key rather than writing a migration — a prototype has no data worth migrating.
- **UI primitives are in `src/components/ui.tsx`.** `Table` is the one to know: it caps rows, renders the "Show all" toggle, and supports per-column hover descriptions. Behaviour added there lands on all ~64 tables at once.

### Conventions

- Path alias `@/` → `src/`.
- Hubs (`src/pages/hubs.tsx`) group related pages under one route with a `?tab=` query param. Ten hubs cover most of the ~70 pages. Old flat routes still exist and `<Navigate>` to the hub equivalent — keep them, they are linked from elsewhere.
- Any action a role might not be allowed to take is wrapped in `<GatedButton cap="...">`, never a bare `<button>`.
- Any state-changing action calls `logAction(...)` from `useSession()`, which appends to the audit trail and stamps the actor as active.
- Derived values are computed at render from the store, not cached in state. The data volumes here are trivial; correctness beats memoisation.

---

## 2. What is NOT a specification

Read this before treating anything in the console as a requirement.

- All seeded telemetry: the enforcement decision log, latency samples, uptime figures, RPS, token counts, MRR, service-credit amounts, dates. **Illustrative.**
- All threshold *values*: latency ceilings, SLA targets, false-positive counts, budgets, row caps. **The mechanisms are real; the numbers are dials.** Every one is a named constant so it can be set from real contracts without hunting through the code.
- The RBAC model in `src/data/access.ts` — 7 roles × 86 features. **Invented for this prototype**, not copied from production. Treat it as a proposal to review, not as authority. (A stale comment in `permissions.ts` previously implied otherwise; it has been corrected.)
- Every integration. Stripe, PagerDuty, OpenTelemetry, Terraform/Helm, the container registry, cosign/SLSA, SSO/SCIM are all placeholders standing in for integrations that still need to be built.

The distinction that matters throughout this document:

- ✅ **Rule is real** — a real business decision. Reimplement it faithfully.
- ⚠️ **Value is a placeholder** — the mechanism is real, the number is a dial awaiting real input.
- 🚫 **Illustrative only** — do not carry it forward.

---

## 3. Known gaps

- **No error handling anywhere.** No loading states, no failure paths, no retries, no optimistic-update rollback. Every action succeeds instantly because nothing crosses a network. This is the single largest piece of work when wiring a backend. Recommended pattern: give each store an explicit `status: idle | loading | error` alongside its data, render a skeleton on `loading` and an inline retry on `error`, and make mutations optimistic with rollback on rejection — the stores already centralise state, so this fits without restructuring pages.
- **No tests.** Not one. The pure functions in `src/data/*` (`percentile`, `tuningRecommendations`, `hardeningRecommendations`, `latencyStatus`, `roleCan`, `scoreSecurity`) are the highest-value place to start: they hold the business rules and have no React dependency.
- **No i18n, no timezone handling.** Dates are formatted ad hoc; some are ISO strings, some are display strings. `Employee.lastActiveAt` is the one field deliberately stored as an ISO instant — copy that approach, not the others.
- **No accessibility audit.** Gated buttons and column hints carry ARIA, but the app has not been tested with a screen reader end to end.
- **Bundle is one chunk (~2 MB).** No code splitting; the build warns about it. Route-level `React.lazy` is the obvious fix.

---

## 4. Modules

Each section below is also available in-app: the **Dev Notes** button (bottom-right) opens the notes for whatever page you are on.

### Policy — packs, controls, change management, enforcement

*The catalog of what gets enforced, the workflow for changing it, and the record of what it did.*

**Start here:**
- `src/data/policy.ts` — the control catalog
- `src/data/enforcement.ts` — decision log, triage, tuning proposals
- `src/data/hardening.ts` — red-team bypasses → tightening proposals
- `src/data/policyChanges.ts` — change-request lifecycle
- `src/pages/Enforcement.tsx, PolicyPacks.tsx, PolicyChanges.tsx`

#### Overview

The policy catalog has three levels. **Atomic controls** (51 of them, ids like `DR-01`, `RG-02`) are the unit of enforcement: each has a *detector* (what it inspects), a *decision* (what it does), an *obligation* (what it guarantees), *evidence* fields (what it emits), and a *mode* (`enforce` or `monitor`). Controls group into **primitive packs** (single-purpose guardrails, `P1`…`P10`), which compose into **composite packs** — framework bundles (GDPR, SOC 2) and industry bundles. Customers deploy composites.

The **decision log** is the record of what the enforcement point actually did, request by request. Each entry resolves back through the whole chain, which is what makes an outcome explainable to a customer or an auditor.

The most important flow in the console closes a loop: an operator reviews decisions and marks them correct or false-positive → accumulated verdicts produce a **tuning recommendation** → that becomes a real **change request** carrying its evidence → the CR goes through review, approval, dry-run, schedule, apply. The same queue receives **hardening** proposals from the opposite direction (see the Evaluations module). One path loosens a control that over-fires; the other tightens one that under-fires.

#### Business rules

- ✅ **Rule is real** — A decision's outcome is a pure function of the control's mode and decision type. `monitor` mode never blocks. `Deny` blocks; `Review` and `Log` flag; everything else (`Route`, `Transform`, `Throttle`, `Emit`) resolves and is recorded as allowed.
  - *Example:* RG-02 is `Deny` in `enforce` mode → Blocked. Flip it to `monitor` and the same request is Flagged, not Blocked. This function (`outcomeFor`) is also what powers blast-radius replay.
  - *Source:* `src/data/enforcement.ts → outcomeFor()`
- ⚠️ **Value is a placeholder** — A control needs a *pattern* of reviewed false positives before the console proposes changing it — a single bad call is noise.
  - *Example:* Threshold is `TUNING_MIN_FALSE_POSITIVES = 2`. Mark one decision on HI-02 as a false positive and nothing happens; mark a second and a recommendation appears.
  - *Source:* `src/data/enforcement.ts → tuningRecommendations()`
- ✅ **Rule is real** — The *shape* of a tuning proposal depends on how badly the control is misfiring. Overwhelming (≥75% of reviews false) → drop it to `monitor` so it keeps logging while retuned, rather than blocking traffic it shouldn't. Persistent but partial → keep enforcing, narrow the obligation to exclude the accounts that tripped it.
  - *Example:* HI-02 at 2 false of 2 reviewed = 100% → proposes `mode: enforce → monitor`, filed at High risk. RD-05 at 2 false of 3 = 67% → proposes `obligation: "Sign logs / enforce WORM" → "… except Lumen Media, Meridian Bank"`, filed at Medium.
- ✅ **Rule is real** — A proposal is remembered per control once raised, so the same recommendation cannot be filed twice.
  - *Example:* After filing, the card shows "Raised as CR-201" with a link instead of the button. Survives reload — stored in `enforcementStore.proposals`.
- ✅ **Rule is real** — Change requests carry a version bump derived from the pack's history, computed in one shared place so every surface that raises a CR numbers it identically.
  - *Example:* A pack at 1.0 → the CR targets 1.1. `nextVersion()` is used by both the Enforcement and Red-Team paths.
  - *Source:* `src/data/policyChanges.ts → nextVersion()`
- ✅ **Rule is real** — Authoring a change and approving it are separate capabilities — deliberate separation of duties.
  - *Example:* `policy.manage` lets you open and edit a CR; `policy.approve` is the approval board. A role with only the former cannot approve its own change.
- ✅ **Rule is real** — Request content is never stored. The decision log holds a redacted one-line `subject` and a list of *entity types* the detector matched — never the values.
  - *Example:* `matched: ["PII:name", "PII:national_id"]`, not the name or the number. This is a privacy guarantee, not a display choice, and must survive the move to a real backend.

#### Key data fields

| Field | Type | Source | Notes |
| --- | --- | --- | --- |
| `Control.mode` | `'enforce' | 'monitor'` | src/data/policy.ts | Monitor-mode controls log without acting. The single most consequential field on a control. |
| `Control.decision` | `'Allow' | 'Deny' | 'Transform' | 'Route' | 'Review' | 'Log' | 'Throttle' | 'Emit'` | src/data/policy.ts | Drives outcome. Ranked by strictness in hardening.ts. |
| `Control.detector` | `DetectorType` | src/data/policy.ts | What the control can actually see. Metadata/Policy detectors cannot inspect request content — central to the hardening logic. |
| `EnforcementDecision.viaPackId` | `string` | Generated; must come from the enforcement point | The composite pack the customer deployed that pulled this control in. Without it the explanation chain breaks. |
| `EnforcementDecision.latencyMs` | `number` | Generated (right-skewed); must be real per-decision timing | Feeds the p95 enforcement-overhead figure. |
| `Triage.verdict` | `'correct' | 'false-positive'` | enforcementStore, operator-entered | The only human input in the loop. Drives false-positive rate and all tuning. |
| `ChangeLine` | `{ op, controlId, controlName, field, before, after }` | src/data/policyChanges.ts | The universal diff shape. Both tuning and hardening emit it, so Change Management needs no translation. |

#### Edge cases

- Global enforcement can be switched off. Controls still evaluate and log, but nothing is blocked — the page says so explicitly rather than silently showing a stale log.
- A control with zero decisions in the log window has no blast radius. The UI says "hasn't fired in the last N decisions" rather than implying zero risk.
- The decision log is capped at 25 rows with an explicit "Show all" toggle; changing a filter collapses it back, because "most recent 25" means something different per filter.
- Packs can be created and cloned in the editor. Ids must be unique — the form blocks a clash rather than silently overwriting.

#### Integrations

- **Enforcement point (the gateway itself)** — The decision log is generated from the control catalog. Real source: a stream or query API from the enforcement point. This is the single most important integration in the product.
- **OpenTelemetry** — Controls declare `evidence` fields they emit to traces. Nothing is actually emitted. Placeholder for the real evidence pipeline.

#### Permissions

| Action | Capability | Notes |
| --- | --- | --- |
| Toggle global enforcement, set pack mode, add exception, triage a decision, file a tuning CR | `policy.manage` | One capability covers all policy mutation. |
| Approve a change request | `policy.approve` | Deliberately distinct from authoring. |

#### Open questions

- What are the real thresholds — how many false positives justify a change, and at what rate does a control get demoted rather than narrowed?
- Who owns approving a policy change in practice, and is one approver enough or does risk level change the quorum?
- Should an applied CR automatically re-open if the control regresses, or is that a fresh proposal?

---

### Evaluations — efficacy, red-team, hardening, review queue

*Adversarial testing of the platform, and turning what gets through into policy changes.*

**Start here:**
- `src/data/evals.ts` — campaigns, findings, attempts, attack library, OWASP/ATLAS taxonomy
- `src/data/hardening.ts` — bypass → tightening proposal
- `src/pages/RedTeam.tsx, Efficacy.tsx, EvalSuites.tsx, ModelScorecards.tsx, ReviewQueue.tsx`
- `docs/red-team-runner-spec.md` — the backend contract for actually running campaigns

#### Overview

Red-team campaigns attack the platform and connected instances with techniques drawn from an attack library, tagged against OWASP LLM Top-10 and MITRE ATLAS. A campaign produces **attempts** (the forensic record of each prompt fired) and **findings** (the ones that got through, with a reproduction).

A finding is not a dead end. When a bypass defeats a control family, the console produces a **hardening recommendation** against that family's primary guard and hands it to Policy Change Management as a change request — the mirror image of the tuning flow that Enforcement produces.

`docs/red-team-runner-spec.md` already specifies the backend that would run campaigns for real. Read it alongside this module.

#### Business rules

- ✅ **Rule is real** — A finding counts as evidence only while it is live. `accepted` findings are excluded — someone explicitly signed off on that risk, and re-proposing would relitigate a closed decision. `mitigated` findings are excluded *unless* their latest retest bypassed again, which means the mitigation did not hold.
  - *Example:* f_301 is `accepted` → never proposes. f_102 is `mitigated` with a passing retest → excluded. Fail its retest and it returns as evidence.
  - *Source:* `src/data/hardening.ts → isLiveBypass()`
- ✅ **Rule is real** — One Critical or High bypass justifies a proposal on its own; anything lower needs a pattern. A proven bypass is not noise the way a single false positive is — the asymmetry against the tuning threshold is deliberate.
  - *Example:* A single High finding on RG produces a recommendation immediately. Two Mediums also would; one Medium would not.
- ✅ **Rule is real** — The control to tighten is the family's **primary guard**: the strictest *acting* decision, with ties broken toward the **weakest detector** — within a tier, that is the link an attack walks through. Controls whose decision only records (`Log`, `Emit`) are never the target, because enforcing a logger changes nothing.
  - *Example:* RG has RG-01 (Deny, Policy detector) and RG-02 (Deny, Metadata). Both Deny; Metadata is the weaker detector, so RG-02 is picked. Worth knowing: this rule picks the weakest link, which is not always the control a human would have named.
  - *Source:* `src/data/hardening.ts → primaryGuard()`
- ✅ **Rule is real** — Three tightening shapes, chosen by where the gap is. Guard in `monitor` → promote to `enforce` (it was only watching). Guard whose detector cannot read content → give it a content-aware detector (a payload shaped to look ordinary walks past metadata). Guard that saw the request and still allowed it → raise its decision one step (`Transform → Review → Deny`). Every shape also writes the technique into the control's obligation.
  - *Example:* A High bypass past RG-02 (Metadata detector) proposes `detector: Metadata → Classifier` plus an obligation extension naming the technique. Two diff lines, one CR.
- ✅ **Rule is real** — Tightening can break customer traffic in a way loosening cannot, so every hardening proposal carries a **blast radius** replayed against the real decision log: how many recent decisions it touches, on which accounts, and how many would newly block. Where a change moves no outcome, it says so rather than inventing a number.
  - *Example:* A detector change alters what is *seen*, not the verdict, so `wouldChange` is 0. The UI reports "no decision outcome changes… re-evaluates 1 recent decision on Meridian Bank with a detector that reads content" instead of implying zero risk.
  - *Source:* `src/data/hardening.ts → blastRadius()`
- ✅ **Rule is real** — A finding only passes retest once it has actually been worked — a remediation note or a mitigated status. An untouched open finding still bypasses.
  - *Example:* This is a deliberate honesty constraint on the mock: you cannot make a finding disappear by clicking Retest.
  - *Source:* `src/data/evalsStore.ts → retestFinding()`
- ✅ **Rule is real** — Air-gapped targets must be rejected server-side. The console can express a campaign against them; the runner must refuse.
  - *Source:* `docs/red-team-runner-spec.md`

#### Key data fields

| Field | Type | Source | Notes |
| --- | --- | --- | --- |
| `Finding.linkedControlPrefix` | `string (family prefix, e.g. "RG")` | evals seed; must come from the runner | A family, not a control id. The hardening logic resolves the specific control itself. |
| `Finding.repro` | `{ prompt, model }` | evals seed | The exact attack, so a retest is a real re-run rather than a status flip. |
| `Finding.retestResult` | `'blocked' | 'bypassed'` | evalsStore | Decides whether a mitigated finding re-enters the evidence pool. |
| `TargetSpec` | `union — all / selection / filter` | src/data/evals.ts | What a campaign attacks. Resolves to concrete deployments; the runner must re-resolve server-side, never trust the client list. |
| `evalsStore.hardening` | `Record<controlId, crId>` | localStorage | Prevents double-filing a hardening CR. |

#### Edge cases

- A control family with no acting control produces no recommendation rather than a broken one.
- A recommendation disappears once its finding is genuinely resolved — work the finding, pass the retest, and it drops off the list.
- The recommendations card has a real empty state; it is evidence-driven and shows nothing when nothing qualifies.

#### Integrations

- **Red-team runner** — Does not exist. `docs/red-team-runner-spec.md` defines the orchestrator, scheduler, and result stream that would replace the seeded campaigns.
- **Model providers** — Attempts name real models (GPT-4 Turbo, Claude Opus 4, Llama 3.1). No calls are made.

#### Permissions

| Action | Capability | Notes |
| --- | --- | --- |
| View efficacy and eval surfaces | `evals.view` |  |
| Launch campaigns, run evals, retest findings | `evals.run` | Treated as a governance mutation. |
| Label QA review decisions | `evals.review` |  |
| File a hardening change request | `policy.manage` | Deliberately the policy capability, not an evals one — it creates a policy change. |

#### Open questions

- Is "weakest link in the strictest tier" the right target-selection rule, or should a finding name its control directly?
- Should hardening proposals require a dry-run before they can be approved, given they can block live traffic?
- What is the real severity threshold for auto-proposing, and does it differ by customer tier?

---

### SLA, Observability & Incidents

*Contractual commitments — uptime and latency — and the operational surfaces behind them.*

**Start here:**
- `src/data/latency.ts` — the one percentile definition
- `src/data/sla.ts` — targets, latency objective, credits
- `src/pages/Sla.tsx, Observability.tsx, Incidents.tsx, Notifications.tsx`

#### Overview

An SLA record commits to uptime *and*, as of recently, latency. Latency is the number a customer challenges you on, so it belongs on the contract next to uptime rather than living as a decorative chart.

`src/data/latency.ts` is the single definition of a percentile for the whole app. Before it existed, four surfaces invented latency independently and "p95" meant something different on each. Anything that reports a percentile must go through `percentile()` here.

#### Business rules

- ✅ **Rule is real** — Percentiles use **nearest rank**: `ceil(p × n)`, one-based. Not `floor(p × n)`, which over-reports whenever `p × n` is a whole number.
  - *Example:* At n=20, p95 is the 19th of 20 sorted values, not the 20th. The old implementation returned the maximum and called it p95.
  - *Source:* `src/data/latency.ts → percentile()`
- ✅ **Rule is real** — A latency objective is judged at p95 against a ceiling set by SLA tier. Over the ceiling is Breached; within the last 10% of it is At risk — the band where you want to know before the customer does.
  - *Example:* A Gold account with a 400 ms ceiling reading 439 ms is Breached by 39 ms. At 366 ms it is At risk. At 294 ms it is Meeting.
  - *Source:* `src/data/latency.ts → latencyStatus()`
- ⚠️ **Value is a placeholder** — Tier ceilings and the enforcement-overhead budget are named constants precisely because they are placeholders.
  - *Example:* `LATENCY_TARGET_MS = { Platinum: 250, Gold: 400, Silver: 600 }` and `ENFORCEMENT_BUDGET_MS = 50`. Every one of these must be set from real contracts. The mechanism around them is real; the numbers are not.
- ✅ **Rule is real** — Enforcement overhead is tracked separately from gateway latency. It is PLCY's own tax on every governed request, and a customer will challenge it independently of end-to-end latency.
- ✅ **Rule is real** — A percentile over a period is computed from the period's samples, never by averaging per-bucket percentiles — averaging percentiles is statistically meaningless.
  - *Example:* The Observability headline reduces all 9,600 of the day's samples through `percentile()`. It does not average the 24 hourly p95s.
- ✅ **Rule is real** — Latency samples are right-skewed, not uniform. Most requests sit near the median and a thin tail runs long.
  - *Example:* This is not cosmetic. When the decision log sampled uniformly over 4-41 ms, p50 and p95 were nearly identical and the page's "warn above 50 ms" threshold could never fire — the tail it existed to catch did not exist. Calibrated so p95 ≈ 2.1× median, p99 ≈ 3×.
  - *Source:* `src/data/latency.ts → skewedLatency()`

#### Key data fields

| Field | Type | Source | Notes |
| --- | --- | --- | --- |
| `SlaTarget.latencyMedianMs` | `number` | sla seed; must come from real telemetry | How the account actually runs. The judged p95 is derived from it so the two cannot contradict each other. |
| `SlaTarget.uptimeTarget / uptimeMtd` | `number` | sla seed | Illustrative figures. |
| `SlaTarget.creditsOwed` | `number` | sla seed | Accrues from uptime misses only. Latency breaches are declared chargeable in the UI but do not yet accrue credits — see open questions. |
| `Percentiles.count` | `number` | computed | Sample size behind the percentile. Always surface it; a p99 over 12 requests is not a p99. |

#### Edge cases

- A customer with no traffic in the window reports no blast radius and no percentile rather than zero.
- Latency and uptime status are computed independently and can disagree — latency is often the leading indicator. Vertex Capital breaches latency while uptime is only wobbling.
- Column headings on this page carry hover descriptions, because "Attainment", "p95 latency" and "Notice" are contractual terms rather than plain English.

#### Integrations

- **Telemetry / metrics backend** — All latency is generated deterministically from a seeded stream. Real source: the gateway's own metrics pipeline. Percentiles should ideally be computed server-side over full data rather than client-side over a sample.
- **PagerDuty** — On-call tiers, rotations, and services are modelled on the Notifications page. No integration exists.

#### Permissions

| Action | Capability | Notes |
| --- | --- | --- |
| Schedule a maintenance window | `provision.manage` |  |
| Manage incidents | `incident.manage` |  |

#### Open questions

- What are the real p95 ceilings per tier, and are they negotiated per contract rather than fixed by tier?
- Should a latency breach accrue service credits like an uptime miss? The UI says it is chargeable; the credit maths is not wired, deliberately — it changes billing numbers.
- Is p95 the right contractual percentile, or do enterprise customers negotiate p99?
- Over what window is the objective judged — calendar month, rolling 30 days?

---

### Customers, Instances & Provisioning

*Accounts, their deployments, and how a new environment is stood up.*

**Start here:**
- `src/data/mock.ts` — Customer/Instance shapes, makeCustomer()
- `src/context/Customers.tsx` — the customer store
- `src/components/CustomerPicker.tsx` — picker with inline create
- `src/pages/Customers.tsx, Instances.tsx, Provisioning.tsx, BulkOps.tsx`

#### Overview

`Customer` is the root record almost everything joins to. `Instance.customer` is a **name string**, not an id — billing, health, renewals, residency, and scoping all resolve through it, which is why an unrecognised name produces a deployment nobody can bill or report on. Moving to a real backend, this should become a foreign key.

Provisioning has two entry points: **Instances → Provision instance** (creates an instance directly) and **Provisioning → Onboard a new environment** (a three-step wizard that raises a provisioning job with compliance prerequisites). Both now share one customer picker.

#### Business rules

- ✅ **Rule is real** — You can only provision for a customer that exists. The picker reads the live customer store and offers an inline create; free text is not accepted.
  - *Example:* Previously the wizard took free text and would happily raise a job for an account with no record behind it. The picker replaced that.
- ✅ **Rule is real** — A customer created mid-provisioning is a real record, identical to one created the long way — same factory, same id derivation.
  - *Example:* `makeCustomer({ name: "Beacon Financial" })` → id `cus_beacon_financial`, domain `beaconfinancial.com`. The same name always resolves to the same id.
  - *Source:* `src/data/mock.ts → makeCustomer()`
- ✅ **Rule is real** — Duplicate customer names are refused and the user is pointed at the existing account.
- ✅ **Rule is real** — A Trial customer has zero MRR regardless of what the form carried.
  - *Example:* Set status Trial with MRR 5000 and the record stores 0.
- ✅ **Rule is real** — Provisioning an instance increments the owning customer's instance count.
  - *Example:* Without this a customer read "0 instances" however many they ran.
- ✅ **Rule is real** — Deployment mode steers compliance prerequisites. Air-gapped defaults BYOK, residency, offline licence and escorted access on; Sovereign Cloud defaults BYOK and residency.
- ✅ **Rule is real** — A customer-scope selector in the sidebar filters most pages to one account. "All Customers" is the unscoped default.
  - *Source:* `src/context/CustomerScope.tsx`

#### Key data fields

| Field | Type | Source | Notes |
| --- | --- | --- | --- |
| `Customer.id` | `string` | derived from name | `cus_<slugged name>`. Deterministic, so re-creating the same name collides — which is why duplicates are blocked. |
| `Customer.instances` | `number` | incremented on provision | Denormalised count. In a real backend, derive it rather than store it. |
| `Instance.customer` | `string (name)` | user selection | Should be a customer id. The single worst modelling decision in this prototype. |
| `Instance.status` | `'Healthy' | 'Degraded' | 'Provisioning' | 'Offline'` | seed / set on create | New instances start `Provisioning` and never advance — no lifecycle simulation. |

#### Edge cases

- Provision is disabled until a customer is chosen, rather than defaulting to whoever is first in the list.
- There is no decommission path. Instances can be created but not removed, so the instance count only ever goes up.
- Bulk operations select targets from data, not from rendered rows — so a capped table does not silently change what "select all eligible" means.

#### Integrations

- **Provisioning / orchestration backend** — Jobs are local state with a fake progress value. Real source: whatever actually stands up a tenant.
- **Terraform / Helm** — Cluster IaC state and Helm releases are displayed on the Clusters pages. Read-only fiction.

#### Permissions

| Action | Capability | Notes |
| --- | --- | --- |
| Provision an instance, run bulk operations, schedule windows | `provision.manage` |  |
| Create or edit a customer | `customer.manage` | Note: the inline create in the picker currently gates on the surrounding form, not on `customer.manage` — flagged in open questions. |

#### Open questions

- Should `Instance.customer` become a customer id before or during backend integration? It touches every joining page.
- Should the inline customer create require `customer.manage` separately from `provision.manage`? Today someone who can provision can create an account.
- What is the real instance lifecycle — who moves Provisioning → Healthy, and what does the console do while it waits?

---

### Residency & Privacy

*Where data may live, how it moves, and data-subject rights.*

**Start here:**
- `src/data/residency.ts, privacy.ts, fleet.ts`
- `src/pages/Residency.tsx, Transfers.tsx, Subprocessors.tsx, DSAR.tsx`

#### Overview

Residency is a real compliance surface, not decoration. The control families it draws on — data residency, consent and purpose, retention and deletion, DSAR rights — are grounded in **real regimes** (GDPR, India DPDP, EU AI Act, CERT-In). The *data* is illustrative; the regimes and the obligations they impose are not.

Regions carry a sovereignty classification that determines which deployment modes and providers are permissible.

#### Business rules

- ✅ **Rule is real** — A transfer between regions requires a lawful mechanism (SCCs, adequacy decision, or explicit derogation). Transfers without one are flagged.
- ✅ **Rule is real** — Sub-processors are a registry with data-access scope and DPA status — a GDPR Article 28 obligation, not a nice-to-have.
- ✅ **Rule is real** — DSAR requests carry a statutory due date driven by the governing law, not a uniform SLA.
- ✅ **Rule is real** — Residency controls (the `DR` family) route or deny at request time rather than auditing after the fact — consistent with inline enforcement.
  - *Example:* DR-01 routes EU data to EU-only endpoints or denies; DR-05 denies outright when residency is required but absent.

#### Key data fields

| Field | Type | Source | Notes |
| --- | --- | --- | --- |
| `Region.sovereignty` | `'SaaS' | 'Sovereign' | 'Air-gapped'` | src/data/fleet.ts | Gates which deployment modes and providers are offered. |
| `Transfer.mechanism` | `string` | seed | The lawful basis for a cross-border transfer. |
| `Dsar.law / due` | `string` | seed | Statutory clock. Different regimes, different deadlines. |

#### Edge cases

- Air-gapped regions cannot participate in live transfers by construction.
- A DSAR touching a live index is a distinct case from one over archived history — modelled as separate controls (DS-01 vs DS-03).

#### Integrations

- **Regional infrastructure** — Region list is static. Real source: the actual deployment inventory.
- **DSAR intake** — No intake channel exists. Requests are seeded.

#### Permissions

| Action | Capability | Notes |
| --- | --- | --- |
| Manage DSAR requests | `dsar.manage` |  |
| Approve a cross-border transfer | `transfer.approve` |  |

#### Open questions

- Which regimes are in scope for launch, and which are aspirational?
- Who is the accountable approver for a transfer — is it a compliance role that does not exist in the current model?

---

### Billing, Licensing & FinOps

*Subscriptions, invoices, unit economics, and licence lifecycle.*

**Start here:**
- `src/data/billing.ts, stripe.ts, subscriptions.ts, finops.ts, billingHealth.ts`
- `src/pages/Billing.tsx, Licensing.tsx, FinOps.tsx, BillingIntegration.tsx`

#### Overview

Billing models a Stripe-backed subscription business: products and prices mapped to PLCY plans, invoices with a lifecycle, dunning for failed charges, and per-tenant unit economics (revenue vs infrastructure cost).

This is the one area with real pagination rather than the app-wide row cap, because invoices are a ledger people page through.

#### Business rules

- ✅ **Rule is real** — An invoice moves Draft → Open → Paid. Finalising a draft issues it; only an issued invoice can be marked paid.
- ✅ **Rule is real** — Margin is revenue minus infrastructure cost per tenant; a tenant with no revenue reports no margin percentage rather than a misleading zero.
- ✅ **Rule is real** — Licences carry an expiry and a seat utilisation; renewal extends from the current expiry.
- ⚠️ **Value is a placeholder** — The dunning queue is driven by failed charges with attempt counts and a next-retry time.

#### Key data fields

| Field | Type | Source | Notes |
| --- | --- | --- | --- |
| `Invoice.status` | `'Draft' | 'Open' | 'Paid'` | local state |  |
| `FinopsRow.margin / marginPct` | `number | null` | computed | Null when there is no revenue — do not coerce to 0. |
| `Customer.mrr` | `number` | customer record | Illustrative. Real source: Stripe. |

#### Edge cases

- The invoice table opts out of the global row cap because it has its own pager — two mechanisms would fight.
- Trial customers carry zero MRR by rule, so they appear in counts but not revenue.

#### Integrations

- **Stripe** — The most fully modelled placeholder: products, prices, webhooks with delivery status, dunning. Nothing calls Stripe. This is the first integration to make real.

#### Permissions

| Action | Capability | Notes |
| --- | --- | --- |
| Manage licences, finalise/mark invoices | `license.manage` |  |

#### Open questions

- Is Stripe the billing system of record, or does an internal ledger own subscriptions with Stripe only taking payment?
- Where do infrastructure costs come from for the margin calculation — cloud billing export, or an internal allocation model?

---

### Fleet — Releases, Clusters, Supply Chain

*What version each customer runs, the infrastructure under it, and the provenance of the artifacts.*

**Start here:**
- `src/data/fleet.ts, clusters.ts, registry.ts, ops.ts, clusterConfig.ts`
- `src/pages/Releases.tsx, Clusters.tsx, ClusterDetail.tsx, SupplyChain.tsx, Registry.tsx, Backups.tsx`

#### Overview

The fleet view answers "what is every customer running, and is it healthy". Releases roll out by ring; clusters expose workloads, node pools, Helm releases and Terraform state; supply chain covers signed images, SBOMs, CVEs and SLSA levels.

Air-gapped customers receive **update bundles** rather than live rollouts — the offline path that exists because the control plane cannot reach them.

#### Business rules

- ✅ **Rule is real** — Air-gapped deployments are updated by signed offline bundle, never by live rollout. A bundle carries a checksum and a signature that must verify before import.
- ✅ **Rule is real** — An image is promoted through environments; a workload running behind the promoted tag is drift and is flagged.
- ✅ **Rule is real** — Container images carry signing status, SLSA level, and open CVE count. Unsigned or high-CVE images are surfaced as supply-chain risk.
- ✅ **Rule is real** — Backup posture is judged against RPO per customer, with residency of the backup location tracked separately from the primary region.

#### Key data fields

| Field | Type | Source | Notes |
| --- | --- | --- | --- |
| `Deployment.version / regionCode` | `string` | src/data/fleet.ts | The fleet matrix joins nearly everything on these. |
| `Workload.signed / cves` | `boolean / number` | clusters seed | Real source: registry attestations and a scanner. |
| `Bundle.checksum / signed` | `string / boolean` | seed | The offline trust anchor for air-gapped customers. |

#### Edge cases

- A rollout must skip air-gapped targets rather than fail on them.
- Cluster detail tabs each carry their own row caps; workloads can run to hundreds.

#### Integrations

- **Container registry + cosign/SLSA** — Signing, SBOM and provenance are displayed, not verified. Placeholder.
- **Kubernetes / Helm / Terraform** — Workloads, node pools, releases and IaC state are static fiction.
- **Vulnerability scanner** — CVE lists are seeded.

#### Permissions

| Action | Capability | Notes |
| --- | --- | --- |
| Roll out a release | `release.rollout` |  |
| Cluster mutations (restart, scale, sync, roll back) | `provision.manage` | Read-only roles see the data but not the actions. |

#### Open questions

- What is the real promotion pipeline, and does the console drive it or observe it?
- How is an air-gapped bundle actually delivered and its import confirmed back to PLCY?

---

### Customer Success — health, churn, renewals

*Whether accounts are healthy, at risk, and whether anyone is working them.*

**Start here:**
- `src/data/success.ts, successStore.ts`
- `src/pages/CustomerHealth.tsx, ChurnWatch.tsx, CSTasks.tsx, Renewals.tsx, Support.tsx`

#### Overview

Health, churn risk and renewal probability are derived signals, not typed-in numbers. The design principle throughout: a risk with nobody working it is worse than a risk with an open task, so the UI consistently answers "is this being worked".

#### Business rules

- ✅ **Rule is real** — A renewal whose recorded stage is rosier than its evidence is flagged as a mismatch.
  - *Example:* Stage says "Committed" while health is poor and no work is open → the row carries a warning dot and the drawer explains why.
- ✅ **Rule is real** — An at-risk renewal with no open tasks is flagged "Nobody working it" — the absence of work is itself the signal.
- ✅ **Rule is real** — Suggested plays are derived from the signal, and accepting one creates a real task assigned to someone.
- ✅ **Rule is real** — Renewal rows render one Fragment per customer so an expanded evidence panel does not count as a row in the table cap.

#### Key data fields

| Field | Type | Source | Notes |
| --- | --- | --- | --- |
| `RenewalSignal` | `derived` | src/data/success.ts → renewalSignal() | Combines health, open/overdue tasks, case status and stage into mismatch/unworked flags. |
| `Task.dueDate / overdue` | `string / derived` | successStore |  |

#### Edge cases

- A customer with no health score shows "—" rather than defaulting to a number that implies measurement.
- Tasks and renewals cross-link by customer name, inheriting the name-as-key weakness noted under Customers.

#### Integrations

- **Support ticketing** — Tickets are seeded. Real source: Zendesk/Intercom or equivalent.
- **CRM** — Renewal stages and ARR would normally live in a CRM. No integration.

#### Permissions

| Action | Capability | Notes |
| --- | --- | --- |
| Advance a renewal stage, create tasks, start plays | `customer.manage` |  |

#### Open questions

- What actually computes health score in production — usage, support load, compliance posture, or a blend?
- Is the CRM or this console the system of record for renewal stage?

---

### Admin Security, Settings, Team & RBAC

*Who can do what, the org security posture, and the audit trail.*

**Start here:**
- `src/data/access.ts` — roles, features, AccessMap
- `src/data/permissions.ts` — UI capabilities → features
- `src/data/security.ts` — posture policy + scoring
- `src/data/activity.ts` — last-active tracking
- `src/context/Session.tsx` — acting role, audit log

#### Overview

**Read this before trusting anything in this module.** The RBAC model — 7 roles, 86 features, and the `AccessMap` between them — was **invented for this prototype**. It is a proposal to review against your real access model, not a copy of it.

The design intent is sound and worth keeping: pages gate on a small set of coarse **capabilities** (16 of them, e.g. `policy.manage`), each of which resolves to a concrete **feature** in a single access map. That avoids a second parallel permission table drifting from the real one. The mapping table is the part that needs review — several entries are best-guess (`evals.run` → `InstanceManagePackage`, `policy.approve` → `UserManageRoles` for separation of duties).

A role switcher lets you preview the console as any role. Gated actions disable with an explanatory tooltip rather than disappearing, so an operator can see that a capability exists and who to ask.

#### Business rules

- ✅ **Rule is real** — Every mutating action gates on a capability via `<GatedButton cap="…">`. A bare `<button>` for a mutation is a bug.
- ✅ **Rule is real** — Capability checks resolve through `effectiveAccessMap()`, which layers any locally-saved overrides on top of the base map — so editing the roles matrix in Settings immediately changes what the UI permits.
  - *Source:* `src/data/permissions.ts → roleCan()`
- ✅ **Rule is real** — Break-glass access (`access.breakglass`) is Superuser-only and maps to the most privileged feature.
- ✅ **Rule is real** — Every audited action stamps the actor as active. "Last active" is an ISO instant rendered through a relative formatter on a 30-second tick — never a stored display string.
  - *Example:* Act anywhere in the console and your own row on Settings → Team resets to "just now", then counts up on its own.
  - *Source:* `src/data/activity.ts`
- ✅ **Rule is real** — Activity writes are throttled to once a minute so a burst of clicks does not re-render every table that reads it.
- ✅ **Rule is real** — Security posture is scored from the org policy by weighted checks; each failing check carries the remediation that would fix it.
  - *Source:* `src/data/security.ts → scoreSecurity()`

#### Key data fields

| Field | Type | Source | Notes |
| --- | --- | --- | --- |
| `EAccessRole` | `enum (7)` | src/data/access.ts | Superuser, CS Admin, CS User, Billing, Engineer, Analyst, Dev Advocate. **Invented.** |
| `EAccessFeature` | `enum (86)` | src/data/access.ts | Fine-grained feature list. **Invented.** |
| `Capability` | `union (16)` | src/data/permissions.ts | What the UI actually gates on. The abstraction is worth keeping even if the map under it changes. |
| `Employee.lastActiveAt` | `string | null (ISO)` | seed offset + live activity store | Null means never signed in. The one date field in the app modelled correctly — copy this, not the others. |
| `SecurityPolicy.sessionTimeoutHours / idleLockMinutes / maxConcurrentSessions` | `number` | localStorage | **These persist and feed the posture score but enforce nothing.** No session is timed out, nothing locks on idle. A visible gap between what the settings imply and what happens. |

#### Edge cases

- A role with no capability for a page still sees the page — gating is per-action, not per-route. Whether that is right is an open question.
- The roles matrix can be edited and reset; overrides live in `localStorage` and silently change gating for that browser only.
- The audit trail is in-memory per session on top of a seeded list; it is not persisted.

#### Integrations

- **SSO / SCIM** — Configuration UI exists; no identity provider is wired. There is no real authentication anywhere in this app — the "signed-in user" is a constant.
- **Device management (MDM)** — Managed device inventory and posture are modelled in `src/data/devices.ts`. Placeholder.
- **SIEM / audit sink** — The audit trail goes nowhere. In production it must be append-only and exportable.

#### Permissions

| Action | Capability | Notes |
| --- | --- | --- |
| Modify org settings, edit the roles matrix | `settings.modify` |  |
| Approve access requests, invite employees | `access.approve` |  |
| Break-glass elevation | `access.breakglass` | Superuser only. |

#### Open questions

- What is the real role and feature model? Everything here must be reconciled against it.
- Should the capability→feature mappings stand? Several are guesses — `evals.run`, `evals.review`, `policy.approve`, `incident.manage` especially.
- Should gating be per-route as well as per-action? Today every role can navigate everywhere.
- Do the session settings (timeout, idle lock, concurrent sessions) need to become real, or are they configuration the enforcement layer consumes elsewhere?

---

### Docs, Glossary & Reports

*In-app documentation, the term glossary, and generated customer/compliance reports.*

**Start here:**
- `src/data/docs.ts, docsStore.ts, glossary.ts, glossaryStore.ts, report.ts, reports.ts`
- `src/pages/Docs.tsx, Reports.tsx, *Report.tsx`

#### Overview

The console ships its own help centre: ~34 articles and an ~80-term glossary, both editable in-app and persisted locally. Reports are print-oriented documents generated from live console data — posture, compliance, security, SLA, FinOps, incidents, DSAR, and per-customer.

#### Business rules

- ✅ **Rule is real** — Reports are documents, not dashboards. They deliberately opt out of the app-wide row cap — a report must print whole.
- ✅ **Rule is real** — Glossary terms deep-link by id (`?term=`), and a deep link narrows the view to that term rather than scrolling a long list.
- 🚫 **Illustrative only** — Docs and glossary content are editable at runtime and stored locally — useful for demos, not a CMS.

#### Key data fields

| Field | Type | Source | Notes |
| --- | --- | --- | --- |
| `Doc.slug / category / type` | `string` | src/data/docs.ts | Drives the index, filters and routing. |
| `StoredTerm` | `glossary entry` | glossaryStore |  |

#### Edge cases

- The docs index sidebar is a scrolling pane with its own height limit, so it is exempt from the row cap — it never lengthens the page.
- Reports read from live stores, so an edit elsewhere changes the next report.

#### Integrations

- **Document generation / export** — Reports render as HTML for print. No PDF pipeline, no delivery, no signing.

#### Permissions

| Action | Capability | Notes |
| --- | --- | --- |
| Edit docs and glossary terms | `settings.modify` |  |

#### Open questions

- Should docs be authored in-app or sourced from a real CMS/repo?
- Do compliance reports need to be signed or timestamped to be audit-admissible?

---

## 5. All open questions, collected

Everything the code cannot answer, gathered from the sections above.

**Policy — packs, controls, change management, enforcement**

- What are the real thresholds — how many false positives justify a change, and at what rate does a control get demoted rather than narrowed?
- Who owns approving a policy change in practice, and is one approver enough or does risk level change the quorum?
- Should an applied CR automatically re-open if the control regresses, or is that a fresh proposal?

**Evaluations — efficacy, red-team, hardening, review queue**

- Is "weakest link in the strictest tier" the right target-selection rule, or should a finding name its control directly?
- Should hardening proposals require a dry-run before they can be approved, given they can block live traffic?
- What is the real severity threshold for auto-proposing, and does it differ by customer tier?

**SLA, Observability & Incidents**

- What are the real p95 ceilings per tier, and are they negotiated per contract rather than fixed by tier?
- Should a latency breach accrue service credits like an uptime miss? The UI says it is chargeable; the credit maths is not wired, deliberately — it changes billing numbers.
- Is p95 the right contractual percentile, or do enterprise customers negotiate p99?
- Over what window is the objective judged — calendar month, rolling 30 days?

**Customers, Instances & Provisioning**

- Should `Instance.customer` become a customer id before or during backend integration? It touches every joining page.
- Should the inline customer create require `customer.manage` separately from `provision.manage`? Today someone who can provision can create an account.
- What is the real instance lifecycle — who moves Provisioning → Healthy, and what does the console do while it waits?

**Residency & Privacy**

- Which regimes are in scope for launch, and which are aspirational?
- Who is the accountable approver for a transfer — is it a compliance role that does not exist in the current model?

**Billing, Licensing & FinOps**

- Is Stripe the billing system of record, or does an internal ledger own subscriptions with Stripe only taking payment?
- Where do infrastructure costs come from for the margin calculation — cloud billing export, or an internal allocation model?

**Fleet — Releases, Clusters, Supply Chain**

- What is the real promotion pipeline, and does the console drive it or observe it?
- How is an air-gapped bundle actually delivered and its import confirmed back to PLCY?

**Customer Success — health, churn, renewals**

- What actually computes health score in production — usage, support load, compliance posture, or a blend?
- Is the CRM or this console the system of record for renewal stage?

**Admin Security, Settings, Team & RBAC**

- What is the real role and feature model? Everything here must be reconciled against it.
- Should the capability→feature mappings stand? Several are guesses — `evals.run`, `evals.review`, `policy.approve`, `incident.manage` especially.
- Should gating be per-route as well as per-action? Today every role can navigate everywhere.
- Do the session settings (timeout, idle lock, concurrent sessions) need to become real, or are they configuration the enforcement layer consumes elsewhere?

**Docs, Glossary & Reports**

- Should docs be authored in-app or sourced from a real CMS/repo?
- Do compliance reports need to be signed or timestamped to be audit-admissible?
