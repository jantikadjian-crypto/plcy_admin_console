import { useEffect, useMemo } from 'react'
import { Download, FileText, ShieldCheck, AlertTriangle, OctagonAlert, Users, FileClock } from 'lucide-react'
import { Badge } from '@/components/ui'
import { ReportShell, ReportSection } from '@/components/ReportShell'
import { useCustomerScope } from '@/context/CustomerScope'
import { useSession } from '@/context/Session'
import { currentUser } from '@/data/roles'
import { buildIncidentReport } from '@/data/incidentReport'
import type { IncRag, IncidentReport as IncidentReportData } from '@/data/incidentReport'
import type { IncidentSeverity, IncidentStatus, RegNoticeStatus } from '@/data/incidents'
import { downloadCSV, downloadMarkdown, reportStem } from '@/lib/download'

const bannerTone: Record<IncRag, 'green' | 'amber' | 'red'> = { green: 'green', amber: 'amber', red: 'red' }
const overallIcon: Record<IncRag, typeof ShieldCheck> = { green: ShieldCheck, amber: AlertTriangle, red: OctagonAlert }

const sevTone: Record<IncidentSeverity, 'red' | 'orange' | 'yellow' | 'slate'> = { Critical: 'red', High: 'orange', Medium: 'yellow', Low: 'slate' }
const sevBar: Record<IncidentSeverity, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#94a3b8' }
const statusTone: Record<IncidentStatus, 'red' | 'purple' | 'blue' | 'orange' | 'green'> = {
  Open: 'red', Triage: 'purple', Investigating: 'blue', Remediation: 'orange', Resolved: 'green',
}
const noticeTone: Record<RegNoticeStatus, 'green' | 'orange' | 'red' | 'slate'> = { Filed: 'green', Pending: 'orange', Overdue: 'red', 'Not required': 'slate' }
const riskColor = (n: number) => (n >= 80 ? 'text-rose-600' : n >= 60 ? 'text-orange-600' : n >= 40 ? 'text-amber-600' : 'text-emerald-600')

