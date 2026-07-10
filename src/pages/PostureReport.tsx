import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { Badge } from '@/components/ui'
import { useCustomerScope } from '@/context/CustomerScope'
import { useSession } from '@/context/Session'
import { useRegistryPromoted } from '@/data/registryStore'
import { currentUser } from '@/data/roles'
import { buildPostureReport } from '@/data/report'
import type { Rag, Sev } from '@/data/report'

const ragDot: Record<Rag, string> = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500' }
const sevBadge: Record<Sev, 'red' | 'orange' | 'yellow'> = { critical: 'red', high: 'orange', medium: 'yellow' }
const overallIcon: Record<Rag, typeof ShieldCheck> = { green: ShieldCheck, amber: ShieldAlert, red: ShieldX }
const overallBand: Record<Rag, string> = {
  green: 'from-emerald-600 to-emerald-500',
  amber: 'from-amber-600 to-amber-500',
  red: 'from-rose-600 to-rose-500',
}

function stamp(): string {
  const d = new Date()
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

/** Small labelled section wrapper with a print-friendly card frame. */
function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 print:mt-4 print:border-slate-300 print:shadow-none">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-700">{title}</h2>
        {note && <span className="text-xs text-ink-400">{note}</span>}
      </div>
      {children}
    </section>
  )
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

  const OverallIcon = overallIcon[report.overall]
  const maxScore = 100

  return (
    <div className="mx-auto max-w-4xl print:max-w-none">
      {/* Action bar — hidden when printing */}
      <div className="mb-5 flex items-center justify-between print:hidden">
        <Link to="/" className="btn-ghost -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>

      {/* Report banner */}
      <div className={`rounded-2xl bg-gradient-to-r ${overallBand[report.overall]} px-6 py-6 text-white print:rounded-xl`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/70">PLCY · Confidential — Internal</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Fleet Governance Posture Report</h1>
            <p className="mt-1 text-sm text-white/80">
              {report.isAll ? 'All customers · entire estate' : `Customer scope · ${report.scope}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-inset ring-white/30">
              <OverallIcon className="h-4 w-4" />
              {report.overallLabel}
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-xs text-white/80">
          <span>Generated {report.generatedAt}</span>
          <span>Prepared by {report.generatedBy}</span>
          <span>Source: live control-plane metadata (no customer content)</span>
        </div>
      </div>

      {/* Executive summary KPIs */}
      <Section title="Executive summary">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {report.kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 ">
              <p className="text-xs font-medium text-ink-500">{k.label}</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink-900">{k.value}</p>
              <p className="text-[11px] text-ink-400">{k.sub}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Posture by domain */}
      <Section title="Posture by domain" note="Red / Amber / Green per control area">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {report.signals.map((s) => (
            <div key={s.key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 ">
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
      </Section>

      {/* Risk & attention register */}
      <Section title="Risk & attention register" note={`${report.risks.length} open`}>
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
      </Section>

      {/* Compliance by domain (platform-wide) */}
      <Section title="Compliance by domain" note={report.isAll ? 'Fleet aggregate' : 'Platform-wide'}>
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
      </Section>

      {/* Coverage + risk mix */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Section title="Control coverage" note="Policy catalog">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Cov label="Policy packs" value={report.coverage.packs} />
            <Cov label="Atomic controls" value={report.coverage.controls} />
            <Cov label="Primitives" value={report.coverage.primitives} />
            <Cov label="Frameworks" value={report.coverage.frameworks} />
            <Cov label="Industry packs" value={report.coverage.industries} />
          </div>
        </Section>
        <Section title="Model risk mix" note={report.isAll ? 'Fleet aggregate' : 'Platform-wide'}>
          <div className="space-y-2">
            {report.riskMix.map((r) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: r.color }} />
                <span className="flex-1 text-sm text-ink-700">{r.name}</span>
                <span className="text-sm font-semibold tabular-nums text-ink-900">{r.value}%</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Footer */}
      <p className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] text-ink-400">
        PLCY Admin Console · Fleet Governance Posture Report · {report.generatedAt} · Confidential — Internal use only.
        Figures are point-in-time control-plane metadata; no customer prompt or payload data is included.
      </p>
    </div>
  )
}

function Cov({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2 ">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="text-xl font-bold text-ink-900">{value}</p>
    </div>
  )
}
