import { Bot, CheckCircle2, AlertTriangle, Activity, ShieldAlert } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Card,
  CardTitle,
  PageHeader,
  StatCard,
  Badge,
  StatusBadge,
  Table,
  Tr,
  Td,
} from '@/components/ui'
import { models, fmtCompact } from '@/data/mock'
import type { AIModel } from '@/data/mock'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const typeTone: Record<AIModel['type'], 'blue' | 'purple' | 'green' | 'orange' | 'slate'> = {
  LLM: 'blue',
  Vision: 'purple',
  Embedding: 'green',
  Classifier: 'orange',
  Speech: 'slate',
}

const riskTone: Record<AIModel['risk'], 'green' | 'orange' | 'red'> = {
  Low: 'green',
  Medium: 'orange',
  High: 'red',
}

const totalModels = models.length
const activeModels = models.filter((m) => m.status === 'Active').length
const highRisk = models.filter((m) => m.risk === 'High').length
const totalRequests = models.reduce((s, m) => s + m.requests, 0)
const blocked = models.filter((m) => m.status === 'Blocked')

const riskColors: Record<AIModel['risk'], string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
}
const riskCounts = (['Low', 'Medium', 'High'] as const).map((r) => ({
  name: `${r} Risk`,
  value: models.filter((m) => m.risk === r).length,
  color: riskColors[r],
}))

const providers = Array.from(new Set(models.map((m) => m.provider)))
const types = Array.from(new Set(models.map((m) => m.type)))

export default function Models() {
  return (
    <>
      <PageHeader
        title="AI Models"
        description="Every model under PLCY governance across the customer fleet"
        actions={
          <button className="btn-primary">
            <Bot className="h-4 w-4" />
            Register model
          </button>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total models" value={totalModels} icon={Bot} tone="blue" footer="Under governance" />
        <StatCard label="Active" value={activeModels} icon={CheckCircle2} tone="green" footer={`${totalModels - activeModels} not serving`} />
        <StatCard label="High risk" value={highRisk} icon={AlertTriangle} tone="red" footer="Require review" />
        <StatCard label="Total requests" value={fmtCompact(totalRequests)} icon={Activity} tone="purple" footer="Lifetime volume" />
      </div>

      {/* Shadow AI banner */}
      {blocked.length > 0 && (
        <Card className="mt-6 border-rose-200 bg-rose-50/60" padded={false}>
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-800">
                {blocked.length} unapproved model{blocked.length > 1 ? 's' : ''} blocked
              </p>
              <p className="mt-0.5 text-sm text-rose-700">
                Shadow AI detected: {blocked.map((m) => m.name).join(', ')} — flagged by enforcement and denied at the gateway.
              </p>
            </div>
            <button className="btn-secondary shrink-0">Review</button>
          </div>
        </Card>
      )}

      {/* Filters + donut */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle title="Model Inventory" subtitle="Filter and inspect governed models" />
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <select className="input sm:max-w-xs">
              <option>All providers</option>
              {providers.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select className="input sm:max-w-xs">
              <option>All types</option>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <Table columns={['Model', 'Provider', 'Type', 'Customer', 'Risk', 'Status', 'Requests']}>
            {models.map((m) => (
              <Tr key={m.id}>
                <Td>
                  <p className="font-semibold text-ink-900">{m.name}</p>
                  <p className="text-xs text-ink-400">v{m.version}</p>
                </Td>
                <Td>{m.provider}</Td>
                <Td>
                  <Badge tone={typeTone[m.type]}>{m.type}</Badge>
                </Td>
                <Td>{m.customer}</Td>
                <Td>
                  <Badge tone={riskTone[m.risk]} dot>
                    {m.risk}
                  </Badge>
                </Td>
                <Td>
                  <StatusBadge status={m.status} />
                </Td>
                <Td className="font-medium text-ink-900">{fmtCompact(m.requests)}</Td>
              </Tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardTitle title="Risk Breakdown" subtitle="Governed models by risk tier" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={88} paddingAngle={2} stroke="none">
                  {riskCounts.map((r) => (
                    <Cell key={r.name} fill={r.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} models`} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-xs text-ink-400">
            {highRisk} of {totalModels} models flagged high risk
          </p>
        </Card>
      </div>
    </>
  )
}
