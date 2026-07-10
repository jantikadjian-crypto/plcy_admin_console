import { useState } from 'react'
import type { ReactNode } from 'react'
import { Server, HeartPulse, Activity, Gauge, Eye } from 'lucide-react'
import { useCreateIntent } from '@/hooks/useCreateIntent'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  Modal,
} from '@/components/ui'
import { instances, customers, fmtNum } from '@/data/mock'
import { packs as policyPacks } from '@/data/policy'
import type { Instance } from '@/data/mock'
import { useCustomerScope } from '@/context/CustomerScope'
import { useSession } from '@/context/Session'
import { GatedButton } from '@/components/GatedButton'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const envTone: Record<Instance['environment'], 'blue' | 'orange' | 'slate'> = {
  Production: 'blue',
  Staging: 'orange',
  Sandbox: 'slate',
}

const statusDot: Record<string, string> = {
  Healthy: 'bg-emerald-500',
  Degraded: 'bg-orange-500',
  Provisioning: 'bg-violet-500',
  Offline: 'bg-rose-500',
}

export default function Instances() {
  const { scope, isAll } = useCustomerScope()
  const { logAction } = useSession()
  const [rows, setRows] = useState<Instance[]>(instances)
  const [sel, setSel] = useState<Instance | null>(null)
  const [provisioning, setProvisioning] = useState(false)
  useCreateIntent(() => setProvisioning(true))

  const scoped = isAll ? rows : rows.filter((i) => i.customer === scope)

  const totalInstances = scoped.length
  const healthy = scoped.filter((i) => i.status === 'Healthy').length
  const live = scoped.filter((i) => i.uptime > 0)
  const avgUptime = live.reduce((s, i) => s + i.uptime, 0) / (live.length || 1)
  const totalRps = scoped.reduce((s, i) => s + i.rps, 0)
  const rpsByInstance = [...scoped]
    .filter((i) => i.rps > 0)
    .sort((a, b) => b.rps - a.rps)
    .map((i) => ({ name: i.name.replace(/-prod.*$/, '').replace(/-.*$/, ''), rps: i.rps }))
  const statusCounts = (['Healthy', 'Degraded', 'Provisioning', 'Offline'] as const).map((s) => ({
    status: s,
    count: scoped.filter((i) => i.status === s).length,
  }))

  return (
    <>
      <PageHeader
        title="Instances"
        description={isAll ? 'Deployed PLCY enforcement instances across every customer environment' : `Deployed instances for ${scope}`}
        actions={
          <GatedButton cap="provision.manage" className="btn-primary" onClick={() => setProvisioning(true)}>
            <Server className="h-4 w-4" />
            Provision instance
          </GatedButton>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total instances" value={totalInstances} icon={Server} tone="blue" footer={isAll ? 'Across all regions' : scope} />
        <StatCard label="Healthy" value={healthy} icon={HeartPulse} tone="green" footer={`${totalInstances - healthy} need attention`} />
        <StatCard label="Avg uptime" value={`${avgUptime.toFixed(2)}%`} icon={Gauge} tone="purple" footer="Live instances (30d)" />
        <StatCard label="Total RPS" value={fmtNum(totalRps)} icon={Activity} tone="orange" footer="Requests per second" />
      </div>

      {/* Chart + health summary */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle title="Throughput by Instance" subtitle="Live requests per second across active deployments" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rpsByInstance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => `${fmtNum(v)} rps`} />
                <Bar dataKey="rps" fill="#3366ff" radius={[6, 6, 0, 0]} maxBarSize={54} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle title="Fleet Health" subtitle="Instances by operational status" />
          <ul className="space-y-3">
            {statusCounts.map((s) => (
              <li key={s.status} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-ink-700">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusDot[s.status]}`} />
                  {s.status}
                </span>
                <span className="text-sm font-semibold text-ink-900">{s.count}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-ink-500">Healthy ratio</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {Math.round((healthy / totalInstances) * 100)}%
            </p>
            <p className="mt-1 text-xs text-ink-400">{healthy} of {totalInstances} instances operational</p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="mt-6">
        <CardTitle title="All Instances" subtitle={`${scoped.length} deployment${scoped.length === 1 ? '' : 's'}${isAll ? '' : ` · ${scope}`}`} />
        <Table columns={['Name', 'Customer', 'Environment', 'Region', 'Version', 'Status', 'Uptime', 'RPS', 'Policy Packs', '']}>
          {scoped.map((i) => (
            <Tr key={i.id}>
              <Td>
                <button className="text-left" onClick={() => setSel(i)}>
                  <p className="font-mono text-sm font-medium text-ink-900 hover:text-brand-600">{i.name}</p>
                  <p className="font-mono text-xs text-ink-400">{i.id}</p>
                </button>
              </Td>
              <Td>{i.customer}</Td>
              <Td>
                <Badge tone={envTone[i.environment]}>{i.environment}</Badge>
              </Td>
              <Td className="font-mono text-xs text-ink-600">{i.region}</Td>
              <Td className="font-mono text-xs text-ink-700">{i.version}</Td>
              <Td>
                <StatusBadge status={i.status} />
              </Td>
              <Td>{i.uptime > 0 ? `${i.uptime.toFixed(2)}%` : '—'}</Td>
              <Td>{i.rps > 0 ? fmtNum(i.rps) : '—'}</Td>
              <Td>{i.policyPacks}</Td>
              <Td>
                <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${i.name}`} onClick={() => setSel(i)}>
                  <Eye className="h-4 w-4" />
                </button>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {sel && <InstanceModal instance={sel} onClose={() => setSel(null)} />}

      <ProvisionModal
        open={provisioning}
        onClose={() => setProvisioning(false)}
        defaultCustomer={isAll ? customers[0].name : scope}
        onCreate={(inst) => {
          logAction({ action: 'instance.provision', target: inst.name, category: 'provisioning' })
          setRows((prev) => [inst, ...prev])
          setProvisioning(false)
          setSel(inst)
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Provision instance form                                             */
/* ------------------------------------------------------------------ */
const REGIONS = ['us-east-1', 'us-west-2', 'eu-central-1', 'eu-west-1', 'ap-southeast-1']

function ProvisionModal({
  open,
  onClose,
  defaultCustomer,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  defaultCustomer: string
  onCreate: (inst: Instance) => void
}) {
  const [customer, setCustomer] = useState(defaultCustomer)
  const [environment, setEnvironment] = useState<Instance['environment']>('Production')
  const [region, setRegion] = useState(REGIONS[0])
  const [packs, setPacks] = useState(4)

  const submit = () => {
    const slug = customer.toLowerCase().replace(/[^a-z0-9]+/g, '')
    const env = environment === 'Production' ? 'prod' : environment === 'Staging' ? 'staging' : 'sandbox'
    onCreate({
      id: `inst_${slug}_${env}`.slice(0, 24),
      name: `${slug}-${env}-${region.split('-')[0]}`,
      customer,
      environment,
      region,
      version: 'v4.9.0-rc1',
      status: 'Provisioning',
      uptime: 0,
      rps: 0,
      policyPacks: packs,
    })
    setCustomer(defaultCustomer)
    setEnvironment('Production')
    setRegion(REGIONS[0])
    setPacks(4)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Provision instance"
      subtitle="Deploy a new PLCY enforcement instance"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Provision</button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InstField label="Customer" className="sm:col-span-2">
          <select className="input" value={customer} onChange={(e) => setCustomer(e.target.value)}>
            {customers.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
        </InstField>
        <InstField label="Environment">
          <select className="input" value={environment} onChange={(e) => setEnvironment(e.target.value as Instance['environment'])}>
            {(['Production', 'Staging', 'Sandbox'] as Instance['environment'][]).map((e) => <option key={e}>{e}</option>)}
          </select>
        </InstField>
        <InstField label="Region">
          <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </InstField>
        <InstField label={`Policy packs · ${packs}`} className="sm:col-span-2">
          <input type="range" min={0} max={8} value={packs} onChange={(e) => setPacks(Number(e.target.value))} className="w-full accent-brand-600" />
        </InstField>
      </div>
    </Modal>
  )
}

function InstField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Instance detail drawer                                              */
/* ------------------------------------------------------------------ */
function InstanceModal({ instance: i, onClose }: { instance: Instance; onClose: () => void }) {
  // Derived, deterministic metrics for display.
  const p95 = i.rps > 0 ? Math.round(40 + i.rps / 30) : 0
  const errorRate = i.status === 'Healthy' ? '0.02%' : i.status === 'Degraded' ? '1.4%' : '—'
  const appliedPacks = policyPacks.filter((p) => p.status === 'live').slice(0, i.policyPacks)

  const metrics: { label: string; value: string }[] = [
    { label: 'Uptime (30d)', value: i.uptime > 0 ? `${i.uptime.toFixed(2)}%` : '—' },
    { label: 'Throughput', value: i.rps > 0 ? `${fmtNum(i.rps)} rps` : '—' },
    { label: 'p95 latency', value: p95 > 0 ? `${p95} ms` : '—' },
    { label: 'Error rate', value: errorRate },
    { label: 'Region', value: i.region },
    { label: 'Version', value: i.version },
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title={<span className="font-mono">{i.name}</span>}
      subtitle={`${i.customer} · ${i.id}`}
      headerRight={<StatusBadge status={i.status} />}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary">Open console</button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge tone={envTone[i.environment]}>{i.environment}</Badge>
          <Badge tone="slate">{i.region}</Badge>
          <Badge tone="blue">{i.version}</Badge>
          <Badge tone="purple">{i.customer}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-medium text-ink-500">{m.label}</p>
              <p className="mt-0.5 font-semibold text-ink-900">{m.value}</p>
            </div>
          ))}
        </div>

        <section>
          <div className="mb-2 flex items-center gap-2">
            <Server className="h-4 w-4 text-ink-400" />
            <h4 className="text-sm font-semibold text-ink-900">Enforced policy packs ({i.policyPacks})</h4>
          </div>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {appliedPacks.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">{p.name}</p>
                  <p className="text-xs text-ink-500">{p.category} · {p.version}</p>
                </div>
                <Badge tone="green" dot>Active</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}
