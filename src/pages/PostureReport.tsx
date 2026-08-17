import { useEffect, useMemo } from 'react'
import { Download, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { Badge } from '@/components/ui'
import { ReportShell, ReportSection } from '@/components/ReportShell'
import { useCustomerScope } from '@/context/CustomerScope'
import { useSession } from '@/context/Session'
import { useRegistryPromoted } from '@/data/registryStore'
import { currentUser } from '@/data/roles'
import { buildPostureReport } from '@/data/report'
import type { Rag, Sev, PostureReport as PostureReportData } from '@/data/report'
import { downloadMarkdown, reportStem } from '@/lib/download'

const ragDot: Record<Rag, string> = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500' }
const sevBadge: Record<Sev, 'red' | 'orange' | 'yellow'> = { critical: 'red', high: 'orange', medium: 'yellow' }
const bannerTone: Record<Rag, 'green' | 'amber' | 'red'> = { green: 'green', amber: 'amber', red: 'red' }
const overallIcon: Record<Rag, typeof ShieldCheck> = { green: ShieldCheck, amber: ShieldAlert, red: ShieldX }

function stamp(): string {
  const d = new Date()
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

/** Render the posture report as Markdown for the Download action. */
function toMarkdown(r: PostureReportData): string {
  const L: string[] = []
  L.push(`# Fleet Governance Posture Report`)
  L.push('')
  L.push(`**Scope:** ${r.isAll ? 'All customers · entire estate' : r.scope}  `)
  L.push(`**Status:** ${r.overallLabel}  `)
  L.push(`**Generated:** ${r.generatedAt} · **Prepared by:** ${r.generatedBy}  `)
  L.push(`_Source: live control-plane metadata (no customer content)._`)
  L.push('')
  L.push(`## Executive summary`)
  L.push('')
  L.push(`| Metric | Value | |`)
  L.push(`| --- | --- | --- |`)
  r.kpis.forEach((k) => L.push(`| ${k.label} | ${k.value} | ${k.sub} |`))
  L.push('')
  L.push(`## Posture by domain`)
  L.push('')
  L.push(`| Domain | Status | Value | Note |`)
  L.push(`| --- | --- | --- | --- |`)
  r.signals.forEach((s) => L.push(`| ${s.label}${s.platform ? ' (platform-wide)' : ''} | ${s.rag.toUpperCase()} | ${s.value} | ${s.note} |`))
  L.push('')
  L.push(`## Risk & attention register (${r.risks.length} open)`)
  L.push('')
  if (r.risks.length === 0) {
    L.push(`_No open risks in scope._`)
  } else {
    L.push(`| Severity | Item | Detail | Domain |`)
    L.push(`| --- | --- | --- | --- |`)
    r.risks.forEach((x) => L.push(`| ${x.sev} | ${x.title} | ${x.detail} | ${x.domain} |`))
  }
  L.push('')
  L.push(`## Compliance by domain`)
  L.push('')
  r.compliance.forEach((c) => L.push(`- ${c.name}: ${c.score}%`))
  L.push('')
  L.push(`## Control coverage`)
  L.push('')
  L.push(`- Policy packs: ${r.coverage.packs}`)
  L.push(`- Atomic controls: ${r.coverage.controls}`)
  L.push(`- Primitives: ${r.coverage.primitives} · Frameworks: ${r.coverage.frameworks} · Industry packs: ${r.coverage.industries}`)
  L.push('')
  L.push(`---`)
  L.push(`_PLCY Admin Console · Confidential — Internal use only._`)
  return L.join('\n')
}

export default function PostureReport() {
  const { scope, isAll } = useCustomerScope()
  const { logAction } = useSession()
  const promoted = useRegistryPromoted()

  const report = useMemo(
    () => buildPostureReport(scope, isAll, promoted, currentUser.name, stamp()),
    [scope, isAll, promoted],
  )

  useEffect(() => {
    logAction({ action: 'Generated posture report', target: isAll ? 'Fleet (all customers)' : scope, category: 'report' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, isAll])

  const maxScore = 100

  return (
    <ReportShell
      title="Fleet Governance Posture Report"
      subtitle={report.isAll ? 'All customers · entire estate' : `Customer scope · ${report.scope}`}
      tone={bannerTone[report.overall]}
      statusLabel={report.overallLabel}
      statusIcon={overallIcon[report.overall]}
      meta={[`Generated ${report.generatedAt}`, `Prepared by ${report.generatedBy}`, 'Source: live control-plane metadata (no customer content)']}
      footer={`PLCY Admin Console · Fleet Governance Posture Report · ${report.generatedAt} · Confidential — Internal use only. Figures are point-in-time control-plane metadata; no customer prompt or payload data is included.`}
      actions={
        <button
          className="btn-secondary"
          onClick={() => {
            downloadMarkdown(`${reportStem(isAll ? 'posture' : `posture-${report.scope.toLowerCase().replace(/\s+/g, '-')}`)}.md`, toMarkdown(report))
            logAction({ action: 'Downloaded posture report (Markdown)', target: isAll ? 'Fleet' : report.scope, category: 'report' })
          }}
        >
          <Download className="h-4 w-4" />
          Download Markdown
        </button>
      }
    >
      {/* Executive summary KPIs */}
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

      {/* Posture by domain */}
      <ReportSection title="Posture by domain" note="Red / Amber / Green per control area">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {report.signals.map((s) => (
            <div key={s.key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ragDot[s.rag]}`} />
                <div>
                  <p className="text-sm font-medium text-ink-800">
                    {s.label}
                    {s.platform && <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-ink-400">platform-wide</span>}
                  </p>
                  <p className="text-[11px] text-ink-400">{s.note}</p>
                </div>
              </div>
              <span className="text-lg font-bold tabular-nums text-ink-900">{s.value}</span>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Risk & attention register */}
      <ReportSection title="Risk & attention register" note={`${report.risks.length} open`}>
        {report.risks.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">No open risks in scope — posture is clear.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3 font-medium">Severity</th>
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 font-medium">Detail</th>
                <th className="py-2 font-medium">Domain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.risks.map((r, i) => (
                <tr key={i} className="break-inside-avoid align-top">
                  <td className="py-2.5 pr-3">
                    <Badge tone={sevBadge[r.sev]} dot>{r.sev}</Badge>
                  </td>
                  <td className="py-2.5 pr-3 font-medium text-ink-900">{r.title}</td>
                  <td className="py-2.5 pr-3 text-ink-500">{r.detail}</td>
                  <td className="py-2.5 text-ink-500">{r.domain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>

      {/* Compliance by domain (platform-wide) */}
      <ReportSection title="Compliance by domain" note={report.isAll ? 'Fleet aggregate' : 'Platform-wide'}>
        <div className="space-y-2.5">
          {report.compliance.map((c) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-sm text-ink-700">{c.name}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${c.score >= 90 ? 'bg-emerald-500' : c.score >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${(c.score / maxScore) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-900">{c.score}%</span>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Coverage + risk mix */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ReportSection title="Control coverage" note="Policy catalog">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Cov label="Policy packs" value={report.coverage.packs} />
            <Cov label="Atomic controls" value={report.coverage.controls} />
            <Cov label="Primitives" value={report.coverage.primitives} />
            <Cov label="Frameworks" value={report.coverage.frameworks} />
            <Cov label="Industry packs" value={report.coverage.industries} />
          </div>
        </ReportSection>
        <ReportSection title="Model risk mix" note={report.isAll ? 'Fleet aggregate' : 'Platform-wide'}>
          <div className="space-y-2">
            {report.riskMix.map((r) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: r.color }} />
                <span className="flex-1 text-sm text-ink-700">{r.name}</span>
                <span className="text-sm font-semibold tabular-nums text-ink-900">{r.value}%</span>
              </div>
            ))}
          </div>
        </ReportSection>
      </div>
    </ReportShell>
  )
}

function Cov({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="text-xl font-bold text-ink-900">{value}</p>
    </div>
  )
}
