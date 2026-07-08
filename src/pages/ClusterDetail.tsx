import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Activity,
  Container,
  GitBranch,
  Puzzle,
  SlidersHorizontal,
  ShieldCheck,
  ShieldAlert,
  Package,
  AlertTriangle,
  ArrowUpRight,
  RotateCcw,
  Download,
  Pencil,
  Save,
  X,
  RotateCw,
  Plus,
  Trash2,
  Building2,
  Maximize2,
  Undo2,
  Terminal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, StatCard, Badge, Table, Tr, Td, Progress, EmptyState, Modal } from '@/components/ui'
import { useSession } from '@/context/Session'
import { useCustomerScope } from '@/context/CustomerScope'
import { deployments, regionByCode, releases } from '@/data/fleet'
import type { Deployment } from '@/data/fleet'
import { customers } from '@/data/mock'
import { workloadsFor, terraformFor, helmFor, addonsFor, nodePoolsFor, podsForWorkload, workloadLogs } from '@/data/clusters'
import type { Workload, WorkloadStatus, HelmStatus, DriftStatus, PodStatus } from '@/data/clusters'
import {
  loadConfig,
  saveConfig,
  resetConfig,
  defaultConfig,
  K8S_VERSIONS,
  RELEASE_OPTIONS,
} from '@/data/clusterConfig'
import type { ClusterConfig } from '@/data/clusterConfig'

/* ------------------------------------------------------------------ */
/* Tones & helpers                                                     */
/* ------------------------------------------------------------------ */
type Health = { label: string; tone: 'green' | 'orange' | 'red' }
function health(d: Deployment): Health {
  if (d.status === 'Offline') return { label: 'Offline', tone: 'red' }
  if (d.podsHealthy < d.podsTotal) return { label: 'Degraded', tone: 'orange' }
  return { label: 'Healthy', tone: 'green' }
}
const utilTone = (v: number): 'orange' | 'blue' => (v > 80 ? 'orange' : 'blue')
const memTone = (v: number): 'orange' | 'purple' => (v > 80 ? 'orange' : 'purple')
const workloadStatusTone: Record<WorkloadStatus, 'green' | 'orange' | 'slate'> = { Running: 'green', Degraded: 'orange', Pending: 'slate' }
const helmStatusTone: Record<HelmStatus, 'green' | 'yellow' | 'red'> = { deployed: 'green', pending: 'yellow', failed: 'red' }
const driftTone: Record<DriftStatus, 'green' | 'orange' | 'slate'> = { 'In sync': 'green', 'Drift detected': 'orange', Unknown: 'slate' }

type Tab = 'overview' | 'workloads' | 'infra' | 'addons' | 'config'

