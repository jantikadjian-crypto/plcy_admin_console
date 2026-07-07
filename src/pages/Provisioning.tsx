import { useState } from 'react'
import { Cloud, Server, ShieldOff, Plus, RotateCcw, Eye, Clock, CircleCheck, CircleAlert, Boxes, Layers } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, StatusBadge, Table, Tr, Td, Progress, Modal } from '@/components/ui'
import { provisions as seedProvisions, PROVISION_STEPS, provisionStep, opsTotals } from '@/data/ops'
import type { Provision, ProvTemplate } from '@/data/ops'
import { regionByCode } from '@/data/fleet'

const templateTone: Record<ProvTemplate, 'blue' | 'purple' | 'red'> = {
  SaaS: 'blue',
  'Sovereign Cloud': 'purple',
  'Air-gapped': 'red',
}

const progressTone = (status: Provision['status']): 'green' | 'blue' | 'orange' | 'red' =>
  status === 'Ready' ? 'green' : status === 'Failed' ? 'red' : status === 'Configuring' ? 'orange' : 'blue'

const TEMPLATES: { name: ProvTemplate; icon: typeof Cloud; tone: 'blue' | 'purple' | 'red'; desc: string }[] = [
  { name: 'SaaS', icon: Cloud, tone: 'blue', desc: 'Shared-region managed environment' },
  { name: 'Sovereign Cloud', icon: Server, tone: 'purple', desc: 'In-region AWS + BYOK encryption' },
  { name: 'Air-gapped', icon: ShieldOff, tone: 'red', desc: 'On-prem, bundle-delivered' },
]

const cardTone: Record<'blue' | 'purple' | 'red', string> = {
  blue: 'border-blue-200 bg-blue-50/50 text-blue-600',
  purple: 'border-violet-200 bg-violet-50/50 text-violet-600',
  red: 'border-rose-200 bg-rose-50/50 text-rose-600',
}

const nodeSize: Record<ProvTemplate, string> = { SaaS: 'm6i.2xlarge', 'Sovereign Cloud': 'm6i.4xlarge', 'Air-gapped': 'on-prem' }

export default function Provisioning() {
  const [rows, setRows] = useState<Provision[]>(seedProvisions)
  const [sel, setSel] = useState<Provision | null>(null)

  const retry = (id: string) =>
    setRows((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'Provisioning', progress: 40 } : p)))

  const current = sel ? rows.find((p) => p.id === sel.id) ?? sel : null

  return (
    <>
      <PageHeader
        title="Provisioning"
        description="Day-0 onboarding — provision new single-tenant environments via IaC"
        actions={<button className="btn-primary"><Plus className="h-4 w-4" />New environment</button>}
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="In progress" value={opsTotals.provisioning} icon={Layers} tone="blue" footer="Active runs" />
        <StatCard label="Ready" value={opsTotals.provReady} icon={CircleCheck} tone="green" footer="Handed over" />
        <StatCard label="Failed" value={opsTotals.provFailed} icon={CircleAlert} tone="red" footer="Need attention" />
        <StatCard label="Avg time" value="~38 min" icon={Clock} tone="purple" footer="Request → ready" />
      </div>

      {/* Templates */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TEMPLATES.map((t) => (
          <Card key={t.name} className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cardTone[t.tone]}`}>
              <t.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">{t.name}</p>
              <p className="mt-0.5 text-xs text-ink-500">{t.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Provisioning queue */}
      <Card className="mt-6">
        <CardTitle title="Provisioning Queue" subtitle={`${rows.length} environments in the onboarding pipeline`} />
        <Table columns={['Customer', 'Template', 'Region', 'Progress', 'Status', 'Requested', 'Owner', 'Actions', '']}>
          {rows.map((p) => (
            <Tr key={p.id}>
              <Td className="font-semibold text-ink-900">{p.customer}</Td>
              <Td><Badge tone={templateTone[p.template]}>{p.template}</Badge></Td>
              <Td>
                <p className="text-sm text-ink-700">{regionByCode(p.regionCode)?.name ?? p.regionCode}</p>
                <p className="font-mono text-xs text-ink-400">{p.regionCode}</p>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="w-28"><Progress value={p.progress} tone={progressTone(p.status)} /></div>
                  <span className="text-xs font-medium text-ink-500">{p.progress}%</span>
                </div>
              </Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td className="text-xs text-ink-500">{p.requested}</Td>
              <Td className="font-mono text-xs text-ink-500">{p.owner}</Td>
              <Td>
                {p.status === 'Failed' ? (
                  <button className="btn-secondary px-2.5 py-1 text-xs" onClick={() => retry(p.id)}>
                    <RotateCcw className="h-3.5 w-3.5" />Retry
                  </button>
                ) : (
                  <span className="text-xs text-ink-400">—</span>
                )}
              </Td>
              <Td>
                <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${p.customer}`} onClick={() => setSel(p)}>
                  <Eye className="h-4 w-4" />
                </button>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* Detail drawer */}
      {current && (
        <Modal
          open
          onClose={() => setSel(null)}
          title={current.customer}
          subtitle={`${regionByCode(current.regionCode)?.name} · ${current.regionCode}`}
          headerRight={<Badge tone={templateTone[current.template]}>{current.template}</Badge>}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setSel(null)}>Close</button>
              {current.status === 'Failed' && (
                <button className="btn-primary" onClick={() => retry(current.id)}>
                  <RotateCcw className="h-4 w-4" />Retry
                </button>
              )}
            </>
          }
        >
          <div className="space-y-5">
            <section>
              <h4 className="mb-3 text-sm font-semibold text-ink-900">IaC pipeline</h4>
              <ol className="space-y-2.5">
                {PROVISION_STEPS.map((step, i) => {
                  const progress = provisionStep(current.status)
                  const done = i < progress
                  const active = i === progress && current.status !== 'Ready'
                  const failed = active && current.status === 'Failed'
                  return (
                    <li key={step} className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${done ? 'bg-emerald-500 text-white' : failed ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-500' : active ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                        {done ? '✓' : i + 1}
                      </span>
                      <span className={`text-sm ${done || active ? 'text-ink-900' : 'text-ink-400'}`}>{step}</span>
                      {failed && <Badge tone="red">Failed</Badge>}
                      {active && !failed && <Badge tone="blue">In progress</Badge>}
                    </li>
                  )
                })}
              </ol>
            </section>

            <div className="grid grid-cols-3 gap-3">
              <KV label="Template" value={current.template} />
              <KV label="Region" value={current.regionCode} mono />
              <KV label="Owner" value={current.owner} mono />
              <KV label="Requested" value={current.requested} />
              <KV label="Status" value={current.status} />
              <KV label="Progress" value={`${current.progress}%`} />
            </div>

            <section>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900"><Boxes className="h-4 w-4 text-ink-400" />Terraform module</h4>
              <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-[12px] text-slate-100">{`module "plcy_tenant" {
  source    = "plcy/tenant/aws"
  customer  = "${current.customer}"
  region    = "${current.regionCode}"
  template  = "${current.template}"
  node_size = "${nodeSize[current.template]}"
  byok      = ${current.template !== 'SaaS'}
}`}</pre>
            </section>

            {current.template === 'Air-gapped' && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">
                  Air-gapped tenant — the bootstrap image <strong>bundle is shipped to the site</strong> and imported on-prem. No cloud provisioning runs; the site activates the bundle on its own schedule.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 font-semibold text-ink-900 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  )
}
