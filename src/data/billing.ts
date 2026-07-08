/**
 * Per-customer usage metering and invoicing across the fleet.
 *
 * Each single-tenant customer meters consumption against plan-included volumes
 * (evaluations, seats, storage, compute-hours); overage bills at the plan rate.
 * Invoices track the billing lifecycle.
 */

export type Plan = 'Enterprise' | 'Business' | 'Growth' | 'Trial'
export type BillingStatus = 'Current' | 'Past due' | 'Trial'

export interface UsageMeter {
  label: string
  used: number
  included: number
  unit: string
}

export interface CustomerBilling {
  customer: string
  region: string
  plan: Plan
  mrr: number
  status: BillingStatus
  nextInvoice: string
  overage: number
  meters: UsageMeter[]
}

export const customerBilling: CustomerBilling[] = [
  {
    customer: 'Meridian Bank', region: 'us-east-1', plan: 'Enterprise', mrr: 42000, status: 'Current', nextInvoice: '2026-08-01', overage: 2400,
    meters: [
      { label: 'API evaluations', used: 10.4e6, included: 12e6, unit: '' },
      { label: 'Seats', used: 240, included: 300, unit: '' },
      { label: 'Storage', used: 820, included: 1024, unit: 'GB' },
      { label: 'Compute', used: 3100, included: 3600, unit: 'GPU-h' },
    ],
  },
  {
    customer: 'Helix Health', region: 'de-sov-1', plan: 'Enterprise', mrr: 38500, status: 'Current', nextInvoice: '2026-08-01', overage: 0,
    meters: [
      { label: 'API evaluations', used: 7.1e6, included: 10e6, unit: '' },
      { label: 'Seats', used: 180, included: 200, unit: '' },
      { label: 'Storage', used: 610, included: 1024, unit: 'GB' },
      { label: 'Compute', used: 1800, included: 2400, unit: 'GPU-h' },
    ],
  },
  {
    customer: 'Vertex Capital', region: 'ap-southeast-1', plan: 'Enterprise', mrr: 33000, status: 'Current', nextInvoice: '2026-08-01', overage: 1150,
    meters: [
      { label: 'API evaluations', used: 6.6e6, included: 8e6, unit: '' },
      { label: 'Seats', used: 150, included: 180, unit: '' },
      { label: 'Storage', used: 540, included: 768, unit: 'GB' },
      { label: 'Compute', used: 2050, included: 2000, unit: 'GPU-h' },
    ],
  },
  {
    customer: 'Pinecrest Insurance', region: 'us-east-1', plan: 'Business', mrr: 16400, status: 'Current', nextInvoice: '2026-08-01', overage: 0,
    meters: [
      { label: 'API evaluations', used: 3.2e6, included: 5e6, unit: '' },
      { label: 'Seats', used: 110, included: 140, unit: '' },
      { label: 'Storage', used: 280, included: 512, unit: 'GB' },
      { label: 'Compute', used: 720, included: 1200, unit: 'GPU-h' },
    ],
  },
  {
    customer: 'Northwind Retail', region: 'eu-central-1', plan: 'Business', mrr: 14200, status: 'Past due', nextInvoice: '2026-07-01', overage: 640,
    meters: [
      { label: 'API evaluations', used: 4.9e6, included: 5e6, unit: '' },
      { label: 'Seats', used: 96, included: 120, unit: '' },
      { label: 'Storage', used: 410, included: 512, unit: 'GB' },
      { label: 'Compute', used: 1080, included: 1200, unit: 'GPU-h' },
    ],
  },
  {
    customer: 'Atlas Logistics', region: 'us-east-1', plan: 'Business', mrr: 11800, status: 'Current', nextInvoice: '2026-08-01', overage: 0,
    meters: [
      { label: 'API evaluations', used: 2.1e6, included: 5e6, unit: '' },
      { label: 'Seats', used: 64, included: 80, unit: '' },
      { label: 'Storage', used: 190, included: 512, unit: 'GB' },
      { label: 'Compute', used: 540, included: 1200, unit: 'GPU-h' },
    ],
  },
  {
    customer: 'Lumen Media', region: 'us-west-2', plan: 'Growth', mrr: 4900, status: 'Current', nextInvoice: '2026-08-01', overage: 0,
    meters: [
      { label: 'API evaluations', used: 1.1e6, included: 2e6, unit: '' },
      { label: 'Seats', used: 32, included: 40, unit: '' },
      { label: 'Storage', used: 88, included: 256, unit: 'GB' },
      { label: 'Compute', used: 160, included: 600, unit: 'GPU-h' },
    ],
  },
  {
    customer: 'Ferro Manufacturing', region: 'de-sov-1', plan: 'Growth', mrr: 4200, status: 'Current', nextInvoice: '2026-08-01', overage: 0,
    meters: [
      { label: 'API evaluations', used: 0.9e6, included: 2e6, unit: '' },
      { label: 'Seats', used: 28, included: 40, unit: '' },
      { label: 'Storage', used: 72, included: 256, unit: 'GB' },
      { label: 'Compute', used: 140, included: 600, unit: 'GPU-h' },
    ],
  },
  {
    customer: 'Saffron Foods', region: 'eu-west-1', plan: 'Trial', mrr: 0, status: 'Trial', nextInvoice: '—', overage: 0,
    meters: [
      { label: 'API evaluations', used: 0.2e6, included: 0.5e6, unit: '' },
      { label: 'Seats', used: 12, included: 20, unit: '' },
      { label: 'Storage', used: 18, included: 128, unit: 'GB' },
      { label: 'Compute', used: 30, included: 200, unit: 'GPU-h' },
    ],
  },
  {
    customer: 'Orbit Telecom', region: 'ap-southeast-1', plan: 'Business', mrr: 0, status: 'Past due', nextInvoice: '2026-07-01', overage: 0,
    meters: [
      { label: 'API evaluations', used: 0, included: 5e6, unit: '' },
      { label: 'Seats', used: 80, included: 100, unit: '' },
      { label: 'Storage', used: 300, included: 512, unit: 'GB' },
      { label: 'Compute', used: 0, included: 1200, unit: 'GPU-h' },
    ],
  },
]

