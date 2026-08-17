import { useState } from 'react'
import { Swords, AlertOctagon, ShieldOff, Grid3x3, Plus, ExternalLink, RefreshCw, UserPlus, BookOpen, Server, ShieldPlus, GitPullRequest, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { Link } from 'react-router-dom'
import { useEvals, upsertCampaign, setFindingStatus, updateFinding, retestFinding, recordHardeningProposal, newId } from '@/data/evalsStore'
import { hardeningRecommendations, hardeningTitle, primaryGuard, HARDENING_MIN_LOW_SEVERITY } from '@/data/hardening'
import type { Hardening } from '@/data/hardening'
import { useEnforcement } from '@/data/enforcementStore'
import { addChangeRequest } from '@/data/policyChangesStore'
import { nextVersion } from '@/data/policyChanges'
import {
  OWASP_LLM, owaspName, familyOf, bypassRate, connectedDeployments, attemptsFor, bypassResistanceTrend,
  MITRE_ATLAS, atlasName, atlasTactic, atlasForOwasp, campaignTemplates, templateById, SCHEDULES,
  describeTarget, resolveTargets,
} from '@/data/evals'
import type { RedTeamCampaign, Finding, Severity, Schedule, TargetSpec } from '@/data/evals'
import { regionByCode } from '@/data/fleet'

const NOW = '2026-07-23'
type LogFn = (i: { action: string; target: string; category?: string }) => void
const sevTone: Record<Severity, 'red' | 'orange' | 'yellow' | 'slate'> = { Critical: 'red', High: 'orange', Medium: 'yellow', Low: 'slate' }
const statusTone = (s: RedTeamCampaign['status']) => (s === 'Running' ? 'blue' : s === 'Triaging' ? 'orange' : 'green')
const findingTone = (s: Finding['status']) => (s === 'open' ? 'red' : s === 'mitigated' ? 'green' : 'slate')
const scheduleTone = (s?: Schedule) => (s === 'Continuous' ? 'blue' : s === 'One-off' || !s ? 'slate' : 'purple')
const ageDays = (from?: string) => (from ? Math.max(0, Math.round((Date.parse(NOW) - Date.parse(from)) / 86400000)) : null)

export function RedTeam() {
  const { campaigns } = useEvals()
  const { logAction } = useSession()
  const [sel, setSel] = useState<string | null>(null)
  const [creating, setCreating] = useState<false | { templateId?: string }>(false)
  const [coverageFw, setCoverageFw] = useState<'owasp' | 'atlas'>('owasp')

  const openFindings = campaigns.flatMap((c) => c.findings).filter((f) => f.status === 'open')
  const critHigh = openFindings.filter((f) => f.severity === 'Critical' || f.severity === 'High').length
  const totalAttempts = campaigns.reduce((a, c) => a + c.attempts, 0)
  const totalBypasses = campaigns.reduce((a, c) => a + c.bypasses, 0)
  const covered = new Set(campaigns.flatMap((c) => c.taxonomy))
  const atlasCovered = new Set(atlasForOwasp([...covered]))

  const selected = campaigns.find((c) => c.id === sel)

  return (
    <div>
      <PageHeader
        title="Red-Team"
        description="Adversarial campaigns against PLCY's own SaaS platform and connected instances. Air-gapped deployments are tested via the separate offline process."
        actions={
          <GatedButton cap="evals.run" className="btn-primary" onClick={() => setCreating({})}>
            <Plus className="h-4 w-4" /> New campaign
          </GatedButton>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active campaigns" value={campaigns.filter((c) => c.status !== 'Completed').length} icon={Swords} tone="blue" footer={`${campaigns.length} total`} />
        <StatCard label="Open findings" value={openFindings.length} icon={AlertOctagon} tone={critHigh ? 'red' : 'green'} footer={`${critHigh} critical/high`} />
        <StatCard label="Bypass rate" value={`${totalAttempts ? ((totalBypasses / totalAttempts) * 100).toFixed(1) : '0'}%`} icon={ShieldOff} tone="orange" footer={`${totalBypasses} of ${totalAttempts.toLocaleString()} attempts`} />
        <StatCard label="OWASP coverage" value={`${covered.size}/10`} icon={Grid3x3} tone="purple" footer="LLM Top-10 categories exercised" />
      </div>

      <ResistanceTrend />

      <Card className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-ink-400" />
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Playbooks</h3>
            <p className="text-xs text-ink-500">Standardised campaigns — one click to launch from the attack library</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {campaignTemplates.map((t) => (
            <div key={t.id} className="flex flex-col justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink-900">{t.name}</span>
                  <Badge tone={scheduleTone(t.suggestedSchedule)}>{t.suggestedSchedule}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-500">{t.description}</p>
                <p className="mt-1.5 text-[11px] text-ink-400">{t.techniqueIds.length} techniques · {t.taxonomy.join(', ')}</p>
              </div>
              <GatedButton cap="evals.run" showLock={false} className="btn-secondary mt-2.5 w-full px-2.5 py-1 text-xs" onClick={() => setCreating({ templateId: t.id })}>
                Launch
              </GatedButton>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <CardTitle title="Campaigns" subtitle="Click a campaign for its findings and attempt-level transcripts" />
        <Table columns={['Campaign', 'Scope', 'Taxonomy', 'Attempts', 'Bypasses', 'Status', 'Schedule', 'Owner']} noun="campaigns">
          {campaigns.map((c) => (
            <Tr key={c.id} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setSel(c.id)}>
              <Td>
                <p className="font-medium text-ink-900">{c.name}</p>
                <p className="text-xs text-ink-400">Started {c.startedAt}</p>
              </Td>
              <Td className="text-xs text-ink-600">{c.scope}</Td>
              <Td>
                <span className="flex flex-wrap gap-1">
                  {c.taxonomy.map((id) => <Badge key={id} tone="slate">{id}</Badge>)}
                </span>
              </Td>
              <Td className="tabular-nums text-ink-600">{c.attempts.toLocaleString()}</Td>
              <Td><Badge tone={c.bypasses > 20 ? 'red' : c.bypasses > 0 ? 'orange' : 'green'}>{c.bypasses} · {(bypassRate(c) * 100).toFixed(1)}%</Badge></Td>
              <Td><Badge tone={statusTone(c.status)} dot>{c.status}</Badge></Td>
              <Td>
                {c.schedule ? (
                  <span className="flex items-center gap-1.5">
                    <Badge tone={scheduleTone(c.schedule)}>{c.schedule}</Badge>
                    {c.nextRun && <span className="whitespace-nowrap text-[11px] text-ink-400">next {c.nextRun}</span>}
                  </span>
                ) : <span className="text-xs text-ink-400">—</span>}
              </Td>
              <Td className="text-xs text-ink-500">{c.owner}</Td>
            </Tr>
          ))}
        </Table>
      </Card>

      <HardeningRecommendations />

      <Card>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Framework coverage</h3>
            <p className="text-xs text-ink-500">Which attack classes we've exercised across all campaigns</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {(['owasp', 'atlas'] as const).map((f) => (
              <button key={f} onClick={() => setCoverageFw(f)} className={clsx('rounded-md px-2.5 py-1 transition-colors', coverageFw === f ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500')}>
                {f === 'owasp' ? 'OWASP LLM' : 'MITRE ATLAS'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {coverageFw === 'owasp'
            ? OWASP_LLM.map((o) => {
              const on = covered.has(o.id)
              const bypasses = campaigns.filter((c) => c.taxonomy.includes(o.id)).reduce((a, c) => a + c.bypasses, 0)
              return (
                <div key={o.id} className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 text-sm ${on ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/60'}`}>
                  <span className="min-w-0"><span className="font-mono text-xs font-semibold text-ink-700">{o.id}</span><span className={`ml-2 ${on ? 'text-ink-800' : 'text-ink-400'}`}>{o.name}</span></span>
                  {on ? <Badge tone={bypasses ? 'orange' : 'green'}>{bypasses ? `${bypasses} bypass${bypasses === 1 ? '' : 'es'}` : 'held'}</Badge> : <span className="text-xs text-ink-400">not exercised</span>}
                </div>
              )
            })
            : MITRE_ATLAS.map((a) => {
              const on = atlasCovered.has(a.id)
              return (
                <div key={a.id} className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 text-sm ${on ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/60'}`}>
                  <span className="min-w-0"><span className="font-mono text-xs font-semibold text-ink-700">{a.id}</span><span className={`ml-2 ${on ? 'text-ink-800' : 'text-ink-400'}`}>{a.name}</span><span className="ml-1 text-[11px] text-ink-400">· {a.tactic}</span></span>
                  {on ? <Badge tone="green">exercised</Badge> : <span className="text-xs text-ink-400">not exercised</span>}
                </div>
              )
            })}
        </div>
      </Card>

      {selected && <CampaignModal campaign={selected} onClose={() => setSel(null)} logAction={logAction} />}
      {creating !== false && <NewCampaignModal templateId={creating.templateId} onClose={() => setCreating(false)} logAction={logAction} />}
    </div>
  )
}

function ResistanceTrend() {
  const data = bypassResistanceTrend
  const w = 640, h = 92, pad = 10
  const max = Math.max(...data.map((d) => d.rate))
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2)
  const y = (v: number) => h - pad - (v / (max || 1)) * (h - pad * 2)
  const line = data.map((d, i) => `${x(i)},${y(d.rate)}`).join(' ')
  const area = `${x(0)},${h - pad} ${line} ${x(data.length - 1)},${h - pad}`
  const delta = data[0].rate - data[data.length - 1].rate
  return (
    <Card className="mb-6">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Bypass resistance</h3>
          <p className="text-xs text-ink-500">Fleet bypass rate over the last 8 weeks — lower is more resistant</p>
        </div>
        <Badge tone={delta >= 0 ? 'green' : 'red'}>{delta >= 0 ? '▼' : '▲'} {Math.abs(delta).toFixed(1)} pts · now {data[data.length - 1].rate}%</Badge>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full text-emerald-500" style={{ height: 92 }}>
        <polygon points={area} fill="currentColor" opacity="0.10" />
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.rate)} r="2.5" fill="currentColor" />)}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-ink-400">
        {data.map((d) => <span key={d.week}>{d.week}</span>)}
      </div>
    </Card>
  )
}

function AttemptsTable({ campaignId }: { campaignId: string }) {
  const [onlyBypass, setOnlyBypass] = useState(false)
  const all = attemptsFor(campaignId)
  if (all.length === 0) return null
  const bypassCount = all.filter((a) => a.verdict === 'bypassed').length
  const rows = all.filter((a) => !onlyBypass || a.verdict === 'bypassed')
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink-900">Attempts <span className="font-normal text-ink-400">· {all.length} sampled · {bypassCount} bypassed</span></h4>
        <button onClick={() => setOnlyBypass((v) => !v)} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${onlyBypass ? 'bg-rose-50 text-rose-700 ring-rose-600/20' : 'bg-slate-100 text-ink-600 ring-slate-500/10 hover:bg-slate-200/70'}`}>Only bypasses</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        {rows.map((a) => (
          <div key={a.id} className="border-b border-slate-100 px-3 py-2 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <Badge tone={a.verdict === 'bypassed' ? 'red' : 'green'}>{a.verdict}</Badge>
                <span className="truncate text-xs font-medium text-ink-700">{a.technique}</span>
                <span className="shrink-0 font-mono text-[10px] text-ink-400">{a.taxonomy}</span>
              </span>
              <span className="shrink-0 text-[10px] text-ink-400">{a.model} · {a.latencyMs}ms</span>
            </div>
            <p className="mt-1 truncate font-mono text-[11px] text-ink-600" title={a.prompt}>{a.prompt}</p>
            <p className="mt-0.5 text-[11px] text-ink-500">
              {a.verdict === 'blocked' ? <>Caught by <span className="font-medium text-ink-700">{a.detector}</span>. </> : 'Not caught. '}{a.response}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Hardening recommendations — bypasses as a case for tightening        */
/* ------------------------------------------------------------------ */
/**
 * The counterpart to Enforcement's tuning recommendations. There, reviewed
 * false positives argue a control is too aggressive; here, a bypass that got
 * past a control argues the opposite. Both hand Policy Change Management the
 * same `ChangeLine` shape, so a tightening enters the same review → approval →
 * dry-run → apply path as a loosening.
 */
function HardeningRecommendations() {
  const { campaigns, hardening } = useEvals()
  const { log } = useEnforcement()
  const { can, logAction } = useSession()
  const manage = can('policy.manage')

  const recs = hardeningRecommendations(campaigns, log)

  /** Raise the proposal as a real change request, carrying its evidence. */
  const fileChangeRequest = (h: Hardening) => {
    const { from, to } = nextVersion(h.packId)
    const crId = addChangeRequest({
      packId: h.packId,
      packName: h.packName,
      title: hardeningTitle(h),
      summary: `${h.rationale} Raised from red-team ${h.campaigns.join(', ')}; evidence: ${h.evidence.join(', ')}. `
        + (h.blast.evaluated
          ? `Blast radius: touches ${h.blast.evaluated} of the last ${h.blast.window} enforcement decisions (${h.blast.customers.join(', ')}), ${h.blast.wouldBlock} of which would newly block.`
          : 'Blast radius: this control has not fired in the current decision-log window.'),
      risk: h.risk,
      fromVersion: from,
      toVersion: to,
      changes: h.changes,
    })
    recordHardeningProposal(h.controlId, crId)
    logAction({ action: 'evals.hardening.propose', target: `${h.controlId} → ${crId}`, category: 'governance' })
  }

  return (
    <Card className="mb-6">
      <CardTitle
        title="Hardening recommendations"
        subtitle={`Controls a bypass got past. Each proposal can be handed to Policy Change Management, carrying the findings that justify it. Raised on one Critical/High bypass, or ${HARDENING_MIN_LOW_SEVERITY} of any severity.`}
      />
      {recs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
          <ShieldPlus className="mx-auto h-5 w-5 text-ink-300" />
          <p className="mt-2 text-sm text-ink-500">No unresolved bypass is pointing at a control right now.</p>
          <p className="mt-1 text-xs text-ink-400">Open a campaign above and leave a finding unmitigated — or fail its retest — and the control it defeated shows up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recs.map((h) => {
            const crId = hardening[h.controlId]
            return (
              <div key={h.controlId} className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-ink-800">{h.controlId}</span>
                  <span className="text-sm font-medium text-ink-900">{h.controlName}</span>
                  <Badge tone={sevTone[h.severity]}>{h.severity} bypass</Badge>
                  <span className="text-[11px] text-ink-500">{h.family}{h.packName !== h.family && ` · ${h.packName}`}</span>
                </div>

                <p className="mt-2 text-sm text-ink-700">{h.rationale}</p>

                {/* The proposed edit, as a diff */}
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white text-xs">
                  {h.changes.map((c, i) => (
                    <div key={c.field} className={i > 0 ? 'border-t border-slate-200' : ''}>
                      <div className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-500">
                        Proposed change · {c.field}
                      </div>
                      <div className="flex items-start gap-2 px-3 py-1.5">
                        <span className="mt-0.5 w-4 shrink-0 text-center font-mono text-rose-600">−</span>
                        <span className="text-ink-600 line-through decoration-rose-300">{c.before}</span>
                      </div>
                      <div className="flex items-start gap-2 border-t border-slate-100 px-3 py-1.5">
                        <span className="mt-0.5 w-4 shrink-0 text-center font-mono text-emerald-600">+</span>
                        <span className="font-medium text-ink-800">{c.after}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Blast radius — tightening can break traffic in a way loosening can't */}
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-ink-700">
                  <span className="font-semibold text-ink-800">Blast radius</span>{' '}
                  {h.blast.evaluated === 0 ? (
                    <>— {h.controlId} hasn’t fired in the last {h.blast.window} enforcement decisions, so there’s no recent traffic to judge this against.</>
                  ) : h.blast.wouldChange > 0 ? (
                    <>— replayed against the last {h.blast.window} enforcement decisions, this changes the outcome of{' '}
                      <span className="font-semibold">{h.blast.wouldChange}</span> on {h.blast.customers.join(', ')}
                      {h.blast.wouldBlock > 0 && <>, <span className="font-semibold text-rose-700">{h.blast.wouldBlock} of them newly blocked</span></>}.</>
                  ) : (
                    <>— no decision outcome changes: the control keeps the same verdict, but re-evaluates{' '}
                      <span className="font-semibold">{h.blast.evaluated}</span> recent decision{h.blast.evaluated === 1 ? '' : 's'} on {h.blast.customers.join(', ')} with a detector that reads content
                      {h.blast.currentlyAllowed > 0 && <>, {h.blast.currentlyAllowed} of which currently pass</>}.</>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-[11px] text-ink-500">
                    Evidence: {h.evidence.map((e) => <span key={e} className="font-mono">{e} </span>)}
                    · {h.campaigns.join(', ')}
                  </span>
                  <div className="ml-auto">
                    {crId ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-600">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Raised as <Link to="/policy?tab=changes" className="font-mono font-semibold text-brand-700 hover:underline">{crId}</Link>
                      </span>
                    ) : (
                      <GatedButton
                        cap="policy.manage"
                        showLock={false}
                        disabled={!manage}
                        onClick={() => fileChangeRequest(h)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                      >
                        <GitPullRequest className="h-3.5 w-3.5" />Open change request
                      </GatedButton>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function FindingCard({ campaignId, f, logAction }: { campaignId: string; f: Finding; logAction: LogFn }) {
  const { can } = useSession()
  const { hardening } = useEvals()
  const [note, setNote] = useState(f.remediationNote ?? '')
  // If this finding's control already has a hardening CR open, say so here —
  // the reader shouldn't have to go back to the tab to find out.
  const guard = f.linkedControlPrefix ? primaryGuard(f.linkedControlPrefix) : undefined
  const hardeningCr = guard ? hardening[guard.id] : undefined
  const cycle = () => {
    const next: Finding['status'] = f.status === 'open' ? 'mitigated' : f.status === 'mitigated' ? 'accepted' : 'open'
    setFindingStatus(campaignId, f.id, next)
    logAction({ action: 'evals.finding.update', target: `${f.id} → ${next}`, category: 'governance' })
  }
  const createIncident = () => {
    const incId = newId('INC')
    updateFinding(campaignId, f.id, { linkedIncidentId: incId, status: 'mitigated' })
    logAction({ action: 'evals.incident.create', target: `${f.id} → ${incId}`, category: 'governance' })
  }
  const assignMe = () => {
    updateFinding(campaignId, f.id, { assignee: 'You' })
    logAction({ action: 'evals.finding.assign', target: `${f.id} → You`, category: 'governance' })
  }
  const saveNote = () => {
    updateFinding(campaignId, f.id, { remediationNote: note.trim() })
    logAction({ action: 'evals.finding.update', target: `${f.id} · remediation note`, category: 'governance' })
  }
  const retest = () => {
    const r = retestFinding(campaignId, f.id)
    logAction({ action: 'evals.finding.retest', target: `${f.id} → ${r}`, category: 'governance' })
  }
  const age = ageDays(f.openedAt)
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={sevTone[f.severity]}>{f.severity}</Badge>
          <span className="font-mono text-xs text-ink-500">{f.attackType} · {owaspName(f.attackType)}</span>
        </div>
        <Badge tone={findingTone(f.status)}>{f.status}</Badge>
      </div>
      <p className="mt-1.5 text-sm text-ink-700">{f.summary}</p>
      <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-ink-500">
        {f.openedAt && <span>Opened {f.openedAt}{age !== null && ` · ${age}d old`}</span>}
        <span>· {f.assignee ? <>Assignee <span className="font-medium text-ink-700">{f.assignee}</span></> : 'Unassigned'}</span>
        {f.linkedControlPrefix && <span>· Should be caught by <span className="font-mono text-ink-700">{f.linkedControlPrefix}</span> ({familyOf(f.linkedControlPrefix)})</span>}
        {f.linkedIncidentId && <span>· <span className="font-medium text-brand-600">Incident {f.linkedIncidentId}</span></span>}
        {hardeningCr && (
          <span>· Hardening <Link to="/policy?tab=changes" className="font-mono font-semibold text-brand-700 hover:underline">{hardeningCr}</Link> raised on {guard?.id}</span>
        )}
      </p>

      {f.repro && (
        <div className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Reproduction · {f.repro.model}</span>
            {f.retestedAt && (
              <Badge tone={f.retestResult === 'blocked' ? 'green' : 'red'}>
                {f.retestResult === 'blocked' ? '✓ Retest passed' : '✗ Still bypassing'} · {f.retestedAt}
              </Badge>
            )}
          </div>
          <p className="mt-1 font-mono text-[11px] text-ink-700">{f.repro.prompt}</p>
          <GatedButton cap="evals.run" showLock={false} className="btn-secondary mt-2 px-2.5 py-1 text-xs" onClick={retest}>
            <RefreshCw className="h-3.5 w-3.5" /> Retest
          </GatedButton>
        </div>
      )}

      <label className="mt-2.5 block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Remediation note</span>
        <textarea
          className="input mt-1 h-16 text-xs" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="What fixed it — policy change, control tuning…" disabled={!can('evals.run')}
        />
      </label>

      <div className="mt-2 flex flex-wrap gap-2">
        <GatedButton cap="evals.run" showLock={false} className="btn-primary px-2.5 py-1 text-xs disabled:opacity-50" onClick={saveNote} disabled={!can('evals.run') || note.trim() === (f.remediationNote ?? '')}>
          Save note
        </GatedButton>
        <GatedButton cap="evals.run" showLock={false} className="btn-secondary px-2.5 py-1 text-xs" onClick={cycle}>Advance status</GatedButton>
        {!f.assignee && (
          <GatedButton cap="evals.run" showLock={false} className="btn-secondary px-2.5 py-1 text-xs" onClick={assignMe}>
            <UserPlus className="h-3.5 w-3.5" /> Assign to me
          </GatedButton>
        )}
        {!f.linkedIncidentId && (
          <GatedButton cap="incident.manage" showLock={false} className="btn-secondary px-2.5 py-1 text-xs" onClick={createIncident} disabled={!can('incident.manage')}>
            <ExternalLink className="h-3.5 w-3.5" /> Create incident
          </GatedButton>
        )}
      </div>
    </div>
  )
}

function CampaignModal({ campaign, onClose, logAction }: { campaign: RedTeamCampaign; onClose: () => void; logAction: LogFn }) {
  return (
    <Modal
      open onClose={onClose}
      title={campaign.name}
      subtitle={`${campaign.scope} · ${campaign.attempts.toLocaleString()} attempts · ${campaign.bypasses} bypasses`}
      maxWidth="max-w-2xl"
      headerRight={<Badge tone={statusTone(campaign.status)} dot>{campaign.status}</Badge>}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="space-y-5">
        {campaign.target?.kind === 'selection' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-ink-600">
            <span className="font-semibold text-ink-800">Targets ({resolveTargets(campaign.target).length}):</span>{' '}
            {resolveTargets(campaign.target).map((d) => `${d.customer} (${regionByCode(d.regionCode)?.name ?? d.regionCode})`).join(', ')}
          </div>
        )}
        <AttemptsTable campaignId={campaign.id} />
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-ink-900">Findings ({campaign.findings.length})</h4>
          {campaign.findings.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-ink-400">No findings yet — campaign in progress.</p>}
          {campaign.findings.map((f) => <FindingCard key={f.id} campaignId={campaign.id} f={f} logAction={logAction} />)}
        </section>
      </div>
    </Modal>
  )
}

function TargetPicker({ value, onChange }: { value: TargetSpec; onChange: (t: TargetSpec) => void }) {
  const [region, setRegion] = useState('all')
  const [customer, setCustomer] = useState('all')
  const [tier, setTier] = useState('all')
  const insts = connectedDeployments
  const regionCodes = Array.from(new Set(insts.map((d) => d.regionCode)))
  const customers = Array.from(new Set(insts.map((d) => d.customer)))
  const tiers = Array.from(new Set(insts.map((d) => d.sovereignty)))
  const filtered = insts.filter((d) =>
    (region === 'all' || d.regionCode === region) &&
    (customer === 'all' || d.customer === customer) &&
    (tier === 'all' || d.sovereignty === tier),
  )
  const sel = new Set(value.instanceIds)
  const toggle = (id: string) => {
    const next = new Set(sel)
    if (next.has(id)) next.delete(id); else next.add(id)
    onChange({ kind: 'selection', instanceIds: [...next] })
  }
  const selectAll = () => onChange({ kind: 'selection', instanceIds: [...new Set([...value.instanceIds, ...filtered.map((d) => d.id)])] })
  const clear = () => onChange({ kind: 'selection', instanceIds: [] })
  const selectStyle = 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-ink-700'

  return (
    <div>
      <div className="mb-2 flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
        {(['platform', 'selection'] as const).map((k) => (
          <button key={k} type="button" onClick={() => onChange({ kind: k, instanceIds: value.instanceIds })}
            className={clsx('flex-1 rounded-md px-2.5 py-1.5 transition-colors', value.kind === k ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500')}>
            {k === 'platform' ? `Entire SaaS platform (${insts.length})` : 'Select clusters / customers'}
          </button>
        ))}
      </div>

      {value.kind === 'platform' ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-ink-600">
          Targets <span className="font-semibold text-ink-800">all {insts.length} connected instances</span> across {new Set(insts.map((d) => d.regionCode)).size} regions and {new Set(insts.map((d) => d.customer)).size} customers. Air-gapped deployments are excluded (validated separately).
        </div>
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <select className={selectStyle} value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="all">All regions</option>
              {regionCodes.map((r) => <option key={r} value={r}>{regionByCode(r)?.name ?? r}</option>)}
            </select>
            <select className={selectStyle} value={customer} onChange={(e) => setCustomer(e.target.value)}>
              <option value="all">All customers</option>
              {customers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className={selectStyle} value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="all">All tiers</option>
              {tiers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="button" onClick={selectAll} className="rounded-lg bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-600/20">Select all ({filtered.length})</button>
            <button type="button" onClick={clear} className="rounded-lg px-2 py-1 text-xs font-medium text-ink-500 hover:text-ink-700">Clear</button>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
            {filtered.length === 0 && <p className="p-4 text-center text-xs text-ink-400">No instances match these filters.</p>}
            {filtered.map((d) => (
              <label key={d.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50">
                <input type="checkbox" checked={sel.has(d.id)} onChange={() => toggle(d.id)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                <Server className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                <span className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-ink-900">{d.customer}</span>
                  <span className="ml-2 text-[11px] text-ink-500">{regionByCode(d.regionCode)?.name ?? d.regionCode}</span>
                </span>
                <Badge tone={d.sovereignty === 'Sovereign Cloud' ? 'purple' : 'slate'}>{d.sovereignty}</Badge>
                <span className="shrink-0 text-[10px] text-ink-400">{d.nodes} nodes · {d.version}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs font-medium text-ink-600">Targeting: <span className="text-ink-900">{describeTarget(value)}</span></p>
        </div>
      )}
    </div>
  )
}

function NewCampaignModal({ templateId, onClose, logAction }: { templateId?: string; onClose: () => void; logAction: LogFn }) {
  const tpl = templateId ? templateById(templateId) : undefined
  const [name, setName] = useState(tpl ? tpl.name : '')
  const [target, setTarget] = useState<TargetSpec>({ kind: 'platform', instanceIds: [] })
  const [tax, setTax] = useState<string[]>(tpl ? tpl.taxonomy : ['LLM01'])
  const [schedule, setSchedule] = useState<Schedule>(tpl ? tpl.suggestedSchedule : 'One-off')
  const toggle = (id: string) => setTax((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const targetCount = resolveTargets(target).length
  const valid = name.trim().length > 2 && tax.length > 0 && targetCount > 0

  const launch = () => {
    const scope = describeTarget(target)
    const attempts = (300 + tax.length * 240 + (tpl ? tpl.techniqueIds.length * 60 : 0)) * Math.max(1, target.kind === 'platform' ? 1 : targetCount)
    const bypasses = Math.max(1, Math.round(attempts * 0.02))
    const nextRun = schedule === 'Nightly' ? '2026-07-24' : schedule === 'Weekly' ? '2026-07-30' : undefined
    const c: RedTeamCampaign = {
      id: newId('rt'), name: name.trim(), taxonomy: tax, scope, target, attempts, bypasses,
      status: 'Running', owner: 'Trust & Safety', startedAt: new Date().toISOString().slice(0, 10), findings: [],
      schedule, ...(nextRun ? { nextRun } : {}),
    }
    upsertCampaign(c)
    logAction({ action: 'evals.redteam.launch', target: `${c.name} · ${scope} · ${schedule}`, category: 'governance' })
    onClose()
  }

  return (
    <Modal
      open onClose={onClose}
      title={tpl ? `Launch playbook: ${tpl.name}` : 'Launch red-team campaign'}
      subtitle="Runs against the connected fleet only — air-gapped is validated separately."
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary disabled:opacity-50" disabled={!valid} onClick={launch}>Launch{targetCount > 0 ? ` · ${targetCount} target${targetCount === 1 ? '' : 's'}` : ''}</button>
        </div>
      }
    >
      <div className="space-y-4">
        {tpl && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900">
            From playbook <span className="font-semibold">{tpl.name}</span> — {tpl.techniqueIds.length} techniques from the attack library.
          </div>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Campaign name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 Injection Sweep" />
        </label>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-600">Where to red-team</span>
          <TargetPicker value={target} onChange={setTarget} />
        </div>
        <label className="block sm:max-w-[12rem]">
          <span className="mb-1 block text-xs font-medium text-ink-600">Schedule</span>
          <select className="input" value={schedule} onChange={(e) => setSchedule(e.target.value as Schedule)}>
            {SCHEDULES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-600">Attack taxonomy (OWASP LLM Top-10)</span>
          <div className="flex flex-wrap gap-1.5">
            {OWASP_LLM.map((o) => (
              <button
                key={o.id} type="button" onClick={() => toggle(o.id)} title={o.name}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${tax.includes(o.id) ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-slate-100 text-ink-600 ring-slate-500/10 hover:bg-slate-200/70'}`}
              >
                {o.id}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
