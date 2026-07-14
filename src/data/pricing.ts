/**
 * Pricing catalog — the source of truth behind Settings/Billing for what PLCY
 * sells: plans (packages) with included capacity + features, add-ons with bulk
 * (pack) pricing, and the global discount levers. Modeled from the SaaS pricing
 * workbook (Package Matrix / Add-Ons / discount logic / Quote Builder). All three
 * are persisted to localStorage so edits survive a reload.
 */

export type CapacityKey = 'requests' | 'seats' | 'apps' | 'packs' | 'primitives' | 'promptGb' | 'logGb' | 'retentionDays'

export interface PlanCapacity {
  requests: number
  seats: number
  apps: number
  packs: number
  primitives: number
  promptGb: number
  logGb: number
  retentionDays: number
}

export interface PlanFeatures {
  rbac: string
  sso: string
  immutableLogs: string
  advancedReporting: string
  hitl: string
  backups: string
  deployment: string
  support: string
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
  /** Links a capacity add-on to the plan dimension it tops up. */
  capacityKey?: CapacityKey
  /** Individual per-unit price; null when only sold as a pack (e.g. requests). */
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
}

/* ---- Capacity dimension metadata (labels + formatting) ---- */
export const CAPACITY_META: { key: CapacityKey; label: string; short: string }[] = [
  { key: 'requests', label: 'Governed requests / mo', short: 'Requests' },
  { key: 'seats', label: 'Seats', short: 'Seats' },
  { key: 'apps', label: 'Apps / workflows', short: 'Apps' },
  { key: 'packs', label: 'Policy packs', short: 'Packs' },
  { key: 'primitives', label: 'Primitives', short: 'Primitives' },
  { key: 'promptGb', label: 'Prompt storage (GB)', short: 'Prompt GB' },
  { key: 'logGb', label: 'Log storage (GB)', short: 'Log GB' },
  { key: 'retentionDays', label: 'Log retention (days)', short: 'Retention' },
]

export const FEATURE_META: { key: keyof PlanFeatures; label: string }[] = [
  { key: 'rbac', label: 'RBAC' },
  { key: 'sso', label: 'SSO / SCIM' },
  { key: 'immutableLogs', label: 'Immutable logs' },
  { key: 'advancedReporting', label: 'Advanced reporting' },
  { key: 'hitl', label: 'HITL' },
  { key: 'backups', label: 'Backups' },
  { key: 'deployment', label: 'Deployment model' },
  { key: 'support', label: 'Onboarding / support' },
]

/* ------------------------------------------------------------------ */
/* Seeds (from the pricing workbook)                                    */
/* ------------------------------------------------------------------ */
export const seedPlans: Plan[] = [
  {
    id: 'plan_free', name: 'Free', monthly: 0, quarterlyDiscount: 0, annualDiscount: 0,
    capacity: { requests: 10000, seats: 2, apps: 1, packs: 1, primitives: 3, promptGb: 0.5, logGb: 0.5, retentionDays: 7 },
    features: { rbac: 'No', sso: 'No', immutableLogs: 'No', advancedReporting: 'No', hitl: 'No', backups: 'None', deployment: 'Shared multi-tenant', support: 'Community' },
    notes: 'Developer / plugin adoption',
  },
  {
    id: 'plan_builder', name: 'Builder', monthly: 29, quarterlyDiscount: 0.05, annualDiscount: 0.17,
    capacity: { requests: 100000, seats: 5, apps: 3, packs: 2, primitives: 6, promptGb: 2, logGb: 2, retentionDays: 30 },
    features: { rbac: 'Basic roles', sso: 'No', immutableLogs: 'No', advancedReporting: 'No', hitl: 'Optional add-on', backups: 'Daily', deployment: 'Shared; Dedicated add-on available', support: 'Email support' },
    notes: 'Solo founder / startup builder',
  },
  {
    id: 'plan_team', name: 'Team', monthly: 99, quarterlyDiscount: 0.05, annualDiscount: 0.17,
    capacity: { requests: 500000, seats: 10, apps: 10, packs: 5, primitives: 12, promptGb: 10, logGb: 10, retentionDays: 90 },
    features: { rbac: 'Basic RBAC', sso: 'No', immutableLogs: 'Optional add-on', advancedReporting: 'Standard', hitl: 'Included', backups: 'Daily + restore window', deployment: 'Shared; Dedicated add-on available', support: '1 kickoff session + priority email' },
    notes: 'Small product team',
  },
  {
    id: 'plan_business', name: 'Business', monthly: 399, quarterlyDiscount: 0.05, annualDiscount: 0.17,
    capacity: { requests: 2000000, seats: 25, apps: 25, packs: 10, primitives: 25, promptGb: 50, logGb: 100, retentionDays: 180 },
    features: { rbac: 'Advanced RBAC', sso: 'SSO', immutableLogs: 'Included', advancedReporting: 'Included', hitl: 'Included', backups: 'Daily + extended restore', deployment: 'Shared; Dedicated add-on available', support: 'Dedicated onboarding + quarterly training + Slack' },
    notes: 'Main governance SaaS plan',
  },
  {
    id: 'plan_enterprise', name: 'Enterprise Cloud', monthly: 2499, quarterlyDiscount: 0.05, annualDiscount: 0.17,
    capacity: { requests: 10000000, seats: 1000, apps: 100, packs: 20, primitives: 50, promptGb: 500, logGb: 1000, retentionDays: 1095 },
    features: { rbac: 'Advanced RBAC', sso: 'SSO + SCIM', immutableLogs: 'Included', advancedReporting: 'Included', hitl: 'Included', backups: 'Custom', deployment: 'Dedicated single-tenant included', support: 'Named onboarding lead + SLA support' },
    notes: 'Dedicated enterprise cloud',
  },
]

