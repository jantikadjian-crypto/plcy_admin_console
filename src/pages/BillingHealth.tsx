import { useState } from 'react'
import {
  AlertTriangle, CreditCard, Scale, Webhook, RefreshCw, DollarSign, CheckCircle2,
  ExternalLink, RotateCcw, Send,
} from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, EmptyState } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useStripe } from '@/context/Stripe'
import {
  dunningQueue, failedPayments, disputes, syncIssues, billingHealthTotals,
  dunningStageTone, disputeTone, driftTone,
} from '@/data/billingHealth'
import { subscriptionTotals } from '@/data/subscriptions'

const money = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`)

export default function BillingHealth() {
  const { can, logAction } = useSession()
  const { deliveries } = useStripe()
  const canManage = can('license.manage')
  const [msg, setMsg] = useState('')
  const [resolved, setResolved] = useState<Set<string>>(new Set())

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 2000) }
  const act = (action: string, target: string, note: string) => {
    logAction({ action, target, category: 'billing' })
    flash(note)
  }
  const resolveSync = (id: string, customer: string) => {
    setResolved((prev) => new Set(prev).add(id))
    logAction({ action: 'billing.sync.resolve', target: customer, category: 'billing' })
    flash('Re-synced from Stripe')
  }

  const failedWebhooks = deliveries.filter((d) => d.status === 'Failed').length
  const webhookRate = deliveries.length ? Math.round(((deliveries.length - failedWebhooks) / deliveries.length) * 100) : 100
  const openSync = syncIssues.filter((s) => !resolved.has(s.id))

  return (
    <>
      <PageHeader
        title="Billing Health"
        description="Operational monitoring over Stripe — the dunning queue, failed payments, disputes, webhook health, and drift between Stripe and the local view."
        actions={
          <a className="btn-secondary" href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open Stripe Dashboard
          </a>
        }
      />

      {msg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> {msg}
        </div>
      )}

      {/* Health strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="In dunning" value={money(billingHealthTotals.dunningAmount)} icon={AlertTriangle} tone={billingHealthTotals.dunningCount ? 'red' : 'green'} footer={`${billingHealthTotals.dunningCount} invoices retrying`} />
        <StatCard label="Failed payments" value={String(billingHealthTotals.failedCount)} icon={CreditCard} tone={billingHealthTotals.failedCount ? 'orange' : 'green'} footer="Last 24 h" />
        <StatCard label="Open disputes" value={money(billingHealthTotals.disputeAmount)} icon={Scale} tone={billingHealthTotals.disputesNeedingResponse ? 'red' : 'orange'} footer={`${billingHealthTotals.disputesNeedingResponse} need response`} />
        <StatCard label="Webhook health" value={`${webhookRate}%`} icon={Webhook} tone={failedWebhooks ? 'orange' : 'green'} footer={`${failedWebhooks} failed recently`} />
      </div>

      {/* Dunning queue */}
      <Card className="mt-6">
        <CardTitle title="Dunning queue" subtitle="Failed recurring charges being retried under Smart Retries · resolve before they turn uncollectible" />
        {dunningQueue.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No failed charges" description="Every subscription is paid up." />
        ) : (
          <Table columns={['Customer', 'Invoice', 'Amount', 'Attempts', 'Last error', 'Next retry', 'Stage', '']} noun="charges">
            {dunningQueue.map((d) => (
              <Tr key={d.id}>
                <Td className="font-medium text-ink-900">{d.customer}</Td>
                <Td className="font-mono text-xs text-ink-600">{d.invoiceId}</Td>
                <Td className="font-medium text-ink-900">{money(d.amount)}</Td>
                <Td className="text-ink-700">{d.attempts}/{d.maxAttempts}</Td>
                <Td className="font-mono text-xs text-rose-600">{d.lastError}</Td>
                <Td className="whitespace-nowrap text-xs text-ink-500">{d.nextRetry}</Td>
                <Td><Badge tone={dunningStageTone[d.stage]} dot>{d.stage}</Badge></Td>
                <Td>
                  {canManage && (
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => act('billing.dunning.retry', `${d.customer} · ${d.invoiceId}`, 'Retry queued')}>
                        <RotateCcw className="h-3.5 w-3.5" /> Retry
                      </button>
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => act('billing.dunning.remind', `${d.customer} · ${d.invoiceId}`, 'Reminder sent')}>
                        <Send className="h-3.5 w-3.5" /> Remind
                      </button>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Failed payments */}
        <Card>
          <CardTitle title="Recent failed payments" subtitle="Declined charge attempts" />
          {failedPayments.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="None" description="No recent declines." />
          ) : (
            <div className="divide-y divide-slate-100">
              {failedPayments.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{f.customer}</p>
                    <p className="truncate text-xs text-ink-500">
                      <span className="font-mono text-rose-600">{f.reason}</span> · {f.method} · {f.time}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-ink-900">{money(f.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Disputes */}
        <Card>
          <CardTitle title="Disputes & chargebacks" subtitle="Respond before the evidence deadline" />
          {disputes.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="None" description="No open disputes." />
          ) : (
            <div className="space-y-2">
              {disputes.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink-900">{d.customer}</span>
                      <span className="text-sm text-ink-700">{money(d.amount)}</span>
                      <Badge tone={disputeTone[d.status]} dot>{d.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500"><span className="font-mono">{d.reason}</span> · evidence due {d.evidenceDue}</p>
                  </div>
                  {canManage && d.status === 'Needs response' && (
                    <button className="btn-secondary shrink-0 px-2.5 py-1 text-xs" onClick={() => act('billing.dispute.respond', `${d.customer} · ${d.id}`, 'Evidence submitted')}>
                      Submit evidence
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Sync drift */}
      <Card className="mt-6">
        <CardTitle
          title="Stripe ↔ local sync"
          subtitle="Mismatches between Stripe and the console's local view"
          action={
            <GatedButton cap="license.manage" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => act('billing.sync.all', 'All customers', 'Full resync queued')}>
              <RefreshCw className="h-3.5 w-3.5" /> Resync all
            </GatedButton>
          }
        />
        {openSync.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="In sync" description="Stripe and the local view agree." />
        ) : (
          <div className="space-y-2">
            {openSync.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <div className="flex items-start gap-3">
                  <Badge tone={driftTone[s.severity]}>{s.severity}</Badge>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{s.customer} — {s.kind}</p>
                    <p className="text-xs text-ink-500">{s.detail}</p>
                  </div>
                </div>
                {canManage && (
                  <button className="btn-ghost shrink-0 px-2 py-1 text-xs" onClick={() => resolveSync(s.id, s.customer)}>
                    <RefreshCw className="h-3.5 w-3.5" /> Resync
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Revenue footer */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Recurring revenue" value={money(subscriptionTotals.mrr)} icon={DollarSign} tone="green" footer={`${subscriptionTotals.active} active · ${subscriptionTotals.trialing} trialing`} />
        <StatCard label="Canceled MRR" value={money(billingHealthTotals.canceledMrr)} icon={RotateCcw} tone="slate" footer="Churned this period" />
        <StatCard label="Sync issues" value={String(openSync.length)} icon={RefreshCw} tone={openSync.length ? 'orange' : 'green'} footer="Awaiting resync" />
      </div>
    </>
  )
}
