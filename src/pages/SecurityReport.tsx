import { useEffect, useMemo } from 'react'
import { Download, FileText, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { Badge } from '@/components/ui'
import { ReportShell, ReportSection } from '@/components/ReportShell'
import { useSession } from '@/context/Session'
import { useRegistryPromoted } from '@/data/registryStore'
import { currentUser } from '@/data/roles'
import { buildSecurityReport } from '@/data/securityReport'
import type { SecRag, SecurityReport as SecurityReportData } from '@/data/securityReport'
import type { Cve, PatchStatus } from '@/data/ops'
import { downloadCSV, downloadMarkdown, reportStem } from '@/lib/download'

const bannerTone: Record<SecRag, 'green' | 'amber' | 'red'> = { green: 'green', amber: 'amber', red: 'red' }
const overallIcon: Record<SecRag, typeof ShieldCheck> = { green: ShieldCheck, amber: ShieldAlert, red: ShieldX }
const sevTone: Record<Cve['severity'], 'red' | 'orange' | 'yellow'> = { Critical: 'red', High: 'orange', Medium: 'yellow' }
const cveStatusTone: Record<Cve['status'], 'red' | 'orange' | 'green'> = { Open: 'red', Mitigated: 'orange', Patched: 'green' }
const patchTone: Record<PatchStatus, 'green' | 'orange' | 'red'> = { 'Up to date': 'green', 'Patch available': 'orange', 'Critical patch': 'red' }

function stamp(): string {
  const d = new Date()
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

function toMarkdown(r: SecurityReportData): string {
  const L: string[] = []
  L.push('# Security & Vulnerability Report')
  L.push('')
  L.push(`**Status:** ${r.overallLabel}  `)
  L.push(`**Signing:** ${r.integrity.signed} Cosign-signed · SLSA ≥ L3 on ${r.integrity.slsaHigh}  `)
  L.push(`**Promoted platform tag:** ${r.integrity.promotedTag}  `)
  L.push(`**Generated:** ${r.generatedAt} · **Prepared by:** ${r.generatedBy}`)
  L.push('')
  L.push('## Image posture')
  L.push('')
  L.push('| Image | Version | Components | Critical | High | Medium | Signed | SLSA | Patch status | Last scan |')
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  r.images.forEach((i) => L.push(`| ${i.name} | ${i.version} | ${i.components} | ${i.criticalCves} | ${i.highCves} | ${i.mediumCves} | ${i.signed ? 'Cosign' : 'no'} | L${i.slsa} | ${i.patchStatus} | ${i.lastScan} |`))
  L.push('')
  L.push('## CVE register')
  L.push('')
  L.push('| CVE | Severity | Component | Image | Status | Published | Fixed in |')
  L.push('| --- | --- | --- | --- | --- | --- | --- |')
  r.cves.forEach((c) => L.push(`| ${c.id} | ${c.severity} | ${c.component} | ${c.image} | ${c.status} | ${c.published} | ${c.fixedIn} |`))
  L.push('')
  if (r.integrity.quarantined.length) {
    L.push(`> Quarantined (blocked from deploy): ${r.integrity.quarantined.join(', ')}`)
    L.push('')
  }
  L.push('---')
  L.push('_PLCY Admin Console · Confidential — Internal use only._')
  return L.join('\n')
}

export default function SecurityReport() {
  const { logAction } = useSession()
  const promoted = useRegistryPromoted()
  const generatedAt = stamp()
  const report = useMemo(() => buildSecurityReport(promoted, currentUser.name, generatedAt), [promoted, generatedAt])

  useEffect(() => {
    logAction({ action: 'Generated security report', target: 'Platform images', category: 'report' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exportCSV = () => {
    downloadCSV(
      `${reportStem('security-cves')}.csv`,
      ['CVE ID', 'Severity', 'Component', 'Image', 'Status', 'Published', 'Fixed in'],
      report.cves.map((c) => [c.id, c.severity, c.component, c.image, c.status, c.published, c.fixedIn]),
    )
    logAction({ action: 'Downloaded CVE register (CSV)', target: 'Platform images', category: 'report' })
  }
  const exportMD = () => {
    downloadMarkdown(`${reportStem('security')}.md`, toMarkdown(report))
    logAction({ action: 'Downloaded security report (Markdown)', target: 'Platform images', category: 'report' })
  }

  return (
    <ReportShell
      title="Security & Vulnerability Report"
      subtitle="Supply-chain integrity and CVE posture across PLCY platform images"
      tone={bannerTone[report.overall]}
      statusLabel={report.overallLabel}
      statusIcon={overallIcon[report.overall]}
      backTo="/supply-chain"
      meta={[`Generated ${report.generatedAt}`, `Prepared by ${report.generatedBy}`, `Promoted platform tag ${report.integrity.promotedTag}`]}
      footer={`PLCY Admin Console · Security & Vulnerability Report · ${report.generatedAt} · Confidential — Internal use only. Scan results are automated; CVE data reflects the latest nightly scan.`}
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

      {/* Supply-chain integrity */}
      <ReportSection title="Supply-chain integrity" note="Signing & provenance">
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-emerald-900">
              <strong>{report.integrity.signed}</strong> platform images are Cosign-signed, with SLSA ≥ L3 provenance on{' '}
              <strong>{report.integrity.slsaHigh}</strong>. Only signed, provenance-backed artifacts are admitted to the fleet.
              Promoted platform tag: <strong>{report.integrity.promotedTag}</strong>.
            </p>
          </div>
          {report.integrity.criticalPatch.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
              <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <p className="text-rose-900">
                Critical patch outstanding on <strong>{report.integrity.criticalPatch.join(', ')}</strong> — rebuild and roll a
                new signed build across the fleet as soon as possible.
              </p>
            </div>
          )}
          {report.integrity.quarantined.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
              <p className="text-orange-900">
                Quarantined (blocked from deploy): <strong>{report.integrity.quarantined.join(', ')}</strong>.
              </p>
            </div>
          )}
        </div>
      </ReportSection>

      {/* Image posture */}
      <ReportSection title="Image posture" note={`${report.images.length} images`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3 font-medium">Image</th>
                <th className="py-2 pr-3 font-medium">Version</th>
                <th className="py-2 pr-3 font-medium">Components</th>
                <th className="py-2 pr-3 font-medium">CVEs (C/H/M)</th>
                <th className="py-2 pr-3 font-medium">Signed</th>
                <th className="py-2 pr-3 font-medium">SLSA</th>
                <th className="py-2 pr-3 font-medium">Patch status</th>
                <th className="py-2 font-medium">Last scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.images.map((i) => (
                <tr key={i.id} className="break-inside-avoid">
                  <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-ink-900">{i.name}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-ink-500">{i.version}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink-700">{i.components}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    <span className="text-rose-600">{i.criticalCves}c</span> <span className="text-orange-600">{i.highCves}h</span> <span className="text-amber-500">{i.mediumCves}m</span>
                  </td>
                  <td className="py-2.5 pr-3">{i.signed ? <Badge tone="green">Cosign</Badge> : <span className="text-xs text-ink-400">—</span>}</td>
                  <td className="py-2.5 pr-3"><Badge tone="slate">L{i.slsa}</Badge></td>
                  <td className="py-2.5 pr-3"><Badge tone={patchTone[i.patchStatus]} dot>{i.patchStatus}</Badge></td>
                  <td className="py-2.5 whitespace-nowrap text-xs text-ink-500">{i.lastScan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>

      {/* CVE register */}
      <ReportSection title="CVE register" note={`${report.cves.length} tracked · unresolved first`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3 font-medium">CVE</th>
                <th className="py-2 pr-3 font-medium">Severity</th>
                <th className="py-2 pr-3 font-medium">Component</th>
                <th className="py-2 pr-3 font-medium">Image</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Published</th>
                <th className="py-2 font-medium">Fixed in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.cves.map((c) => (
                <tr key={c.id} className="break-inside-avoid">
                  <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-ink-900">{c.id}</td>
                  <td className="py-2.5 pr-3"><Badge tone={sevTone[c.severity]}>{c.severity}</Badge></td>
                  <td className="py-2.5 pr-3 text-ink-700">{c.component}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-ink-500">{c.image}</td>
                  <td className="py-2.5 pr-3"><Badge tone={cveStatusTone[c.status]} dot>{c.status}</Badge></td>
                  <td className="py-2.5 pr-3 whitespace-nowrap text-xs text-ink-500">{c.published}</td>
                  <td className="py-2.5 font-mono text-xs text-ink-700">{c.fixedIn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </ReportShell>
  )
}
