import { ShieldCheck, CheckCircle2, Layers, FileText, Download } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Card, CardTitle, StatCard, PageHeader, Badge, Progress, Table, Tr, Td, StatusBadge } from '@/components/ui'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

type FrameworkStatus = 'Compliant' | 'In progress' | 'Gap'

interface Framework {
  name: string
  score: number
  status: FrameworkStatus
  passed: number
  total: number
}

const frameworks: Framework[] = [
  { name: 'SOC 2 Type II', score: 98, status: 'Compliant', passed: 61, total: 62 },
  { name: 'GDPR', score: 96, status: 'Compliant', passed: 48, total: 50 },
  { name: 'HIPAA', score: 94, status: 'Compliant', passed: 42, total: 45 },
  { name: 'EU AI Act', score: 71, status: 'In progress', passed: 34, total: 48 },
  { name: 'ISO/IEC 42001', score: 82, status: 'In progress', passed: 39, total: 47 },
  { name: 'NIST AI RMF', score: 58, status: 'Gap', passed: 26, total: 45 },
]

const statusTone: Record<FrameworkStatus, 'green' | 'orange' | 'red'> = {
  Compliant: 'green',
  'In progress': 'orange',
  Gap: 'red',
}

function scoreTone(score: number): 'green' | 'blue' | 'orange' | 'red' {
  if (score >= 90) return 'green'
  if (score >= 80) return 'blue'
  if (score >= 65) return 'orange'
  return 'red'
}

function barColor(score: number) {
  if (score >= 90) return '#10b981'
  if (score >= 80) return '#3366ff'
  if (score >= 65) return '#f59e0b'
  return '#ef4444'
}

interface Control {
  id: string
  framework: string
  description: string
  status: string
  owner: string
  checked: string
}

const controls: Control[] = [
  { id: 'CC6.1', framework: 'SOC 2', description: 'Logical access controls restrict governed model endpoints', status: 'Passed', owner: 'Security', checked: '2025-07-04' },
  { id: 'CC7.2', framework: 'SOC 2', description: 'Continuous monitoring of anomalous inference traffic', status: 'Passed', owner: 'Platform', checked: '2025-07-05' },
  { id: 'Art.30', framework: 'GDPR', description: 'Records of processing activities for AI workloads', status: 'Passed', owner: 'D. Cole', checked: '2025-07-02' },
  { id: 'Art.35', framework: 'GDPR', description: 'Data protection impact assessment on file', status: 'Passed', owner: 'Legal', checked: '2025-06-28' },
  { id: '164.312', framework: 'HIPAA', description: 'PHI de-identification in prompts and completions', status: 'Passed', owner: 'M. Ihde', checked: '2025-07-01' },
  { id: 'AIA-9', framework: 'EU AI Act', description: 'High-risk system technical documentation complete', status: 'Failed', owner: 'P. Nair', checked: '2025-07-03' },
  { id: 'AIA-14', framework: 'EU AI Act', description: 'Human oversight mechanisms for automated decisions', status: 'Failed', owner: 'Governance', checked: '2025-07-03' },
  { id: 'A.8.3', framework: 'ISO 42001', description: 'AI system impact assessment lifecycle documented', status: 'Passed', owner: 'Governance', checked: '2025-06-30' },
  { id: 'MAP-2', framework: 'NIST AI RMF', description: 'Context of model deployment mapped and classified', status: 'Failed', owner: 'D. Cole', checked: '2025-07-04' },
  { id: 'GOV-4', framework: 'NIST AI RMF', description: 'Third-party model risk governance policy enforced', status: 'N/A', owner: 'Security', checked: '2025-06-25' },
]

export default function Compliance() {
  const totalPassed = frameworks.reduce((s, f) => s + f.passed, 0)
  const totalControls = frameworks.reduce((s, f) => s + f.total, 0)
  const overall = Math.round(frameworks.reduce((s, f) => s + f.score, 0) / frameworks.length)

  return (
    <>
      <PageHeader
        title="Compliance Reporting"
        description="Framework coverage and control evidence across the PLCY platform"
        actions={
          <button className="btn-primary">
            <Download className="h-4 w-4" />
            Download report
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall Compliance" value={`${overall}%`} icon={ShieldCheck} tone="green" footer="weighted across frameworks" />
        <StatCard label="Controls Passing" value={`${totalPassed}/${totalControls}`} icon={CheckCircle2} tone="blue" footer="auto-evaluated nightly" />
        <StatCard label="Frameworks Tracked" value={frameworks.length} icon={Layers} tone="purple" footer="3 fully compliant" />
        <StatCard label="Evidence Artifacts" value="1,284" icon={FileText} tone="slate" footer="collected this quarter" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {frameworks.map((f) => (
          <Card key={f.name}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-ink-900">{f.name}</h3>
              <Badge tone={statusTone[f.status]} dot>
                {f.status}
              </Badge>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-bold tracking-tight text-ink-900">{f.score}%</span>
              <span className="text-xs text-ink-500">
                {f.passed}/{f.total} controls
              </span>
            </div>
            <div className="mt-3">
              <Progress value={f.score} tone={scoreTone(f.score)} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardTitle title="Framework Scores" subtitle="Control pass rate by regulatory framework" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={frameworks} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={70}>
                {frameworks.map((f) => (
                  <Cell key={f.name} fill={barColor(f.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mt-6">
        <CardTitle title="Control Evidence" subtitle="Latest automated control evaluations" />
        <Table columns={['Control ID', 'Framework', 'Description', 'Status', 'Owner', 'Last checked']}>
          {controls.map((c) => (
            <Tr key={c.id + c.framework}>
              <Td className="font-mono text-xs text-ink-700">{c.id}</Td>
              <Td>{c.framework}</Td>
              <Td className="text-ink-700">{c.description}</Td>
              <Td>
                <StatusBadge status={c.status} />
              </Td>
              <Td>{c.owner}</Td>
              <Td className="text-ink-500">{c.checked}</Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
