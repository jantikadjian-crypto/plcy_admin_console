import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  GitBranch,
  Boxes,
  Gauge,
  Network,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  Cpu,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Progress } from '@/components/ui'
import { SecurityPostureBanner } from '@/components/SecurityPostureBanner'
import { deployments, regionByCode } from '@/data/fleet'
import { useRegistryPromoted } from '@/data/registryStore'
import { fleetPosture, fleetPostureTotals } from '@/data/clusters'
import type { ClusterPosture, ClusterHealth, NsPosture, PSALevel } from '@/data/clusters'

const healthTone: Record<ClusterHealth, 'green' | 'orange' | 'red'> = { Healthy: 'green', Degraded: 'orange', Offline: 'red' }
const psaTone: Record<PSALevel, 'green' | 'yellow' | 'red'> = { restricted: 'green', baseline: 'yellow', privileged: 'red' }
const quotaTone = (p: number): 'red' | 'orange' | 'blue' => (p >= 90 ? 'red' : p >= 75 ? 'orange' : 'blue')

type Filter = 'all' | 'drift' | 'quota' | 'security'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All clusters' },
  { key: 'drift', label: 'Config / image drift' },
  { key: 'quota', label: 'Quota pressure' },
  { key: 'security', label: 'Security gaps' },
]

