import { useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, FileText, ShieldCheck, ShieldAlert, ShieldX, Building2 } from 'lucide-react'
import { Badge, Card, EmptyState } from '@/components/ui'
import { ReportShell, ReportSection } from '@/components/ReportShell'
import { useSession } from '@/context/Session'
import { useCustomers } from '@/context/Customers'
import { currentUser } from '@/data/roles'
import { buildCustomerReport, fmtCustMoney } from '@/data/customerReport'
import type { CustRag, CustomerReport as CustomerReportData } from '@/data/customerReport'
import { downloadCSV, downloadMarkdown, reportStem } from '@/lib/download'

const bannerTone: Record<CustRag, 'green' | 'amber' | 'red'> = { green: 'green', amber: 'amber', red: 'red' }
const overallIcon: Record<CustRag, typeof ShieldCheck> = { green: ShieldCheck, amber: ShieldAlert, red: ShieldX }
const sevTone: Record<string, 'red' | 'orange' | 'yellow' | 'slate'> = { Critical: 'red', High: 'orange', Medium: 'yellow', Low: 'slate' }
const slaTone: Record<string, 'green' | 'orange' | 'red'> = { Meeting: 'green', 'At risk': 'orange', Breached: 'red' }
const invTone: Record<string, 'green' | 'blue' | 'red' | 'slate'> = { Paid: 'green', Open: 'blue', 'Past due': 'red', Draft: 'slate' }