function stamp(): string {
  const d = new Date()
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

function toMarkdown(r: IncidentReportData): string {
  const L: string[] = []
  L.push('# Incident Post-Mortem Report')
  L.push('')
  L.push(`**Scope:** ${r.isAll ? 'All customers · entire fleet' : r.scope}  `)
  L.push(`**Status:** ${r.overallLabel}  `)
  L.push(`**Incidents:** ${r.totals.total} · **Open:** ${r.totals.open} · **Critical:** ${r.totals.critical} · **Data exposure:** ${r.totals.dataExposure}  `)
  L.push(`**Generated:** ${r.generatedAt} · **Prepared by:** ${r.generatedBy}`)
  L.push('')
  L.push('## Incident register')
  L.push('')
  L.push('| ID | Title | Severity | Status | Customer | Risk | Users | Data exposure |')
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- |')
  r.rows.forEach((i) => L.push(`| ${i.id} | ${i.title} | ${i.severity} | ${i.status} | ${i.customer} | ${i.riskScore} | ${i.usersAffected} | ${i.dataExposure ? 'YES' : 'no'} |`))
  L.push('')
  if (r.notices.length) {
    L.push('## Regulatory obligations')
    L.push('')
    L.push('| Regulator | Incident | Requirement | Deadline | Status |')
    L.push('| --- | --- | --- | --- | --- |')
    r.notices.forEach((n) => L.push(`| ${n.regulator} | ${n.incident} | ${n.requirement} | ${n.deadline} | ${n.status} |`))
    L.push('')
  }
  L.push('## Post-mortems')
  L.push('')
  r.postmortems.forEach((i) => {
    L.push(`### ${i.id} — ${i.title}`)
    L.push('')
    L.push(`**Severity:** ${i.severity} · **Status:** ${i.status} · **Customer:** ${i.customer} · **Model:** ${i.model}  `)
    L.push(`**Impact:** ${i.usersAffected} users · ${i.requestsImpacted} requests · data exposure: ${i.dataExposure ? 'yes' : 'no'}`)
    L.push('')
    L.push(`**Root cause.** ${i.rootCause}`)
    L.push('')
    L.push('**Remediation.**')
    i.remediation.forEach((a) => L.push(`- ${a}`))
    L.push('')
  })
  L.push('---')
  L.push('_PLCY Admin Console · Confidential — Internal. Incident review for governance and regulatory purposes._')
  return L.join('\n')
}

export default function IncidentReport() {
  const { scope, isAll } = useCustomerScope()
  const { logAction } = useSession()
  const generatedAt = stamp()
  const report = useMemo(() => buildIncidentReport(scope, isAll, currentUser.name, generatedAt), [scope, isAll, generatedAt])

  useEffect(() => {
    logAction({ action: 'Generated incident post-mortem report', target: isAll ? 'Fleet (all customers)' : scope, category: 'report' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, isAll])

  const maxSev = Math.max(1, ...report.severityMix.map((b) => b.count))
  const stemSuffix = isAll ? 'incidents' : `incidents-${report.scope.toLowerCase().replace(/\s+/g, '-')}`

  const exportCSV = () => {
    downloadCSV(
      `${reportStem(stemSuffix)}.csv`,
      ['ID', 'Title', 'Severity', 'Status', 'App', 'Model', 'Customer', 'Risk', 'Users affected', 'Requests impacted', 'Data exposure', 'Reported'],
      report.rows.map((i) => [i.id, i.title, i.severity, i.status, i.app, i.model, i.customer, i.riskScore, i.usersAffected, i.requestsImpacted, i.dataExposure ? 'YES' : 'no', i.reported]),
    )
    logAction({ action: 'Downloaded incident post-mortem report (CSV)', target: isAll ? 'Fleet' : report.scope, category: 'report' })
  }
  const exportMD = () => {
    downloadMarkdown(`${reportStem(stemSuffix)}.md`, toMarkdown(report))
    logAction({ action: 'Downloaded incident post-mortem report (Markdown)', target: isAll ? 'Fleet' : report.scope, category: 'report' })
  }

  return (
    <ReportShell
      title="Incident Post-Mortem Report"
      subtitle={report.isAll ? 'All customers · entire fleet' : `Customer scope · ${report.scope}`}
      tone={bannerTone[report.overall]}
      statusLabel={report.overallLabel}
      statusIcon={overallIcon[report.overall]}
      backTo="/incidents"
      meta={[`Generated ${report.generatedAt}`, `Prepared by ${report.generatedBy}`, `${report.totals.total} incident${report.totals.total === 1 ? '' : 's'} reviewed`]}
      footer={`PLCY Admin Console · Incident Post-Mortem Report · ${report.generatedAt} · Confidential — Internal. Incident review for governance and regulatory purposes.`}
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
              <p className={`mt-0.5 text-2xl font-bold tracking-tight ${(k.label === 'Data exposure' || k.label === 'Critical') && Number(k.value) > 0 ? 'text-rose-600' : 'text-ink-900'}`}>{k.value}</p>
              <p className="text-[11px] text-ink-400">{k.sub}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Severity mix */}
      {report.severityMix.length > 0 && (
        <ReportSection title="Severity mix" note="Incidents in scope by severity">
          <div className="space-y-2.5">
            {report.severityMix.map((b) => (
              <div key={b.severity} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm text-ink-700">{b.severity}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${(b.count / maxSev) * 100}%`, backgroundColor: sevBar[b.severity] }} />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-900">{b.count}</span>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Incident register */}
      <ReportSection title="Incident register" note="Most severe first">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3 font-medium">ID</th>
                <th className="py-2 pr-3 font-medium">Incident</th>
                <th className="py-2 pr-3 font-medium">Severity</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Customer</th>
                <th className="py-2 pr-3 font-medium">Risk</th>
                <th className="py-2 font-medium">Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((i) => (
                <tr key={i.id} className="break-inside-avoid align-top">
                  <td className="py-2.5 pr-3 font-mono text-xs text-ink-500">{i.id}</td>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-ink-900">{i.title}</p>
                    <p className="text-xs text-ink-400">{i.app} · {i.model}{i.dataExposure ? ' · data exposure' : ''}</p>
                  </td>
                  <td className="py-2.5 pr-3"><Badge tone={sevTone[i.severity]}>{i.severity}</Badge></td>
                  <td className="py-2.5 pr-3"><Badge tone={statusTone[i.status]}>{i.status}</Badge></td>
                  <td className="py-2.5 pr-3 text-ink-700">{i.customer}</td>
                  <td className={`py-2.5 pr-3 font-bold tabular-nums ${riskColor(i.riskScore)}`}>{i.riskScore}</td>
                  <td className="py-2.5 tabular-nums text-ink-700">{i.usersAffected}</td>
                </tr>
              ))}
              {report.rows.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-ink-400">No incidents in scope.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ReportSection>

      {/* Regulatory obligations */}
      {report.notices.length > 0 && (
        <ReportSection title="Regulatory obligations" note="Reporting triggered by these incidents">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-3 font-medium">Regulator</th>
                  <th className="py-2 pr-3 font-medium">Incident</th>
                  <th className="py-2 pr-3 font-medium">Requirement</th>
                  <th className="py-2 pr-3 font-medium">Deadline</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.notices.map((n, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 pr-3 font-medium text-ink-900">{n.regulator}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-ink-500">{n.incident}</td>
                    <td className="py-2.5 pr-3 text-ink-700">{n.requirement}</td>
                    <td className="py-2.5 pr-3 text-xs text-ink-500">{n.deadline}</td>
                    <td className="py-2.5"><Badge tone={noticeTone[n.status]} dot>{n.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>
      )}

      {/* Post-mortems */}
      <ReportSection title="Post-mortems" note="Root cause & remediation for Critical and High incidents">
        <div className="space-y-4">
          {report.postmortems.map((i) => (
            <div key={i.id} className="break-inside-avoid rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-ink-500">{i.id}</span>
                <Badge tone={sevTone[i.severity]}>{i.severity}</Badge>
                <Badge tone={statusTone[i.status]}>{i.status}</Badge>
                <Badge tone="slate">{i.customer}</Badge>
                {i.dataExposure && <Badge tone="red"><AlertTriangle className="h-3 w-3" />Data exposure</Badge>}
              </div>
              <h4 className="mt-2 text-sm font-semibold text-ink-900">{i.title}</h4>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-ink-400">
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{i.usersAffected} users · {i.requestsImpacted} requests</span>
                <span className="inline-flex items-center gap-1"><FileClock className="h-3 w-3" />Reported {i.reported}</span>
                <span>{i.app} · {i.model}</span>
              </div>
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
                <span className="font-semibold">Root cause. </span>{i.rootCause}
              </div>
              <div className="mt-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">Remediation</p>
                <ol className="list-inside list-decimal space-y-0.5 text-[13px] text-ink-700">
                  {i.remediation.map((a, idx) => <li key={idx}>{a}</li>)}
                </ol>
              </div>
            </div>
          ))}
          {report.postmortems.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-ink-400">No Critical or High incidents in scope — nothing requiring a post-mortem.</p>
          )}
        </div>
      </ReportSection>
    </ReportShell>
  )
}
