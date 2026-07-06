import { Boxes, Rocket, Clock, Archive, GitBranch } from 'lucide-react'
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
import {
  Card,
  CardTitle,
  PageHeader,
  StatCard,
  Badge,
  Table,
  Tr,
  Td,
  Avatar,
} from '@/components/ui'
import { models } from '@/data/mock'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

type Stage = 'Development' | 'Staging' | 'Production' | 'Archived'

const stageMeta: Record<Stage, { tone: 'purple' | 'orange' | 'green' | 'slate'; dot: string; color: string }> = {
  Development: { tone: 'purple', dot: 'bg-violet-500', color: '#8b5cf6' },
  Staging: { tone: 'orange', dot: 'bg-orange-500', color: '#f59e0b' },
  Production: { tone: 'green', dot: 'bg-emerald-500', color: '#10b981' },
  Archived: { tone: 'slate', dot: 'bg-slate-400', color: '#94a3b8' },
}

const stageOrder: Stage[] = ['Development', 'Staging', 'Production', 'Archived']

const owners = ['Dana Cole', 'Marcus Ihde', 'Priya Nair', 'Alex Reyes', 'Jordan Kim']
const approvers = ['R. Chen (Risk)', 'S. Patel (Security)', 'L. Gomez (Compliance)', 'Pending']

function hashFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return 'sha256:' + (h.toString(16) + h.toString(16)).padEnd(12, '0').slice(0, 12)
}

interface RegistryRow {
  id: string
  model: string
  provider: string
  version: string
  stage: Stage
  owner: string
  approvedBy: string
  registered: string
  hash: string
}

const registry: RegistryRow[] = models.map((m, i) => {
  let stage: Stage
  if (m.status === 'Deprecated' || m.status === 'Blocked') stage = 'Archived'
  else if (m.status === 'Review') stage = 'Staging'
  else if (m.type === 'Classifier' || m.type === 'Vision') stage = 'Development'
  else stage = 'Production'
  const approvedBy = stage === 'Production' || stage === 'Archived' ? approvers[i % 3] : 'Pending'
  const day = String((i % 27) + 1).padStart(2, '0')
  const month = String((i % 6) + 1).padStart(2, '0')
  return {
    id: m.id,
    model: m.name,
    provider: m.provider,
    version: `${m.version.includes('.') ? m.version : m.version + '.0'}+build.${100 + i * 7}`,
    stage,
    owner: owners[i % owners.length],
    approvedBy,
    registered: `2025-${month}-${day}`,
    hash: hashFor(m.id + m.version),
  }
})

const registered = registry.length
const inProduction = registry.filter((r) => r.stage === 'Production').length
const pending = registry.filter((r) => r.approvedBy === 'Pending').length
const deprecated = registry.filter((r) => r.stage === 'Archived').length

const stageDistribution = stageOrder.map((s) => ({
  stage: s,
  count: registry.filter((r) => r.stage === s).length,
}))

export default function ModelRegistry() {
  return (
    <>
      <PageHeader
        title="Model Registry"
        description="Versioned catalog of registered models with lifecycle stages and approvals"
        actions={
          <button className="btn-primary">
            <GitBranch className="h-4 w-4" />
            Register version
          </button>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered models" value={registered} icon={Boxes} tone="blue" footer="Version-controlled" />
        <StatCard label="In production" value={inProduction} icon={Rocket} tone="green" footer="Serving live traffic" />
        <StatCard label="Pending approval" value={pending} icon={Clock} tone="orange" footer="Awaiting sign-off" />
        <StatCard label="Deprecated" value={deprecated} icon={Archive} tone="slate" footer="Archived versions" />
      </div>

      {/* Legend + distribution */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardTitle title="Lifecycle Stages" subtitle="Promotion path for every registered version" />
          <ul className="space-y-3">
            {stageOrder.map((s) => (
              <li key={s} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-ink-700">
                  <span className={`h-2.5 w-2.5 rounded-full ${stageMeta[s].dot}`} />
                  {s}
                </span>
                <Badge tone={stageMeta[s].tone}>
                  {registry.filter((r) => r.stage === s).length}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle title="Stage Distribution" subtitle="Registered versions by lifecycle stage" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => `${v} versions`} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={72}>
                  {stageDistribution.map((d) => (
                    <Cell key={d.stage} fill={stageMeta[d.stage].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="mt-6">
        <CardTitle title="Registered Versions" subtitle={`${registry.length} model versions in the catalog`} />
        <Table columns={['Model', 'Version', 'Stage', 'Owner', 'Approved by', 'Registered', 'Artifact hash']}>
          {registry.map((r) => (
            <Tr key={r.id}>
              <Td>
                <p className="font-semibold text-ink-900">{r.model}</p>
                <p className="text-xs text-ink-400">{r.provider}</p>
              </Td>
              <Td className="font-mono text-xs text-ink-700">{r.version}</Td>
              <Td>
                <Badge tone={stageMeta[r.stage].tone} dot>
                  {r.stage}
                </Badge>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Avatar name={r.owner} />
                  <span className="text-sm text-ink-700">{r.owner}</span>
                </div>
              </Td>
              <Td>
                {r.approvedBy === 'Pending' ? (
                  <Badge tone="orange">Pending</Badge>
                ) : (
                  <span className="text-sm text-ink-700">{r.approvedBy}</span>
                )}
              </Td>
              <Td className="text-ink-600">{r.registered}</Td>
              <Td>
                <span className="font-mono text-xs text-ink-400">{r.hash.slice(0, 18)}…</span>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
