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
import { Server, Cpu, Boxes, Activity, AlertTriangle, Eye, ArrowUpRight, RotateCcw, Download, Container, ShieldCheck, ShieldAlert, GitBranch, Package, Puzzle } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Progress, Modal } from '@/components/ui'
import { deployments, regionByCode } from '@/data/fleet'
import type { Deployment } from '@/data/fleet'
import { workloadsFor, terraformFor, helmFor, addonsFor, clusterTotals } from '@/data/clusters'
import type { Workload, WorkloadStatus, HelmStatus, DriftStatus } from '@/data/clusters'
import { useCustomerScope } from '@/context/CustomerScope'

type ModalTab = 'overview' | 'workloads' | 'infra' | 'addons'
const MODAL_TABS: { key: ModalTab; label: string; icon: typeof Server }[] = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'workloads', label: 'Workloads', icon: Container },
  { key: 'infra', label: 'Infrastructure', icon: GitBranch },
  { key: 'addons', label: 'Add-ons', icon: Puzzle },
]

const workloadStatusTone: Record<WorkloadStatus, 'green' | 'orange' | 'slate'> = {
  Running: 'green',
  Degraded: 'orange',
  Pending: 'slate',
}
const helmStatusTone: Record<HelmStatus, 'green' | 'yellow' | 'red'> = {
  deployed: 'green',
  pending: 'yellow',
  failed: 'red',
}
const driftTone: Record<DriftStatus, 'green' | 'orange' | 'slate'> = {
  'In sync': 'green',
  'Drift detected': 'orange',
  Unknown: 'slate',
}

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
  const [mtab, setMtab] = useState<ModalTab>('overview')
  const openCluster = (d: Deployment) => { setSel(d); setMtab('overview') }

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
                  <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${d.customer}`} onClick={() => openCluster(d)}>
                    <Eye className="h-4 w-4" />
                  </button>
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
        <Table columns={['Customer', 'Workspace', 'Provider', 'Resources', 'Drift', 'Last apply']}>
          {scoped.map((d) => {
            const tf = terraformFor(d)
            return (
              <Tr key={d.id} onClick={() => { openCluster(d); setMtab('infra') }}>
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

      {/* Detail modal */}
      {sel && (
        <Modal
          open
          onClose={() => setSel(null)}
          title={sel.customer}
          subtitle={`${regionByCode(sel.regionCode)?.name} · ${sel.regionCode}`}
          headerRight={<Badge tone={health(sel).tone} dot>{health(sel).label}</Badge>}
          maxWidth="max-w-4xl"
          footer={<button className="btn-secondary" onClick={() => setSel(null)}>Close</button>}
        >
          {sel.status === 'Offline' && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <p className="text-sm text-rose-900">
                Cluster unreachable — last seen <strong>{sel.lastSync}</strong>. Metrics below reflect the last known state.
              </p>
            </div>
          )}

          {/* Tab nav */}
          <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
            {MODAL_TABS.map((t) => {
              const Icon = t.icon
              const active = mtab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setMtab(t.key)}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${
                    active ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {mtab === 'workloads' && <WorkloadsTab d={sel} />}
          {mtab === 'infra' && <InfraTab d={sel} />}
          {mtab === 'addons' && <AddonsTab d={sel} />}

          {mtab === 'overview' && (
          <div className="space-y-5">
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
          )}
        </Modal>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Workloads tab                                                       */
/* ------------------------------------------------------------------ */
function WorkloadsTab({ d }: { d: Deployment }) {
  const workloads = workloadsFor(d)
  const signed = workloads.filter((w) => w.signed).length
  const cves = workloads.reduce((s, w) => s + w.cves, 0)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge tone="blue">{workloads.length} workloads</Badge>
        <Badge tone="green" dot>{signed}/{workloads.length} images signed</Badge>
        <Badge tone={cves > 0 ? 'red' : 'green'} dot>{cves} open CVE{cves === 1 ? '' : 's'}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
              <th className="py-2 pr-3">Workload</th>
              <th className="py-2 pr-3">Image</th>
              <th className="py-2 pr-3">Ready</th>
              <th className="py-2 pr-3">Restarts</th>
              <th className="py-2 pr-3">Requests</th>
              <th className="py-2 pr-3">Security</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {workloads.map((w: Workload) => (
              <tr key={`${w.namespace}/${w.name}`} className="border-b border-slate-100 last:border-0 align-top">
                <td className="py-2.5 pr-3">
                  <p className="font-medium text-ink-900">{w.name}</p>
                  <p className="text-xs text-ink-400">{w.namespace} · {w.kind}</p>
                </td>
                <td className="py-2.5 pr-3">
                  <p className="font-mono text-xs text-ink-700">{w.image}</p>
                  <p className="font-mono text-[11px] text-ink-400">{w.digest.slice(0, 19)}…</p>
                </td>
                <td className="py-2.5 pr-3">
                  <span className={`font-mono text-xs ${w.replicasReady < w.replicas ? 'font-semibold text-rose-600' : 'text-ink-700'}`}>
                    {w.replicasReady}/{w.replicas}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <span className={`font-mono text-xs ${w.restarts > 0 ? 'text-orange-600' : 'text-ink-500'}`}>{w.restarts}</span>
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs text-ink-600">{w.cpu} / {w.mem}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    {w.signed && <span title="Signed (cosign)"><ShieldCheck className="h-4 w-4 text-emerald-500" /></span>}
                    {w.cves > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {w.cves}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 pr-3"><Badge tone={workloadStatusTone[w.status]} dot>{w.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Infrastructure tab (Terraform + Helm)                               */
/* ------------------------------------------------------------------ */
function InfraTab({ d }: { d: Deployment }) {
  const tf = terraformFor(d)
  const helm = helmFor(d)
  return (
    <div className="space-y-5">
      {tf.drift === 'Drift detected' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><strong>{tf.driftedResources} resources</strong> differ from Terraform state. A plan is pending review before the next apply.</span>
        </div>
      )}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="mb-3 flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-ink-400" />
          <h4 className="text-sm font-semibold text-ink-900">Terraform</h4>
          <Badge tone={driftTone[tf.drift]} dot>{tf.drift}</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KV label="Workspace" value={tf.workspace} mono />
          <KV label="Module" value={`${tf.module}@${tf.moduleVersion}`} mono />
          <KV label="Provider" value={tf.provider} />
          <KV label="State backend" value={tf.backend} />
          <KV label="Resources managed" value={String(tf.resources)} />
          <KV label="Last apply" value={`${tf.lastApply} · ${tf.appliedBy}`} />
        </dl>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Package className="h-4 w-4 text-ink-400" />
          <h4 className="text-sm font-semibold text-ink-900">Helm releases</h4>
        </div>
        <Table columns={['Release', 'Chart', 'Chart ver.', 'App ver.', 'Rev', 'Namespace', 'Status']}>
          {helm.map((h) => (
            <Tr key={h.name}>
              <Td className="font-medium text-ink-900">{h.name}</Td>
              <Td className="font-mono text-xs text-ink-600">{h.chart}</Td>
              <Td className="font-mono text-xs text-ink-600">{h.chartVersion}</Td>
              <Td className="font-mono text-xs text-ink-600">{h.appVersion}</Td>
              <Td className="text-ink-700">{h.revision}</Td>
              <Td className="font-mono text-xs text-ink-500">{h.namespace}</Td>
              <Td><Badge tone={helmStatusTone[h.status]} dot>{h.status}</Badge></Td>
            </Tr>
          ))}
        </Table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Add-ons tab                                                         */
/* ------------------------------------------------------------------ */
function AddonsTab({ d }: { d: Deployment }) {
  const addons = addonsFor(d)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {addons.map((a) => (
        <div key={a.name} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">{a.name}</p>
            <p className="font-mono text-xs text-ink-500">{a.component} · {a.version}</p>
          </div>
          <Badge tone={a.status === 'Healthy' ? 'green' : 'orange'} dot>{a.status}</Badge>
        </div>
      ))}
    </div>
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
