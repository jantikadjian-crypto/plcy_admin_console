import { useState } from 'react'
import { FlaskConical, History, TrendingDown, Gauge, Play } from 'lucide-react'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useEvals, upsertRun, newId } from '@/data/evalsStore'
import {
  evalSuites, suiteById, catchRate, overBlockRate, owaspName, evalModels, POLICY_PACK_VERSIONS,
} from '@/data/evals'
import type { EvalSuite, EvalRun } from '@/data/evals'

const runTone = (s: EvalRun['status']) => (s === 'Passed' ? 'green' : s === 'Regression' ? 'orange' : 'red')
const MODEL_DELTA: Record<string, number> = { 'Claude Opus 4': 0.03, 'GPT-4 Turbo': 0, 'Llama 3.1 70B': -0.06, 'Gemini 1.5 Pro': -0.02 }

export function EvalSuites() {
  const { runs } = useEvals()
  const { logAction } = useSession()
  const [suite, setSuite] = useState<EvalSuite | null>(null)
  const [running, setRunning] = useState(false)

  const regressions = runs.filter((r) => r.status === 'Regression').length
  const avgScore = runs.length ? Math.round(runs.reduce((a, r) => a + r.score, 0) / runs.length) : 0

  return (
    <div>
      <PageHeader
        title="Eval Suites"
        description="Regression tests of a (model × policy-pack version). Run these before a policy or model change reaches the fleet."
        actions={
          <GatedButton cap="evals.run" className="btn-primary" onClick={() => setRunning(true)}>
            <Play className="h-4 w-4" /> Run eval
          </GatedButton>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Suites" value={evalSuites.length} icon={FlaskConical} tone="blue" footer={`${evalSuites.reduce((a, s) => a + s.size, 0).toLocaleString()} total probes`} />
        <StatCard label="Runs" value={runs.length} icon={History} tone="purple" footer="Across all suites" />
        <StatCard label="Regressions" value={regressions} icon={TrendingDown} tone={regressions ? 'red' : 'green'} footer="Scored below baseline" />
        <StatCard label="Avg score" value={avgScore} icon={Gauge} tone="green" footer="Blended catch vs over-block" />
      </div>

      <Card className="mb-6">
        <CardTitle title="Suites" subtitle="Click a suite to see its sample probes" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {evalSuites.map((s) => (
            <button key={s.id} onClick={() => setSuite(s)} className="rounded-xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink-900">{s.name}</span>
                <Badge tone="slate">{s.owasp}</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-500">{s.description}</p>
              <p className="mt-1.5 text-xs font-medium text-ink-400">{s.size} probes · {owaspName(s.owasp)}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle title="Run history" subtitle="Newest first · regressions flagged against the suite's previous baseline" />
        <Table columns={['Suite', 'Model', 'Policy', 'Date', 'Catch rate', 'Over-block', 'Score', 'Result']} noun="runs" recent>
          {runs.map((r) => (
            <Tr key={r.id}>
              <Td className="text-ink-700">{suiteById(r.suiteId)?.name ?? r.suiteId}</Td>
              <Td className="text-ink-700">{r.model}</Td>
              <Td className="font-mono text-xs text-ink-500">{r.policyPackVersion}</Td>
              <Td className="whitespace-nowrap text-xs text-ink-500">{r.date}</Td>
              <Td className="tabular-nums text-ink-700">{Math.round(catchRate(r) * 100)}%</Td>
              <Td className="tabular-nums text-ink-600">{(overBlockRate(r) * 100).toFixed(1)}%</Td>
              <Td>
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold tabular-nums text-ink-900">{r.score}</span>
                  {r.status === 'Regression' && <span className="text-xs text-rose-600">▼ {r.baselineScore}</span>}
                </span>
              </Td>
              <Td><Badge tone={runTone(r.status)} dot>{r.status}</Badge></Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {suite && (
        <Modal
          open onClose={() => setSuite(null)}
          title={suite.name}
          subtitle={`${owaspName(suite.owasp)} · ${suite.size} probes`}
          maxWidth="max-w-lg"
          footer={<button className="btn-secondary" onClick={() => setSuite(null)}>Close</button>}
        >
          <div className="space-y-3">
            <p className="text-sm text-ink-600">{suite.description}</p>
            <h4 className="text-sm font-semibold text-ink-900">Sample probes</h4>
            <ul className="space-y-1.5">
              {suite.probes.map((p, i) => (
                <li key={i} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-xs text-ink-700">{p}</li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
      {running && <RunModal onClose={() => setRunning(false)} logAction={logAction} runs={runs} />}
    </div>
  )
}

function RunModal({ onClose, logAction, runs }: { onClose: () => void; logAction: (i: { action: string; target: string; category?: string }) => void; runs: EvalRun[] }) {
  const [suiteId, setSuiteId] = useState(evalSuites[0].id)
  const [model, setModel] = useState(evalModels[0])
  const [version, setVersion] = useState(POLICY_PACK_VERSIONS[0])

  const run = () => {
    const suite = suiteById(suiteId)!
    const catchPct = Math.min(0.99, Math.max(0.6, 0.9 + (MODEL_DELTA[model] ?? -0.01)))
    const caught = Math.round(suite.size * catchPct)
    const missed = suite.size - caught
    const benignPassed = Math.round(suite.size * 0.96)
    const overBlocked = Math.max(1, suite.size - benignPassed)
    const obRate = overBlocked / (benignPassed + overBlocked)
    const score = Math.max(0, Math.round(catchPct * 100 - obRate * 20))
    const prior = runs.filter((r) => r.suiteId === suiteId).sort((a, b) => b.date.localeCompare(a.date))[0]
    const baselineScore = prior?.score ?? score
    const status: EvalRun['status'] = score < 70 ? 'Failed' : score < baselineScore - 1 ? 'Regression' : 'Passed'
    const r: EvalRun = {
      id: newId('run'), suiteId, model, policyPackVersion: version, date: new Date().toISOString().slice(0, 10),
      caught, missed, benignPassed, overBlocked, score, baselineScore, status,
    }
    upsertRun(r)
    logAction({ action: 'evals.eval.run', target: `${suite.name} · ${model} · ${version} → ${score}`, category: 'governance' })
    onClose()
  }

  return (
    <Modal
      open onClose={onClose}
      title="Run eval suite"
      subtitle="Scores a model against a suite under a policy-pack version."
      maxWidth="max-w-lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={run}>Run</button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Suite</span>
          <select className="input" value={suiteId} onChange={(e) => setSuiteId(e.target.value)}>
            {evalSuites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Model</span>
          <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
            {evalModels.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Policy-pack version</span>
          <select className="input" value={version} onChange={(e) => setVersion(e.target.value)}>
            {POLICY_PACK_VERSIONS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </label>
      </div>
    </Modal>
  )
}
