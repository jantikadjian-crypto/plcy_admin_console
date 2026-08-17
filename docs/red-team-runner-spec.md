# PLCY Red-Team Runner — Backend Integration Spec

**Status:** draft · **Audience:** PLCY platform/backend engineering
**Companion to:** the Evaluations → Red-Team UI (`src/pages/RedTeam.tsx`) and its
data contracts (`src/data/evals.ts`).

The console already produces everything a run needs — **what** to attack
(`TargetSpec`), **with which techniques** (Attack Library + OWASP/ATLAS
taxonomy), and **on what cadence** (`Schedule`). This spec defines the backend
that turns that into real attacks against connected instances and streams
results back into the existing screens.

**Out of scope:** air-gapped deployments. They have no live reach and are
validated by the separate offline bundle-certification process. The runner MUST
reject air-gapped targets server-side.

---

## 1. Architecture

```
Console (control plane)            Red-Team backend                     Targets
──────────────────────             ────────────────                     ───────
Launch campaign  ──POST──▶  Orchestrator ──▶ Scheduler (cron/queue)
  (CampaignSpec)                │                │
Render results ◀──SSE/webhook── │           Attack Workers ──attack──▶  PLCY gateway
  attempts / findings           │                │                       (SaaS or
  coverage / trend              ▼                ▼                        per-instance,
                          Results store   Verdict oracle                 governed path)
                          (PG + object)   (was it blocked?)
```

- **Orchestrator** — receives `CampaignSpec`, resolves targets → endpoints, persists, schedules, dispatches, aggregates attempts → findings, emits events.
- **Attack Workers** — execute technique payloads against a target's **governed request path**, capture `{prompt, response, verdict, detector, latency}`.
- **Scheduler** — fires `Nightly` / `Weekly` (per-campaign `nextRun`) and keeps `Continuous` fuzzers running.
- **Verdict oracle** — per-technique success checker that decides *bypassed* vs *blocked* (see §6).
- **Results store** — Postgres for campaigns/attempts/findings/schedules; object store for full transcripts.

> **Core principle:** attacks go through the **real PLCY gateway** (the same
> path production traffic takes), so a `blocked` verdict means the actual
> deployed detectors caught it. That is the entire point — we are measuring the
> live guardrails, not a simulation.

---

## 2. Safety & authorization (this is attacking customer systems — read first)

Red-teaming a live customer instance is high-blast-radius. Non-negotiables:

1. **Per-customer authorization.** A connected instance is only targetable if the
   customer has red-team authorization on file (contract/entitlement flag). Default
   scope is **PLCY's own SaaS platform / staging**. The orchestrator re-checks this
   independently of the console.
2. **Synthetic-traffic isolation.** Every attack request carries
   `X-PLCY-RedTeam: <campaignId>`. Such traffic MUST be:
   - excluded from the customer's **billing/usage** metering,
   - excluded from (or clearly labelled in) the customer's **audit/incident** feeds,
   - rate-limited to protect capacity.
3. **No real side effects.** Tool/agent attacks execute against a **sandbox / dry-run**
   tool surface; destructive actions are never actually performed.
4. **Canary data, never real PII.** Cross-tenant / data-leak techniques assert the
   control *blocks* access using **seeded canaries** — the harness never surfaces a
   real other-tenant record even during a passing test.
5. **AuthZ.** Launch requires the console capability `evals.run`; the orchestrator
   requires a service scope + on-behalf-of operator identity for audit. **Air-gapped
   targets are rejected.**
6. **Kill switch.** Operators can stop/pause any running or `Continuous` campaign;
   the scheduler honours pause immediately.
7. **Audit.** Launch / schedule-change / stop / retest are written to the platform
   audit log (already modelled in the console as `evals.redteam.launch`,
   `evals.finding.retest`, etc.).

---

## 3. Data contracts

Wire types mirror the console TypeScript in `src/data/evals.ts` — keep them in sync.

