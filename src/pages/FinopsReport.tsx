import { useEffect, useMemo } from 'react'
import { Download, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Badge } from '@/components/ui'
import { ReportShell, ReportSection } from '@/components/ReportShell'
import { useCustomerScope } from '@/context/CustomerScope'
import { useSession } from '@/context/Session'
import { currentUser } from '@/data/roles'
import { buildFinopsReport, fmtFinMoney } from '@/data/finopsReport'
import type { FinRag, FinopsReport as FinopsReportData } from '@/data/finopsReport'
import { downloadCSV, downloadMarkdown, reportStem } from '@/lib/download'

const bannerTone: Record<FinRag, 'green' | 'amber' | 'red'> = { green: 'green', amber: 'amber', red: 'red' }
const overallIcon: Record<FinRag, typeof TrendingUp> = { green: TrendingUp, amber: Minus, red: TrendingDown }

function stamp(): string {
  const d = new Date()
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}
const marginTone = (n: number) => (n < 0 ? 'text-rose-600' : 'text-ink-900')
const pctTone = (p: number | null) => (p === null ? 'text-ink-400' : p < 0 ? 'text-rose-600' : p < 40 ? 'text-orange-600' : 'text-emerald-600')

function toMarkdown(r: FinopsReportData): string {
  const L: string[] = []
  L.push('# Cost & Margin Report')
  L.push('')
  L.push(`**Scope:** ${r.isAll ? 'All customers · entire fleet' : r.scope}  `)
  L.push(`**Status:** ${r.overallLabel}  `)
  L.push(`**MRR:** ${fmtFinMoney(r.totals.mrr)} · **Cost:** ${fmtFinMoney(r.totals.cost)} · **Margin:** ${fmtFinMoney(r.totals.margin)} (${r.totals.marginPct}%)  `)
  L.push(`**Generated:** ${r.generatedAt} · **Prepared by:** ${r.generatedBy}`)
  L.push('')
  L.push('## Cost by component')
  L.push('')
  r.components.forEach((c) => L.push(`- ${c.name}: ${fmtFinMoney(c.value)}`))
  L.push('')
  L.push('## Margin by account (worst first)')
  L.push('')
  L.push('| Customer | Plan | Region | MRR | Cost | Margin | Margin % |')
  L.push('| --- | --- | --- | --- | --- | --- | --- |')
  r.rows.forEach((x) => L.push(`| ${x.customer} | ${x.plan} | ${x.regionCode} | ${fmtFinMoney(x.mrr)} | ${fmtFinMoney(x.cost)} | ${fmtFinMoney(x.margin)} | ${x.marginPct === null ? 'n/a' : x.marginPct + '%'} |`))
  L.push('')
  L.push('---')
  L.push('_PLCY Admin Console · Confidential — Internal. Costs are modelled monthly run-rate estimates._')
  return L.join('\n')
}

