import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Server, Cpu, Boxes, Activity, Eye } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Progress } from '@/components/ui'
import { deployments, regionByCode } from '@/data/fleet'
import type { Deployment } from '@/data/fleet'
import { terraformFor, clusterTotals } from '@/data/clusters'
import type { DriftStatus } from '@/data/clusters'
import { useCustomerScope } from '@/context/CustomerScope'

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)', fontSize: 12 }

type Health = { label: string; tone: 'green' | 'orange' | 'red' }
function health(d: Deployment): Health {
  if (d.status === 'Offline') return { label: 'Offline', tone: 'red' }
  if (d.podsHealthy < d.podsTotal) return { label: 'Degraded', tone: 'orange' }
  return { label: 'Healthy', tone: 'green' }
}
const utilTone = (v: number): 'orange' | 'blue' => (v > 80 ? 'orange' : 'blue')
const memTone = (v: number): 'orange' | 'purple' => (v > 80 ? 'orange' : 'purple')
const driftTone: Record<DriftStatus, 'green' | 'orange' | 'slate'> = { 'In sync': 'green', 'Drift detected': 'orange', Unknown: 'slate' }

export default function Clusters() {
  const { scope, isAll } = useCustomerScope()
  const navigate = useNavigate()
  const open = (d: Deployment) => navigate(`/clusters/${d.id}`)

  const scoped = isAll ? deployments : deployments.filter((d) => d.customer === scope)
  const iac = clusterTotals(scoped)

  const totalNodes = scoped.reduce((s, d) => s + d.nodes, 0)
  const totalGpu = scoped.reduce((s, d) => s + d.gpuNodes, 0)
  const podsHealthy = scoped.reduce((s, d) => s + d.podsHealthy, 0)
  const podsTotal = scoped.reduce((s, d) => s + d.podsTotal, 0)
  const attention = scoped.filter((d) => d.status === 'Offline' || d.podsHealthy < d.podsTotal).length

  const chartData = scoped.map((d) => ({ name: d.customer, cpuPct: d.cpuPct, memPct: d.memPct }))

  return (
    <>
      <PageHeader
        title="Cluster Health"
        description={isAll ? "Live health of every customer's Kubernetes cluster — nodes, GPUs, CPU/memory use, and pod status. Each customer runs on their own isolated cluster; this is where you spot the ones that are offline, degraded, or running hot. Click a cluster to dig into its workloads, infrastructure, and guardrails." : `Kubernetes health for ${scope}`}
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clusters" value={scoped.length} icon={Server} tone="blue" footer={attention > 0 ? `${attention} need attention` : 'All operational'} />
        <StatCard label="Nodes" value={totalNodes} icon={Boxes} tone="purple" footer="Across the fleet" />
        <StatCard label="GPU nodes" value={totalGpu} icon={Cpu} tone="orange" footer="Inference capacity" />
        <StatCard label="Pods healthy" value={`${podsHealthy}/${podsTotal}`} icon={Activity} tone={podsHealthy < podsTotal ? 'red' : 'green'} footer={attention > 0 ? `${attention} cluster${attention === 1 ? '' : 's'} degraded` : 'Fully scheduled'} />
      </div>

      {/* Utilization chart */}
      <Card className="mt-6">
        <CardTitle title="CPU vs Memory Utilization" subtitle="Per-cluster resource pressure across the fleet" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={50} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(v: number, n: string) => [`${v}%`, n === 'cpuPct' ? 'CPU' : 'Memory']} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => (v === 'cpuPct' ? 'CPU' : 'Memory')} />
              <Bar dataKey="cpuPct" fill="#3366ff" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="memPct" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Cluster table */}
      <Card className="mt-6">
        <CardTitle title="Clusters" subtitle={`${scoped.length} single-tenant Kubernetes cluster${scoped.length === 1 ? '' : 's'}${isAll ? '' : ` · ${scope}`} · click to open`} />
        <Table columns={['Customer', 'Region', 'K8s', 'Nodes', 'CPU', 'Memory', 'Pods', 'Status', '']} noun="clusters">
          {scoped.map((d) => {
            const hh = health(d)
            const podsBad = d.podsHealthy < d.podsTotal
            return (
              <Tr key={d.id} onClick={() => open(d)}>
                <Td className="font-semibold text-ink-900">{d.customer}</Td>
                <Td>
                  <p className="text-sm text-ink-700">{regionByCode(d.regionCode)?.name ?? d.regionCode}</p>
                  <p className="font-mono text-xs text-ink-400">{d.regionCode}</p>
                </Td>
                <Td className="font-mono text-xs text-ink-700">{d.k8sVersion}</Td>
                <Td className="text-sm text-ink-700">
                  {d.nodes}
                  {d.gpuNodes > 0 && <span className="text-ink-400"> · {d.gpuNodes} GPU</span>}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-20"><Progress value={d.cpuPct} tone={utilTone(d.cpuPct)} /></div>
                    <span className="w-9 text-xs tabular-nums text-ink-500">{d.cpuPct}%</span>
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-20"><Progress value={d.memPct} tone={memTone(d.memPct)} /></div>
                    <span className="w-9 text-xs tabular-nums text-ink-500">{d.memPct}%</span>
                  </div>
                </Td>
                <Td>
                  <span className={`font-mono text-xs ${podsBad ? 'font-semibold text-rose-600' : 'text-ink-700'}`}>
                    {d.podsHealthy}/{d.podsTotal}
                  </span>
                </Td>
                <Td><Badge tone={hh.tone} dot>{hh.label}</Badge></Td>
                <Td>
                  <span className="rounded-md p-1.5 text-ink-400"><Eye className="h-4 w-4" /></span>
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

      {/* Infrastructure as Code */}
      <Card className="mt-6">
        <CardTitle
          title="Infrastructure as Code"
          subtitle="Terraform state per cluster"
          action={
            <Badge tone={iac.drifted > 0 ? 'orange' : 'green'} dot>
              {iac.drifted > 0 ? `${iac.drifted} drifted` : 'All in sync'}
            </Badge>
          }
        />
        <Table columns={['Customer', 'Workspace', 'Provider', 'Resources', 'Drift', 'Last apply']} noun="workspaces">
          {scoped.map((d) => {
            const tf = terraformFor(d)
            return (
              <Tr key={d.id} onClick={() => open(d)}>
                <Td className="font-semibold text-ink-900">{d.customer}</Td>
                <Td className="font-mono text-xs text-ink-600">{tf.workspace}</Td>
                <Td className="text-ink-700">{tf.provider}</Td>
                <Td className="text-ink-700">{tf.resources}</Td>
                <Td>
                  <Badge tone={driftTone[tf.drift]} dot>{tf.drift}</Badge>
                  {tf.planPending && <span className="ml-2 text-xs text-orange-600">plan pending</span>}
                </Td>
                <Td className="whitespace-nowrap text-xs text-ink-500">{tf.lastApply}</Td>
              </Tr>
            )
          })}
        </Table>
      </Card>
    </>
  )
}
