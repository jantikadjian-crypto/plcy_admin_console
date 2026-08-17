import { useState } from 'react'
import { Target, ShieldCheck, ShieldAlert, Ban, Info } from 'lucide-react'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge, Modal } from '@/components/ui'
import {
  controlEfficacy, precisionOf, recallOf, f1Of, pct, familyOf, efficacyTotals,
  connectedDeployments, airgappedCount,
} from '@/data/evals'
import type { ControlEfficacy } from '@/data/evals'

const healthTone = (p: number) => (p >= 0.9 ? 'green' : p >= 0.75 ? 'yellow' : 'red')

function Sparkline({ data, tone }: { data: number[]; tone: string }) {
  const w = 72, h = 22
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * (h - 4) - 2}`).join(' ')
  const color = tone === 'green' ? 'text-emerald-500' : tone === 'yellow' ? 'text-amber-500' : 'text-rose-500'
  return (
    <svg width={w} height={h} className={color}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** Synthesised sample of recent decisions for the drill-down (illustrative). */
function sampleDecisions(prefix: string) {
  const rows = [
    { id: `${prefix}-01`, decision: 'Block', label: 'Correct', prompt: 'Route EU prompt to a US-hosted model', outcome: 'Blocked cross-border inference' },
    { id: `${prefix}-02`, decision: 'Block', label: 'False positive', prompt: 'Internal test payload flagged as PII', outcome: 'Over-blocked a benign request' },
    { id: `${prefix}-03`, decision: 'Allow', label: 'Correct', prompt: 'In-region, consented processing', outcome: 'Allowed with obligations logged' },
  ]
  return rows
}

export function Efficacy() {
  const [sel, setSel] = useState<ControlEfficacy | null>(null)
  const t = efficacyTotals()
  const rows = [...controlEfficacy].sort((a, b) => precisionOf(a) - precisionOf(b)) // worst first — attention up top

  return (
    <div>
      <PageHeader
        title="Guardrail Efficacy"
        description="Live detector precision & recall across the SaaS + connected fleet — are our controls catching what they should, and over-blocking what they shouldn't?"
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <span>
          Covers <span className="font-semibold">{connectedDeployments.length} connected instances</span>. Air-gapped deployments
          ({airgappedCount}) have no live telemetry and are validated by the separate offline bundle-certification process.
        </span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall precision" value={`${pct(t.precision)}%`} icon={Target} tone="blue" footer="Of blocks, share that were correct" />
        <StatCard label="Overall recall" value={`${pct(t.recall)}%`} icon={ShieldCheck} tone="green" footer="Of real violations, share caught" />
        <StatCard label="False-positive rate" value={`${pct(t.fpRate)}%`} icon={ShieldAlert} tone="orange" footer="Over-blocks per confirmed catch" />
        <StatCard label="Enforced blocks · 7d" value={t.blocked.toLocaleString()} icon={Ban} tone="purple" footer={`${t.evaluated.toLocaleString()} requests evaluated`} />
      </div>

      <Card>
        <CardTitle title="Efficacy by control family" subtitle="Sorted worst-precision first · click a family for its metrics and a decision sample" />
        <Table columns={['Family', 'Evaluated', 'Blocked', 'Precision', 'Recall', 'F1', '8-wk trend']} noun="families">
          {rows.map((c) => {
            const p = precisionOf(c), r = recallOf(c), tone = healthTone(p)
            return (
              <Tr key={c.prefix} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setSel(c)}>
                <Td>
                  <span className="font-mono text-xs font-semibold text-ink-900">{c.prefix}</span>
                  <span className="ml-2 text-sm text-ink-700">{familyOf(c.prefix)}</span>
                </Td>
                <Td className="tabular-nums text-ink-600">{c.evaluated.toLocaleString()}</Td>
                <Td className="tabular-nums text-ink-600">{c.blocked.toLocaleString()}</Td>
                <Td><Badge tone={tone}>{pct(p)}%</Badge></Td>
                <Td className="tabular-nums text-ink-700">{pct(r)}%</Td>
                <Td className="tabular-nums text-ink-700">{pct(f1Of(c))}%</Td>
                <Td><Sparkline data={c.trend} tone={tone} /></Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

      {sel && (
        <Modal
          open onClose={() => setSel(null)}
          title={<span className="flex items-baseline gap-2"><span className="font-mono text-base">{sel.prefix}</span><span className="text-sm font-normal text-ink-500">{familyOf(sel.prefix)}</span></span>}
          subtitle="Detection quality · last 7 days"
          maxWidth="max-w-2xl"
          footer={<button className="btn-secondary" onClick={() => setSel(null)}>Close</button>}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Precision" value={`${pct(precisionOf(sel))}%`} />
              <Metric label="Recall" value={`${pct(recallOf(sel))}%`} />
              <Metric label="True positives" value={sel.tp.toLocaleString()} />
              <Metric label="False positives" value={sel.fp.toLocaleString()} tone="orange" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-ink-600">
              <span className="font-semibold text-ink-800">{sel.fn.toLocaleString()} missed ({pct(1 - recallOf(sel))}% of violations)</span> — false
              negatives are the tuning target: raise detector sensitivity or add a probe to the eval suite.
            </div>
            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink-900">Recent decisions (sample)</h4>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                {sampleDecisions(sel.prefix).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-xs last:border-0">
                    <span className="min-w-0">
                      <span className="font-mono font-semibold text-ink-900">{d.id}</span>
                      <span className="ml-2 text-ink-600">{d.prompt}</span>
                    </span>
                    <Badge tone={d.label === 'Correct' ? 'green' : 'orange'}>{d.label}</Badge>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Metric({ label, value, tone = 'slate' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${tone === 'orange' ? 'text-orange-600' : 'text-ink-900'}`}>{value}</p>
    </div>
  )
}
