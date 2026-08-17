import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Cloud, Server, ShieldOff, Plus, RotateCcw, Eye, Clock, CircleCheck, CircleAlert, Boxes, Layers, Check, X, ArrowRight, ArrowLeft, ArrowUpRight, ClipboardCheck } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, StatusBadge, Table, Tr, Td, Progress, Modal } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { provisionSteps, provisionStep, onboardingChecklist, opsTotals } from '@/data/ops'
import type { Provision, ProvTemplate, OnboardingState, ChecklistItem } from '@/data/ops'
import { regionByCode, regions } from '@/data/fleet'
import { useSession } from '@/context/Session'
import { useProvisioning } from '@/context/Provisioning'
import { GatedButton } from '@/components/GatedButton'

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

let provSeq = 0

export default function Provisioning() {
  const { logAction } = useSession()
  const { list: rows, add, update } = useProvisioning()
  const [params, setParams] = useSearchParams()
  const [selId, setSelId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)

  // Reopen a specific record when returning from a gate's page (?open=<id>).
  useEffect(() => {
    const openId = params.get('open')
    if (openId) {
      setSelId(openId)
      params.delete('open')
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retry = (id: string) => update(id, { status: 'Provisioning', progress: 40 })

  const createProvision = (draft: { customer: string; template: ProvTemplate; regionCode: string; onboarding: OnboardingState }) => {
    provSeq += 1
    const id = `prov_new_${rows.length}_${provSeq}`
    add({
      id,
      customer: draft.customer,
      template: draft.template,
      regionCode: draft.regionCode,
      status: 'Requested',
      progress: 10,
      requested: 'just now',
      owner: 'jack@plcy.app',
      onboarding: draft.onboarding,
    })
    logAction({ action: 'provision.request', target: `${draft.customer} · ${draft.template} · ${draft.regionCode}`, category: 'provisioning' })
    setWizardOpen(false)
    setSelId(id)
  }

  const current = selId ? rows.find((p) => p.id === selId) ?? null : null

  return (
    <>
      <PageHeader
        title="Provisioning"
        description="Day-0 onboarding — provision new single-tenant environments via IaC"
        actions={<GatedButton cap="provision.manage" className="btn-primary" onClick={() => setWizardOpen(true)}><Plus className="h-4 w-4" />New environment</GatedButton>}
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
        <Table columns={['Customer', 'Template', 'Region', 'Progress', 'Status', 'Requested', 'Owner', 'Actions', '']} noun="jobs">
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
                  <GatedButton cap="provision.manage" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => {
                    logAction({ action: 'provision.retry', target: p.customer, category: 'provisioning' })
                    retry(p.id)
                  }}>
                    <RotateCcw className="h-3.5 w-3.5" />Retry
                  </GatedButton>
                ) : (
                  <span className="text-xs text-ink-400">—</span>
                )}
              </Td>
              <Td>
                <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${p.customer}`} onClick={() => setSelId(p.id)}>
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
          onClose={() => setSelId(null)}
          title={current.customer}
          subtitle={`${regionByCode(current.regionCode)?.name} · ${current.regionCode}`}
          headerRight={<Badge tone={templateTone[current.template]}>{current.template}</Badge>}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setSelId(null)}>Close</button>
              {current.status === 'Failed' && (
                <button className="btn-primary" onClick={() => retry(current.id)}>
                  <RotateCcw className="h-4 w-4" />Retry
                </button>
              )}
            </>
          }
        >
          <div className="space-y-5">
            <OnboardingReadiness items={onboardingChecklist(current)} linkable provisionId={current.id} />

            <section>
              <h4 className="mb-3 text-sm font-semibold text-ink-900">{current.template === 'Air-gapped' ? 'Air-gapped delivery pipeline' : 'IaC pipeline'}</h4>
              <ol className="space-y-2.5">
                {provisionSteps(current.template).map((step, i) => {
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

      {wizardOpen && <OnboardWizard onClose={() => setWizardOpen(false)} onCreate={createProvision} />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Onboarding readiness checklist                                       */
/* ------------------------------------------------------------------ */
function OnboardingReadiness({ items, linkable = false, provisionId }: { items: ChecklistItem[]; linkable?: boolean; provisionId?: string }) {
  const done = items.filter((i) => i.done).length
  const criticalPending = items.filter((i) => i.critical && !i.done)
  const ready = criticalPending.length === 0 && done === items.length
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><ClipboardCheck className="h-4 w-4 text-ink-400" />Onboarding readiness</h4>
        <Badge tone={ready ? 'green' : criticalPending.length ? 'red' : 'orange'} dot>
          {ready ? 'Ready to hand over' : criticalPending.length ? `${criticalPending.length} blocker${criticalPending.length === 1 ? '' : 's'}` : `${done}/${items.length} done`}
        </Badge>
      </div>
      {linkable && !ready && <p className="mb-2 text-xs text-ink-400">Pending gates link to the page that completes them — finish there and mark it done to check it off here.</p>}
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {items.map((i) => {
          const showLink = linkable && !i.done && i.to
          const href = provisionId ? `${i.to}?onboard=${provisionId}&gate=${i.key}` : i.to
          return (
            <li key={i.key} className="flex items-center gap-2 text-sm">
              {i.done ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <X className={`h-4 w-4 shrink-0 ${i.critical ? 'text-rose-500' : 'text-slate-300'}`} />
              )}
              <span className={i.done ? 'text-ink-700' : i.critical ? 'font-medium text-rose-700' : 'text-ink-500'}>{i.label}</span>
              {showLink ? (
                <Link to={href!} className="ml-auto inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-medium text-brand-600 hover:text-brand-700">
                  {i.cta ?? 'Set up'}<ArrowUpRight className="h-3 w-3" />
                </Link>
              ) : (
                !i.done && i.critical && <span className="ml-auto text-[10px] font-semibold uppercase text-rose-500">required</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Onboarding wizard                                                    */
/* ------------------------------------------------------------------ */
const WIZARD_TEMPLATES: { name: ProvTemplate; icon: typeof Cloud; tone: 'blue' | 'purple' | 'red'; desc: string }[] = TEMPLATES

function OnboardWizard({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (draft: { customer: string; template: ProvTemplate; regionCode: string; onboarding: OnboardingState }) => void
}) {
  const [step, setStep] = useState(0)
  const [customer, setCustomer] = useState('')
  const [plan, setPlan] = useState('Enterprise')
  const [template, setTemplate] = useState<ProvTemplate>('SaaS')
  const [regionCode, setRegionCode] = useState('us-east-1')
  const air = template === 'Air-gapped'
  const sov = template !== 'SaaS'

  // Compliance prerequisites — defaults nudge the required ones on for regulated modes.
  const [byok, setByok] = useState(false)
  const [residency, setResidency] = useState(false)
  const [dpa, setDpa] = useState(false)
  const [offlineLicense, setOfflineLicense] = useState(false)
  const [escortedAccess, setEscortedAccess] = useState(false)
  const [contacts, setContacts] = useState(false)

  const pickTemplate = (t: ProvTemplate) => {
    setTemplate(t)
    // Steer region + prerequisites to sensible defaults for the mode.
    if (t === 'Air-gapped') { setRegionCode('de-sov-1'); setByok(true); setResidency(true); setOfflineLicense(true); setEscortedAccess(true) }
    else if (t === 'Sovereign Cloud') { setRegionCode('eu-central-1'); setByok(true); setResidency(true) }
    else setRegionCode('us-east-1')
  }

  const onboarding: OnboardingState = { plan, byok, residency, dpa, offlineLicense, escortedAccess, contacts }
  const preview: Provision = { id: 'preview', customer: customer || 'New customer', template, regionCode, status: 'Requested', progress: 10, requested: 'just now', owner: 'jack@plcy.app', onboarding }
  const checklist = onboardingChecklist(preview)
  const criticalPending = checklist.filter((i) => i.critical && !i.done)

  const canNext = step === 0 ? customer.trim().length > 0 : true
  const steps = ['Customer & mode', 'Compliance & prerequisites', 'Review']

  const Toggle = ({ on, set, label, hint, required }: { on: boolean; set: (v: boolean) => void; label: string; hint: string; required?: boolean }) => (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
      <div className="min-w-0 pr-3">
        <p className="text-sm font-medium text-ink-900">{label}{required && <span className="ml-1.5 text-[10px] font-semibold uppercase text-rose-500">required</span>}</p>
        <p className="text-xs text-ink-500">{hint}</p>
      </div>
      <button onClick={() => set(!on)} aria-pressed={on} className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${on ? 'justify-end bg-brand-600' : 'justify-start bg-slate-300'}`}>
        <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
      </button>
    </div>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title="Onboard a new environment"
      subtitle={`Step ${step + 1} of ${steps.length} · ${steps[step]}`}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <div className="flex items-center gap-2">
            {step > 0 && <button className="btn-secondary" onClick={() => setStep((s) => s - 1)}><ArrowLeft className="h-4 w-4" />Back</button>}
            {step < steps.length - 1 ? (
              <button className="btn-primary disabled:opacity-50" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Next<ArrowRight className="h-4 w-4" /></button>
            ) : (
              <button className="btn-primary" onClick={() => onCreate({ customer: customer.trim(), template, regionCode, onboarding })}><Plus className="h-4 w-4" />Request environment</button>
            )}
          </div>
        </div>
      }
    >
      {/* Stepper */}
      <div className="mb-5 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{i < step ? '✓' : i + 1}</span>
            <span className={`text-xs ${i === step ? 'font-semibold text-ink-900' : 'text-ink-400'}`}>{s}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Customer</label>
            {/* Was free text, which let a job be raised for an account that
                doesn't exist. Same picker as Instances → Provision instance,
                so both entry points can only target a real customer. */}
            <CustomerPicker
              value={customer}
              onChange={setCustomer}
              onCreated={(c) => setPlan(c.plan)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Plan</label>
              <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>
                {['Enterprise', 'Business', 'Growth', 'Trial'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Region</label>
              <select className="input" value={regionCode} onChange={(e) => setRegionCode(e.target.value)}>
                {regions.filter((r) => (air ? r.sovereignty === 'Air-gapped' : true)).map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Deployment mode</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {WIZARD_TEMPLATES.map((t) => {
                const on = template === t.name
                return (
                  <button key={t.name} onClick={() => pickTemplate(t.name)} className={`rounded-xl border p-3 text-left transition-colors ${on ? 'border-brand-400 bg-brand-50/50 ring-1 ring-brand-400' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg border ${cardTone[t.tone]}`}><t.icon className="h-5 w-5" /></div>
                    <p className="text-sm font-semibold text-ink-900">{t.name}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{t.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {air && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <ShieldOff className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Air-gapped onboarding has extra required gates — a signed offline bundle, an offline license, and an escorted-access rule — before the site can go live.</span>
            </div>
          )}
          {sov && <Toggle on={byok} set={setByok} label="BYOK / in-region encryption" hint="Customer-managed keys in an in-region HSM." required />}
          {sov && <Toggle on={residency} set={setResidency} label="Data residency policy" hint="Pin data to the region; block cross-border by default." required />}
          {air && <Toggle on={offlineLicense} set={setOfflineLicense} label="Offline license" hint="Issue a signed license key for the air-gapped site." required />}
          {air && <Toggle on={escortedAccess} set={setEscortedAccess} label="Escorted-access rule" hint="Break-glass access requires an escort on-site." required />}
          <Toggle on={dpa} set={setDpa} label="DPA & sub-processors reviewed" hint="Data-processing agreement signed; sub-processor list shared." />
          <Toggle on={contacts} set={setContacts} label="Notification contacts" hint="Customer ops contacts set for alerts." />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KV label="Customer" value={customer || '—'} />
            <KV label="Plan" value={plan} />
            <KV label="Mode" value={template} />
            <KV label="Region" value={regionByCode(regionCode)?.name ?? regionCode} />
            <KV label="Node size" value={nodeSize[template]} mono />
            <KV label="BYOK" value={byok ? 'Yes' : 'No'} />
          </div>
          <OnboardingReadiness items={checklist} />
          {criticalPending.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>You can request the environment now, but it can't be handed over until the {criticalPending.length} required gate{criticalPending.length === 1 ? '' : 's'} above {criticalPending.length === 1 ? 'is' : 'are'} complete.</span>
            </div>
          )}
        </div>
      )}
    </Modal>
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
