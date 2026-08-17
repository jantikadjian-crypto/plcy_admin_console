import { useEffect, useMemo } from 'react'
import { Download, FileText, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { Badge } from '@/components/ui'
import { ReportShell, ReportSection } from '@/components/ReportShell'
import { useCustomerScope } from '@/context/CustomerScope'
import { useSession } from '@/context/Session'
import { currentUser } from '@/data/roles'
import { buildSlaReport, slaStatusRag, fmtSlaMoney } from '@/data/slaReport'
import type { SlaRag, SlaReport as SlaReportData } from '@/data/slaReport'
import { downloadCSV, downloadMarkdown, reportStem } from '@/lib/download'

const bannerTone: Record<SlaRag, 'green' | 'amber' | 'red'> = { green: 'green', amber: 'amber', red: 'red' }
const overallIcon: Record<SlaRag, typeof ShieldCheck> = { green: ShieldCheck, amber: ShieldAlert, red: ShieldX }
const ragDot: Record<SlaRag, string> = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500' }
const statusBadge: Record<'green' | 'amber' | 'red', 'green' | 'orange' | 'red'> = { green: 'green', amber: 'orange', red: 'red' }

function stamp(): string {
  const d = new Date()
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

function toMarkdown(r: SlaReportData): string {
  const L: string[] = []
  L.push('# SLA & Credits Report')
  L.push('')
  L.push(`**Scope:** ${r.isAll ? 'All customers · entire fleet' : r.scope}  `)
  L.push(`**Status:** ${r.overallLabel}  `)
  L.push(`**Credits owed (MTD):** ${fmtSlaMoney(r.creditsTotal)}  `)
  L.push(`**Generated:** ${r.generatedAt} · **Prepared by:** ${r.generatedBy}`)
  L.push('')
  L.push('## SLA attainment')
  L.push('')
  L.push('| Customer | Tier | Target | Attainment MTD | Status | Breaches | Credits |')
  L.push('| --- | --- | --- | --- | --- | --- | --- |')
  r.rows.forEach((t) => L.push(`| ${t.customer} | ${t.tier} | ${t.uptimeTarget}% | ${t.uptimeMtd}% | ${t.status} | ${t.breachesMtd} | ${fmtSlaMoney(t.creditsOwed)} |`))
  L.push('')
  L.push('## Maintenance windows')
  L.push('')
  if (r.windows.length === 0) {
    L.push('_No maintenance windows in scope._')
  } else {
    L.push('| Window | Customer | Start | Duration | Impact | Notice | Status |')
    L.push('| --- | --- | --- | --- | --- | --- | --- |')
    r.windows.forEach((w) => L.push(`| ${w.title} | ${w.customer} | ${w.start} | ${w.duration} | ${w.impact} | ${w.noticeDays}d | ${w.status} |`))
  }
  L.push('')
  L.push('---')
  L.push('_PLCY Admin Console · Confidential. SLA figures are month-to-date; credits are estimated per contract terms._')
  return L.join('\n')
}

export default function SlaReport() {
  const { scope, isAll } = useCustomerScope()
  const { logAction } = useSession()
  const generatedAt = stamp()
  const report = useMemo(() => buildSlaReport(scope, isAll, currentUser.name, generatedAt), [scope, isAll, generatedAt])

  useEffect(() => {
    logAction({ action: 'Generated SLA report', target: isAll ? 'Fleet (all customers)' : scope, category: 'report' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, isAll])

  const exportCSV = () => {
    downloadCSV(
      `${reportStem(isAll ? 'sla' : `sla-${report.scope.toLowerCase().replace(/\s+/g, '-')}`)}.csv`,
      ['Customer', 'Tier', 'Region', 'Uptime target', 'Attainment MTD', 'Status', 'Breaches MTD', 'Credits owed', 'Response target', 'Restore target'],
      report.rows.map((t) => [t.customer, t.tier, t.region, `${t.uptimeTarget}%`, `${t.uptimeMtd}%`, t.status, t.breachesMtd, t.creditsOwed, t.responseTarget, t.restoreTarget]),
    )
    logAction({ action: 'Downloaded SLA report (CSV)', target: isAll ? 'Fleet' : report.scope, category: 'report' })
  }
  const exportMD = () => {
    downloadMarkdown(`${reportStem(isAll ? 'sla' : `sla-${report.scope.toLowerCase().replace(/\s+/g, '-')}`)}.md`, toMarkdown(report))
    logAction({ action: 'Downloaded SLA report (Markdown)', target: isAll ? 'Fleet' : report.scope, category: 'report' })
  }

  return (
    <ReportShell
      title="SLA & Credits Report"
      subtitle={report.isAll ? 'All customers · entire fleet' : `Customer scope · ${report.scope}`}
      tone={bannerTone[report.overall]}
      statusLabel={report.overallLabel}
      statusIcon={overallIcon[report.overall]}
      backTo="/sla"
      meta={[`Generated ${report.generatedAt}`, `Prepared by ${report.generatedBy}`, 'Uptime figures are month-to-date']}
      footer={`PLCY Admin Console · SLA & Credits Report · ${report.generatedAt} · Confidential. SLA figures are month-to-date; service credits are estimated per contract terms and confirmed at invoice.`}
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
      {/* Executive summary */}
      <ReportSection title="Executive summary">
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

      {/* SLA attainment */}
      <ReportSection title="SLA attainment" note={`${report.rows.length} ${report.rows.length === 1 ? 'account' : 'accounts'}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3 font-medium">Customer</th>
                <th className="py-2 pr-3 font-medium">Tier</th>
                <th className="py-2 pr-3 font-medium">Target</th>
                <th className="py-2 pr-3 font-medium">Attainment MTD</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Breaches</th>
                <th className="py-2 font-medium">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((t) => {
                const rag = slaStatusRag[t.status]
                const met = t.uptimeMtd >= t.uptimeTarget
                return (
                  <tr key={t.customer} className="break-inside-avoid">
                    <td className="py-2.5 pr-3 font-medium text-ink-900">{t.customer}</td>
                    <td className="py-2.5 pr-3 text-ink-700">{t.tier}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink-500">{t.uptimeTarget}%</td>
                    <td className="py-2.5 pr-3">
                      <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${met ? 'text-ink-900' : 'text-rose-600'}`}>
                        <span className={`h-2 w-2 rounded-full ${ragDot[rag]}`} />
                        {t.uptimeMtd}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-3"><Badge tone={statusBadge[rag]} dot>{t.status}</Badge></td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink-700">{t.breachesMtd}</td>
                    <td className={`py-2.5 tabular-nums font-medium ${t.creditsOwed > 0 ? 'text-rose-600' : 'text-ink-500'}`}>{fmtSlaMoney(t.creditsOwed)}</td>
                  </tr>
                )
              })}
            </tbody>
            {report.creditsTotal > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-ink-500" colSpan={6}>Total credits owed (MTD)</td>
                  <td className="py-2.5 font-bold tabular-nums text-rose-600">{fmtSlaMoney(report.creditsTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </ReportSection>

      {/* Maintenance windows */}
      <ReportSection title="Maintenance windows" note={`${report.windows.length} in scope`}>
        {report.windows.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">No maintenance windows scheduled in scope.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-3 font-medium">Window</th>
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 font-medium">Start</th>
                  <th className="py-2 pr-3 font-medium">Duration</th>
                  <th className="py-2 pr-3 font-medium">Impact</th>
                  <th className="py-2 pr-3 font-medium">Notice</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.windows.map((w) => (
                  <tr key={w.id} className="break-inside-avoid">
                    <td className="py-2.5 pr-3 font-medium text-ink-900">{w.title}</td>
                    <td className="py-2.5 pr-3 text-ink-700">{w.customer}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-xs text-ink-500">{w.start}</td>
                    <td className="py-2.5 pr-3 text-ink-500">{w.duration}</td>
                    <td className="py-2.5 pr-3 text-ink-700">{w.impact}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink-500">{w.noticeDays}d</td>
                    <td className="py-2.5"><Badge tone={w.status === 'Completed' ? 'green' : w.status === 'In progress' ? 'orange' : 'slate'} dot>{w.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>
    </ReportShell>
  )
}