export default function FleetPosture() {
  const promoted = useRegistryPromoted()
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const rows = fleetPosture(deployments, promoted)
  const totals = fleetPostureTotals(rows)

  const shown = rows.filter((r) => {
    if (filter === 'drift') return r.hasDrift
    if (filter === 'quota') return r.quotaHot > 0 || r.maxQuotaPct >= 75
    if (filter === 'security') return r.psaWeak > 0
    return true
  })

  return (
    <>
      <PageHeader
        title="Fleet Posture"
        description="One place to see how healthy and locked-down every tenant cluster is — configuration & image drift, resource-quota pressure, and pod-security / network guardrails rolled up across the whole fleet. Rows are sorted most-at-risk first; expand any tenant to see its namespaces, or click through to fix it."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clusters with drift" value={totals.clustersDrift} icon={GitBranch} tone={totals.clustersDrift ? 'orange' : 'green'} footer="Config or image out of sync" />
        <StatCard label="Quota pressure" value={totals.quotaHotNamespaces} icon={Gauge} tone={totals.quotaHotNamespaces ? 'orange' : 'green'} footer="Namespaces ≥ 90% of a quota" />
        <StatCard label="Pod-security gaps" value={totals.psaWeakNamespaces} icon={ShieldCheck} tone={totals.psaWeakNamespaces ? 'orange' : 'green'} footer="Namespaces not fully enforced" />
        <StatCard label="External egress" value={totals.clustersExtEgress} icon={Network} tone={totals.clustersExtEgress ? 'blue' : 'green'} footer="Clusters allowing outbound" />
      </div>

      <div className="mt-6">
        <SecurityPostureBanner showGaps={false} />
      </div>

      <Card className="mt-6">
        <CardTitle
          title="Tenant clusters"
          subtitle="Health, drift, and guardrail posture per tenant · click a row to expand namespaces"
          action={
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${filter === f.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          }
        />

        <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-ink-600 sm:grid-cols-3">
          <p>
            <span className="font-semibold text-ink-800">Health</span> — is the cluster up and its pods running?{' '}
            <span className="font-medium text-emerald-600">Healthy</span> = all good,{' '}
            <span className="font-medium text-orange-600">Degraded</span> = some pods unhealthy,{' '}
            <span className="font-medium text-rose-600">Offline</span> = unreachable.
          </p>
          <p>
            <span className="font-semibold text-ink-800">Drift</span> — is it running what it should?{' '}
            <span className="font-medium text-emerald-600">In sync</span> = matches approved config &amp; promoted image;{' '}
            <span className="font-medium text-orange-600">N behind</span> = older than the promoted tag;{' '}
            <span className="font-medium text-orange-600">TF · N res</span> = infra differs from Terraform;{' '}
            <span className="font-medium text-ink-500">Unknown</span> = offline, can't tell.
          </p>
          <p>
            <span className="font-semibold text-ink-800">Quota pressure</span> — how close a namespace is to its CPU / memory / pod limits. The %
            is the highest across the cluster's namespaces; <span className="font-medium text-rose-600">hot</span> = at or above 90% and at risk of hitting the ceiling.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3">Tenant</th>
                <th className="py-2 pr-3">Health</th>
                <th className="py-2 pr-3">Drift</th>
                <th className="py-2 pr-3">Quota pressure</th>
                <th className="py-2 pr-3">Pod-security</th>
                <th className="py-2 pr-3">Network</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <PostureRow key={r.d.id} r={r} open={openId === r.d.id} onToggle={() => setOpenId((id) => (id === r.d.id ? null : r.d.id))} />
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-ink-400">No clusters match this filter — the fleet is clean here.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

function DriftCell({ r }: { r: ClusterPosture }) {
  if (r.health === 'Offline') return <Badge tone="slate" dot>Unknown</Badge>
  if (r.tfDrift !== 'Drift detected' && r.imageBehind === 0) {
    return <Badge tone={r.imageAhead > 0 ? 'blue' : 'green'} dot>{r.imageAhead > 0 ? `${r.imageAhead} ahead` : 'In sync'}</Badge>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {r.tfDrift === 'Drift detected' && <Badge tone="orange">TF · {r.tfDriftedResources} res</Badge>}
      {r.imageBehind > 0 && <Badge tone="orange">{r.imageBehind} behind</Badge>}
    </div>
  )
}

function PostureRow({ r, open, onToggle }: { r: ClusterPosture; open: boolean; onToggle: () => void }) {
  const region = regionByCode(r.d.regionCode)
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <>
      <tr className="cursor-pointer border-b border-slate-100 align-middle transition-colors hover:bg-slate-50" onClick={onToggle}>
        <td className="py-3 pr-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 shrink-0 text-ink-400" />
            <div className="min-w-0">
              <p className="font-medium text-ink-900">{r.d.customer}</p>
              <p className="truncate text-xs text-ink-400">{region?.name ?? r.d.regionCode} · {r.d.connectivity} · {r.d.sovereignty}</p>
            </div>
          </div>
        </td>
        <td className="py-3 pr-3"><Badge tone={healthTone[r.health]} dot>{r.health}</Badge></td>
        <td className="py-3 pr-3"><DriftCell r={r} /></td>
        <td className="py-3 pr-3">
          <div className="flex items-center gap-2">
            <div className="w-16"><Progress value={Math.min(100, r.maxQuotaPct)} tone={quotaTone(r.maxQuotaPct)} /></div>
            <span className="font-mono text-xs text-ink-600">{r.maxQuotaPct}%</span>
            {r.quotaHot > 0 && <Badge tone="orange">{r.quotaHot} hot</Badge>}
          </div>
        </td>
        <td className="py-3 pr-3">
          {r.psaWeak === 0 ? <Badge tone="green" dot>All enforced</Badge> : <Badge tone="orange">{r.psaWeak} not enforced</Badge>}
        </td>
        <td className="py-3 pr-3">
          {r.extEgress > 0 ? <Badge tone="blue">External egress</Badge> : <Badge tone="green" dot>Isolated</Badge>}
        </td>
        <td className="py-3 pr-3 text-right"><Chevron className="h-4 w-4 text-ink-300" /></td>
      </tr>
      {open && (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td colSpan={7} className="px-3 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Namespaces · {r.namespaces.length}</p>
              <Link to={`/clusters/${r.d.id}?tab=guardrails`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                Open guardrails <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {r.namespaces.map((n) => (
                <NsCard key={n.namespace} n={n} />
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function NsCard({ n }: { n: NsPosture }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate font-mono text-xs font-semibold text-ink-900">{n.namespace}</p>
        <div className="flex shrink-0 items-center gap-1">
          <Badge tone={psaTone[n.psa]}>{n.psa}</Badge>
          {n.psaMode !== 'enforce' && <Badge tone="yellow">{n.psaMode}</Badge>}
        </div>
      </div>
      <div className="mb-2">
        <div className="mb-0.5 flex items-center justify-between text-[11px] text-ink-400">
          <span>Peak quota use</span>
          <span className="font-mono">{n.maxQuotaPct}%</span>
        </div>
        <Progress value={Math.min(100, n.maxQuotaPct)} tone={quotaTone(n.maxQuotaPct)} />
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge tone={n.defaultDeny ? 'green' : 'orange'} dot>{n.defaultDeny ? 'Default deny' : 'Open network'}</Badge>
        {n.extEgress && <Badge tone="blue">External egress</Badge>}
      </div>
    </div>
  )
}
