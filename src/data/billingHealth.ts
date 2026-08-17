/**
 * Billing health — the operational monitoring view over Stripe. Surfaces the
 * things that quietly cost revenue: the dunning queue (failed recurring charges
 * being retried), recent failed payments, open disputes/chargebacks, and drift
 * between Stripe and the local view. Derived from subscriptions + invoices so it
 * stays consistent with the rest of the console.
 */
import { subscriptions, subscriptionByCustomer } from '@/data/subscriptions'
import { invoices } from '@/data/billing'

export type DunningStage = 'Retrying' | 'Final notice' | 'Uncollectible'
export interface DunningEntry {
  id: string
  customer: string
  invoiceId: string
  amount: number
  attempts: number
  maxAttempts: number
  nextRetry: string
  lastError: string
  stage: DunningStage
  collection: 'charge_automatically' | 'send_invoice'
}

export interface FailedPayment {
  id: string
  customer: string
  amount: number
  reason: string
  method: string
  time: string
}

export type DisputeStatus = 'Needs response' | 'Under review' | 'Won' | 'Lost'
export interface Dispute {
  id: string
  customer: string
  amount: number
  reason: string
  status: DisputeStatus
  evidenceDue: string
}

export type DriftSeverity = 'high' | 'medium' | 'low'
export interface SyncIssue {
  id: string
  customer: string
  kind: string
  detail: string
  severity: DriftSeverity
}

const DECLINE_REASONS = ['insufficient_funds', 'card_expired', 'do_not_honor', 'processor_declined']

/** Dunning queue: every past-due invoice with a retry schedule. */
export const dunningQueue: DunningEntry[] = invoices
  .filter((i) => i.status === 'Past due')
  .map((i, idx) => {
    const sub = subscriptionByCustomer(i.customer)
    const attempts = 2 + (idx % 3)
    const maxAttempts = 4
    const stage: DunningStage = attempts >= maxAttempts ? 'Uncollectible' : attempts >= 3 ? 'Final notice' : 'Retrying'
    return {
      id: `dun_${i.id}`,
      customer: i.customer,
      invoiceId: i.id,
      amount: i.amount,
      attempts,
      maxAttempts,
      nextRetry: stage === 'Uncollectible' ? '—' : `2026-07-${String(13 + idx).padStart(2, '0')} 08:00 UTC`,
      lastError: DECLINE_REASONS[idx % DECLINE_REASONS.length],
      stage,
      collection: sub?.collection ?? 'charge_automatically',
    }
  })

export const failedPayments: FailedPayment[] = [
  { id: 'ch_f1', customer: 'Northwind Retail', amount: 14840, reason: 'insufficient_funds', method: '•••• 1188', time: '2 h ago' },
  { id: 'ch_f2', customer: 'Orbit Telecom', amount: 12000, reason: 'do_not_honor', method: '•••• 4417', time: '9 h ago' },
  { id: 'ch_f3', customer: 'Saffron Foods', amount: 0, reason: 'card_expired', method: '•••• 0002', time: '1 d ago' },
]

export const disputes: Dispute[] = [
  { id: 'dp_1', customer: 'Lumen Media', amount: 4900, reason: 'product_not_received', status: 'Needs response', evidenceDue: '2026-07-18' },
  { id: 'dp_2', customer: 'Atlas Logistics', amount: 1180, reason: 'duplicate', status: 'Under review', evidenceDue: '2026-07-22' },
]

export const syncIssues: SyncIssue[] = [
  { id: 'sy_1', customer: 'Vertex Capital', kind: 'MRR mismatch', detail: 'Local $33.0k vs Stripe subscription $31.5k — proration not applied locally.', severity: 'medium' },
  { id: 'sy_2', customer: 'Orbit Telecom', kind: 'Status drift', detail: 'Subscription is past_due in Stripe but marked Suspended locally.', severity: 'high' },
  { id: 'sy_3', customer: 'Saffron Foods', kind: 'Trial ending', detail: 'Stripe trial ends in 3 days with no default payment method on file.', severity: 'low' },
]

export const dunningStageTone: Record<DunningStage, 'orange' | 'red' | 'slate'> = {
  Retrying: 'orange',
  'Final notice': 'red',
  Uncollectible: 'slate',
}
export const disputeTone: Record<DisputeStatus, 'red' | 'orange' | 'green' | 'slate'> = {
  'Needs response': 'red',
  'Under review': 'orange',
  Won: 'green',
  Lost: 'slate',
}
export const driftTone: Record<DriftSeverity, 'red' | 'orange' | 'yellow'> = { high: 'red', medium: 'orange', low: 'yellow' }

export const billingHealthTotals = {
  dunningAmount: dunningQueue.reduce((s, d) => s + d.amount, 0),
  dunningCount: dunningQueue.length,
  failedCount: failedPayments.length,
  disputeAmount: disputes.reduce((s, d) => s + d.amount, 0),
  disputeCount: disputes.length,
  disputesNeedingResponse: disputes.filter((d) => d.status === 'Needs response').length,
  syncIssueCount: syncIssues.length,
  canceledMrr: subscriptions.filter((s) => s.status === 'canceled').reduce((s, x) => s + x.mrr, 0),
}
