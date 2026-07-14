/**
 * Pricing catalog — the source of truth for what PLCY sells: plans (packages)
 * with included capacity + features, add-ons with bulk (pack) pricing, named
 * throughput tiers, and global discount levers. Modeled from the SaaS pricing
 * workbook. Persisted to localStorage.
 *
 * Feature model:
 *  - Metered capacity (requests, seats, cache GB, …) → overage add-ons.
 *  - Throughput → a named tier (Standard/High/Burst/Dedicated) with an uplift.
 *  - Boolean entitlements (SSO, immutable logs, Bedrock, custom models, …) →
 *    on/off per plan; chargeable ones become add-ons when a plan doesn't include
 *    them.
 */

export type CapacityKey = 'requests' | 'seats' | 'apps' | 'packs' | 'primitives' | 'promptGb' | 'logGb' | 'cacheGb' | 'retentionDays'

export interface PlanCapacity {
  requests: number
  seats: number
  apps: number
  packs: number
  primitives: number
  promptGb: number
  logGb: number
  cacheGb: number
  retentionDays: number
}

export type BoolFeatureKey = 'sso' | 'scim' | 'immutableLogs' | 'advancedReporting' | 'hitl' | 'bedrock' | 'customModels'

export interface PlanFeatures {
  rbac: string
  throughputTier: string
  deployment: string
  backups: string
  support: string
  sso: boolean
  scim: boolean
  immutableLogs: boolean
  advancedReporting: boolean
  hitl: boolean
  bedrock: boolean
  customModels: boolean
}

export interface Plan {
  id: string
  name: string
  monthly: number
  quarterlyDiscount: number
  annualDiscount: number
  capacity: PlanCapacity
  features: PlanFeatures
  notes: string
  archived?: boolean
}

export type AddOnKind = 'capacity' | 'feature'
export interface AddOn {
  id: string
  name: string
  kind: AddOnKind
  capacityKey?: CapacityKey
  unitPrice: number | null
  packSize: number
  packPrice: number
  unitLabel: string
  notes: string
}

export interface Discounts {
  quarterly: number
  annual: number
  term24: number
  term36: number
  premiumSupport: number
  managedLlmFee: number
  byokMarkup: number
  cacheHitDiscount: number
}

/* ---- Capacity / feature metadata ---- */
export const CAPACITY_META: { key: CapacityKey; label: string; short: string }[] = [
  { key: 'requests', label: 'Governed requests / mo', short: 'Requests' },
  { key: 'seats', label: 'Seats', short: 'Seats' },
  { key: 'apps', label: 'Apps / workflows', short: 'Apps' },
  { key: 'packs', label: 'Policy packs', short: 'Packs' },
  { key: 'primitives', label: 'Primitives', short: 'Primitives' },
  { key: 'promptGb', label: 'Prompt storage (GB)', short: 'Prompt GB' },
  { key: 'logGb', label: 'Log storage (GB)', short: 'Log GB' },
  { key: 'cacheGb', label: 'Prompt cache (GB)', short: 'Cache GB' },
  { key: 'retentionDays', label: 'Log retention (days)', short: 'Retention' },
]

export const RBAC_OPTIONS = ['None', 'Basic roles', 'Basic RBAC', 'Advanced RBAC']
export const DEPLOYMENT_OPTIONS = ['Shared multi-tenant', 'Shared; Dedicated add-on available', 'Dedicated single-tenant included']

export interface ThroughputTier { name: string; monthly: number; note: string }
export const THROUGHPUT_TIERS: ThroughputTier[] = [
  { name: 'Standard', monthly: 0, note: 'Baseline sustained rate limits' },
  { name: 'High', monthly: 200, note: 'Elevated sustained throughput' },
  { name: 'Burst', monthly: 600, note: 'High burst ceiling + priority queue' },
  { name: 'Dedicated', monthly: 2000, note: 'Reserved capacity, no contention' },
]
export const tierPrice = (name: string): number => THROUGHPUT_TIERS.find((t) => t.name === name)?.monthly ?? 0
export const tierRank = (name: string): number => { const i = THROUGHPUT_TIERS.findIndex((t) => t.name === name); return i < 0 ? 0 : i }

