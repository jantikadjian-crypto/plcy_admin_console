import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleDollarSign,
  TrendingUp,
  Wallet,
  AlertCircle,
  Receipt,
  FilePlus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Progress, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useCustomerScope } from '@/context/CustomerScope'
import {
  customerBilling,
  billingByCustomer,
  invoices as seedInvoices,
  billingTotals,
} from '@/data/billing'
import type { Plan, BillingStatus, UsageMeter, Invoice, InvoiceStatus, CustomerBilling } from '@/data/billing'

/* ------------------------------------------------------------------ */
/* Tone maps                                                           */
/* ------------------------------------------------------------------ */
const planTone: Record<Plan, 'purple' | 'blue' | 'green' | 'slate'> = {
  Enterprise: 'purple',
  Business: 'blue',
  Growth: 'green',
  Trial: 'slate',
}

const statusToneMap: Record<BillingStatus, 'green' | 'red' | 'slate'> = {
  Current: 'green',
  'Past due': 'red',
  Trial: 'slate',
}

const invoiceTone: Record<InvoiceStatus, 'green' | 'blue' | 'red' | 'slate'> = {
  Paid: 'green',
  Open: 'blue',
  'Past due': 'red',
  Draft: 'slate',
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */
function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1)}K`
  return `${n}`
}

/** Counts (unit '') format compact; GB / GPU-h append the unit. */
function fmtMeter(value: number, unit: string): string {
  return unit === '' ? compact(value) : `${value.toLocaleString()} ${unit}`
}

function meterTone(pct: number): 'red' | 'orange' | 'blue' {
  if (pct >= 100) return 'red'
  if (pct >= 85) return 'orange'
  return 'blue'
}

const money = (n: number) => `$${n.toLocaleString()}`

/* ------------------------------------------------------------------ */
/* Meter row                                                           */
/* ------------------------------------------------------------------ */
function MeterBar({ meter }: { meter: UsageMeter }) {
  const pct = (meter.used / meter.included) * 100
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink-700">{meter.label}</span>
        <span className="whitespace-nowrap font-mono text-xs text-ink-500">
          {fmtMeter(meter.used, meter.unit)}
          <span className="mx-1 text-ink-400">/</span>
          {fmtMeter(meter.included, meter.unit)}
          {pct >= 100 && <span className="ml-1.5 font-sans font-semibold text-rose-600">over</span>}
        </span>
      </div>
      <Progress value={pct} tone={meterTone(pct)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */
function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPage,
}: {
  page: number
  pageCount: number
  total: number
  from: number
  to: number
  onPage: (p: number) => void
}) {
  if (total === 0) return null
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
      <p className="text-xs text-ink-500">
        Showing <span className="font-medium text-ink-700">{from}</span>–<span className="font-medium text-ink-700">{to}</span> of{' '}
        <span className="font-medium text-ink-700">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          className="btn-ghost px-2 py-1 text-xs disabled:opacity-40"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        <span className="px-2 text-xs font-medium text-ink-600">
          Page {page} of {pageCount}
        </span>
        <button
          className="btn-ghost px-2 py-1 text-xs disabled:opacity-40"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

const PAGE_SIZE = 6

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function Billing() {
  const { logAction } = useSession()
  const { scope, isAll } = useCustomerScope()

  const scopedCustomers = useMemo(
    () => (isAll ? customerBilling : customerBilling.filter((c) => c.customer === scope)),
    [isAll, scope],
  )
  const single = !isAll && scopedCustomers.length === 1

  /* Invoices are mutable locally (mark paid / issue). */
  const [invoiceList, setInvoiceList] = useState<Invoice[]>(seedInvoices)
  const scopedInvoices = useMemo(
    () => (isAll ? invoiceList : invoiceList.filter((i) => i.customer === scope)),
    [isAll, scope, invoiceList],
  )

  /* Pagination for the invoice line items. */
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [scope, isAll])
  const pageCount = Math.max(1, Math.ceil(scopedInvoices.length / PAGE_SIZE))
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])
  const pageRows = scopedInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const from = scopedInvoices.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, scopedInvoices.length)

  const markPaid = (inv: Invoice) => {
    setInvoiceList((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: 'Paid' } : i)))
    logAction({ action: 'invoice.mark-paid', target: inv.id, category: 'billing' })
  }

  /* Drill-down drawers. */
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null)
  const [detailCustomer, setDetailCustomer] = useState<CustomerBilling | null>(null)
  // Keep an open invoice drawer in sync when its status changes (mark paid).
  const liveInvoice = detailInvoice ? invoiceList.find((i) => i.id === detailInvoice.id) ?? detailInvoice : null

  /* Issue-invoice modal. */
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueCustomer, setIssueCustomer] = useState(customerBilling[0]?.customer ?? '')
  const [issuePeriod, setIssuePeriod] = useState('Jul 2026')
  const [issueAmount, setIssueAmount] = useState('')
  const issueCounter = useRef(1)

  const openIssue = (preset?: string) => {
    setIssueCustomer(preset ?? (!isAll ? scope : customerBilling[0]?.customer ?? ''))
    setIssuePeriod('Jul 2026')
    setIssueAmount('')
    setIssueOpen(true)
  }

  const submitIssue = () => {
    const amount = Number(issueAmount) || 0
    const id = `INV-NEW-${issueCounter.current++}`
    const newInvoice: Invoice = {
      id,
      customer: issueCustomer,
      period: issuePeriod,
      amount,
      status: 'Open',
      issued: '2026-07-08',
      due: '2026-08-07',
    }
    setInvoiceList((prev) => [newInvoice, ...prev])
    logAction({ action: 'invoice.issue', target: `${id} · ${issueCustomer}`, category: 'billing' })
    setIssueOpen(false)
  }

  return (
    <>
      <PageHeader
        title="Billing & Usage"
        description="Metered consumption and invoicing across single-tenant customers"
        actions={
          <GatedButton cap="license.manage" className="btn-primary" onClick={() => openIssue()}>
            <Receipt className="h-4 w-4" />
            Issue invoice
          </GatedButton>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR" value={money(billingTotals.mrr)} icon={CircleDollarSign} tone="blue" footer={`ARR ${money(billingTotals.arr)}`} />
        <StatCard label="Overage this cycle" value={money(billingTotals.overageThisCycle)} icon={TrendingUp} tone="orange" footer="Metered above plan" />
        <StatCard label="Open invoices" value={money(billingTotals.openInvoices)} icon={Wallet} tone="purple" footer="Awaiting payment" />
        <StatCard label="Past due" value={money(billingTotals.pastDue)} icon={AlertCircle} tone="red" footer={`${billingTotals.pastDueCount} invoices`} />
      </div>

      {/* Usage metering */}
      <Card className="mt-6">
        <CardTitle title="Usage by Customer" subtitle="Metered consumption against plan-included volumes · click a customer to drill down" />
        <div className="space-y-4">
          {scopedCustomers.map((c) => (
            <div
              key={c.customer}
              onClick={() => setDetailCustomer(c)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setDetailCustomer(c)}
              className="group cursor-pointer rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-300 hover:bg-slate-50/60"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">{c.customer}</span>
                  <span className="font-mono text-xs text-ink-400">{c.region}</span>
                  <Badge tone={planTone[c.plan]}>{c.plan}</Badge>
                  <Badge tone={statusToneMap[c.status]} dot>{c.status}</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {c.overage > 0 && (
                    <span className="font-medium text-orange-600">+{money(c.overage)} overage</span>
                  )}
                  <span className="font-semibold text-ink-900">{money(c.mrr)}/mo</span>
                  <ChevronRight className="h-4 w-4 text-ink-300 transition-colors group-hover:text-brand-500" />
                </div>
              </div>
              <div className={single ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : 'grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2'}>
                {c.meters.map((m) => (
                  <MeterBar key={m.label} meter={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Invoices */}
      <Card className="mt-6">
        <CardTitle title="Invoices" subtitle="Recent billing activity · click a row for details" />
        <Table columns={['Invoice', 'Customer', 'Period', 'Amount', 'Status', 'Due', '']}>
          {pageRows.map((inv) => {
            const actionable = inv.status === 'Open' || inv.status === 'Past due'
            return (
              <Tr key={inv.id} onClick={() => setDetailInvoice(inv)}>
                <Td className="font-mono text-xs text-ink-700">{inv.id}</Td>
                <Td className="font-medium text-ink-900">{inv.customer}</Td>
                <Td className="text-ink-700">{inv.period}</Td>
                <Td className="font-medium text-ink-900">{money(inv.amount)}</Td>
                <Td><Badge tone={invoiceTone[inv.status]} dot>{inv.status}</Badge></Td>
                <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{inv.due}</Td>
                <Td className="text-right">
                  {actionable && (
                    <GatedButton
                      cap="license.manage"
                      className="btn-secondary px-2.5 py-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        markPaid(inv)
                      }}
                    >
                      Mark paid
                    </GatedButton>
                  )}
                </Td>
              </Tr>
            )
          })}
        </Table>
        <Pagination page={page} pageCount={pageCount} total={scopedInvoices.length} from={from} to={to} onPage={setPage} />
      </Card>

      {/* Invoice detail drawer */}
      <InvoiceDrawer invoice={liveInvoice} onClose={() => setDetailInvoice(null)} onMarkPaid={markPaid} />

      {/* Customer billing drill-down */}
      <CustomerDrawer
        customer={detailCustomer}
        invoices={detailCustomer ? invoiceList.filter((i) => i.customer === detailCustomer.customer) : []}
        onClose={() => setDetailCustomer(null)}
        onOpenInvoice={(inv) => {
          setDetailCustomer(null)
          setDetailInvoice(inv)
        }}
        onIssue={(cust) => {
          setDetailCustomer(null)
          openIssue(cust)
        }}
      />

      {/* Issue-invoice modal */}
      <Modal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Issue invoice"
        subtitle="Create a new open invoice for a customer"
        maxWidth="max-w-lg"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setIssueOpen(false)}>
              Cancel
            </button>
            <GatedButton cap="license.manage" className="btn-primary" onClick={submitIssue}>
              <FilePlus className="h-4 w-4" />
              Issue
            </GatedButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Customer</label>
            <select className="input" value={issueCustomer} onChange={(e) => setIssueCustomer(e.target.value)}>
              {customerBilling.map((c) => (
                <option key={c.customer} value={c.customer}>{c.customer}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Period</label>
            <input className="input" value={issuePeriod} onChange={(e) => setIssuePeriod(e.target.value)} placeholder="Jul 2026" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Amount (USD)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={issueAmount}
              onChange={(e) => setIssueAmount(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Invoice detail drawer                                               */
/* ------------------------------------------------------------------ */
function InvoiceDrawer({
  invoice,
  onClose,
  onMarkPaid,
}: {
  invoice: Invoice | null
  onClose: () => void
  onMarkPaid: (inv: Invoice) => void
}) {
  if (!invoice) return null
  const cust = billingByCustomer(invoice.customer)
  const base = cust ? Math.min(cust.mrr, invoice.amount) : invoice.amount
  const overage = Math.max(0, invoice.amount - base)
  const lineItems = [
    { label: `${cust?.plan ?? 'Platform'} subscription`, detail: invoice.period, amount: base },
    ...(overage > 0 ? [{ label: 'Usage overage', detail: 'Metered above plan', amount: overage }] : []),
  ]
  const actionable = invoice.status === 'Open' || invoice.status === 'Past due'

  return (
    <Modal
      open
      onClose={onClose}
      title={invoice.id}
      subtitle={`${invoice.customer} · ${invoice.period}`}
      maxWidth="max-w-lg"
      headerRight={<Badge tone={invoiceTone[invoice.status]} dot>{invoice.status}</Badge>}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          {actionable && (
            <GatedButton cap="license.manage" className="btn-primary" onClick={() => onMarkPaid(invoice)}>
              Mark paid
            </GatedButton>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: 'Issued', v: invoice.issued },
            { k: 'Due', v: invoice.due },
            { k: 'Customer', v: invoice.customer },
          ].map((m) => (
            <div key={m.k} className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{m.k}</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink-900">{m.v}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink-900">Line items</p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {lineItems.map((li) => (
              <div key={li.label} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0">
                <div>
                  <p className="text-sm font-medium text-ink-800">{li.label}</p>
                  <p className="text-xs text-ink-500">{li.detail}</p>
                </div>
                <span className="font-mono text-sm text-ink-900">{money(li.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
              <span className="text-sm font-semibold text-ink-900">Total</span>
              <span className="font-mono text-sm font-bold text-ink-900">{money(invoice.amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Customer billing drill-down                                         */
/* ------------------------------------------------------------------ */
function CustomerDrawer({
  customer,
  invoices,
  onClose,
  onOpenInvoice,
  onIssue,
}: {
  customer: CustomerBilling | null
  invoices: Invoice[]
  onClose: () => void
  onOpenInvoice: (inv: Invoice) => void
  onIssue: (cust: string) => void
}) {
  if (!customer) return null
  return (
    <Modal
      open
      onClose={onClose}
      title={customer.customer}
      subtitle={`${customer.plan} · ${customer.region}`}
      headerRight={<Badge tone={statusToneMap[customer.status]} dot>{customer.status}</Badge>}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <GatedButton cap="license.manage" className="btn-primary" onClick={() => onIssue(customer.customer)}>
            <FilePlus className="h-4 w-4" />
            Issue invoice
          </GatedButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: 'MRR', v: money(customer.mrr) },
            { k: 'Overage', v: customer.overage > 0 ? money(customer.overage) : '—' },
            { k: 'Next invoice', v: customer.nextInvoice },
          ].map((m) => (
            <div key={m.k} className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{m.k}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink-900">{m.v}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink-900">Metered usage</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {customer.meters.map((m) => (
              <MeterBar key={m.label} meter={m} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink-900">Invoices</p>
          {invoices.length === 0 ? (
            <p className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-ink-400">
              No invoices for this customer.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {invoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => onOpenInvoice(inv)}
                  className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-slate-50"
                >
                  <span className="font-mono text-xs text-ink-600">{inv.id}</span>
                  <span className="flex-1 truncate text-sm text-ink-700">{inv.period}</span>
                  <span className="font-mono text-sm text-ink-900">{money(inv.amount)}</span>
                  <Badge tone={invoiceTone[inv.status]} dot>{inv.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