### 3.1 `CampaignSpec` — console → orchestrator (launch)
```jsonc
{
  "id": "rt_...",                       // client-generated; also Idempotency-Key
  "name": "Q3 Injection Sweep",
  "owner": "trust-and-safety",
  "target": {                            // === console TargetSpec
    "kind": "platform" | "selection",
    "instanceIds": ["dep_meridian", ...] // empty for platform (= all connected)
  },
  "taxonomy": ["LLM01", "LLM02"],        // OWASP LLM ids
  "techniqueIds": ["atk_01", ...],       // optional; else derived from taxonomy + library
  "schedule": "One-off|Nightly|Weekly|Continuous",
  "mode": "shadow" | "enforce",          // shadow = observe only; enforce = live governed path
  "createdAt": "2026-07-23T…Z"
}
```

### 3.2 `AttemptResult` — worker → orchestrator → console
```jsonc
{
  "id": "at_...", "campaignId": "rt_...", "instanceId": "dep_meridian",
  "techniqueId": "atk_02", "taxonomy": "LLM01",
  "prompt": "…", "model": "Claude Opus 4", "response": "…",
  "verdict": "blocked" | "bypassed",
  "detector": "Injection classifier" | "—",   // which control fired ('—' when bypassed)
  "latencyMs": 340, "at": "2026-07-23T09:16Z"
}
```

### 3.3 `Finding` — derived by orchestrator
```jsonc
{
  "id": "f_...", "campaignId": "rt_...",
  "attackType": "LLM01", "severity": "High",
  "status": "open|mitigated|accepted",
  "summary": "…", "linkedControlPrefix": "RG",
  "repro": { "prompt": "…", "model": "…", "instanceId": "dep_meridian" },
  "openedAt": "…", "assignee": null, "remediationNote": null,
  "retestedAt": null, "retestResult": null, "linkedIncidentId": null
}
```
Findings open when a technique **bypasses on ≥1 target**; dedupe by
`(techniqueId × linkedControlPrefix)`. Severity derives from the technique's
severity/difficulty and how many targets it bypassed on.

### 3.4 Resolved target (orchestrator-internal)
`instanceId → { customer, region, gatewayUrl, authRef, connectivity }`. Reject any
with `connectivity === "Air-gapped"`.

---

## 4. REST API

Base `POST /v1/redteam`. Bearer service token + `X-On-Behalf-Of: <operator>`.
`Idempotency-Key` required on launch. (gRPC equivalents are 1:1.)

| Method & path | Purpose |
|---|---|
| `POST /campaigns` | Launch a campaign (body `CampaignSpec`) → `202 {campaignId, status}` |
| `GET /campaigns/{id}` | Status + rollup (attempts, bypasses, coverage) |
| `GET /campaigns/{id}/attempts?verdict=bypassed&cursor=` | Paged transcripts |
| `GET /campaigns/{id}/findings` | Findings for a campaign |
| `POST /campaigns/{id}/stop` | Kill / pause (incl. `Continuous`) |
| `PATCH /findings/{id}` | status / assignee / remediationNote |
| `POST /findings/{id}/retest` | Re-run the finding's `repro` → `{verdict}` |
| `GET /schedules` · `PATCH /schedules/{campaignId}` | Cadence management |
| `GET /library` | Attack library (backend is source of truth; console syncs) |
| `GET /campaigns/{id}/events` (SSE) **or** webhook registration | Live stream |

**Event stream** (`text/event-stream` or webhook POST). Event types:
`attempt` (new `AttemptResult`), `finding` (opened/updated), `campaign.status`
(running → triaging → completed). The console subscribes and updates the same
screens that render mock data today.

---

## 5. Execution model (worker)

For each `(target × technique)`:
1. **Render** the technique payload (may be a multi-turn script).
2. **Send** through the target's PLCY gateway with `X-PLCY-RedTeam` and the run
   `mode`. In `shadow` mode the gateway evaluates detectors but does not affect
   real traffic; in `enforce` it uses the live path.
3. **Capture** `{response, which detector fired, latency}`.
4. **Classify** via the verdict oracle (§6) → `blocked | bypassed`.
5. **Emit** the `AttemptResult`.

