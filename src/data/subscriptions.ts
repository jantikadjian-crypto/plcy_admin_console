/**
 * Stripe subscription view of each customer. PLCY runs two collection motions:
 * SaaS tiers charge automatically off a card; Enterprise accounts are billed by
 * sent invoice on net terms. This module derives a subscription record per
 * customer from the customer + billing data so the console can show Stripe-native
 * state (subscription status, collection method, current period) without a live
 * Stripe call.
 */
import { customers } from '@/data/mock'
import { billingByCustomer } from '@/data/billing'
import { priceMappingsSeed, collectionLabel } from '@/data/stripe'
import type { CollectionMethod } from '@/data/stripe'

export type SubStatus = 'active' | 'trialing' | 'past_due' | 'unpaid' | 'canceled'

export interface Subscription {
  customer: string
  stripeCustomerId: string
  subscriptionId: string
  status: SubStatus
  collection: CollectionMethod
  plan: string
  priceId: string
  mrr: number
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  poNumber?: string
  netTermsDays?: number
}

export const subStatusTone: Record<SubStatus, 'green' | 'blue' | 'red' | 'orange' | 'slate'> = {
  active: 'green',
  trialing: 'blue',
  past_due: 'red',
  unpaid: 'orange',
  canceled: 'slate',
}
export const subStatusLabel: Record<SubStatus, string> = {
  active: 'Active',
  trialing: 'Trialing',
  past_due: 'Past due',
  unpaid: 'Unpaid',
  canceled: 'Canceled',
}
export { collectionLabel }

const PLAN_KEY: Record<string, string> = { Enterprise: 'plan_enterprise', Business: 'plan_business', Growth: 'plan_growth', Trial: 'plan_trial' }

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12)
}
function hash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0).toString(36).slice(0, 6)
}

/** Map a customer's account state to a Stripe subscription status. */
function statusFor(custStatus: string, billingStatus?: string): SubStatus {
  if (custStatus === 'Churned') return 'canceled'
  if (custStatus === 'Suspended') return 'unpaid'
  if (custStatus === 'Trial' || billingStatus === 'Trial') return 'trialing'
  if (billingStatus === 'Past due') return 'past_due'
  return 'active'
}

export const subscriptions: Subscription[] = customers.map((c) => {
  const billing = billingByCustomer(c.name)
  const collection: CollectionMethod = c.plan === 'Enterprise' ? 'send_invoice' : 'charge_automatically'
  const mapping = priceMappingsSeed.find((m) => m.key === PLAN_KEY[c.plan])
  const status = statusFor(c.status, billing?.status)
  return {
    customer: c.name,
    stripeCustomerId: `cus_${slug(c.name)}${hash(c.name)}`,
    subscriptionId: `sub_${hash(c.name + c.id)}${slug(c.name).slice(0, 6)}`,
    status,
    collection,
    plan: c.plan,
    priceId: mapping?.priceId ?? 'price_unmapped',
    mrr: c.mrr,
    currentPeriodStart: '2026-07-01',
    currentPeriodEnd: billing?.nextInvoice && billing.nextInvoice !== '—' ? billing.nextInvoice : '2026-08-01',
    cancelAtPeriodEnd: c.status === 'Churned',
    poNumber: collection === 'send_invoice' ? `PO-2026-${hash(c.name).toUpperCase()}` : undefined,
    netTermsDays: collection === 'send_invoice' ? 30 : undefined,
  }
})

export const subscriptionByCustomer = (name: string) => subscriptions.find((s) => s.customer === name)

export const subscriptionTotals = {
  active: subscriptions.filter((s) => s.status === 'active').length,
  trialing: subscriptions.filter((s) => s.status === 'trialing').length,
  pastDue: subscriptions.filter((s) => s.status === 'past_due' || s.status === 'unpaid').length,
  autoCharge: subscriptions.filter((s) => s.collection === 'charge_automatically').length,
  sendInvoice: subscriptions.filter((s) => s.collection === 'send_invoice').length,
  mrr: subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing').reduce((sum, s) => sum + s.mrr, 0),
}
