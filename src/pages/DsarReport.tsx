import { useEffect, useMemo } from 'react'
import { Download, FileText, CircleCheck, Clock, OctagonAlert } from 'lucide-react'
import { Badge } from '@/components/ui'
import { ReportShell, ReportSection } from '@/components/ReportShell'
import { useCustomerScope } from '@/context/CustomerScope'
import { useSession } from '@/context/Session'
import { currentUser } from '@/data/roles'
import { regionByCode } from '@/data/fleet'
import { buildDsarReport } from '@/data/dsarReport'
import type { DsarRag, SlaState, DsarReport as DsarReportData } from '@/data/dsarReport'
import type { DSARType } from '@/data/privacy'
import { downloadCSV, downloadMarkdown, reportStem } from '@/lib/download'

const bannerTone: Record<DsarRag, 'green' | 'amber' | 'red'> = { green: 'green', amber: 'amber', red: 'red' }
const overallIcon: Record<DsarRag, typeof CircleCheck> = { green: CircleCheck, amber: Clock, red: OctagonAlert }

const typeTone: Record<DSARType, 'blue' | 'red' | 'purple' | 'orange' | 'slate'> = {
  Access: 'blue', Erasure: 'red', Portability: 'purple', Rectification: 'orange', Objection: 'slate',
}
const slaTone: Record<SlaState, 'red' | 'orange' | 'blue' | 'green'> = { Breached: 'red', 'At risk': 'orange', 'On track': 'blue', Closed: 'green' }
const typeBar = '#6366f1'
const jurBar = '#0ea5e9'