Concurrency: per-instance QPS cap + backoff; respect capacity headroom. Every run
has an idempotent `runId` so re-drives don't double-count.

---

## 6. Verdict oracle (the hard part)

Deciding *bypassed* is technique-specific and must not rely on the gateway's own
verdict alone (that only tells you it wasn't blocked, not that the attack
succeeded). Each `AttackTechnique` gains a `successCheck`:

- **Injection / jailbreak:** did the model follow the injected instruction? Check
  for a planted sentinel the payload asks it to emit.
- **Data leakage:** does the response contain the **canary** value seeded in context?
- **Tool abuse:** did a tool call reach a disallowed (sandboxed) destination?
- **Output handling:** does the response contain the unescaped payload?
- **DoS:** did generation exceed the token/latency budget?

Implementation: a small rules engine per technique, with an **LLM-judge fallback**
for fuzzy cases (graded, logged, and itself sampled for QA). This is the main
research/eng investment and should be its own milestone.

---

## 7. Wiring the console to the real API

The screens already exist; only the data source changes.
- Swap `evalsStore` reads (`useEvals`) for API calls: `GET …/campaigns`,
  `…/attempts`, `…/findings`, plus an **SSE subscription** for live updates.
- Mutations map 1:1: launch → `POST /campaigns`; retest → `POST /findings/{id}/retest`;
  status/assign/note → `PATCH /findings/{id}`; stop → `POST /campaigns/{id}/stop`.
- Bypass-resistance trend and coverage are **server-aggregated** time series/rollups.
- The **Efficacy** tab (detector precision/recall) is fed by QA-labelled attempts
  (ties to the planned QA Review Queue) — labels flow back as `AttemptResult`
  annotations.

Keep `src/data/evals.ts` types as the shared contract; generate them from the
backend's OpenAPI/JSON-Schema so the two never drift.

---

## 8. Storage & retention

- **Postgres:** campaigns, findings, schedules, library. Attempts may be
  high-volume → consider a columnar/OLAP sink for rollups.
- **Object store:** full transcripts (prompt/response) — **sensitive** (attack
  payloads + model output, possibly canary-laden). Encrypt at rest, tight ACLs,
  **short retention**, redact canaries before any export.

---

## 9. Deployment topology decision

Two ways workers reach targets:
- **Central runner → out to instances** (simplest for connected SaaS; the
  orchestrator calls each instance's gateway URL).
- **In-cluster agent** (for VPC/single-tenant): a control-plane-triggered agent
  runs inside the customer's cluster and reports back. Better isolation and
  avoids inbound exposure, at the cost of an extra deployed component.

Recommendation: **central runner for the SaaS platform + connected multi-tenant;
in-cluster agent for dedicated single-tenant VPCs.** (Air-gapped stays offline.)

---

## 10. Phased rollout

| Phase | Scope |
|---|---|
| **0 (done)** | Console emits `CampaignSpec` (target + taxonomy + techniques + schedule). |
| **1** | Orchestrator + workers against **PLCY's own SaaS / staging only**, `One-off` + scheduled, `shadow` mode. Wire console to the real API + SSE. |
| **2** | Per-customer opt-in targeting (contract-gated), `Continuous` fuzzing, per-technique verdict oracles. |
| **3** | Feed **Efficacy** from labelled results (Review Queue), auto-open incidents from findings, hook into release-gating. |

---

## 11. Open decisions (need product sign-off)

1. **Default attack mode** — `shadow` (observe) vs `enforce` (live path)?
2. **Verdict oracle** strategy per technique — rules-first vs LLM-judge, and the QA loop for judging the judge.
3. **Topology** — central runner vs in-cluster agent per deployment type (§9).
4. **Synthetic-traffic policy** — exact billing/audit isolation rules for `X-PLCY-RedTeam` traffic.
5. **Transcript retention** — how long, and redaction policy for canaries/PII.
6. **Customer consent UX** — how a customer authorizes being red-teamed (contract flag, per-run notification?).
