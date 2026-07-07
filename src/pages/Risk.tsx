import { useState } from 'react'
import { ShieldAlert, Bot, ListChecks, CheckCircle2, Eye } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { Card, CardTitle, StatCard, PageHeader, Badge, Table, Tr, Td, StatusBadge, Modal } from '@/components/ui'
import { models } from '@/data/mock'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const levels = ['Low', 'Medium', 'High'] as const
type Level = (typeof levels)[number]

const levelTone: Record<Level, 'green' | 'orange' | 'red'> = {
  Low: 'green',
  Medium: 'orange',
  High: 'red',
}

/* ---- 5x5 risk matrix (likelihood rows top→bottom, impact cols left→right) ---- */
const likelihoodLabels = ['Almost certain', 'Likely', 'Possible', 'Unlikely', 'Rare']
const impactLabels = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Severe']

/* counts[row][col] — row 0 = Almost certain, col 0 = Insignificant */
const matrixCounts: number[][] = [
  [0, 1, 1, 2, 1],
  [1, 0, 2, 1, 3],
  [1, 2, 3, 2, 1],
  [2, 1, 1, 0, 1],
  [1, 0, 1, 0, 0],
]

/* cell severity = likelihood weight (5-row) × impact weight (col+1) */
function cellColor(row: number, col: number) {
  const likelihood = 5 - row // row 0 = highest likelihood
  const impact = col + 1
  const score = likelihood * impact
  if (score >= 15) return 'bg-rose-500 text-white'
  if (score >= 10) return 'bg-orange-400 text-white'
  if (score >= 5) return 'bg-amber-300 text-ink-900'
  return 'bg-emerald-300 text-ink-900'
}

const riskByCategory = [
  { name: 'Security', value: 9, color: '#ef4444' },
  { name: 'Privacy', value: 7, color: '#f59e0b' },
  { name: 'Model Quality', value: 6, color: '#3366ff' },
  { name: 'Fairness', value: 4, color: '#8b5cf6' },
  { name: 'Reliability', value: 5, color: '#10b981' },
]

interface RiskRow {
  risk: string
  category: string
  likelihood: Level
  impact: Level
  score: number
  owner: string
  status: string
  mitigation: string
}

/* derive rows from high-risk models, then extend with invented entries */
const modelRisks: RiskRow[] = models
  .filter((m) => m.risk === 'High')
  .map((m) => ({
    risk: `Unmanaged risk in ${m.name}`,
    category: m.type === 'Vision' ? 'Model Quality' : m.status === 'Blocked' ? 'Security' : 'Fairness',
    likelihood: m.status === 'Blocked' ? ('High' as Level) : ('Medium' as Level),
    impact: 'High' as Level,
    score: m.status === 'Blocked' ? 20 : 15,
    owner: m.customer,
    status: m.status === 'Blocked' ? 'Mitigating' : 'Open',
    mitigation: m.status === 'Blocked' ? 'Endpoint blocked pending review' : 'Manual review gate enabled',
  }))

const extraRisks: RiskRow[] = [
  { risk: 'PII redaction bypass on legacy pack', category: 'Privacy', likelihood: 'Medium', impact: 'High', score: 15, owner: 'Security', status: 'Mitigating', mitigation: 'Migrate to PII Standard v3.2' },
  { risk: 'Prompt injection on staging build', category: 'Security', likelihood: 'High', impact: 'Medium', score: 12, owner: 'Platform', status: 'Open', mitigation: 'Injection Defense v1.9 rollout' },
  { risk: 'Policy pack sync latency spikes', category: 'Reliability', likelihood: 'Low', impact: 'Medium', score: 6, owner: 'Platform', status: 'Mitigated', mitigation: 'Autoscale thresholds retuned' },
  { risk: 'Vendor model deprecation without notice', category: 'Reliability', likelihood: 'Medium', impact: 'Medium', score: 9, owner: 'D. Cole', status: 'Open', mitigation: 'Fallback routing configured' },
  { risk: 'Bias drift in loan approval model', category: 'Fairness', likelihood: 'Low', impact: 'High', score: 10, owner: 'P. Nair', status: 'Mitigated', mitigation: 'Continuous fairness monitor active' },
]

const riskRows: RiskRow[] = [...modelRisks, ...extraRisks]

const scoreColor = (n: number) =>
  n >= 15 ? 'text-rose-600' : n >= 10 ? 'text-orange-600' : n >= 5 ? 'text-amber-600' : 'text-emerald-600'