export default function ClusterDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can, logAction } = useSession()
  const { setScope } = useCustomerScope()
  const [tab, setTab] = useState<Tab>('overview')

  const d = deployments.find((x) => x.id === id)
  const [config, setConfig] = useState<ClusterConfig | null>(null)
  const [draft, setDraft] = useState<ClusterConfig | null>(null)
  const [editing, setEditing] = useState(false)
  const [workloads, setWorkloads] = useState<Workload[]>(() => (d ? workloadsFor(d) : []))
  const [detailName, setDetailName] = useState<string | null>(null)
  const [scaleName, setScaleName] = useState<string | null>(null)

  useEffect(() => {
    if (d) {
      setConfig(loadConfig(d.id, d))
      setWorkloads(workloadsFor(d))
    }
    setEditing(false)
    setDetailName(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!d) {
    return (
      <Card>
        <EmptyState icon={Building2} title="Cluster not found" description="This cluster is not in the fleet." />
        <div className="mt-4 flex justify-center">
          <Link to="/clusters" className="btn-secondary"><ArrowLeft className="h-4 w-4" />Back to Cluster Health</Link>
        </div>
      </Card>
    )
  }
  if (!config) return null

  const canEdit = can('provision.manage')
  const view = editing && draft ? draft : config
  const setField = (patch: Partial<ClusterConfig>) => setDraft((c) => (c ? { ...c, ...patch } : c))

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(config)) as ClusterConfig)
    setTab('config')
    setEditing(true)
  }
  const cancel = () => setEditing(false)
  const save = () => {
    if (draft) {
      saveConfig(d.id, draft)
      setConfig(draft)
      logAction({ action: 'cluster.config.update', target: `${d.customer} cluster`, category: 'operations' })
    }
    setEditing(false)
  }
  const resetDefaults = () => {
    resetConfig(d.id)
    const def = defaultConfig(d)
    setConfig(def)
    if (editing) setDraft(JSON.parse(JSON.stringify(def)) as ClusterConfig)
    logAction({ action: 'cluster.config.reset', target: `${d.customer} cluster`, category: 'operations' })
  }

  // Workload lifecycle actions (gated on provision.manage, audited)
  const patchWorkload = (name: string, patch: Partial<Workload>) =>
    setWorkloads((prev) => prev.map((w) => (w.name === name ? { ...w, ...patch } : w)))
  const restartWorkload = (w: Workload) => {
    patchWorkload(w.name, { status: 'Pending', replicasReady: 0 })
    logAction({ action: 'workload.restart', target: `${w.name} · ${d.customer}`, category: 'operations' })
    window.setTimeout(() => patchWorkload(w.name, { status: 'Running', replicasReady: w.replicas, restarts: 0 }), 1200)
  }
  const scaleWorkload = (name: string, n: number) => {
    patchWorkload(name, { replicas: n, replicasReady: n, status: 'Running' })
    logAction({ action: 'workload.scale', target: `${name} → ${n} replicas · ${d.customer}`, category: 'operations' })
    setScaleName(null)
  }
  const rollbackWorkload = (w: Workload) => {
    const idx = releases.findIndex((r) => w.image.endsWith(r.version))
    if (idx < 0) return
    const prev = releases[idx + 1] ?? releases[idx]
    patchWorkload(w.name, { image: w.image.replace(/:[^:]+$/, `:${prev.version}`), status: 'Running', replicasReady: w.replicas, restarts: 0 })
    logAction({ action: 'workload.rollback', target: `${w.name} → ${prev.version} · ${d.customer}`, category: 'operations' })
  }
  const canManageWorkloads = can('provision.manage')

  const h = health(d)
  const region = regionByCode(d.regionCode)
  const tf = terraformFor(d)

  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'workloads', label: 'Workloads', icon: Container },
    { key: 'infra', label: 'Infrastructure', icon: GitBranch },
    { key: 'addons', label: 'Add-ons', icon: Puzzle },
    { key: 'config', label: 'Configuration', icon: SlidersHorizontal },
  ]

  return (
    <>
      <Link to="/clusters" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" />
        Cluster Health
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">{d.customer}</h1>
            <Badge tone={h.tone} dot>{h.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {region?.name ?? d.regionCode} · <span className="font-mono">{d.regionCode}</span> · {d.connectivity} · K8s {d.k8sVersion}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          {editing ? (
            <>
              <button className="btn-ghost text-ink-500" onClick={resetDefaults}><RotateCw className="h-4 w-4" />Reset</button>
              <button className="btn-secondary" onClick={cancel}><X className="h-4 w-4" />Cancel</button>
              <button className="btn-primary" onClick={save}><Save className="h-4 w-4" />Save changes</button>
            </>
          ) : (
            <>
              {(() => {
                const custId = customers.find((c) => c.name === d.customer)?.id
                return custId ? (
                  <button className="btn-secondary" onClick={() => { setScope(d.customer); navigate(`/customers/${custId}`) }} title="Open the customer this cluster belongs to">
                    <Building2 className="h-4 w-4" />
                    Customer
                  </button>
                ) : null
              })()}
              {canEdit && (
                <button className="btn-primary" onClick={startEdit}>
                  <Pencil className="h-4 w-4" />
                  Edit configuration
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stat row */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Nodes" value={d.nodes} icon={Puzzle} tone="blue" footer={`${d.gpuNodes} GPU`} />
        <StatCard label="Pods healthy" value={`${d.podsHealthy}/${d.podsTotal}`} icon={Activity} tone={d.podsHealthy < d.podsTotal ? 'red' : 'green'} footer="Scheduled" />
        <StatCard label="CPU / Memory" value={`${d.cpuPct}% / ${d.memPct}%`} icon={SlidersHorizontal} tone={d.cpuPct > 80 || d.memPct > 80 ? 'orange' : 'purple'} footer="Utilization" />
        <StatCard label="Terraform" value={tf.drift} icon={GitBranch} tone={tf.drift === 'Drift detected' ? 'orange' : 'green'} footer={`${tf.resources} resources`} />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${active ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'}`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.key === 'config' && editing && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        {tab === 'overview' && <OverviewTab d={d} />}
        {tab === 'workloads' && (
          <WorkloadsTab
            workloads={workloads}
            canManage={canManageWorkloads}
            onRestart={restartWorkload}
            onScale={setScaleName}
            onRollback={rollbackWorkload}
            onOpen={setDetailName}
          />
        )}
        {tab === 'infra' && <InfraTab d={d} />}
        {tab === 'addons' && <AddonsTab d={d} view={view} editing={editing} setField={setField} />}
        {tab === 'config' && <ConfigTab view={view} editing={editing} canEdit={canEdit} onEdit={startEdit} setField={setField} />}
      </div>

      {detailName && (() => {
        const w = workloads.find((x) => x.name === detailName)
        if (!w) return null
        return (
          <WorkloadDrawer
            w={w}
            regionCode={d.regionCode}
            canManage={canManageWorkloads}
            onClose={() => setDetailName(null)}
            onRestart={() => restartWorkload(w)}
            onScale={() => setScaleName(w.name)}
            onRollback={() => rollbackWorkload(w)}
          />
        )
      })()}

      {scaleName && (() => {
        const w = workloads.find((x) => x.name === scaleName)
        if (!w) return null
        return <ScaleModal w={w} onClose={() => setScaleName(null)} onScale={(n) => scaleWorkload(w.name, n)} />
      })()}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Overview (read-only)                                                */
/* ------------------------------------------------------------------ */
function recentEvents(d: Deployment): { label: string; when: string; tone: 'green' | 'orange' | 'blue' | 'red' }[] {
  if (d.status === 'Offline')
    return [
      { label: 'Heartbeat lost — control plane unreachable', when: d.lastSync, tone: 'red' },
      { label: 'Last successful metrics scrape', when: d.lastSync, tone: 'orange' },
    ]
  const events: { label: string; when: string; tone: 'green' | 'orange' | 'blue' | 'red' }[] = [
    { label: `Pulled signed image plcy/policy-engine:${d.version}`, when: '18 min ago', tone: 'blue' },
    { label: `Scaled inference-gpu pool to ${d.gpuNodes} node${d.gpuNodes === 1 ? '' : 's'}`, when: '2 h ago', tone: 'green' },
  ]
  if (d.podsHealthy < d.podsTotal) events.unshift({ label: `Restarted ${d.podsTotal - d.podsHealthy} unhealthy pod(s)`, when: '6 min ago', tone: 'orange' })
  return events
}
function EventIcon({ tone }: { tone: 'green' | 'orange' | 'blue' | 'red' }) {
  const map = { green: { Icon: ArrowUpRight, cls: 'text-emerald-500' }, orange: { Icon: RotateCcw, cls: 'text-orange-500' }, blue: { Icon: Download, cls: 'text-blue-500' }, red: { Icon: AlertTriangle, cls: 'text-rose-500' } } as const
  const { Icon, cls } = map[tone]
  return <Icon className={`h-4 w-4 shrink-0 ${cls}`} />
}

function OverviewTab({ d }: { d: Deployment }) {
  const region = regionByCode(d.regionCode)
  return (
    <div className="space-y-6">
      {d.status === 'Offline' && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <p className="text-sm text-rose-900">Cluster unreachable — last seen <strong>{d.lastSync}</strong>. Metrics reflect the last known state.</p>
        </div>
      )}
      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KV label="Region" value={region?.name ?? d.regionCode} />
          <KV label="Jurisdiction" value={region?.jurisdiction ?? '—'} />
          <KV label="K8s version" value={d.k8sVersion} mono />
          <KV label="Nodes" value={String(d.nodes)} />
          <KV label="GPU nodes" value={String(d.gpuNodes)} />
          <KV label="Sovereignty" value={d.sovereignty} />
        </div>
        <div className="mt-5 space-y-3">
          <UtilBar label="CPU utilization" value={d.cpuPct} tone={utilTone(d.cpuPct)} />
          <UtilBar label="Memory utilization" value={d.memPct} tone={memTone(d.memPct)} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="Node pools" subtitle={`${d.podsHealthy}/${d.podsTotal} pods healthy`} />
          {nodePoolsFor(d).length ? (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {nodePoolsFor(d).map((p) => (
                <li key={p.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium text-ink-900">{p.name}</span>
                  <span className="font-mono text-xs text-ink-500">{p.count} × {p.instance}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-ink-400">No nodes reporting.</p>
          )}
        </Card>
        <Card>
          <CardTitle title="Recent events" subtitle="Control-plane activity" />
          <ul className="space-y-2">
            {recentEvents(d).map((e, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <EventIcon tone={e.tone} />
                <span className="text-ink-700">{e.label}</span>
                <span className="ml-auto whitespace-nowrap text-xs text-ink-400">{e.when}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Workloads (read-only)                                               */
/* ------------------------------------------------------------------ */
const canRollback = (w: Workload) => releases.some((r) => w.image.endsWith(r.version))

function WorkloadsTab({
  workloads,
  canManage,
  onRestart,
  onScale,
  onRollback,
  onOpen,
}: {
  workloads: Workload[]
  canManage: boolean
  onRestart: (w: Workload) => void
  onScale: (name: string) => void
  onRollback: (w: Workload) => void
  onOpen: (name: string) => void
}) {
  const signed = workloads.filter((w) => w.signed).length
  const cves = workloads.reduce((s, w) => s + w.cves, 0)
  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="blue">{workloads.length} workloads</Badge>
        <Badge tone="green" dot>{signed}/{workloads.length} images signed</Badge>
        <Badge tone={cves > 0 ? 'red' : 'green'} dot>{cves} open CVE{cves === 1 ? '' : 's'}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
              <th className="py-2 pr-3">Workload</th>
              <th className="py-2 pr-3">Image</th>
              <th className="py-2 pr-3">Ready</th>
              <th className="py-2 pr-3">Restarts</th>
              <th className="py-2 pr-3">Security</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workloads.map((w: Workload) => (
              <tr key={`${w.namespace}/${w.name}`} className="border-b border-slate-100 align-top last:border-0">
                <td className="py-2.5 pr-3">
                  <button className="text-left" onClick={() => onOpen(w.name)}>
                    <p className="font-medium text-ink-900 hover:text-brand-700">{w.name}</p>
                    <p className="text-xs text-ink-400">{w.namespace} · {w.kind}</p>
                  </button>
                </td>
                <td className="py-2.5 pr-3">
                  <p className="font-mono text-xs text-ink-700">{w.image}</p>
                  <p className="font-mono text-[11px] text-ink-400">{w.digest.slice(0, 19)}…</p>
                </td>
                <td className="py-2.5 pr-3"><span className={`font-mono text-xs ${w.replicasReady < w.replicas ? 'font-semibold text-rose-600' : 'text-ink-700'}`}>{w.replicasReady}/{w.replicas}</span></td>
                <td className="py-2.5 pr-3"><span className={`font-mono text-xs ${w.restarts > 0 ? 'text-orange-600' : 'text-ink-500'}`}>{w.restarts}</span></td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    {w.signed && <span title="Signed (cosign)"><ShieldCheck className="h-4 w-4 text-emerald-500" /></span>}
                    {w.cves > 0 && <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600"><ShieldAlert className="h-3.5 w-3.5" />{w.cves}</span>}
                  </div>
                </td>
                <td className="py-2.5 pr-3"><Badge tone={workloadStatusTone[w.status]} dot>{w.status}</Badge></td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center justify-end gap-0.5">
                    <IconBtn title="Logs & pods" onClick={() => onOpen(w.name)}><Terminal className="h-4 w-4" /></IconBtn>
                    {canManage && <IconBtn title="Restart" onClick={() => onRestart(w)}><RotateCw className="h-4 w-4" /></IconBtn>}
                    {canManage && <IconBtn title="Scale" onClick={() => onScale(w.name)}><Maximize2 className="h-4 w-4" /></IconBtn>}
                    {canManage && canRollback(w) && <IconBtn title="Roll back image" onClick={() => onRollback(w)}><Undo2 className="h-4 w-4" /></IconBtn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!canManage && <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400"><Terminal className="h-3 w-3" /> Your role can view workloads but not restart, scale, or roll them back.</p>}
    </Card>
  )
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-slate-100 hover:text-brand-600">
      {children}
    </button>
  )
}

const podStatusTone: Record<PodStatus, 'green' | 'red' | 'slate' | 'orange'> = { Running: 'green', CrashLoopBackOff: 'red', Pending: 'slate', Terminating: 'orange' }

function WorkloadDrawer({ w, regionCode, canManage, onClose, onRestart, onScale, onRollback }: {
  w: Workload
  regionCode: string
  canManage: boolean
  onClose: () => void
  onRestart: () => void
  onScale: () => void
  onRollback: () => void
}) {
  const pods = podsForWorkload(w, regionCode)
  const logs = workloadLogs(w)
  return (
    <Modal
      open
      onClose={onClose}
      title={w.name}
      subtitle={`${w.namespace} · ${w.kind}`}
      maxWidth="max-w-3xl"
      headerRight={<Badge tone={workloadStatusTone[w.status]} dot>{w.status}</Badge>}
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="font-mono text-xs text-ink-400">{w.image}</span>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={onClose}>Close</button>
            {canManage && <button className="btn-secondary" onClick={onRestart}><RotateCw className="h-4 w-4" />Restart</button>}
            {canManage && <button className="btn-secondary" onClick={onScale}><Maximize2 className="h-4 w-4" />Scale</button>}
            {canManage && canRollback(w) && <button className="btn-secondary" onClick={onRollback}><Undo2 className="h-4 w-4" />Roll back</button>}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-semibold text-ink-900">Pods</p>
            <span className="text-xs text-ink-500">{w.replicasReady}/{w.replicas} ready</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {pods.map((p) => (
              <div key={p.name} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 last:border-0">
                <span className="truncate font-mono text-xs text-ink-700">{p.name}</span>
                <span className="hidden font-mono text-xs text-ink-400 sm:inline">{p.node}</span>
                <span className="font-mono text-xs text-ink-400">{p.restarts} restarts · {p.age}</span>
                <Badge tone={podStatusTone[p.status]} dot>{p.status}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-900">Logs</p>
          <div className="space-y-0.5 rounded-xl bg-ink-900/95 p-3 font-mono text-xs text-slate-200">
            {logs.map((l, i) => (
              <div key={i} className={l.includes('error') ? 'text-rose-300' : l.includes('warn') ? 'text-amber-300' : ''}>
                <span className="text-slate-500">{String(i + 1).padStart(2, '0')} </span>{l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function ScaleModal({ w, onClose, onScale }: { w: Workload; onClose: () => void; onScale: (n: number) => void }) {
  const [n, setN] = useState(w.replicas)
  return (
    <Modal
      open
      onClose={onClose}
      title={`Scale ${w.name}`}
      subtitle={`${w.namespace} · currently ${w.replicas} replica${w.replicas === 1 ? '' : 's'}`}
      maxWidth="max-w-sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onScale(n)}><Maximize2 className="h-4 w-4" />Scale to {n}</button>
        </>
      }
    >
      <label className="mb-1.5 block text-sm font-medium text-ink-700">Desired replicas</label>
      <div className="flex items-center gap-3">
        <button className="btn-secondary px-3" onClick={() => setN((v) => Math.max(0, v - 1))}>−</button>
        <input type="number" min={0} className="input w-24 text-center" value={n} onChange={(e) => setN(Math.max(0, Number(e.target.value)))} />
        <button className="btn-secondary px-3" onClick={() => setN((v) => v + 1)}>+</button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Infrastructure (read-only)                                          */
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
      <Card>
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
      </Card>
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Package className="h-4 w-4 text-ink-400" />
          <h4 className="text-sm font-semibold text-ink-900">Helm releases</h4>
        </div>
        <Table columns={['Release', 'Chart', 'Chart ver.', 'App ver.', 'Rev', 'Namespace', 'Status']}>
          {helm.map((r) => (
            <Tr key={r.name}>
              <Td className="font-medium text-ink-900">{r.name}</Td>
              <Td className="font-mono text-xs text-ink-600">{r.chart}</Td>
              <Td className="font-mono text-xs text-ink-600">{r.chartVersion}</Td>
              <Td className="font-mono text-xs text-ink-600">{r.appVersion}</Td>
              <Td className="text-ink-700">{r.revision}</Td>
              <Td className="font-mono text-xs text-ink-500">{r.namespace}</Td>
              <Td><Badge tone={helmStatusTone[r.status]} dot>{r.status}</Badge></Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Add-ons (editable: enable + version)                                */
/* ------------------------------------------------------------------ */
function AddonsTab({ d, view, editing, setField }: { d: Deployment; view: ClusterConfig; editing: boolean; setField: (p: Partial<ClusterConfig>) => void }) {
  const observed = addonsFor(d)
  const healthOf = (name: string) => observed.find((a) => a.name === name)?.status ?? 'Healthy'
  const update = (i: number, patch: Partial<ClusterConfig['addons'][number]>) =>
    setField({ addons: view.addons.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) })
  return (
    <Card>
      <CardTitle title="Add-ons" subtitle={editing ? 'Enable/disable and pin versions' : 'Installed platform add-ons & health'} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {view.addons.map((a, i) => {
          const hs = healthOf(a.name)
          return (
            <div key={a.name} className={`rounded-xl border p-3 ${a.enabled ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{a.name}</p>
                  <p className="font-mono text-xs text-ink-500">{a.component}</p>
                </div>
                {editing ? (
                  <button
                    onClick={() => update(i, { enabled: !a.enabled })}
                    aria-pressed={a.enabled}
                    className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${a.enabled ? 'justify-end bg-brand-600' : 'justify-start bg-slate-300'}`}
                  >
                    <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                  </button>
                ) : (
                  <Badge tone={!a.enabled ? 'slate' : hs === 'Healthy' ? 'green' : 'orange'} dot>{!a.enabled ? 'Disabled' : hs}</Badge>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-ink-400">Version</span>
                {editing ? (
                  <input className="input h-8 w-28 py-1 font-mono text-xs" value={a.version} onChange={(e) => update(i, { version: e.target.value })} />
                ) : (
                  <span className="font-mono text-xs text-ink-700">{a.version}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Configuration (editable)                                            */
/* ------------------------------------------------------------------ */
function ConfigTab({ view, editing, canEdit, onEdit, setField }: { view: ClusterConfig; editing: boolean; canEdit: boolean; onEdit: () => void; setField: (p: Partial<ClusterConfig>) => void }) {
  const numInput = (val: number, on: (n: number) => void) => (
    <input type="number" min={0} className="input h-8 w-20 py-1" value={val} onChange={(e) => on(Number(e.target.value))} disabled={!editing} />
  )
  const updatePool = (i: number, patch: Partial<ClusterConfig['pools'][number]>) =>
    setField({ pools: view.pools.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) })
  const updateLabel = (i: number, patch: Partial<ClusterConfig['labels'][number]>) =>
    setField({ labels: view.labels.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) })

  return (
    <div className="space-y-6">
      {!editing && (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
          <p className="text-sm text-ink-600">This is the cluster's desired-state configuration.</p>
          {canEdit ? (
            <button className="btn-secondary" onClick={onEdit}><Pencil className="h-4 w-4" />Edit configuration</button>
          ) : (
            <span className="text-xs text-ink-400">Your role can’t edit cluster configuration.</span>
          )}
        </div>
      )}

      {/* Node pools & autoscaling */}
      <Card>
        <CardTitle
          title="Node Pools & Autoscaling"
          subtitle="Desired capacity and autoscaler bounds"
          action={
            <label className="flex items-center gap-2 text-sm text-ink-700">
              Autoscaling
              <button
                onClick={() => editing && setField({ autoscaling: !view.autoscaling })}
                aria-pressed={view.autoscaling}
                disabled={!editing}
                className={`inline-flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${view.autoscaling ? 'justify-end bg-brand-600' : 'justify-start bg-slate-300'} ${!editing ? 'opacity-60' : ''}`}
              >
                <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
              </button>
            </label>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3">Pool</th>
                <th className="py-2 pr-3">Instance type</th>
                <th className="py-2 pr-3">Desired</th>
                <th className="py-2 pr-3">Min</th>
                <th className="py-2 pr-3">Max</th>
              </tr>
            </thead>
            <tbody>
              {view.pools.map((p, i) => (
                <tr key={p.name} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-ink-900">{p.name}</td>
                  <td className="py-2.5 pr-3">
                    {editing ? (
                      <input className="input h-8 w-36 py-1 font-mono text-xs" value={p.instance} onChange={(e) => updatePool(i, { instance: e.target.value })} />
                    ) : (
                      <span className="font-mono text-xs text-ink-700">{p.instance}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">{numInput(p.desired, (n) => updatePool(i, { desired: n }))}</td>
                  <td className="py-2.5 pr-3">{numInput(p.min, (n) => updatePool(i, { min: n }))}</td>
                  <td className="py-2.5 pr-3">{numInput(p.max, (n) => updatePool(i, { max: n }))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upgrade policy */}
      <Card>
        <CardTitle title="Upgrade Policy" subtitle="Target versions, maintenance window, and apply mode" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Target Kubernetes version">
            <select className="input" value={view.targetK8s} onChange={(e) => setField({ targetK8s: e.target.value })} disabled={!editing}>
              {[...new Set([view.targetK8s, ...K8S_VERSIONS])].map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Target PLCY release">
            <select className="input" value={view.targetRelease} onChange={(e) => setField({ targetRelease: e.target.value })} disabled={!editing}>
              {[...new Set([view.targetRelease, ...RELEASE_OPTIONS])].map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Maintenance window">
            <input className="input" value={view.maintenanceWindow} onChange={(e) => setField({ maintenanceWindow: e.target.value })} disabled={!editing} />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <button
                onClick={() => editing && setField({ autoApply: !view.autoApply })}
                aria-pressed={view.autoApply}
                disabled={!editing}
                className={`inline-flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${view.autoApply ? 'justify-end bg-brand-600' : 'justify-start bg-slate-300'} ${!editing ? 'opacity-60' : ''}`}
              >
                <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
              </button>
              Terraform auto-apply
            </label>
          </div>
        </div>
      </Card>

      {/* Alert thresholds */}
      <Card>
        <CardTitle title="Alert Thresholds" subtitle="Utilization levels that page on-call" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="CPU alert (%)">{numInput(view.cpuAlert, (n) => setField({ cpuAlert: n }))}</Field>
          <Field label="Memory alert (%)">{numInput(view.memAlert, (n) => setField({ memAlert: n }))}</Field>
        </div>
      </Card>

      {/* Labels */}
      <Card>
        <CardTitle
          title="Labels"
          subtitle="Cluster metadata / tags"
          action={editing ? (
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setField({ labels: [...view.labels, { key: '', value: '' }] })}>
              <Plus className="h-3.5 w-3.5" />Add label
            </button>
          ) : undefined}
        />
        <div className="space-y-2">
          {view.labels.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              {editing ? (
                <>
                  <input className="input h-8 flex-1 py-1 font-mono text-xs" value={l.key} placeholder="key" onChange={(e) => updateLabel(i, { key: e.target.value })} />
                  <span className="text-ink-400">=</span>
                  <input className="input h-8 flex-1 py-1 font-mono text-xs" value={l.value} placeholder="value" onChange={(e) => updateLabel(i, { value: e.target.value })} />
                  <button onClick={() => setField({ labels: view.labels.filter((_, idx) => idx !== i) })} aria-label="Remove label" className="rounded-md p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-ink-700">
                  <span className="text-ink-500">{l.key}</span>=<span>{l.value}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 font-semibold text-ink-900 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  )
}
function UtilBar({ label, value, tone }: { label: string; value: number; tone: 'orange' | 'blue' | 'purple' }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-ink-700">{label}</span>
        <span className="tabular-nums text-ink-500">{value}%</span>
      </div>
      <Progress value={value} tone={tone} />
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  )
}
