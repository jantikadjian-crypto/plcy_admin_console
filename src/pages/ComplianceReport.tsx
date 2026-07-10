import { useEffect } from 'react'
import { Download, FileText, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui'
import { ReportShell, ReportSection } from '@/components/ReportShell'
import { useSession } from '@/context/Session'
import { currentUser } from '@/data/roles'
import { frameworks, complianceControls, complianceTotals, frameworkStatusTone } from '@/data/compliance'
import { downloadCSV, downloadMarkdown, reportStem } from '@/lib/download'

function stamp(): string {
  const d = new Date()
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

const controlTone = (s: string): 'green' | 'red' | 'slate' | 'orange' =>
  s === 'Passed' ? 'green' : s === 'Failed' ? 'red' : s === 'N/A' ? 'slate' : 'orange'

function toMarkdown(generatedAt: string): string {
  const L: string[] = []
  L.push('# Compliance Attestation Report')
  L.push('')
  L.push(`**Overall compliance:** ${complianceTotals.overall}%  `)
  L.push(`**Controls passing:** ${complianceTotals.passed}/${complianceTotals.total}  `)
  L.push(`**Frameworks:** ${frameworks.length} tracked · ${complianceTotals.compliant} compliant · ${complianceTotals.gaps} gap  `)
  L.push(`**Generated:** ${generatedAt} · **Prepared by:** ${currentUser.name}`)
  L.push('')
  L.push('## Framework coverage')
  L.push('')
  L.push('| Framework | Status | Score | Controls |')
  L.push('| --- | --- | --- | --- |')
  frameworks.forEach((f) => L.push(`| ${f.name} | ${f.status} | ${f.score}% | ${f.passed}/${f.total} |`))
  L.push('')
  L.push('## Control evidence')
  L.push('')
  L.push('| Control | Framework | Description | Status | Owner | Last checked |')
  L.push('| --- | --- | --- | --- | --- | --- |')
  complianceControls.forEach((c) => L.push(`| ${c.id} | ${c.framework} | ${c.description} | ${c.status} | ${c.owner} | ${c.checked} |`))
  L.push('')
  L.push('---')
  L.push('_PLCY Admin Console · Confidential — Internal use only._')
  return L.join('\n')
}

export default function ComplianceReport() {
  const { logAction } = useSession()
  const generatedAt = stamp()
  const overall = complianceTotals.overall
  const tone = overall >= 90 ? 'green' : overall >= 75 ? 'amber' : 'red'
  const statusLabel = complianceTotals.gaps === 0 ? 'Attestation ready' : `${complianceTotals.gaps} framework gap${complianceTotals.gaps === 1 ? '' : 's'}`

  useEffect(() => {
    logAction({ action: 'Generated compliance report', target: 'All frameworks', category: 'report' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exportCSV = () => {
    downloadCSV(
      `${reportStem('compliance-evidence')}.csv`,
      ['Control ID', 'Framework', 'Description', 'Status', 'Owner', 'Last checked'],
      complianceControls.map((c) => [c.id, c.framework, c.description, c.status, c.owner, c.checked]),
    )
    logAction({ action: 'Downloaded compliance evidence (CSV)', target: 'Control evidence', category: 'report' })
  }
  const exportMD = () => {
    downloadMarkdown(`${reportStem('compliance')}.md`, toMarkdown(generatedAt))
    logAction({ action: 'Downloaded compliance report (Markdown)', target: 'All frameworks', category: 'report' })
  }

  return (
    <ReportShell
      title="Compliance Attestation Report"
      subtitle="Framework coverage and control evidence across the PLCY platform"
      tone={tone}
      statusLabel={statusLabel}
      statusIcon={complianceTotals.gaps === 0 ? ShieldCheck : ShieldAlert}
      backTo="/compliance"
      meta={[`Generated ${generatedAt}`, `Prepared by ${currentUser.name}`, 'Evidence auto-evaluated nightly · control-plane metadata only']}
      footer={`PLCY Admin Console · Compliance Attestation Report · ${generatedAt} · Confidential — Internal use only. Control results are automated evaluations; formal certification requires an accredited auditor.`}
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi label="Overall compliance" value={`${overall}%`} sub="Weighted" />
          <Kpi label="Controls passing" value={`${complianceTotals.passed}/${complianceTotals.total}`} sub="Auto-evaluated" />
          <Kpi label="Frameworks tracked" value={String(frameworks.length)} sub={`${complianceTotals.compliant} compliant`} />
          <Kpi label="Open gaps" value={String(complianceTotals.gaps)} sub="Framework-level" />
        </div>
      </ReportSection>

      {/* Framework coverage */}
      <ReportSection title="Framework coverage" note={`${frameworks.length} frameworks`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
              <th className="py-2 pr-3 font-medium">Framework</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Score</th>
              <th className="py-2 font-medium">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {frameworks.map((f) => (
              <tr key={f.name} className="break-inside-avoid">
                <td className="py-2.5 pr-3 font-medium text-ink-900">{f.name}</td>
                <td className="py-2.5 pr-3"><Badge tone={frameworkStatusTone[f.status]} dot>{f.status}</Badge></td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${f.score >= 90 ? 'bg-emerald-500' : f.score >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${f.score}%` }} />
                    </div>
                    <span className="font-semibold tabular-nums text-ink-900">{f.score}%</span>
                  </div>
                </td>
                <td className="py-2.5 tabular-nums text-ink-500">{f.passed}/{f.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportSection>

      {/* Control evidence */}
      <ReportSection title="Control evidence" note={`${complianceControls.length} latest evaluations`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
              <th className="py-2 pr-3 font-medium">Control</th>
              <th className="py-2 pr-3 font-medium">Framework</th>
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Owner</th>
              <th className="py-2 font-medium">Checked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complianceControls.map((c) => (
              <tr key={c.id + c.framework} className="break-inside-avoid align-top">
                <td className="py-2.5 pr-3 font-mono text-xs text-ink-700">{c.id}</td>
                <td className="py-2.5 pr-3 text-ink-700">{c.framework}</td>
                <td className="py-2.5 pr-3 text-ink-500">{c.description}</td>
                <td className="py-2.5 pr-3"><Badge tone={controlTone(c.status)} dot>{c.status}</Badge></td>
                <td className="py-2.5 pr-3 text-ink-500">{c.owner}</td>
                <td className="py-2.5 whitespace-nowrap text-ink-500">{c.checked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportSection>
    </ReportShell>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink-900">{value}</p>
      <p className="text-[11px] text-ink-400">{sub}</p>
    </div>
  )
}