export default function Risk() {
  const [sel, setSel] = useState<RiskRow | null>(null)
  const openRisks = riskRows.filter((r) => r.status === 'Open').length
  const mitigated = riskRows.filter((r) => r.status === 'Mitigated').length
  const highRiskModels = models.filter((m) => m.risk === 'High').length

  return (
    <>
      <PageHeader
        title="Risk Assessment"
        description="Enterprise risk posture across governed AI models and controls"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall Risk Score" value="Medium" icon={ShieldAlert} tone="orange" footer="composite of 31 tracked risks" />
        <StatCard label="High-Risk Models" value={highRiskModels} icon={Bot} tone="red" footer="under enhanced review" />
        <StatCard label="Open Risks" value={openRisks} icon={ListChecks} tone="blue" footer="awaiting mitigation" />
        <StatCard label="Mitigated" value={mitigated} icon={CheckCircle2} tone="green" footer="controls verified" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="Risk Matrix" subtitle="Likelihood × impact with count of open risks" />
          <div className="flex gap-2">
            <div className="flex items-center">
              <span className="rotate-180 text-xs font-medium text-ink-500 [writing-mode:vertical-rl]">Likelihood</span>
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-1">
                {matrixCounts.map((rowVals, row) => (
                  <div key={row} className="contents">
                    <div className="flex items-center justify-end pr-1 text-right text-[10px] leading-tight text-ink-500">
                      {likelihoodLabels[row]}
                    </div>
                    {rowVals.map((count, col) => (
                      <div
                        key={col}
                        className={`flex aspect-square items-center justify-center rounded-md text-sm font-semibold ${cellColor(row, col)}`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    ))}
                  </div>
                ))}
                <div />
                {impactLabels.map((label) => (
                  <div key={label} className="pt-1 text-center text-[10px] leading-tight text-ink-500">
                    {label}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-xs font-medium text-ink-500">Impact</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle title="Risk by Category" subtitle="Distribution of tracked risks" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={95} paddingAngle={2} stroke="none">
                  {riskByCategory.map((r) => (
                    <Cell key={r.name} fill={r.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} risks`} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle title="Risk Register" subtitle="Prioritized log of identified risks and mitigations" />
        <Table columns={['Risk', 'Category', 'Likelihood', 'Impact', 'Score', 'Owner', 'Status', 'Mitigation', '']}>
          {riskRows.map((r) => (
            <Tr key={r.risk}>
              <Td className="font-medium text-ink-900">{r.risk}</Td>
              <Td>{r.category}</Td>
              <Td>
                <Badge tone={levelTone[r.likelihood]}>{r.likelihood}</Badge>
              </Td>
              <Td>
                <Badge tone={levelTone[r.impact]}>{r.impact}</Badge>
              </Td>
              <Td className="font-semibold tabular-nums text-ink-900">{r.score}</Td>
              <Td>{r.owner}</Td>
              <Td>
                <StatusBadge status={r.status} />
              </Td>
              <Td className="text-ink-500">{r.mitigation}</Td>
              <Td>
                <button
                  className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600"
                  aria-label={`View ${r.risk}`}
                  onClick={() => setSel(r)}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {sel && <RiskModal risk={sel} onClose={() => setSel(null)} />}
    </>
  )
}

function RiskModal({ risk: r, onClose }: { risk: RiskRow; onClose: () => void }) {
  const facts: { label: string; value: string }[] = [
    { label: 'Category', value: r.category },
    { label: 'Owner', value: r.owner },
    { label: 'Likelihood', value: r.likelihood },
    { label: 'Impact', value: r.impact },
  ]

  const history: { date: string; event: string }[] = [
    { date: '2025-06-18', event: 'Identified' },
    { date: '2025-06-24', event: 'Mitigation started' },
    r.status === 'Mitigated'
      ? { date: '2025-07-02', event: 'Controls verified' }
      : { date: '2025-07-05', event: 'Under active review' },
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title={r.risk}
      subtitle={`${r.category} · Owner ${r.owner}`}
      headerRight={<StatusBadge status={r.status} />}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary">Update risk</button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
          <div>
            <p className="text-xs font-medium text-ink-500">Risk score</p>
            <p className={`text-3xl font-bold tabular-nums ${scoreColor(r.score)}`}>{r.score}</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge tone={levelTone[r.likelihood]}>{r.likelihood} likelihood</Badge>
            <Badge tone={levelTone[r.impact]}>{r.impact} impact</Badge>
          </div>
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-medium text-ink-500">{f.label}</p>
              <p className="mt-0.5 font-semibold text-ink-900">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Mitigation */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Mitigation</h4>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">{r.mitigation}</div>
        </section>

        {/* Assessment history */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Assessment history</h4>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {history.map((h) => (
              <div key={h.event} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-sm text-ink-700">{h.event}</span>
                <span className="text-xs text-ink-500">{h.date}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}
