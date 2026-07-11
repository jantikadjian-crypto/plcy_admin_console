import { useState } from 'react'
import {
  KeyRound, Webhook, ReceiptText, ShieldCheck, ExternalLink,
  CheckCircle2, AlertTriangle, Send, Copy, DollarSign, RefreshCw,
} from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useStripe } from '@/context/Stripe'
import { collectionLabel } from '@/data/stripe'
import type { DeliveryStatus } from '@/data/stripe'
import { billingTotals } from '@/data/billing'

const fmtMoney = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`)
const deliveryTone: Record<DeliveryStatus, 'green' | 'red' | 'orange'> = { Delivered: 'green', Failed: 'red', Pending: 'orange' }

export default function BillingIntegration() {
  const { can, logAction } = useSession()
  const { config, webhook, deliveries, mappings, updateConfig, sendTestEvent } = useStripe()
  const canManage = can('license.manage')
  const [savedMsg, setSavedMsg] = useState('')

  const flash = (m: string) => { setSavedMsg(m); window.setTimeout(() => setSavedMsg(''), 2000) }
  const toggleMode = () => {
    if (!canManage) return
    const next = config.mode === 'test' ? 'live' : 'test'
    updateConfig({ mode: next })
    logAction({ action: 'stripe.mode.toggle', target: `Stripe → ${next} mode`, category: 'billing' })
    flash(`Switched to ${next} mode`)
  }
  const toggleTax = () => { if (!canManage) return; updateConfig({ taxEnabled: !config.taxEnabled }); logAction({ action: 'stripe.tax.toggle', target: `Stripe Tax ${!config.taxEnabled ? 'on' : 'off'}`, category: 'billing' }) }
  const toggleRetries = () => { if (!canManage) return; updateConfig({ retriesEnabled: !config.retriesEnabled }); logAction({ action: 'stripe.retries.toggle', target: `Smart Retries ${!config.retriesEnabled ? 'on' : 'off'}`, category: 'billing' }) }
  const doTestEvent = () => { sendTestEvent('invoice.paid'); logAction({ action: 'stripe.webhook.test', target: 'invoice.paid', category: 'billing' }); flash('Test event sent') }

  const failedDeliveries = deliveries.filter((d) => d.status === 'Failed').length
  const successRate = deliveries.length ? Math.round(((deliveries.length - failedDeliveries) / deliveries.length) * 100) : 100

  return (
    <>
      <PageHeader
        title="Billing Integration"
        description="Stripe connection, webhooks, price mapping, and invoicing defaults. PLCY charges SaaS tiers via usage-metered subscriptions and enterprise accounts via send-invoice collection."
        actions={
          <a className="btn-secondary" href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open Stripe Dashboard
          </a>
        }
      />

      {savedMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> {savedMsg}
        </div>
      )}

      {/* Health strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR (Stripe)" value={fmtMoney(billingTotals.mrr)} icon={DollarSign} tone="green" footer={`${fmtMoney(billingTotals.arr)} ARR`} />
        <StatCard label="Past due" value={fmtMoney(billingTotals.pastDue)} icon={AlertTriangle} tone={billingTotals.pastDue ? 'red' : 'green'} footer={`${billingTotals.pastDueCount} in dunning`} />
        <StatCard label="Webhook health" value={`${successRate}%`} icon={Webhook} tone={failedDeliveries ? 'orange' : 'green'} footer={`${failedDeliveries} failed recently`} />
        <StatCard label="Open invoices" value={fmtMoney(billingTotals.openInvoices)} icon={ReceiptText} tone="blue" footer="Awaiting payment" />
      </div>

      {/* Connection */}
      <Card className="mt-6">
        <CardTitle
          title="Connection"
          subtitle="Stripe account & API mode"
          action={
            <span className="inline-flex items-center gap-2">
              {config.connected ? <Badge tone="green" dot>Connected</Badge> : <Badge tone="slate">Not connected</Badge>}
              <Badge tone={config.mode === 'live' ? 'purple' : 'orange'}>{config.mode === 'live' ? 'Live mode' : 'Test mode'}</Badge>
            </span>
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Account ID" value={config.accountId} mono copyable onCopy={() => flash('Copied')} />
          <Field label="Publishable key" value={config.publishableKey} mono />
          <Field label="Secret key" value={`sk_${config.mode}_••••••••${config.secretKeyLast4}`} mono icon={KeyRound} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-start gap-2 text-xs text-ink-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>The secret key is stored server-side and shown masked. Only the last 4 are surfaced here — never the full key.</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => flash('Connection verified')}>
              <RefreshCw className="h-4 w-4" /> Test connection
            </button>
            <GatedButton cap="license.manage" className="btn-primary" onClick={toggleMode}>
              Switch to {config.mode === 'test' ? 'live' : 'test'} mode
            </GatedButton>
          </div>
        </div>
      </Card>

      {/* Price mapping */}
      <Card className="mt-6">
        <CardTitle title="Product & price mapping" subtitle="Each PLCY plan and usage meter maps to a Stripe Price. SaaS charges automatically; Enterprise sends an invoice." />
        <Table columns={['Item', 'Type', 'Stripe price', 'Model', 'Amount', 'Collection']}>
          {mappings.map((m) => (
            <Tr key={m.key}>
              <Td className="font-medium text-ink-900">{m.label}</Td>
              <Td><Badge tone={m.kind === 'Plan' ? 'blue' : 'purple'}>{m.kind}</Badge></Td>
              <Td className="font-mono text-xs text-ink-600">{m.priceId}</Td>
              <Td><Badge tone={m.model === 'metered' ? 'orange' : 'slate'}>{m.model}</Badge></Td>
              <Td className="text-ink-700">{m.amount}</Td>
              <Td>
                <Badge tone={m.collection === 'send_invoice' ? 'purple' : 'green'} dot>{collectionLabel[m.collection]}</Badge>
              </Td>
            </Tr>
          ))}
        </Table>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-ink-400">
          Price IDs come from your Stripe product catalog. Editing a mapping re-points billing for that plan/meter — change with care.
        </p>
      </Card>

      {/* Webhooks */}
      <Card className="mt-6">
        <CardTitle
          title="Webhooks"
          subtitle="Stripe pushes billing events here. Delivery health is the first thing to check when billing looks wrong."
          action={
            <GatedButton cap="license.manage" className="btn-secondary px-2.5 py-1 text-xs" onClick={doTestEvent}>
              <Send className="h-3.5 w-3.5" /> Send test event
            </GatedButton>
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Endpoint" value={webhook.endpoint} mono copyable onCopy={() => flash('Copied')} />
          <Field label="Signing secret" value={`whsec_••••••••${webhook.signingSecretLast4}`} mono icon={KeyRound} />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Subscribed events ({webhook.events.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {webhook.events.map((e) => (
              <span key={e} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-ink-700">{e}</span>
            ))}
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Recent deliveries</p>
          <Table columns={['Event', 'Status', 'Attempts', 'When']}>
            {deliveries.slice(0, 8).map((d) => (
              <Tr key={d.id}>
                <Td className="font-mono text-xs text-ink-800">{d.event}</Td>
                <Td><Badge tone={deliveryTone[d.status]} dot>{d.status}</Badge></Td>
                <Td className="text-ink-700">{d.attempts}</Td>
                <Td className="text-xs text-ink-500">{d.time}</Td>
              </Tr>
            ))}
          </Table>
        </div>
      </Card>

      {/* Invoicing & tax defaults */}
      <Card className="mt-6">
        <CardTitle title="Invoicing & tax defaults" subtitle="Applied to newly-created invoices and subscriptions" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Statement descriptor" value={config.statementDescriptor} />
          <Field label="Default currency" value={config.defaultCurrency} />
          <Field label="Net terms" value={`Net ${config.netTermsDays}`} />
        </div>
        <div className="mt-4 space-y-2">
          <ToggleRow icon={ReceiptText} label="Stripe Tax" desc="Automatically calculate and collect sales tax / VAT." on={config.taxEnabled} onToggle={toggleTax} canManage={canManage} />
          <ToggleRow icon={RefreshCw} label={`Smart Retries (dunning)`} desc={`Retry failed card charges up to ${config.maxRetries}× before marking uncollectible.`} on={config.retriesEnabled} onToggle={toggleRetries} canManage={canManage} />
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium text-ink-500">Invoice footer</p>
          <p className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-ink-700">{config.invoiceFooter}</p>
        </div>
      </Card>
    </>
  )
}

function Field({ label, value, mono, copyable, onCopy, icon: Icon }: { label: string; value: string; mono?: boolean; copyable?: boolean; onCopy?: () => void; icon?: typeof KeyRound }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-ink-400" />}
        <span className={`min-w-0 flex-1 truncate text-sm text-ink-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
        {copyable && (
          <button className="shrink-0 rounded-md p-1 text-ink-400 hover:bg-slate-100 hover:text-ink-700" aria-label="Copy" onClick={() => { navigator.clipboard?.writeText(value); onCopy?.() }}>
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function ToggleRow({ icon: Icon, label, desc, on, onToggle, canManage }: { icon: typeof KeyRound; label: string; desc: string; on: boolean; onToggle: () => void; canManage: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
        <div>
          <p className="text-sm font-semibold text-ink-900">{label}</p>
          <p className="text-xs text-ink-500">{desc}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={!canManage}
        aria-label={`Toggle ${label}`}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'bg-brand-600' : 'bg-slate-300'}`}
      >
        <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}
