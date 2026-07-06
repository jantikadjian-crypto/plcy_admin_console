import { ShieldAlert, Bot, ListChecks, CheckCircle2 } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { Card, CardTitle, StatCard, PageHeader, Badge, Table, Tr, Td, StatusBadge } from '@/components/ui'
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

export default function Risk() {
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
        <Table columns={['Risk', 'Category', 'Likelihood', 'Impact', 'Score', 'Owner', 'Status', 'Mitigation']}>
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
            </Tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
