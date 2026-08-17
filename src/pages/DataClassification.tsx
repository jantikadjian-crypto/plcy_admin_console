import {
  Database,
  ShieldAlert,
  Scissors,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardTitle, StatCard, Badge, PageHeader, Progress, Table, Tr, Td } from '@/components/ui'
import { fmtNum, fmtCompact } from '@/data/mock'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

type Tone = 'green' | 'blue' | 'orange' | 'red' | 'purple'

const levels: Array<{ name: string; count: number; pct: number; tone: Tone; color: string }> = [
  { name: 'Public', count: 812400, pct: 46, tone: 'green', color: '#94a3b8' },
  { name: 'Internal', count: 524900, pct: 30, tone: 'blue', color: '#3366ff' },
  { name: 'Confidential', count: 318200, pct: 18, tone: 'orange', color: '#f59e0b' },
  { name: 'Restricted', count: 104700, pct: 6, tone: 'red', color: '#ef4444' },
]

const donutData = levels.map((l) => ({ name: l.name, value: l.count, color: l.color }))

const detections = [
  { day: 'Jun 30', pii: 4200, phi: 1180, pci: 820, secrets: 140 },
  { day: 'Jul 1', pii: 4780, phi: 1320, pci: 910, secrets: 165 },
  { day: 'Jul 2', pii: 4510, phi: 1240, pci: 870, secrets: 152 },
  { day: 'Jul 3', pii: 5120, phi: 1420, pci: 980, secrets: 188 },
  { day: 'Jul 4', pii: 5640, phi: 1560, pci: 1040, secrets: 210 },
  { day: 'Jul 5', pii: 5310, phi: 1490, pci: 990, secrets: 197 },
  { day: 'Jul 6', pii: 5890, phi: 1620, pci: 1120, secrets: 224 },
]

type Trend = 'up' | 'down' | 'flat'
type Action = { label: string; tone: 'red' | 'orange' | 'yellow' | 'green' }

const categories: Array<{
  category: string
  examples: string
  sensitivity: string
  sensTone: 'green' | 'blue' | 'orange' | 'red'
  volume: number
  action: Action
  trend: Trend
}> = [
  { category: 'PII', examples: 'Name, email, phone, address', sensitivity: 'Confidential', sensTone: 'orange', volume: 189400, action: { label: 'Redact', tone: 'orange' }, trend: 'up' },
  { category: 'PHI', examples: 'Diagnoses, MRN, treatment notes', sensitivity: 'Restricted', sensTone: 'red', volume: 42800, action: { label: 'Block', tone: 'red' }, trend: 'up' },
  { category: 'PCI-DSS', examples: 'Card numbers, CVV, expiry', sensitivity: 'Restricted', sensTone: 'red', volume: 31200, action: { label: 'Block', tone: 'red' }, trend: 'flat' },
  { category: 'Credentials / Secrets', examples: 'API keys, tokens, passwords', sensitivity: 'Restricted', sensTone: 'red', volume: 6100, action: { label: 'Block', tone: 'red' }, trend: 'up' },
  { category: 'Source / IP', examples: 'Proprietary code, trade secrets', sensitivity: 'Confidential', sensTone: 'orange', volume: 14700, action: { label: 'Flag', tone: 'yellow' }, trend: 'down' },
  { category: 'General business', examples: 'Public docs, marketing copy', sensitivity: 'Internal', sensTone: 'blue', volume: 96300, action: { label: 'Allow', tone: 'green' }, trend: 'flat' },
]

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-rose-500" />
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-emerald-500" />
  return <Minus className="h-4 w-4 text-ink-400" />
}

export default function DataClassification() {
  const totalItems = levels.reduce((s, l) => s + l.count, 0)
  const restricted = levels.find((l) => l.name === 'Restricted')?.count ?? 0

  return (
    <>
      <PageHeader
        title="Data Classification"
        description="Automated discovery and labeling of sensitive data across governed traffic"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total classified items" value={fmtCompact(totalItems)} icon={Database} tone="blue" footer="Rolling 30 days" />
        <StatCard label="Restricted" value={fmtCompact(restricted)} icon={ShieldAlert} tone="red" footer="Highest sensitivity" />
        <StatCard label="Auto-redacted today" value={fmtNum(8862)} icon={Scissors} tone="orange" footer="Across all packs" />
        <StatCard label="Unclassified" value={fmtNum(1240)} icon={HelpCircle} tone="slate" footer="Awaiting review" />
      </div>

      {/* Sensitivity levels */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {levels.map((l) => (
          <Card key={l.name}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-900">{l.name}</span>
              <Badge tone={l.tone}>{l.pct}%</Badge>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-ink-900">{fmtCompact(l.count)}</p>
            <div className="mt-3">
              <Progress value={l.pct} tone={l.tone} />
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="Items by Classification" subtitle="Distribution across sensitivity levels" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={95} paddingAngle={2} stroke="none">
                  {donutData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle title="Detections by Category" subtitle="Sensitive-data hits over the last 7 days" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detections} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => fmtNum(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Bar dataKey="pii" name="PII" stackId="a" fill="#3366ff" radius={[0, 0, 0, 0]} maxBarSize={44} />
                <Bar dataKey="phi" name="PHI" stackId="a" fill="#8b5cf6" maxBarSize={44} />
                <Bar dataKey="pci" name="PCI" stackId="a" fill="#f59e0b" maxBarSize={44} />
                <Bar dataKey="secrets" name="Secrets" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Category table */}
      <Card className="mt-6">
        <CardTitle title="Detected Data Categories" subtitle="Discovered entity types and their enforcement actions" />
        <Table columns={['Category', 'Example entities', 'Sensitivity', 'Volume', 'Auto-action', 'Trend']} noun="categories">
          {categories.map((c) => (
            <Tr key={c.category}>
              <Td>
                <span className="font-medium text-ink-900">{c.category}</span>
              </Td>
              <Td className="text-ink-500">{c.examples}</Td>
              <Td>
                <Badge tone={c.sensTone}>{c.sensitivity}</Badge>
              </Td>
              <Td className="font-medium text-ink-900">{fmtCompact(c.volume)}</Td>
              <Td>
                <Badge tone={c.action.tone}>{c.action.label}</Badge>
              </Td>
              <Td>
                <TrendIcon trend={c.trend} />
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
