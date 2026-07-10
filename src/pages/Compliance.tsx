import { useNavigate } from 'react-router-dom'
import { ShieldCheck, CheckCircle2, Layers, FileText, FileBarChart } from 'lucide-react'
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
import { frameworks, complianceControls as controls, complianceTotals, frameworkStatusTone as statusTone, scoreTone } from '@/data/compliance'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

function barColor(score: number) {
  if (score >= 90) return '#10b981'
  if (score >= 80) return '#3366ff'
  if (score >= 65) return '#f59e0b'
  return '#ef4444'
}

export default function Compliance() {
  const navigate = useNavigate()
  const totalPassed = complianceTotals.passed
  const totalControls = complianceTotals.total
  const overall = complianceTotals.overall

  return (
    <>
      <PageHeader
        title="Compliance Reporting"
        description="Framework coverage and control evidence across the PLCY platform"
        actions={
          <button className="btn-primary" onClick={() => navigate('/reports/compliance')}>
            <FileBarChart className="h-4 w-4" />
            Generate report
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