function stamp(): string {
  const d = new Date()
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

const dueLabel = (r: DsarReportData['rows'][number]) =>
  r.req.status === 'Completed' ? 'closed' : r.daysToDue === null ? '—' : r.daysToDue < 0 ? `${-r.daysToDue}d overdue` : `${r.daysToDue}d left`

function toMarkdown(r: DsarReportData): string {
  const L: string[] = []
  L.push('# DSAR Fulfilment Report')
  L.push('')
  L.push(`**Scope:** ${r.isAll ? 'All customers · entire fleet' : r.scope}  `)
  L.push(`**Status:** ${r.overallLabel}  `)
  L.push(`**Requests:** ${r.totals.total} · **Open:** ${r.totals.open} · **Overdue:** ${r.totals.overdue} · **SLA compliance:** ${r.totals.slaCompliancePct}%  `)
  L.push(`**Generated:** ${r.generatedAt} · **Prepared by:** ${r.generatedBy}`)
  L.push('')
  L.push('## By request type')
  L.push('')
  r.byType.forEach((b) => L.push(`- ${b.label}: ${b.count}`))
  L.push('')
  L.push('## By jurisdiction')
  L.push('')
  r.byJurisdiction.forEach((b) => L.push(`- ${b.label}: ${b.count}`))
  L.push('')
  L.push('## Request register (most urgent first)')
  L.push('')
  L.push('| ID | Type | Customer | Law | Due | SLA | Assignee |')
  L.push('| --- | --- | --- | --- | --- | --- | --- |')
  r.rows.forEach((x) => L.push(`| ${x.req.id} | ${x.req.type} | ${x.req.customer} | ${x.req.law} | ${x.req.due} (${dueLabel(x)}) | ${x.slaState} | ${x.req.assignee} |`))
  L.push('')
  L.push('---')
  L.push('_PLCY Admin Console · Confidential — Internal. DSAR fulfilment against statutory deadlines._')
  return L.join('\n')
}

export default function DsarReport() {
  const { scope, isAll } = useCustomerScope()
  const { logAction } = useSession()
  const generatedAt = stamp()
  const report = useMemo(() => buildDsarReport(scope, isAll, currentUser.name, generatedAt), [scope, isAll, generatedAt])

  useEffect(() => {
    logAction({ action: 'Generated DSAR fulfilment report', target: isAll ? 'Fleet (all customers)' : scope, category: 'report' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, isAll])

  const maxType = Math.max(1, ...report.byType.map((b) => b.count))
  const maxJur = Math.max(1, ...report.byJurisdiction.map((b) => b.count))
  const stemSuffix = isAll ? 'dsar' : `dsar-${report.scope.toLowerCase().replace(/\s+/g, '-')}`

  const exportCSV = () => {
    downloadCSV(
      `${reportStem(stemSuffix)}.csv`,
      ['ID', 'Type', 'Subject', 'Customer', 'Region', 'Law', 'Received', 'Due', 'SLA state', 'Days to due', 'Status', 'Assignee'],
      report.rows.map((r) => [r.req.id, r.req.type, r.req.subject, r.req.customer, r.req.region, r.req.law, r.req.received, r.req.due, r.slaState, r.daysToDue === null ? 'n/a' : r.daysToDue, r.req.status, r.req.assignee]),
    )
    logAction({ action: 'Downloaded DSAR fulfilment report (CSV)', target: isAll ? 'Fleet' : report.scope, category: 'report' })
  }
  const exportMD = () => {
    downloadMarkdown(`${reportStem(stemSuffix)}.md`, toMarkdown(report))
    logAction({ action: 'Downloaded DSAR fulfilment report (Markdown)', target: isAll ? 'Fleet' : report.scope, category: 'report' })
  }

  return (
    <ReportShell
      title="DSAR Fulfilment Report"
      subtitle={report.isAll ? 'All customers · entire fleet' : `Customer scope · ${report.scope}`}
      tone={bannerTone[report.overall]}
      statusLabel={report.overallLabel}
      statusIcon={overallIcon[report.overall]}
      backTo="/dsar"
      meta={[`Generated ${report.generatedAt}`, `Prepared by ${report.generatedBy}`, `${report.totals.total} request${report.totals.total === 1 ? '' : 's'} · ${report.totals.slaCompliancePct}% within SLA`]}
      footer={`PLCY Admin Console · DSAR Fulfilment Report · ${report.generatedAt} · Confidential — Internal. Data-subject requests reviewed against statutory deadlines.`}
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
              <p className={`mt-0.5 text-2xl font-bold tracking-tight ${k.label === 'Overdue' && Number(k.value) > 0 ? 'text-rose-600' : k.label === 'At risk' && Number(k.value) > 0 ? 'text-orange-600' : 'text-ink-900'}`}>{k.value}</p>
              <p className="text-[11px] text-ink-400">{k.sub}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReportSection title="By request type">
          <div className="space-y-2.5">
            {report.byType.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-ink-700">{b.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${(b.count / maxType) * 100}%`, backgroundColor: typeBar }} />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-900">{b.count}</span>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="By jurisdiction" note="Governing regime">
          <div className="space-y-2.5">
            {report.byJurisdiction.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-ink-700">{b.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${(b.count / maxJur) * 100}%`, backgroundColor: jurBar }} />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-900">{b.count}</span>
              </div>
            ))}
          </div>
        </ReportSection>
      </div>

      {/* Register */}
      <ReportSection title="Request register" note="Overdue and at-risk first">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3 font-medium">ID</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Customer</th>
                <th className="py-2 pr-3 font-medium">Law</th>
                <th className="py-2 pr-3 font-medium">Due</th>
                <th className="py-2 pr-3 font-medium">SLA</th>
                <th className="py-2 font-medium">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((r) => (
                <tr key={r.req.id} className="break-inside-avoid align-top">
                  <td className="py-2.5 pr-3 font-mono text-xs text-ink-700">{r.req.id}</td>
                  <td className="py-2.5 pr-3"><Badge tone={typeTone[r.req.type]}>{r.req.type}</Badge></td>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-ink-900">{r.req.customer}</p>
                    <p className="text-xs text-ink-400">{regionByCode(r.req.region)?.name ?? r.req.region}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-ink-700">{r.req.law}</td>
                  <td className="py-2.5 pr-3">
                    <p className={`tabular-nums ${r.slaState === 'Breached' ? 'font-semibold text-rose-600' : 'text-ink-700'}`}>{r.req.due}</p>
                    <p className="text-[11px] text-ink-400">{dueLabel(r)}</p>
                  </td>
                  <td className="py-2.5 pr-3"><Badge tone={slaTone[r.slaState]} dot>{r.slaState}</Badge></td>
                  <td className="py-2.5 text-xs text-ink-500">{r.req.assignee === 'unassigned' ? <span className="italic text-ink-400">unassigned</span> : r.req.assignee}</td>
                </tr>
              ))}
              {report.rows.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-ink-400">No data-subject requests in scope.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </ReportShell>
  )
}
