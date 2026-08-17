import { Link } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react'
import { scoreSecurity, loadSecurityPolicy } from '@/data/security'
import type { PostureRag } from '@/data/security'

/**
 * Compact readout of the org security posture, computed live from the policy
 * configured in Settings → Security. Dropped onto observability surfaces
 * (Admin Security, Fleet Posture) so "what you set" shows up as "what you see".
 */
const band: Record<PostureRag, string> = {
  green: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-orange-500',
  red: 'from-rose-500 to-rose-600',
}
const icon: Record<PostureRag, typeof ShieldCheck> = { green: ShieldCheck, amber: ShieldAlert, red: ShieldAlert }

export function SecurityPostureBanner({ showGaps = true }: { showGaps?: boolean }) {
  const posture = scoreSecurity(loadSecurityPolicy())
  const Icon = icon[posture.rag]
  return (
    <div className={`rounded-2xl bg-gradient-to-r ${band[posture.rag]} p-4 text-white shadow-sm`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/80">Security posture</p>
            <p className="text-2xl font-bold leading-tight">{posture.score}<span className="text-base font-medium text-white/70">/100</span> · {posture.label}</p>
            <p className="text-xs text-white/80">{posture.passed}/{posture.total} controls · from the configured policy</p>
          </div>
        </div>
        {showGaps && posture.findings.length > 0 && (
          <div className="flex-1 rounded-xl bg-white/10 p-2.5 text-xs">
            <p className="mb-1 font-semibold uppercase tracking-wide text-white/80">Top gaps</p>
            <p className="text-white/90">{posture.findings.slice(0, 3).map((f) => f.label).join(' · ')}</p>
          </div>
        )}
        <Link to="/settings?tab=Security" className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/25">
          Configure
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