export const FEATURE_ENUMS: { key: 'rbac' | 'throughputTier' | 'deployment'; label: string; options: string[] }[] = [
  { key: 'rbac', label: 'RBAC', options: RBAC_OPTIONS },
  { key: 'throughputTier', label: 'Throughput tier', options: THROUGHPUT_TIERS.map((t) => t.name) },
  { key: 'deployment', label: 'Deployment', options: DEPLOYMENT_OPTIONS },
]
export const FEATURE_TEXTS: { key: 'backups' | 'support'; label: string }[] = [
  { key: 'backups', label: 'Backups' },
  { key: 'support', label: 'Onboarding / support' },
]
export const FEATURE_BOOLS: { key: BoolFeatureKey; label: string }[] = [
  { key: 'sso', label: 'SSO' },
  { key: 'scim', label: 'SCIM provisioning' },
  { key: 'immutableLogs', label: 'Immutable logs' },
  { key: 'advancedReporting', label: 'Advanced reporting' },
  { key: 'hitl', label: 'HITL (human-in-the-loop)' },
  { key: 'bedrock', label: 'AWS Bedrock access' },
  { key: 'customModels', label: 'Custom / fine-tuned models' },
]

/** Boolean entitlements that are individually chargeable via an add-on when a plan omits them. */
export interface Entitlement { key: BoolFeatureKey; label: string; addonId: string; desc: string }
export const ENTITLEMENTS: Entitlement[] = [
  { key: 'immutableLogs', label: 'Immutable logs', addonId: 'ao_immutable', desc: 'Tamper-evident, append-only (WORM) audit logs. Often required by financial and healthcare regulators.' },
  { key: 'advancedReporting', label: 'Advanced reporting', addonId: 'ao_reporting', desc: 'Governance dashboards, exportable compliance reports, and custom analytics beyond the standard views.' },
  { key: 'hitl', label: 'HITL', addonId: 'ao_hitl', desc: 'Human-in-the-loop review and approval gates before high-risk model actions execute.' },
  { key: 'bedrock', label: 'AWS Bedrock', addonId: 'ao_bedrock', desc: 'Access to AWS Bedrock foundation models, governed by PLCY.' },
  { key: 'customModels', label: 'Custom models', addonId: 'ao_custom', desc: 'Fine-tuned or customer-imported private models, governed and routed through PLCY.' },
]

/* ------------------------------------------------------------------ */
/* Seeds (from the pricing workbook)                                    */
/* ------------------------------------------------------------------ */
export const seedPlans: Plan[] = [
  {
    id: 'plan_free', name: 'Free', monthly: 0, quarterlyDiscount: 0, annualDiscount: 0,
    capacity: { requests: 10000, seats: 2, apps: 1, packs: 1, primitives: 3, promptGb: 0.5, logGb: 0.5, cacheGb: 0.1, retentionDays: 7 },
    features: { rbac: 'None', throughputTier: 'Standard', deployment: 'Shared multi-tenant', backups: 'None', support: 'Community', sso: false, scim: false, immutableLogs: false, advancedReporting: false, hitl: false, bedrock: false, customModels: false },
    notes: 'Developer / plugin adoption',
  },
  {
    id: 'plan_builder', name: 'Builder', monthly: 29, quarterlyDiscount: 0.05, annualDiscount: 0.17,
    capacity: { requests: 100000, seats: 5, apps: 3, packs: 2, primitives: 6, promptGb: 2, logGb: 2, cacheGb: 1, retentionDays: 30 },
    features: { rbac: 'Basic roles', throughputTier: 'Standard', deployment: 'Shared; Dedicated add-on available', backups: 'Daily', support: 'Email support', sso: false, scim: false, immutableLogs: false, advancedReporting: false, hitl: false, bedrock: false, customModels: false },
    notes: 'Solo founder / startup builder',
  },
  {
    id: 'plan_team', name: 'Team', monthly: 99, quarterlyDiscount: 0.05, annualDiscount: 0.17,
    capacity: { requests: 500000, seats: 10, apps: 10, packs: 5, primitives: 12, promptGb: 10, logGb: 10, cacheGb: 5, retentionDays: 90 },
    features: { rbac: 'Basic RBAC', throughputTier: 'High', deployment: 'Shared; Dedicated add-on available', backups: 'Daily + restore window', support: '1 kickoff session + priority email', sso: false, scim: false, immutableLogs: false, advancedReporting: true, hitl: true, bedrock: false, customModels: false },
    notes: 'Small product team',
  },
  {
    id: 'plan_business', name: 'Business', monthly: 399, quarterlyDiscount: 0.05, annualDiscount: 0.17,
    capacity: { requests: 2000000, seats: 25, apps: 25, packs: 10, primitives: 25, promptGb: 50, logGb: 100, cacheGb: 25, retentionDays: 180 },
    features: { rbac: 'Advanced RBAC', throughputTier: 'Burst', deployment: 'Shared; Dedicated add-on available', backups: 'Daily + extended restore', support: 'Dedicated onboarding + quarterly training + Slack', sso: true, scim: false, immutableLogs: true, advancedReporting: true, hitl: true, bedrock: true, customModels: false },
    notes: 'Main governance SaaS plan',
  },
  {
    id: 'plan_enterprise', name: 'Enterprise Cloud', monthly: 2499, quarterlyDiscount: 0.05, annualDiscount: 0.17,
    capacity: { requests: 10000000, seats: 1000, apps: 100, packs: 20, primitives: 50, promptGb: 500, logGb: 1000, cacheGb: 250, retentionDays: 1095 },
    features: { rbac: 'Advanced RBAC', throughputTier: 'Dedicated', deployment: 'Dedicated single-tenant included', backups: 'Custom', support: 'Named onboarding lead + SLA support', sso: true, scim: true, immutableLogs: true, advancedReporting: true, hitl: true, bedrock: true, customModels: true },
    notes: 'Dedicated enterprise cloud',
  },
]