function stamp(): string {
  const d = new Date()
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function toMarkdown(r: CustomerReportData): string {
  const L: string[] = []
  L.push(`# Customer Account Report — ${r.name}`)
  L.push('')
  L.push(`**Plan:** ${r.plan} · **Status:** ${r.status}  `)
  L.push(`**Overall:** ${r.overallLabel}  `)
  L.push(`**Generated:** ${r.generatedAt} · **Prepared by:** ${r.generatedBy}`)
  L.push('')
  L.push('## Account snapshot')
  L.push('')
  L.push('| Metric | Value | |')
  L.push('| --- | --- | --- |')
  r.kpis.forEach((k) => L.push(`| ${k.label} | ${k.value} | ${k.sub} |`))
  L.push('')
  if (r.sla) {
    L.push('## Service level')
    L.push('')
    L.push(`- Tier ${r.sla.tier} · status ${r.sla.status}`)
    L.push(`- Uptime MTD ${r.sla.uptimeMtd}% vs ${r.sla.uptimeTarget}% target · ${r.sla.breachesMtd} breaches`)
    L.push(`- Response ${r.sla.responseTarget} · restore ${r.sla.restoreTarget} · credits ${fmtCustMoney(r.sla.creditsOwed)}`)
    L.push('')
  }
  if (r.billing) {
    L.push('## Billing')
    L.push('')
    L.push(`- ${r.billing.plan} · ${fmtCustMoney(r.billing.mrr)} MRR · status ${r.billing.status} · next invoice ${r.billing.nextInvoice}`)
    if (r.billing.overage > 0) L.push(`- Overage this cycle: ${fmtCustMoney(r.billing.overage)}`)
    L.push('')
    if (r.invoices.length) {
      L.push('| Invoice | Period | Amount | Status | Due |')
      L.push('| --- | --- | --- | --- | --- |')
      r.invoices.forEach((i) => L.push(`| ${i.id} | ${i.period} | $${i.amount.toLocaleString()} | ${i.status} | ${i.due} |`))
      L.push('')
    }
  }
  L.push('## Governed footprint')
  L.push('')
  L.push(`- Instances: ${r.instances.length} · Models: ${r.modelCount}`)
  r.instances.forEach((i) => L.push(`  - ${i.name} · ${i.environment} · ${i.region} · ${i.version} · ${i.uptime > 0 ? i.uptime + '%' : '—'} · ${i.status}`))
  L.push('')
  L.push('## Open items')
  L.push('')
  L.push(`- Open incidents: ${r.incidents.length} · Open DSARs: ${r.openDsar} · Cross-border transfers: ${r.transfers}`)
  r.incidents.forEach((i) => L.push(`  - [${i.severity}] ${i.title} — ${i.status} (${i.opened})`))
  L.push('')
  L.push('---')
  L.push('_PLCY Admin Console · Confidential — Internal. Figures are current control-plane metadata._')
  return L.join('\n')
}

function Facts({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((f) => (
        <div key={f.label}>
          <dt className="text-xs font-medium text-ink-500">{f.label}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-ink-900">{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function CustomerReport() {
  const { id } = useParams()
  const { get } = useCustomers()
  const { logAction } = useSession()
  const customer = get(id ?? '')
  const generatedAt = stamp()
  const report = useMemo(() => (customer ? buildCustomerReport(customer, currentUser.name, generatedAt) : null), [customer, generatedAt])

  useEffect(() => {
    if (customer) logAction({ action: 'Generated customer report', target: customer.name, category: 'report' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!customer || !report) {
    return (
      <Card>
        <EmptyState icon={Building2} title="Customer not found" description="This organization is not in the PLCY platform." />
        <div className="mt-4 flex justify-center">
          <Link to="/customers" className="btn-secondary">Back to customers</Link>
        </div>
      </Card>
    )
  }

  const exportCSV = () => {
    downloadCSV(
      `${reportStem(`customer-${slug(report.name)}-invoices`)}.csv`,
      ['Invoice', 'Period', 'Amount', 'Status', 'Due'],
      report.invoices.map((i) => [i.id, i.period, i.amount, i.status, i.due]),
    )
    logAction({ action: 'Downloaded customer invoices (CSV)', target: report.name, category: 'report' })
  }
  const exportMD = () => {
    downloadMarkdown(`${reportStem(`customer-${slug(report.name)}`)}.md`, toMarkdown(report))
    logAction({ action: 'Downloaded customer report (Markdown)', target: report.name, category: 'report' })
  }

  return (
    <ReportShell
      title={`Customer Account Report — ${report.name}`}
      subtitle={`${report.plan} plan · ${report.status}`}
      tone={bannerTone[report.overall]}
      statusLabel={report.overallLabel}
      statusIcon={overallIcon[report.overall]}
      backTo={`/customers/${customer.id}`}
      meta={[`Generated ${report.generatedAt}`, `Prepared by ${report.generatedBy}`, 'Confidential — Internal / account team']}
      footer={`PLCY Admin Console · Customer Account Report · ${report.name} · ${report.generatedAt} · Confidential — Internal. Figures are current control-plane metadata.`}
      actions={
        <>
          <button className="btn-secondary" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Download CSV
          </button>
          <button className="btn-secondary" onClick={exportMD}>
            <FileText className="h-4 w-4" />
            Download Markdown
          </button>
        </>
      }
    >
      {/* Account snapshot */}
      <ReportSection title="Account snapshot">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {report.kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
              <p className="text-xs font-medium text-ink-500">{k.label}</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink-900">{k.value}</p>
              <p className="text-[11px] text-ink-400">{k.sub}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Profile + deployment */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReportSection title="Profile">
          <Facts items={report.profile} />
        </ReportSection>
        <ReportSection title="Deployment" note={report.deployment ? 'Single-tenant' : undefined}>
          {report.deployment ? <Facts items={report.deployment} /> : <p className="py-4 text-center text-sm text-ink-400">No deployment on record.</p>}
        </ReportSection>
      </div>

      {/* Service level */}
      <ReportSection title="Service level" note={report.sla ? `${report.sla.tier} tier` : undefined}>
        {report.sla ? (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="text-xs font-medium text-ink-500">Status</p>
              <Badge tone={slaTone[report.sla.status]} dot>{report.sla.status}</Badge>
            </div>
            <Metric label="Uptime MTD" value={`${report.sla.uptimeMtd}%`} sub={`target ${report.sla.uptimeTarget}%`} />
            <Metric label="Breaches MTD" value={String(report.sla.breachesMtd)} sub="this month" />
            <Metric label="Response / restore" value={`${report.sla.responseTarget} / ${report.sla.restoreTarget}`} sub="commitment" />
            <Metric label="Credits owed" value={fmtCustMoney(report.sla.creditsOwed)} sub="MTD" danger={report.sla.creditsOwed > 0} />
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-ink-400">No SLA on record.</p>
        )}
      </ReportSection>

      {/* Billing */}
      {report.billing && (
        <ReportSection title="Billing" note={report.billing.overage > 0 ? `+${fmtCustMoney(report.billing.overage)} overage` : undefined}>
          <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Metric label="Plan" value={report.billing.plan} sub={`${fmtCustMoney(report.billing.mrr)} MRR`} />
            <Metric label="Status" value={report.billing.status} sub={`next invoice ${report.billing.nextInvoice}`} danger={report.billing.status === 'Past due'} />
          </div>
          {report.meters.length > 0 && (
            <div className="mb-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {report.meters.map((m) => {
                const pct = Math.min(100, (m.used / m.included) * 100)
                return (
                  <div key={m.label}>
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="font-medium text-ink-700">{m.label}</span>
                      <span className="font-mono text-ink-500">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 85 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {report.invoices.length > 0 && (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-3 font-medium">Invoice</th>
                  <th className="py-2 pr-3 font-medium">Period</th>
                  <th className="py-2 pr-3 font-medium">Amount</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.invoices.map((i) => (
                  <tr key={i.id} className="break-inside-avoid">
                    <td className="py-2.5 pr-3 font-mono text-xs text-ink-700">{i.id}</td>
                    <td className="py-2.5 pr-3 text-ink-700">{i.period}</td>
                    <td className="py-2.5 pr-3 font-medium text-ink-900">${i.amount.toLocaleString()}</td>
                    <td className="py-2.5 pr-3"><Badge tone={invTone[i.status]} dot>{i.status}</Badge></td>
                    <td className="py-2.5 whitespace-nowrap font-mono text-xs text-ink-500">{i.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportSection>
      )}

      {/* Governed footprint */}
      <ReportSection title="Governed footprint" note={`${report.instances.length} instances · ${report.modelCount} models`}>
        {report.instances.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-400">No deployed instances.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3 font-medium">Instance</th>
                <th className="py-2 pr-3 font-medium">Environment</th>
                <th className="py-2 pr-3 font-medium">Region</th>
                <th className="py-2 pr-3 font-medium">Version</th>
                <th className="py-2 pr-3 font-medium">Uptime</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.instances.map((i) => (
                <tr key={i.name} className="break-inside-avoid">
                  <td className="py-2.5 pr-3 font-mono text-xs text-ink-900">{i.name}</td>
                  <td className="py-2.5 pr-3 text-ink-700">{i.environment}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-ink-600">{i.region}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-ink-600">{i.version}</td>
                  <td className="py-2.5 pr-3 text-ink-700">{i.uptime > 0 ? `${i.uptime}%` : '—'}</td>
                  <td className="py-2.5"><Badge tone={i.status === 'Healthy' ? 'green' : i.status === 'Degraded' ? 'orange' : 'slate'} dot>{i.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>

      {/* Open items */}
      <ReportSection title="Open items" note={`${report.incidents.length} incidents · ${report.openDsar} DSARs · ${report.transfers} transfers`}>
        {report.incidents.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-400">No open incidents for this customer.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3 font-medium">Incident</th>
                <th className="py-2 pr-3 font-medium">Severity</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.incidents.map((i) => (
                <tr key={i.id} className="break-inside-avoid">
                  <td className="py-2.5 pr-3 font-medium text-ink-900">{i.title}</td>
                  <td className="py-2.5 pr-3"><Badge tone={sevTone[i.severity]}>{i.severity}</Badge></td>
                  <td className="py-2.5 pr-3 text-ink-700">{i.status}</td>
                  <td className="py-2.5 whitespace-nowrap font-mono text-xs text-ink-500">{i.opened}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>
    </ReportShell>
  )
}

function Metric({ label, value, sub, danger }: { label: string; value: string; sub: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${danger ? 'text-rose-600' : 'text-ink-900'}`}>{value}</p>
      <p className="text-[11px] text-ink-400">{sub}</p>
    </div>
  )
}
