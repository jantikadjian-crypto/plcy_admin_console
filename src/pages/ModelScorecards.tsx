import { useState } from 'react'
import { Bot, ShieldCheck, Gauge, AlertTriangle, Route } from 'lucide-react'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge, Modal } from '@/components/ui'
import { modelScorecards, SCORECARD_DIMS, scoreTone, scorecardStatusTone, routingHint } from '@/data/evals'
import type { ModelScorecard } from '@/data/evals'

export function ModelScorecards() {
  const [sel, setSel] = useState<ModelScorecard | null>(null)
  const rows = [...modelScorecards].sort((a, b) => b.overall - a.overall)
  const approved = modelScorecards.filter((m) => m.status === 'Approved').length
  const flagged = modelScorecards.filter((m) => m.status !== 'Approved').length
  const avgJb = Math.round(modelScorecards.reduce((a, m) => a + m.jailbreakResistance, 0) / modelScorecards.length)

  return (
    <div>
      <PageHeader
        title="Model Scorecards"
        description="Safety profiles for every model PLCY routes to — how each resists jailbreaks, refuses correctly, and protects data. These scores feed the Model Routing engine."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Models scored" value={modelScorecards.length} icon={Bot} tone="blue" footer="PLCY-managed + BYOK" />
        <StatCard label="Approved for routing" value={approved} icon={ShieldCheck} tone="green" footer="Eligible for all traffic" />
        <StatCard label="Watch / Restricted" value={flagged} icon={AlertTriangle} tone={flagged ? 'orange' : 'green'} footer="Limited or blocked" />
        <StatCard label="Avg jailbreak resist" value={`${avgJb}`} icon={Gauge} tone="purple" footer="Across the catalog" />
      </div>

      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
        <Route className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <span>Scores are consumed by <span className="font-semibold">Model Routing</span> — a model on <span className="font-semibold">Watch</span> only takes low-risk traffic, and a <span className="font-semibold">Restricted</span> model is blocked from routing entirely.</span>
      </div>

      <Card>
        <CardTitle title="Safety profiles" subtitle="Sorted by overall score · click a model for the full breakdown and routing eligibility" />
        <Table columns={['Model', 'Jailbreak', 'Refusal', 'PII', 'Toxicity', 'Grounding', 'Overall', 'Status']}>
          {rows.map((m) => (
            <Tr key={m.model} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setSel(m)}>
              <Td>
                <p className="font-medium text-ink-900">{m.model}</p>
                <p className="text-xs text-ink-400">{m.provider} · {m.managed}</p>
              </Td>
              <Td><Badge tone={scoreTone(m.jailbreakResistance)}>{m.jailbreakResistance}</Badge></Td>
              <Td><Badge tone={scoreTone(m.refusalAccuracy)}>{m.refusalAccuracy}</Badge></Td>
              <Td><Badge tone={scoreTone(m.piiLeakResistance)}>{m.piiLeakResistance}</Badge></Td>
              <Td><Badge tone={scoreTone(m.toxicityFilter)}>{m.toxicityFilter}</Badge></Td>
              <Td><Badge tone={scoreTone(m.grounding)}>{m.grounding}</Badge></Td>
              <Td><span className="font-bold tabular-nums text-ink-900">{m.overall}</span></Td>
              <Td><Badge tone={scorecardStatusTone[m.status]} dot>{m.status}</Badge></Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {sel && (
        <Modal
          open onClose={() => setSel(null)}
          title={sel.model}
          subtitle={`${sel.provider} · ${sel.managed} · v${sel.version} · last evaluated ${sel.lastEval}`}
          maxWidth="max-w-2xl"
          headerRight={<Badge tone={scorecardStatusTone[sel.status]} dot>{sel.status}</Badge>}
          footer={<button className="btn-secondary" onClick={() => setSel(null)}>Close</button>}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <span className="text-sm font-medium text-ink-600">Overall safety score</span>
              <span className="text-2xl font-bold tabular-nums text-ink-900">{sel.overall}<span className="text-sm font-normal text-ink-400">/100</span></span>
            </div>
            <section className="space-y-2.5">
              {SCORECARD_DIMS.map((d) => {
                const v = sel[d.key] as number
                const tone = scoreTone(v)
                const bar = tone === 'green' ? 'bg-emerald-400' : tone === 'blue' ? 'bg-blue-400' : tone === 'yellow' ? 'bg-amber-400' : 'bg-rose-400'
                return (
                  <div key={d.key} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-xs font-medium text-ink-600">{d.label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${bar}`} style={{ width: `${v}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs font-semibold tabular-nums text-ink-800">{v}</span>
                  </div>
                )
              })}
            </section>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
              <Route className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Routing eligibility</p>
                <p className="mt-0.5 text-sm text-ink-700">{routingHint(sel)}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