export const seedAddOns: AddOn[] = [
  { id: 'ao_requests', name: 'Extra governed requests', kind: 'capacity', capacityKey: 'requests', unitPrice: null, packSize: 100000, packPrice: 15, unitLabel: '100k req/mo', notes: 'Usage overage pack' },
  { id: 'ao_cache', name: 'Extra prompt cache', kind: 'capacity', capacityKey: 'cacheGb', unitPrice: 3, packSize: 50, packPrice: 120, unitLabel: 'GB cache/mo', notes: 'Larger cache; cached prompts are not billed as requests' },
  { id: 'ao_seats', name: 'Extra seat', kind: 'capacity', capacityKey: 'seats', unitPrice: 15, packSize: 100, packPrice: 1000, unitLabel: 'seat/mo', notes: 'Discounted 100-seat pack' },
  { id: 'ao_apps', name: 'Extra app / workflow', kind: 'capacity', capacityKey: 'apps', unitPrice: 25, packSize: 5, packPrice: 100, unitLabel: 'app/mo', notes: 'Discounted 5-app pack' },
  { id: 'ao_packs', name: 'Extra policy pack', kind: 'capacity', capacityKey: 'packs', unitPrice: 50, packSize: 5, packPrice: 200, unitLabel: 'pack/mo', notes: 'Discounted 5-pack bundle' },
  { id: 'ao_primitives', name: 'Extra primitive', kind: 'capacity', capacityKey: 'primitives', unitPrice: 10, packSize: 10, packPrice: 75, unitLabel: 'primitive/mo', notes: 'Discounted 10-primitive bundle' },
  { id: 'ao_prompt', name: 'Extra prompt storage', kind: 'capacity', capacityKey: 'promptGb', unitPrice: 2, packSize: 100, packPrice: 150, unitLabel: 'GB/mo', notes: 'Discounted 100GB storage pack' },
  { id: 'ao_log', name: 'Extra log storage', kind: 'capacity', capacityKey: 'logGb', unitPrice: 3, packSize: 100, packPrice: 250, unitLabel: 'GB/mo', notes: 'Discounted 100GB log storage pack' },
  { id: 'ao_immutable', name: 'Immutable logs', kind: 'feature', unitPrice: 100, packSize: 1, packPrice: 100, unitLabel: 'workspace/mo', notes: 'Included in Business+' },
  { id: 'ao_reporting', name: 'Advanced reporting', kind: 'feature', unitPrice: 150, packSize: 1, packPrice: 150, unitLabel: 'workspace/mo', notes: 'Included in Team+' },
  { id: 'ao_hitl', name: 'HITL', kind: 'feature', unitPrice: 99, packSize: 1, packPrice: 99, unitLabel: 'workspace/mo', notes: 'Included in Team+' },
  { id: 'ao_bedrock', name: 'AWS Bedrock access', kind: 'feature', unitPrice: 250, packSize: 1, packPrice: 250, unitLabel: 'workspace/mo', notes: 'Included in Business+; add-on for Team' },
  { id: 'ao_custom', name: 'Custom / fine-tuned models', kind: 'feature', unitPrice: 500, packSize: 1, packPrice: 500, unitLabel: 'workspace/mo', notes: 'Included in Enterprise Cloud' },
]