export const billingByCustomer = (customer: string) => customerBilling.find((b) => b.customer === customer)

/* ------------------------------------------------------------------ */
/* Payment methods (masked — last 4 only)                              */
/* ------------------------------------------------------------------ */
export type PaymentType = 'Card' | 'Bank' | 'Wire' | 'Invoice'
export type PaymentStatus = 'Active' | 'Expiring' | 'Expired'

export interface PaymentMethod {
  id: string
  type: PaymentType
  /** Card network (Visa/Mastercard/Amex) or bank name. */
  brand: string
  /** Last 4 of the card or account number. */
  last4?: string
  /** Card expiry MM/YY. */
  exp?: string
  /** Bank account type / billing terms. */
  detail?: string
  isDefault: boolean
  status: PaymentStatus
}

/** Masked payment methods on file, keyed by customer. */
export const paymentMethods: Record<string, PaymentMethod[]> = {
  'Meridian Bank': [
    { id: 'pm_mrd_1', type: 'Bank', brand: 'JPMorgan Chase', last4: '6521', detail: 'ACH · Checking', isDefault: true, status: 'Active' },
    { id: 'pm_mrd_2', type: 'Card', brand: 'Visa', last4: '4242', exp: '08/27', detail: 'Backup', isDefault: false, status: 'Active' },
  ],
  'Helix Health': [
    { id: 'pm_hlx_1', type: 'Wire', brand: 'Wire transfer', detail: 'Net 30 · annual', isDefault: true, status: 'Active' },
  ],
  'Vertex Capital': [
    { id: 'pm_vtx_1', type: 'Bank', brand: 'Citibank', last4: '9014', detail: 'ACH · Checking', isDefault: true, status: 'Active' },
  ],
  'Pinecrest Insurance': [
    { id: 'pm_pin_1', type: 'Card', brand: 'Mastercard', last4: '5309', exp: '03/28', isDefault: true, status: 'Active' },
  ],
  'Northwind Retail': [
    { id: 'pm_nw_1', type: 'Card', brand: 'Visa', last4: '1188', exp: '07/26', isDefault: true, status: 'Expiring' },
  ],
  'Atlas Logistics': [
    { id: 'pm_atl_1', type: 'Card', brand: 'Amex', last4: '2003', exp: '11/27', isDefault: true, status: 'Active' },
  ],
  'Lumen Media': [
    { id: 'pm_lum_1', type: 'Card', brand: 'Visa', last4: '7788', exp: '05/28', isDefault: true, status: 'Active' },
  ],
  'Ferro Manufacturing': [
    { id: 'pm_fer_1', type: 'Invoice', brand: 'Invoice', detail: 'Net 45 · PO required', isDefault: true, status: 'Active' },
  ],
  'Saffron Foods': [
    { id: 'pm_saf_1', type: 'Card', brand: 'Visa', last4: '0002', exp: '09/26', detail: 'Trial', isDefault: true, status: 'Active' },
  ],
  'Orbit Telecom': [
    { id: 'pm_orb_1', type: 'Card', brand: 'Mastercard', last4: '4417', exp: '06/26', isDefault: true, status: 'Expired' },
  ],
}