export const seedAddOns: AddOn[] = [
  { id: 'ao_requests', name: 'Extra governed requests', kind: 'capacity', capacityKey: 'requests', unitPrice: null, packSize: 100000, packPrice: 15, unitLabel: '100k req/mo', notes: 'Usage overage pack' },
  { id: 'ao_seats', name: 'Extra seat', kind: 'capacity', capacityKey: 'seats', unitPrice: 15, packSize: 100, packPrice: 1000, unitLabel: 'seat/mo', notes: 'Discounted 100-seat pack' },
  { id: 'ao_apps', name: 'Extra app / workflow', kind: 'capacity', capacityKey: 'apps', unitPrice: 25, packSize: 5, packPrice: 100, unitLabel: 'app/mo', notes: 'Discounted 5-app pack' },
  { id: 'ao_packs', name: 'Extra policy pack', kind: 'capacity', capacityKey: 'packs', unitPrice: 50, packSize: 5, packPrice: 200, unitLabel: 'pack/mo', notes: 'Discounted 5-pack bundle' },
  { id: 'ao_primitives', name: 'Extra primitive', kind: 'capacity', capacityKey: 'primitives', unitPrice: 10, packSize: 10, packPrice: 75, unitLabel: 'primitive/mo', notes: 'Discounted 10-primitive bundle' },
  { id: 'ao_prompt', name: 'Extra prompt storage', kind: 'capacity', capacityKey: 'promptGb', unitPrice: 2, packSize: 100, packPrice: 150, unitLabel: 'GB/mo', notes: 'Discounted 100GB storage pack' },
  { id: 'ao_log', name: 'Extra log storage', kind: 'capacity', capacityKey: 'logGb', unitPrice: 3, packSize: 100, packPrice: 250, unitLabel: 'GB/mo', notes: 'Discounted 100GB log storage pack' },
  { id: 'ao_immutable', name: 'Immutable logs', kind: 'feature', unitPrice: 100, packSize: 1, packPrice: 100, unitLabel: 'workspace/mo', notes: 'Included in Business+' },
  { id: 'ao_reporting', name: 'Advanced reporting', kind: 'feature', unitPrice: 150, packSize: 1, packPrice: 150, unitLabel: 'workspace/mo', notes: 'Included in Business+' },
  { id: 'ao_hitl', name: 'HITL', kind: 'feature', unitPrice: 99, packSize: 1, packPrice: 99, unitLabel: 'workspace/mo', notes: 'Included in Team+' },
]

