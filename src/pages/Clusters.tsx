import { useState } from 'react'
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
import { Server, Cpu, Boxes, Activity, AlertTriangle, Eye, ArrowUpRight, RotateCcw, Download } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Progress, Modal } from '@/components/ui'
import { deployments, regionByCode } from '@/data/fleet'
import type { Deployment } from '@/data/fleet'
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

interface NodePool {
  name: string
  count: number
  instance: string
}
function nodePools(d: Deployment): NodePool[] {
  if (d.nodes === 0) return []
  const pools: NodePool[] = [{ name: 'system', count: 2, instance: 'm5.xlarge' }]
  if (d.gpuNodes > 0) pools.push({ name: 'inference-gpu', count: d.gpuNodes, instance: 'g5.xlarge' })
  const rest = d.nodes - 2 - d.gpuNodes
  if (rest > 0) pools.push({ name: 'general', count: rest, instance: 'm5.2xlarge' })
  return pools
}

interface ClusterEvent {
  label: string
  when: string
  tone: 'green' | 'orange' | 'blue' | 'red'
}
function recentEvents(d: Deployment): ClusterEvent[] {
  if (d.status === 'Offline')
    return [
      { label: 'Heartbeat lost — control plane unreachable', when: d.lastSync, tone: 'red' },
      { label: 'Last successful metrics scrape', when: d.lastSync, tone: 'orange' },
    ]
  const events: ClusterEvent[] = [
    { label: `Pulled signed image plcy/policy-engine:${d.version}`, when: '18 min ago', tone: 'blue' },
    { label: `Scaled inference-gpu pool to ${d.gpuNodes} node${d.gpuNodes === 1 ? '' : 's'}`, when: '2 h ago', tone: 'green' },
  ]
  if (d.podsHealthy < d.podsTotal)
    events.unshift({ label: `Restarted ${d.podsTotal - d.podsHealthy} unhealthy pod${d.podsTotal - d.podsHealthy === 1 ? '' : 's'}`, when: '6 min ago', tone: 'orange' })
  return events
}

export default function Clusters() {
  const { scope, isAll } = useCustomerScope()
  const [sel, setSel] = useState<Deployment | null>(null)

  const scoped = isAll ? deployments : deployments.filter((d) => d.customer === scope)

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
        description={isAll ? 'Kubernetes fleet health across single-tenant deployments' : `Kubernetes health for ${scope}`}
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
        <CardTitle title="Clusters" subtitle={`${scoped.length} single-tenant Kubernetes cluster${scoped.length === 1 ? '' : 's'}${isAll ? '' : ` · ${scope}`}`} />
        <Table columns={['Customer', 'Region', 'K8s', 'Nodes', 'CPU', 'Memory', 'Pods', 'Status', '']}>
          {scoped.map((d) => {
            const h = health(d)
            const podsBad = d.podsHealthy < d.podsTotal
            return (
              <Tr key={d.id}>
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
                <Td><Badge tone={h.tone} dot>{h.label}</Badge></Td>
                <Td>
                  <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${d.customer}`} onClick={() => setSel(d)}>
                    <Eye className="h-4 w-4" />
                  </button>
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

      {/* Detail modal */}
      {sel && (
        <Modal
          open
          onClose={() => setSel(null)}
          title={sel.customer}
          subtitle={`${regionByCode(sel.regionCode)?.name} · ${sel.regionCode}`}
          headerRight={<Badge tone={health(sel).tone} dot>{health(sel).label}</Badge>}
          footer={<button className="btn-secondary" onClick={() => setSel(null)}>Close</button>}
        >
          <div className="space-y-5">
            {sel.status === 'Offline' && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <p className="text-sm text-rose-900">
                  Cluster unreachable — last seen <strong>{sel.lastSync}</strong>. Metrics below reflect the last known state.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KV label="Region" value={regionByCode(sel.regionCode)?.name ?? sel.regionCode} />
              <KV label="Jurisdiction" value={regionByCode(sel.regionCode)?.jurisdiction ?? '—'} />
              <KV label="K8s version" value={sel.k8sVersion} mono />
              <KV label="Nodes" value={String(sel.nodes)} />
              <KV label="GPU nodes" value={String(sel.gpuNodes)} />
              <KV label="Connectivity" value={sel.connectivity} />
            </div>

            <section className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-700">CPU utilization</span>
                  <span className="tabular-nums text-ink-500">{sel.cpuPct}%</span>
                </div>
                <Progress value={sel.cpuPct} tone={utilTone(sel.cpuPct)} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-700">Memory utilization</span>
                  <span className="tabular-nums text-ink-500">{sel.memPct}%</span>
                </div>
                <Progress value={sel.memPct} tone={memTone(sel.memPct)} />
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-ink-900">Node pools</h4>
                <span className="font-mono text-xs text-ink-400">
                  {sel.podsHealthy}/{sel.podsTotal} pods healthy
                </span>
              </div>
              {nodePools(sel).length > 0 ? (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {nodePools(sel).map((p) => (
                    <li key={p.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="font-medium text-ink-900">{p.name}</span>
                      <span className="font-mono text-xs text-ink-500">{p.count} × {p.instance}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-ink-400">No nodes reporting.</p>
              )}
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink-900">Recent events</h4>
              <ul className="space-y-2">
                {recentEvents(sel).map((e, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <EventIcon tone={e.tone} />
                    <span className="text-ink-700">{e.label}</span>
                    <span className="ml-auto whitespace-nowrap text-xs text-ink-400">{e.when}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Modal>
      )}
    </>
  )
}

function EventIcon({ tone }: { tone: ClusterEvent['tone'] }) {
  const map = {
    green: { Icon: ArrowUpRight, cls: 'text-emerald-500' },
    orange: { Icon: RotateCcw, cls: 'text-orange-500' },
    blue: { Icon: Download, cls: 'text-blue-500' },
    red: { Icon: AlertTriangle, cls: 'text-rose-500' },
  } as const
  const { Icon, cls } = map[tone]
  return <Icon className={`h-4 w-4 shrink-0 ${cls}`} />
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 font-semibold text-ink-900 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  )
}
