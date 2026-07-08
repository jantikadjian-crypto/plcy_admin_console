import { useMemo, useRef, useState } from 'react'
import {
  CircleDollarSign,
  TrendingUp,
  Wallet,
  AlertCircle,
  Receipt,
  FilePlus,
} from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Progress, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useCustomerScope } from '@/context/CustomerScope'
import {
  customerBilling,
  invoices as seedInvoices,
  billingTotals,
} from '@/data/billing'
import type { Plan, BillingStatus, UsageMeter, Invoice, InvoiceStatus } from '@/data/billing'

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

  const markPaid = (inv: Invoice) => {
    setInvoiceList((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: 'Paid' } : i)))
    logAction({ action: 'invoice.mark-paid', target: inv.id, category: 'billing' })
  }

  /* Issue-invoice modal. */
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueCustomer, setIssueCustomer] = useState(customerBilling[0]?.customer ?? '')
  const [issuePeriod, setIssuePeriod] = useState('Jul 2026')
  const [issueAmount, setIssueAmount] = useState('')
  const issueCounter = useRef(1)

  const openIssue = () => {
    setIssueCustomer(!isAll ? scope : customerBilling[0]?.customer ?? '')
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
          <GatedButton cap="license.manage" className="btn-primary" onClick={openIssue}>
            <Receipt className="h-4 w-4" />
            Issue invoice
          </GatedButton>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="MRR"
          value={`$${billingTotals.mrr.toLocaleString()}`}
          icon={CircleDollarSign}
          tone="blue"
          footer={`ARR $${billingTotals.arr.toLocaleString()}`}
        />
        <StatCard
          label="Overage this cycle"
          value={`$${billingTotals.overageThisCycle.toLocaleString()}`}
          icon={TrendingUp}
          tone="orange"
          footer="Metered above plan"
        />
        <StatCard
          label="Open invoices"
          value={`$${billingTotals.openInvoices.toLocaleString()}`}
          icon={Wallet}
          tone="purple"
          footer="Awaiting payment"
        />
        <StatCard
          label="Past due"
          value={`$${billingTotals.pastDue.toLocaleString()}`}
          icon={AlertCircle}
          tone="red"
          footer={`${billingTotals.pastDueCount} invoices`}
        />
      </div>

      {/* Usage metering */}
      <Card className="mt-6">
        <CardTitle title="Usage by Customer" subtitle="Metered consumption against plan-included volumes" />
        <div className="space-y-4">
          {scopedCustomers.map((c) => (
            <div key={c.customer} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">{c.customer}</span>
                  <span className="font-mono text-xs text-ink-400">{c.region}</span>
                  <Badge tone={planTone[c.plan]}>{c.plan}</Badge>
                  <Badge tone={statusToneMap[c.status]} dot>{c.status}</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {c.overage > 0 && (
                    <span className="font-medium text-orange-600">+${c.overage.toLocaleString()} overage</span>
                  )}
                  <span className="font-semibold text-ink-900">${c.mrr.toLocaleString()}/mo</span>
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
        <CardTitle title="Invoices" subtitle="Recent billing activity" />
        <Table columns={['Invoice', 'Customer', 'Period', 'Amount', 'Status', 'Due', '']}>
          {scopedInvoices.map((inv) => {
            const actionable = inv.status === 'Open' || inv.status === 'Past due'
            return (
              <Tr key={inv.id}>
                <Td className="font-mono text-xs text-ink-700">{inv.id}</Td>
                <Td className="font-medium text-ink-900">{inv.customer}</Td>
                <Td className="text-ink-700">{inv.period}</Td>
                <Td className="font-medium text-ink-900">${inv.amount.toLocaleString()}</Td>
                <Td><Badge tone={invoiceTone[inv.status]} dot>{inv.status}</Badge></Td>
                <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{inv.due}</Td>
                <Td className="text-right">
                  {actionable && (
                    <GatedButton
                      cap="license.manage"
                      className="btn-secondary px-2.5 py-1 text-xs"
                      onClick={() => markPaid(inv)}
                    >
                      Mark paid
                    </GatedButton>
                  )}
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

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