export const defaultDiscounts: Discounts = {
  quarterly: 0.05, annual: 0.17, term24: 0.2, term36: 0.25, premiumSupport: 0.15, managedLlmFee: 0.05, byokMarkup: 0,
}

/* ------------------------------------------------------------------ */
/* Persistence                                                          */
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

export const loadPlans = (): Plan[] => load('plcy_plans', clonePlans())
export const savePlans = (v: Plan[]) => save('plcy_plans', v)
export const loadAddOns = (): AddOn[] => load('plcy_addons', cloneAddOns())
export const saveAddOns = (v: AddOn[]) => save('plcy_addons', v)
export const loadDiscounts = (): Discounts => load('plcy_discounts', { ...defaultDiscounts })
export const saveDiscounts = (v: Discounts) => save('plcy_discounts', v)

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
  immutableLogs: boolean
  advancedReporting: boolean
  hitl: boolean
  premiumSupport: boolean
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

/** Cheapest way to buy `extra` units: individual vs whole packs. */
function overageCost(extra: number, a: AddOn): { cost: number; basis: string } {
  if (extra <= 0) return { cost: 0, basis: 'within plan' }
  const packs = Math.ceil(extra / a.packSize)
  const packCost = packs * a.packPrice
  const individual = a.unitPrice != null ? extra * a.unitPrice : Infinity
  if (packCost <= individual) return { cost: packCost, basis: `${packs} × ${a.unitLabel} pack` }
  return { cost: individual, basis: `${extra} × ${a.unitLabel}` }
}

const isIncluded = (v: string) => v === 'Included' || v === 'Standard'

export function computeQuote(input: QuoteInput, plans: Plan[], addOns: AddOn[], discounts: Discounts): Quote {
  const plan = plans.find((p) => p.id === input.planId) ?? null
  const lines: QuoteLine[] = []
  if (!plan) {
    return { plan: null, lines, grossMonthly: 0, billingDiscount: 0, termDiscount: 0, commercialDiscount: 0, netMonthly: 0, annualAcv: 0, oneTime: 0, firstYear: 0, effPerSeat: 0 }
  }

  lines.push({ label: `${plan.name} plan`, basis: 'base subscription', monthly: plan.monthly, notes: 'Recurring platform fee' })

  // Capacity overages
  for (const a of addOns) {
    if (a.kind !== 'capacity' || !a.capacityKey) continue
    const need = input.demand[a.capacityKey]
    const included = plan.capacity[a.capacityKey]
    const extra = Math.max(0, need - included)
    if (extra > 0) {
      const { cost, basis } = overageCost(extra, a)
      lines.push({ label: a.name, basis, monthly: cost, notes: a.notes })
    }
  }

  // Feature add-ons (only charged when required and not already included)
  const featureReq: { on: boolean; feat: keyof PlanFeatures; addon: string }[] = [
    { on: input.immutableLogs, feat: 'immutableLogs', addon: 'ao_immutable' },
    { on: input.advancedReporting, feat: 'advancedReporting', addon: 'ao_reporting' },
    { on: input.hitl, feat: 'hitl', addon: 'ao_hitl' },
  ]
  for (const fr of featureReq) {
    if (!fr.on) continue
    if (isIncluded(plan.features[fr.feat])) {
      lines.push({ label: addOns.find((a) => a.id === fr.addon)?.name ?? fr.addon, basis: 'included in plan', monthly: 0, notes: 'No charge — bundled' })
    } else {
      const a = addOns.find((x) => x.id === fr.addon)
      if (a) lines.push({ label: a.name, basis: a.unitLabel, monthly: a.packPrice, notes: a.notes })
    }
  }

  // Model access — PLCY-managed LLM credits + service fee
  if (input.modelAccess === 'Managed' && input.managedCreditsMonthly > 0) {
    const fee = input.managedCreditsMonthly * discounts.managedLlmFee
    lines.push({ label: 'PLCY-managed LLM', basis: `${money(input.managedCreditsMonthly)} credits + ${pct(discounts.managedLlmFee)} fee`, monthly: input.managedCreditsMonthly + fee, notes: 'Optional convenience layer; BYOK is default' })
  }

  // Premium support — % of the recurring subtotal so far
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
