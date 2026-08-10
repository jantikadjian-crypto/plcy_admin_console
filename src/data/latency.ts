/**
 * Latency — one definition of a percentile, and one place that produces the
 * samples the rest of the app reports on.
 *
 * Before this, four surfaces invented latency independently: Observability drew
 * a p50/p95/p99 chart from a sine curve but printed a hardcoded headline above
 * it, Enforcement computed a real p95 from the decision log, the Instances
 * drawer used `40 + rps/30`, and Super Admin held literal strings. "p95" meant
 * something different on every page.
 *
 * Everything now goes through `percentile()` here, and the numbers reported are
 * computed from samples rather than typed in.
 */

/* ------------------------------------------------------------------ */
/* The percentile                                                      */
/* ------------------------------------------------------------------ */

/**
 * Nearest-rank percentile: the smallest value at or below which at least `p`
 * of the observations fall.
 *
 * The previous implementation indexed `floor(n * p)`, which over-reports
 * whenever `p × n` is a whole number — at n=20 it read the 20th of 20 values as
 * p95 instead of the 19th. The rank is `ceil(p × n)`, one-based.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.ceil(p * sorted.length)
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))]
}

export interface Percentiles {
  p50: number
  p95: number
  p99: number
  /** How many observations the percentiles were drawn from. */
  count: number
}

export function percentiles(values: number[]): Percentiles {
  return {
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
    count: values.length,
  }
}

/* ------------------------------------------------------------------ */
/* Sample generation                                                   */
/* ------------------------------------------------------------------ */

/** Deterministic [0,1) mixer (mulberry32) — same one the decision log uses. */
function mix(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** A stable pseudo-random stream from a string key — same customer, same numbers. */
export function seededStream(key: string): (i: number) => number {
  const base = [...key].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
  return (i: number) => mix(Math.imul(base ^ (i + 1), 2654435761))
}

/**
 * One right-skewed latency sample, in ms, expressed as a multiple of the median.
 *
 * Real request latency is not uniform — most requests sit near the median and a
 * thin tail runs long. The decision log used to sample uniformly across 4-41ms,
 * which made p50, p95 and p99 nearly the same number and left the page's "warn
 * above 50ms" threshold permanently unreachable: the tail the threshold exists
 * to catch didn't exist. The high-exponent term restores it.
 *
 * Calibrated so p95 ≈ 2.1× the median and p99 ≈ 3×, which is the shape a
 * healthy gateway actually has.
 */
export function skewedLatency(u: number, medianMs: number): number {
  return Math.round(medianMs * (0.6 + 0.8 * u + 2.0 * Math.pow(u, 19)))
}

/** `n` deterministic samples around a median, stable for a given key. */
export function latencySamples(key: string, n: number, medianMs: number): number[] {
  const rand = seededStream(key)
  return Array.from({ length: n }, (_, i) => skewedLatency(rand(i), medianMs))
}

/* ------------------------------------------------------------------ */
/* Budgets and objectives                                              */
/* ------------------------------------------------------------------ */

/**
 * What the enforcement point is allowed to add to a governed request, at p95.
 * This is PLCY's own overhead — the tax the governance layer charges — and it's
 * the number a customer will challenge you on, separate from gateway latency.
 */
export const ENFORCEMENT_BUDGET_MS = 50

/** Contractual gateway p95 ceiling by SLA tier. */
export const LATENCY_TARGET_MS: Record<'Platinum' | 'Gold' | 'Silver', number> = {
  Platinum: 250,
  Gold: 400,
  Silver: 600,
}

/**
 * How an observed p95 stands against its target. "At risk" is the last 10%
 * before the ceiling — the band where you want to know before the customer does.
 */
export type LatencyStatus = 'Meeting' | 'At risk' | 'Breached'

export function latencyStatus(observedP95: number, targetMs: number): LatencyStatus {
  if (observedP95 > targetMs) return 'Breached'
  if (observedP95 >= targetMs * 0.9) return 'At risk'
  return 'Meeting'
}

/* ------------------------------------------------------------------ */
/* Gateway telemetry (mock, but computed)                              */
/* ------------------------------------------------------------------ */

/** Requests sampled per hourly bucket on the Observability chart. */
const SAMPLES_PER_HOUR = 400

/**
 * 24 hours of gateway traffic as *samples*, not as pre-computed percentiles.
 * The chart and its headline both reduce these through `percentile()`, so they
 * cannot disagree the way a hand-typed stat card did.
 */
export function gatewayHours(): { hour: string; samples: number[]; requests: number }[] {
  return Array.from({ length: 24 }, (_, h) => {
    // Diurnal load curve — busiest mid-afternoon, quietest overnight. Latency
    // rides the same curve, because queueing is what makes it move.
    const load = Math.sin((h / 24) * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5
    return {
      hour: `${String(h).padStart(2, '0')}:00`,
      requests: Math.round(1800 + load * 3400 + (h % 3) * 120),
      samples: latencySamples(`gw-${h}`, SAMPLES_PER_HOUR, Math.round(78 + load * 46)),
    }
  })
}

/** Requests sampled per customer when judging their monthly latency objective. */
const SAMPLES_PER_CUSTOMER = 600

/**
 * A customer's gateway latency for the month, against which their SLA objective
 * is judged. The median comes from their SLA record (how that account actually
 * runs); the distribution around it is generated here and keyed off name and
 * region, so the same customer always reports the same numbers.
 */
export function customerLatency(customer: string, region: string, medianMs: number): Percentiles {
  return percentiles(latencySamples(`${customer}|${region}`, SAMPLES_PER_CUSTOMER, medianMs))
}
