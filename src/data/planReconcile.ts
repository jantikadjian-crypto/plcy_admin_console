/**
 * Reconciles the pricing catalog (Free / Builder / Team / Business / Enterprise
 * Cloud) with the customer base, which still carries the older plan labels
 * (Enterprise / Business / Growth / Trial). Provides the mapping, a per-customer
 * catalog-plan lookup, and per-plan rollups (customer count + MRR) so the catalog
 * connects to real accounts and Stripe subscription revenue.
 */
import { customers } from '@/data/mock'
import { subscriptions } from '@/data/subscriptions'
import type { Plan } from '@/data/pricing'

/** Legacy customer plan label → catalog plan id. */
export const PLAN_LABEL_TO_ID: Record<string, string> = {
  Enterprise: 'plan_enterprise',
  Business: 'plan_business',
  Growth: 'plan_team',
  Trial: 'plan_builder',
}

export const catalogPlanIdFor = (customerPlan: string): string => PLAN_LABEL_TO_ID[customerPlan] ?? 'plan_free'
export const catalogPlanFor = (customerPlan: string, plans: Plan[]): Plan | undefined =>
  plans.find((p) => p.id === catalogPlanIdFor(customerPlan))

export interface PlanRollup { count: number; mrr: number; customers: string[] }

/** For each catalog plan, the customers mapped to it and their recurring revenue. */
export function planRollups(plans: Plan[]): Record<string, PlanRollup> {
  const map: Record<string, PlanRollup> = {}
  plans.forEach((p) => { map[p.id] = { count: 0, mrr: 0, customers: [] } })
  customers.forEach((c) => {
    const pid = catalogPlanIdFor(c.plan)
    if (!map[pid]) map[pid] = { count: 0, mrr: 0, customers: [] }
    const sub = subscriptions.find((s) => s.customer === c.name)
    const counts = !sub || sub.status === 'active' || sub.status === 'trialing'
    map[pid].count += 1
    map[pid].customers.push(c.name)
    map[pid].mrr += counts ? (sub?.mrr ?? c.mrr ?? 0) : 0
  })
  return map
}

export const reconcileTotals = () => ({
  customers: customers.length,
  mrr: subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing').reduce((sum, s) => sum + s.mrr, 0),
})