export const paymentByCustomer = (customer: string): PaymentMethod[] => paymentMethods[customer] ?? []

export type InvoiceStatus = 'Paid' | 'Open' | 'Past due' | 'Draft'

export interface Invoice {
  id: string
  customer: string
  period: string
  amount: number
  status: InvoiceStatus
  issued: string
  due: string
}

export const invoices: Invoice[] = [
  { id: 'INV-2026-0712', customer: 'Meridian Bank', period: 'Jul 2026', amount: 44400, status: 'Open', issued: '2026-07-01', due: '2026-07-31' },
  { id: 'INV-2026-0711', customer: 'Helix Health', period: 'Jul 2026', amount: 38500, status: 'Open', issued: '2026-07-01', due: '2026-07-31' },
  { id: 'INV-2026-0710', customer: 'Vertex Capital', period: 'Jul 2026', amount: 34150, status: 'Open', issued: '2026-07-01', due: '2026-07-31' },
  { id: 'INV-2026-0709', customer: 'Northwind Retail', period: 'Jun 2026', amount: 14840, status: 'Past due', issued: '2026-06-01', due: '2026-06-30' },
  { id: 'INV-2026-0708', customer: 'Orbit Telecom', period: 'Jun 2026', amount: 12000, status: 'Past due', issued: '2026-06-01', due: '2026-06-30' },
  { id: 'INV-2026-0707', customer: 'Pinecrest Insurance', period: 'Jul 2026', amount: 16400, status: 'Open', issued: '2026-07-01', due: '2026-07-31' },
  { id: 'INV-2026-0706', customer: 'Atlas Logistics', period: 'Jun 2026', amount: 11800, status: 'Paid', issued: '2026-06-01', due: '2026-06-30' },
  { id: 'INV-2026-0705', customer: 'Meridian Bank', period: 'Jun 2026', amount: 42000, status: 'Paid', issued: '2026-06-01', due: '2026-06-30' },
  { id: 'INV-2026-0704', customer: 'Lumen Media', period: 'Jul 2026', amount: 4900, status: 'Draft', issued: '2026-07-01', due: '2026-07-31' },
  { id: 'INV-2026-0703', customer: 'Helix Health', period: 'Jun 2026', amount: 38500, status: 'Paid', issued: '2026-06-01', due: '2026-06-30' },
]

const activeMrr = customerBilling.reduce((s, b) => s + b.mrr, 0)

export const billingTotals = {
  mrr: activeMrr,
  arr: activeMrr * 12,
  overageThisCycle: customerBilling.reduce((s, b) => s + b.overage, 0),
  openInvoices: invoices.filter((i) => i.status === 'Open').reduce((s, i) => s + i.amount, 0),
  pastDue: invoices.filter((i) => i.status === 'Past due').reduce((s, i) => s + i.amount, 0),
  pastDueCount: invoices.filter((i) => i.status === 'Past due').length,
}