export const defaultDiscounts: Discounts = {
  quarterly: 0.05, annual: 0.17, term24: 0.2, term36: 0.25, premiumSupport: 0.15, managedLlmFee: 0.05, byokMarkup: 0, cacheHitDiscount: 1,
}

/* ------------------------------------------------------------------ */
/* Persistence (v2 keys — feature model changed)                        */
/* ------------------------------------------------------------------ */
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function save<T>(key: string, val: T) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* ignore */
  }
}
const clonePlans = () => seedPlans.map((p) => ({ ...p, capacity: { ...p.capacity }, features: { ...p.features } }))
const cloneAddOns = () => seedAddOns.map((a) => ({ ...a }))

export const loadPlans = (): Plan[] => load('plcy_plans_v2', clonePlans())
export const savePlans = (v: Plan[]) => save('plcy_plans_v2', v)
export const loadAddOns = (): AddOn[] => load('plcy_addons_v2', cloneAddOns())
export const saveAddOns = (v: AddOn[]) => save('plcy_addons_v2', v)
export const loadDiscounts = (): Discounts => load('plcy_discounts_v2', { ...defaultDiscounts })
export const saveDiscounts = (v: Discounts) => save('plcy_discounts_v2', v)

export function newPlanId(): string {
  return 'plan_' + Math.random().toString(36).slice(2, 8)
}
export function newAddOnId(): string {
  return 'ao_' + Math.random().toString(36).slice(2, 8)
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
export const money = (n: number): string => {
  const neg = n < 0
  const a = Math.round(Math.abs(n))
  return `${neg ? '-' : ''}$${a.toLocaleString()}`
}
export const money2 = (n: number): string => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const pct = (f: number): string => `${Math.round(f * 1000) / 10}%`
export const compact = (n: number): string =>
  n >= 1_000_000 ? `${n / 1_000_000}M` : n >= 1_000 ? `${n / 1_000}k` : String(n)

export const effectivePrice = (monthly: number, discount: number): number => Math.round(monthly * (1 - discount) * 100) / 100
export const packUnitPrice = (a: AddOn): number => (a.packSize ? a.packPrice / a.packSize : 0)
export const packSavingsPct = (a: AddOn): number => (a.unitPrice ? 1 - packUnitPrice(a) / a.unitPrice : 0)

/* ------------------------------------------------------------------ */
/* Quote engine                                                         */
/* ------------------------------------------------------------------ */
export type Cadence = 'Monthly' | 'Quarterly' | 'Annual'
export interface QuoteInput {
  planId: string
  cadence: Cadence
  termMonths: 12 | 24 | 36
  commercialPct: number
  demand: PlanCapacity
  throughputTier: string
  /** Individually toggleable entitlements (keys of ENTITLEMENTS). */
  entitlements: Record<BoolFeatureKey, boolean>
  premiumSupport: boolean
  cacheHitRate: number
  modelAccess: 'BYOK' | 'Managed'
  managedCreditsMonthly: number
  setupFee: number
  trainingFee: number
  migrationFee: number
}

export interface QuoteLine {
  label: string
  basis: string
  monthly: number
  notes: string
}
export interface Quote {
  plan: Plan | null
  lines: QuoteLine[]
  grossMonthly: number
  billingDiscount: number
  termDiscount: number
  commercialDiscount: number
  netMonthly: number
  annualAcv: number
  oneTime: number
  firstYear: number
  effPerSeat: number
}

function overageCost(extra: number, a: AddOn): { cost: number; basis: string } {
  if (extra <= 0) return { cost: 0, basis: 'within plan' }
  const packs = Math.ceil(extra / a.packSize)
  const packCost = packs * a.packPrice
  const individual = a.unitPrice != null ? extra * a.unitPrice : Infinity
  if (packCost <= individual) return { cost: packCost, basis: `${packs} × ${a.unitLabel} pack` }
  return { cost: individual, basis: `${extra} × ${a.unitLabel}` }
}

export function computeQuote(input: QuoteInput, plans: Plan[], addOns: AddOn[], discounts: Discounts): Quote {
  const plan = plans.find((p) => p.id === input.planId) ?? null
  const lines: QuoteLine[] = []
  if (!plan) {
    return { plan: null, lines, grossMonthly: 0, billingDiscount: 0, termDiscount: 0, commercialDiscount: 0, netMonthly: 0, annualAcv: 0, oneTime: 0, firstYear: 0, effPerSeat: 0 }
  }

  lines.push({ label: `${plan.name} plan`, basis: 'base subscription', monthly: plan.monthly, notes: 'Recurring platform fee' })

  // Throughput tier upgrade (delta above the plan's included tier)
  if (tierRank(input.throughputTier) > tierRank(plan.features.throughputTier)) {
    const delta = tierPrice(input.throughputTier) - tierPrice(plan.features.throughputTier)
    lines.push({ label: `Throughput — ${input.throughputTier}`, basis: `upgrade from ${plan.features.throughputTier}`, monthly: delta, notes: THROUGHPUT_TIERS.find((t) => t.name === input.throughputTier)?.note ?? '' })
  }

  const cacheHit = Math.min(1, Math.max(0, input.cacheHitRate)) * discounts.cacheHitDiscount

  // Capacity overages
  for (const a of addOns) {
    if (a.kind !== 'capacity' || !a.capacityKey) continue
    let need = input.demand[a.capacityKey]
    let cacheSuffix = ''
    if (a.capacityKey === 'requests' && cacheHit > 0) {
      const billable = Math.round(need * (1 - cacheHit))
      cacheSuffix = ` · ${Math.round(cacheHit * 100)}% cached (${billable.toLocaleString()} billable)`
      need = billable
    }
    const included = plan.capacity[a.capacityKey]
    const extra = Math.max(0, need - included)
    if (extra > 0) {
      const { cost, basis } = overageCost(extra, a)
      lines.push({ label: a.name, basis: basis + cacheSuffix, monthly: cost, notes: a.notes })
    }
  }

  // Entitlements — $0 when the plan includes it, else the add-on price
  for (const e of ENTITLEMENTS) {
    if (!input.entitlements[e.key]) continue
    if (plan.features[e.key]) {
      lines.push({ label: e.label, basis: 'included in plan', monthly: 0, notes: 'Bundled — no charge' })
    } else {
      const a = addOns.find((x) => x.id === e.addonId)
      if (a) lines.push({ label: a.name, basis: a.unitLabel, monthly: a.packPrice, notes: a.notes })
    }
  }

  // Model access — PLCY-managed LLM credits + service fee
  if (input.modelAccess === 'Managed' && input.managedCreditsMonthly > 0) {
    const fee = input.managedCreditsMonthly * discounts.managedLlmFee
    lines.push({ label: 'PLCY-managed LLM', basis: `${money(input.managedCreditsMonthly)} credits + ${pct(discounts.managedLlmFee)} fee`, monthly: input.managedCreditsMonthly + fee, notes: 'Optional convenience layer; BYOK is default' })
  }

  const subtotal = lines.reduce((s, l) => s + l.monthly, 0)
  if (input.premiumSupport) {
    const fee = subtotal * discounts.premiumSupport
    lines.push({ label: 'Premium support', basis: `${pct(discounts.premiumSupport)} of subscription`, monthly: fee, notes: 'Priority support & SLA' })
  }

  const grossMonthly = lines.reduce((s, l) => s + l.monthly, 0)

  const billingDiscount = input.cadence === 'Quarterly' ? plan.quarterlyDiscount : input.cadence === 'Annual' ? plan.annualDiscount : 0
  const termDiscount = input.termMonths === 24 ? discounts.term24 : input.termMonths === 36 ? discounts.term36 : 0
  const commercialDiscount = input.commercialPct

  const netMonthly = grossMonthly * (1 - billingDiscount) * (1 - termDiscount) * (1 - commercialDiscount)
  const annualAcv = netMonthly * 12
  const oneTime = input.setupFee + input.trainingFee + input.migrationFee
  const firstYear = annualAcv + oneTime
  const effPerSeat = input.demand.seats > 0 ? netMonthly / input.demand.seats : 0

  return { plan, lines, grossMonthly, billingDiscount, termDiscount, commercialDiscount, netMonthly, annualAcv, oneTime, firstYear, effPerSeat }
}
