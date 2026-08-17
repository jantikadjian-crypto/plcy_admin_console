/**
 * Stripe integration model for the admin portal. PLCY charges SaaS tiers via
 * usage-metered subscriptions (charge automatically) and enterprise accounts via
 * send-invoice collection (net terms, ACH/wire). This module holds the seed
 * configuration; the editable/persisted layer lives in context/Stripe.tsx.
 *
 * SECURITY: a live secret key never lives in the front-end or a repo — in
 * production it stays server-side and the console only shows connection status
 * plus a masked last-4. The values here are test-mode placeholders.
 */

export type StripeMode = 'test' | 'live'
export type CollectionMethod = 'charge_automatically' | 'send_invoice'
export type PriceModel = 'flat' | 'metered'

export interface StripeConfig {
  connected: boolean
  mode: StripeMode
  accountId: string
  publishableKey: string
  secretKeyLast4: string
  statementDescriptor: string
  defaultCurrency: string
  netTermsDays: number
  taxEnabled: boolean
  invoiceFooter: string
  /** Smart Retries / dunning */
  retriesEnabled: boolean
  maxRetries: number
}

export interface WebhookConfig {
  endpoint: string
  signingSecretLast4: string
  events: string[]
}

export type DeliveryStatus = 'Delivered' | 'Failed' | 'Pending'
export interface WebhookDelivery {
  id: string
  event: string
  status: DeliveryStatus
  time: string
  attempts: number
}

/** Maps a PLCY plan or usage meter to its Stripe product/price. */
export interface PriceMapping {
  key: string
  label: string
  kind: 'Plan' | 'Meter'
  productId: string
  priceId: string
  model: PriceModel
  amount: string
  interval: string
  collection: CollectionMethod
}

export const stripeConfigSeed: StripeConfig = {
  connected: true,
  mode: 'test',
  accountId: 'acct_1PLCYgov3rnAnce',
  publishableKey: 'pk_test_51PLCY••••••••••••••••3xQ 2',
  secretKeyLast4: '9f2c',
  statementDescriptor: 'PLCY GOVERNANCE',
  defaultCurrency: 'USD',
  netTermsDays: 30,
  taxEnabled: true,
  invoiceFooter: 'PLCY Inc · Thank you for your business. Questions? billing@plcy.app',
  retriesEnabled: true,
  maxRetries: 4,
}

export const webhookSeed: WebhookConfig = {
  endpoint: 'https://api.plcy.app/webhooks/stripe',
  signingSecretLast4: 'a71b',
  events: [
    'invoice.paid',
    'invoice.payment_failed',
    'invoice.finalized',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'charge.dispute.created',
    'checkout.session.completed',
  ],
}

export const webhookDeliveriesSeed: WebhookDelivery[] = [
  { id: 'evt_1a', event: 'invoice.paid', status: 'Delivered', time: '3 min ago', attempts: 1 },
  { id: 'evt_2b', event: 'customer.subscription.updated', status: 'Delivered', time: '18 min ago', attempts: 1 },
  { id: 'evt_3c', event: 'invoice.payment_failed', status: 'Delivered', time: '42 min ago', attempts: 1 },
  { id: 'evt_4d', event: 'invoice.finalized', status: 'Delivered', time: '1 h ago', attempts: 1 },
  { id: 'evt_5e', event: 'charge.dispute.created', status: 'Failed', time: '2 h ago', attempts: 3 },
  { id: 'evt_6f', event: 'invoice.paid', status: 'Delivered', time: '3 h ago', attempts: 1 },
]

export const priceMappingsSeed: PriceMapping[] = [
  { key: 'plan_enterprise', label: 'Enterprise', kind: 'Plan', productId: 'prod_ENT', priceId: 'price_1Ent0flat', model: 'flat', amount: 'Custom / contract', interval: 'year', collection: 'send_invoice' },
  { key: 'plan_business', label: 'Business', kind: 'Plan', productId: 'prod_BIZ', priceId: 'price_1Biz0flat', model: 'flat', amount: '$1,500', interval: 'month', collection: 'charge_automatically' },
  { key: 'plan_growth', label: 'Growth', kind: 'Plan', productId: 'prod_GRW', priceId: 'price_1Grw0flat', model: 'flat', amount: '$500', interval: 'month', collection: 'charge_automatically' },
  { key: 'plan_trial', label: 'Trial', kind: 'Plan', productId: 'prod_TRL', priceId: 'price_1Trl0free', model: 'flat', amount: '$0', interval: 'month', collection: 'charge_automatically' },
  { key: 'meter_evals', label: 'API evaluations', kind: 'Meter', productId: 'prod_USG', priceId: 'price_1Usg0eval', model: 'metered', amount: '$0.002 / eval', interval: 'month', collection: 'charge_automatically' },
  { key: 'meter_seats', label: 'Seats', kind: 'Meter', productId: 'prod_SEAT', priceId: 'price_1Usg0seat', model: 'metered', amount: '$18 / seat', interval: 'month', collection: 'charge_automatically' },
  { key: 'meter_storage', label: 'Storage (GB)', kind: 'Meter', productId: 'prod_STOR', priceId: 'price_1Usg0stor', model: 'metered', amount: '$0.12 / GB', interval: 'month', collection: 'charge_automatically' },
]

export const AVAILABLE_EVENTS = [
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.finalized',
  'invoice.voided',
  'customer.created',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.dispute.created',
  'checkout.session.completed',
  'payment_intent.succeeded',
]

export const collectionLabel: Record<CollectionMethod, string> = {
  charge_automatically: 'Charge automatically',
  send_invoice: 'Send invoice',
}