export default function FinopsReport() {
  const { scope, isAll } = useCustomerScope()
  const { logAction } = useSession()
  const generatedAt = stamp()
  const report = useMemo(() => buildFinopsReport(scope, isAll, currentUser.name, generatedAt), [scope, isAll, generatedAt])

  useEffect(() => {
    logAction({ action: 'Generated cost & margin report', target: isAll ? 'Fleet (all customers)' : scope, category: 'report' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, isAll])

  const maxComponent = Math.max(1, ...report.components.map((c) => c.value))

  const exportCSV = () => {
    downloadCSV(
      `${reportStem(isAll ? 'cost-margin' : `cost-margin-${report.scope.toLowerCase().replace(/\s+/g, '-')}`)}.csv`,
      ['Customer', 'Plan', 'Region', 'Sovereignty', 'MRR', 'Cost', 'Margin', 'Margin %', 'Nodes', 'GPU nodes'],
      report.rows.map((r) => [r.customer, r.plan, r.regionCode, r.sovereignty, r.mrr, r.cost, r.margin, r.marginPct === null ? 'n/a' : `${r.marginPct}%`, r.nodes, r.gpuNodes]),
    )
    logAction({ action: 'Downloaded cost & margin report (CSV)', target: isAll ? 'Fleet' : report.scope, category: 'report' })
  }
  const exportMD = () => {
    downloadMarkdown(`${reportStem(isAll ? 'cost-margin' : `cost-margin-${report.scope.toLowerCase().replace(/\s+/g, '-')}`)}.md`, toMarkdown(report))
    logAction({ action: 'Downloaded cost & margin report (Markdown)', target: isAll ? 'Fleet' : report.scope, category: 'report' })
  }

  return (
    <ReportShell
      title="Cost & Margin Report"
      subtitle={report.isAll ? 'All customers · entire fleet' : `Customer scope · ${report.scope}`}
      tone={bannerTone[report.overall]}
      statusLabel={report.overallLabel}
      statusIcon={overallIcon[report.overall]}
      backTo="/finops"
      meta={[`Generated ${report.generatedAt}`, `Prepared by ${report.generatedBy}`, 'Costs are modelled monthly run-rate estimates']}
      footer={`PLCY Admin Console · Cost & Margin Report · ${report.generatedAt} · Confidential — Internal. Infrastructure costs are modelled monthly run-rate estimates, not billed AWS spend.`}
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
              <p className={`mt-0.5 text-2xl font-bold tracking-tight ${k.label === 'Gross margin' && report.totals.margin < 0 ? 'text-rose-600' : 'text-ink-900'}`}>{k.value}</p>
              <p className="text-[11px] text-ink-400">{k.sub}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Cost by component */}
      <ReportSection title="Cost by component" note="Monthly infrastructure run-rate">
        <div className="space-y-2.5">
          {report.components.map((c) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-sm text-ink-700">{c.name}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${(c.value / maxComponent) * 100}%`, backgroundColor: c.color }} />
              </div>
              <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-900">{fmtFinMoney(c.value)}</span>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Margin by account */}
      <ReportSection title="Margin by account" note="Worst margin first">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3 font-medium">Customer</th>
                <th className="py-2 pr-3 font-medium">Plan</th>
                <th className="py-2 pr-3 font-medium">Region</th>
                <th className="py-2 pr-3 font-medium">MRR</th>
                <th className="py-2 pr-3 font-medium">Cost</th>
                <th className="py-2 pr-3 font-medium">Margin</th>
                <th className="py-2 font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((r) => (
                <tr key={r.customer} className="break-inside-avoid">
                  <td className="py-2.5 pr-3 font-medium text-ink-900">{r.customer}</td>
                  <td className="py-2.5 pr-3"><Badge tone="slate">{r.plan}</Badge></td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-ink-500">{r.regionCode}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink-700">{fmtFinMoney(r.mrr)}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink-700">{fmtFinMoney(r.cost)}</td>
                  <td className={`py-2.5 pr-3 font-semibold tabular-nums ${marginTone(r.margin)}`}>{fmtFinMoney(r.margin)}</td>
                  <td className={`py-2.5 font-semibold tabular-nums ${pctTone(r.marginPct)}`}>{r.marginPct === null ? '—' : `${r.marginPct}%`}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-ink-500" colSpan={3}>Total ({report.rows.length})</td>
                <td className="py-2.5 pr-3 font-bold tabular-nums text-ink-900">{fmtFinMoney(report.totals.mrr)}</td>
                <td className="py-2.5 pr-3 font-bold tabular-nums text-ink-900">{fmtFinMoney(report.totals.cost)}</td>
                <td className={`py-2.5 pr-3 font-bold tabular-nums ${marginTone(report.totals.margin)}`}>{fmtFinMoney(report.totals.margin)}</td>
                <td className={`py-2.5 font-bold tabular-nums ${pctTone(report.totals.marginPct)}`}>{report.totals.marginPct}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportSection>
    </ReportShell>
  )
}
