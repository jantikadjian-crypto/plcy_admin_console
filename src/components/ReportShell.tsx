import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Shared frame for every printable report in the console (posture, compliance,
 * …). Gives each report the same document look: a coloured status banner, a
 * `print:hidden` action bar (Back · optional Download · Print), and a
 * consistent footer. Report-specific content goes in <ReportSection> blocks.
 */
export type BannerTone = 'green' | 'amber' | 'red' | 'brand'

const bannerBand: Record<BannerTone, string> = {
  green: 'from-emerald-600 to-emerald-500',
  amber: 'from-amber-600 to-amber-500',
  red: 'from-rose-600 to-rose-500',
  brand: 'from-brand-700 to-brand-500',
}

export function ReportShell({
  title,
  subtitle,
  tone = 'brand',
  statusLabel,
  statusIcon: StatusIcon,
  meta,
  actions,
  backTo = '/',
  footer,
  children,
}: {
  title: string
  subtitle: string
  tone?: BannerTone
  statusLabel?: string
  statusIcon?: LucideIcon
  meta: string[]
  /** Extra buttons (e.g. Download) shown left of Print in the action bar. */
  actions?: ReactNode
  backTo?: string
  footer: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-4xl print:max-w-none">
      {/* Action bar — hidden when printing */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={backTo} className="btn-ghost -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Banner */}
      <div className={`rounded-2xl bg-gradient-to-r ${bannerBand[tone]} px-6 py-6 text-white print:rounded-xl`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/70">PLCY · Confidential — Internal</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-white/80">{subtitle}</p>
          </div>
          {statusLabel && (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-inset ring-white/30">
              {StatusIcon && <StatusIcon className="h-4 w-4" />}
              {statusLabel}
            </span>
          )}
        </div>
        {meta.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-xs text-white/80">
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        )}
      </div>

      {children}

      <p className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] text-ink-400">{footer}</p>
    </div>
  )
}

/** A titled card section inside a report; avoids page breaks when printing. */
export function ReportSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
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
