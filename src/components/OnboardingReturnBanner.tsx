import { useSearchParams, useNavigate } from 'react-router-dom'
import { ClipboardCheck, Check, ArrowLeft } from 'lucide-react'
import { useProvisioning } from '@/context/Provisioning'
import { useSession } from '@/context/Session'
import { gateLabel } from '@/data/ops'

/**
 * Shown on a destination page when an onboarding deep-link brought you here
 * (`?onboard=<provisionId>&gate=<key>`). Completing the step marks that gate
 * done on the provisioning record and takes you back to it.
 */
export default function OnboardingReturnBanner() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { get, setGate } = useProvisioning()
  const { logAction } = useSession()

  const onboardId = params.get('onboard')
  const gate = params.get('gate')
  if (!onboardId || !gate) return null

  const prov = get(onboardId)
  if (!prov) return null

  const alreadyDone = prov.gates?.[gate] === true

  const markDone = () => {
    setGate(onboardId, gate, true)
    logAction({ action: 'onboarding.gate.complete', target: `${prov.customer} · ${gateLabel(gate)}`, category: 'provisioning' })
    navigate(`/provisioning?open=${onboardId}`)
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4 sm:flex-row sm:items-center">
      <ClipboardCheck className="h-5 w-5 shrink-0 text-brand-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">Onboarding {prov.customer}</p>
        <p className="text-sm text-ink-600">
          Complete the <span className="font-medium text-ink-900">{gateLabel(gate)}</span> step on this page, then mark it done to return to the checklist.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button className="btn-ghost" onClick={() => navigate(`/provisioning?open=${onboardId}`)}>
          <ArrowLeft className="h-4 w-4" />Back to onboarding
        </button>
        <button className="btn-primary" onClick={markDone} disabled={alreadyDone}>
          <Check className="h-4 w-4" />{alreadyDone ? 'Marked done' : 'Mark step done'}
        </button>
      </div>
    </div>
  )
}
