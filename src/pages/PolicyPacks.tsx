import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  Package, Boxes, Puzzle, SlidersHorizontal, Search, ShieldCheck, Scale, Lock, Users, Coins, Globe,
  ArrowUpRight, FileCode2, Layers, Plus, Pencil, Trash2, Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, StatCard, Badge, PageHeader, Modal } from '@/components/ui'
import type { Tone } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { usePolicy } from '@/context/Policy'
import {
  controlsForPack, controlCount, resolvedPrimitives, packById,
  CONTROL_FAMILIES, familyOf, computePolicyTotals,
} from '@/data/policy'
import type { PolicyPack, Control, PackCategory, PackType, CompositeKind, Decision, DetectorType, ControlMode, Lifecycle } from '@/data/policy'

/* ------------------------------------------------------------------ */
/* Tones & option lists                                                */
/* ------------------------------------------------------------------ */
const categoryStyle: Record<PackCategory, { icon: LucideIcon; tone: Tone }> = {
  Sovereignty: { icon: Globe, tone: 'blue' },
  Privacy: { icon: Lock, tone: 'blue' },
  Security: { icon: ShieldCheck, tone: 'purple' },
  Safety: { icon: ShieldCheck, tone: 'orange' },
  Governance: { icon: Users, tone: 'green' },
  Cost: { icon: Coins, tone: 'green' },
  Compliance: { icon: Scale, tone: 'green' },
}
const decisionTone: Record<Decision, 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'slate' | 'yellow'> = {
  Allow: 'green', Deny: 'red', Transform: 'orange', Route: 'blue', Review: 'purple', Log: 'slate', Throttle: 'yellow', Emit: 'red',
}
const CATEGORIES: PackCategory[] = ['Sovereignty', 'Privacy', 'Security', 'Safety', 'Governance', 'Cost', 'Compliance']
const DECISIONS: Decision[] = ['Allow', 'Deny', 'Transform', 'Route', 'Review', 'Log', 'Throttle', 'Emit']
const DETECTORS: DetectorType[] = ['Metadata', 'Classifier', 'Regex', 'LLM', 'Heuristic', 'Policy', 'OTel', 'Event', 'Registry', 'Rate limiter', 'Anomaly', 'Orchestrator']
const MODES: ControlMode[] = ['enforce', 'monitor']
const LIFECYCLES: Lifecycle[] = ['live', 'proposed', 'deprecated']

type Tab = 'packs' | 'controls'
type PackFilter = 'all' | 'primitive' | 'framework' | 'industry'

function suggestPackId(type: PackType, kind: CompositeKind, packs: PolicyPack[]): string {
  const prefix = type === 'primitive' ? 'P' : kind === 'framework' ? 'F' : 'I'
  const nums = packs.filter((p) => p.id.startsWith(prefix)).map((p) => parseInt(p.id.slice(prefix.length), 10)).filter((n) => !isNaN(n))
  return `${prefix}${(nums.length ? Math.max(...nums) : 0) + 1}`
}

export default function PolicyPacks() {
  const { logAction } = useSession()
  const { packs, controls, addPack, updatePack, deletePack, addControl, updateControl, deleteControl } = usePolicy()
  const [tab, setTab] = useState<Tab>('packs')
  const [selPack, setSelPack] = useState<PolicyPack | null>(null)
  const [selControl, setSelControl] = useState<Control | null>(null)
  const [packForm, setPackForm] = useState<{ mode: 'create' | 'edit'; pack?: PolicyPack } | null>(null)
  const [controlForm, setControlForm] = useState<{ mode: 'create' | 'edit'; control?: Control } | null>(null)

  const totals = computePolicyTotals(packs, controls)
  const current = selPack ? packs.find((p) => p.id === selPack.id) ?? null : null
  const currentControl = selControl ? controls.find((c) => c.id === selControl.id) ?? null : null

  const savePack = (p: PolicyPack, mode: 'create' | 'edit') => {
    if (mode === 'edit') updatePack(p.id, p)
    else addPack(p)
    logAction({ action: mode === 'edit' ? 'policy.pack.update' : 'policy.pack.create', target: `${p.id} · ${p.name}`, category: 'policy' })
    setPackForm(null)
    setSelPack(p)
  }
  const removePack = (p: PolicyPack) => {
    deletePack(p.id)
    logAction({ action: 'policy.pack.delete', target: `${p.id} · ${p.name}`, category: 'policy' })
    setSelPack(null)
  }
  const quickAddPrimitive = (p: PolicyPack) => {
    addPack(p)
    logAction({ action: 'policy.pack.create', target: `${p.id} · ${p.name}`, category: 'policy' })
  }
  const saveControl = (c: Control, mode: 'create' | 'edit') => {
    if (mode === 'edit') updateControl(c.id, c)
    else addControl(c)
    logAction({ action: mode === 'edit' ? 'policy.control.update' : 'policy.control.create', target: `${c.id} · ${c.name}`, category: 'policy' })
    setControlForm(null)
    setSelControl(c)
  }
  const removeControl = (c: Control) => {
    deleteControl(c.id)
    logAction({ action: 'policy.control.delete', target: `${c.id} · ${c.name}`, category: 'policy' })
    setSelControl(null)
  }

  return (
    <>
      <PageHeader
        title="Policy Packs"
        description="The governance guardrails PLCY enforces at runtime. Primitive packs are single-purpose controls (residency routing, consent gates, tool firewalls…); composite packs bundle those primitives to satisfy a framework (GDPR, SOC 2, PCI DSS…) or an industry. The Controls tab lists the atomic rules inside them."
        actions={
          tab === 'packs' ? (
            <GatedButton cap="policy.manage" className="btn-primary" onClick={() => setPackForm({ mode: 'create' })}><Plus className="h-4 w-4" />New pack</GatedButton>
          ) : (
            <GatedButton cap="policy.manage" className="btn-primary" onClick={() => setControlForm({ mode: 'create' })}><Plus className="h-4 w-4" />New control</GatedButton>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Policy packs" value={totals.packs} icon={Package} tone="blue" footer={`${totals.primitives} primitive · ${totals.frameworks + totals.industries} composite`} />
        <StatCard label="Framework packs" value={totals.frameworks} icon={Scale} tone="green" footer="GDPR, SOC 2, PCI DSS…" />
        <StatCard label="Industry packs" value={totals.industries} icon={Puzzle} tone="purple" footer="Retail, Gov, HR…" />
        <StatCard label="Controls" value={totals.controls} icon={SlidersHorizontal} tone="orange" footer="Atomic runtime rules" />
      </div>

      <HierarchyLegend />

      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {([['packs', 'Packs', Boxes], ['controls', 'Controls', SlidersHorizontal]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={clsx('-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors', tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800')}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'packs'
          ? <PacksSection packs={packs} controls={controls} onOpen={setSelPack} />
          : <ControlsSection controls={controls} onOpen={setSelControl} />}
      </div>

      {current && (
        <PackDrawer
          pack={current} packs={packs} controls={controls}
          onClose={() => setSelPack(null)} onOpenPack={setSelPack} onOpenControl={setSelControl}
          onEdit={() => setPackForm({ mode: 'edit', pack: current })} onDelete={() => removePack(current)}
        />
      )}
      {currentControl && (
        <ControlDrawer
          control={currentControl} packs={packs}
          onClose={() => setSelControl(null)} onOpenPack={(p) => { setSelControl(null); setSelPack(p) }}
          onEdit={() => setControlForm({ mode: 'edit', control: currentControl })} onDelete={() => removeControl(currentControl)}
        />
      )}
      {packForm && <PackForm mode={packForm.mode} initial={packForm.pack} packs={packs} controls={controls} onClose={() => setPackForm(null)} onSave={savePack} onAddPrimitive={quickAddPrimitive} />}
      {controlForm && <ControlForm mode={controlForm.mode} initial={controlForm.control} packs={packs} onClose={() => setControlForm(null)} onSave={saveControl} />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Packs section                                                       */
/* ------------------------------------------------------------------ */
function PacksSection({ packs, controls, onOpen }: { packs: PolicyPack[]; controls: Control[]; onOpen: (p: PolicyPack) => void }) {
  const [filter, setFilter] = useState<PackFilter>('all')
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const match = (p: PolicyPack) =>
    (!query || [p.name, p.category, ...p.frameworks, ...p.industries].some((f) => f.toLowerCase().includes(query))) &&
    (filter === 'all' || (filter === 'primitive' ? p.type === 'primitive' : p.kind === filter))

  const primitives = packs.filter((p) => p.type === 'primitive' && match(p))
  const frameworks = packs.filter((p) => p.kind === 'framework' && match(p))
  const industries = packs.filter((p) => p.kind === 'industry' && match(p))
  const FILTERS: { key: PackFilter; label: string }[] = [
    { key: 'all', label: 'All packs' }, { key: 'primitive', label: 'Primitive' }, { key: 'framework', label: 'Framework' }, { key: 'industry', label: 'Industry' },
  ]

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search packs, frameworks, industries…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={clsx('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', filter === f.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800')}>{f.label}</button>
          ))}
        </div>
      </div>
      {primitives.length > 0 && <PackGroup title="Primitive packs" subtitle="Single-purpose guardrails — each is a bundle of controls" list={primitives} packs={packs} controls={controls} onOpen={onOpen} />}
      {frameworks.length > 0 && <PackGroup title="Framework packs" subtitle="Composites — bundle primitives to satisfy a standard (GDPR, SOC 2…)" list={frameworks} packs={packs} controls={controls} onOpen={onOpen} />}
      {industries.length > 0 && <PackGroup title="Industry packs" subtitle="Composites — bundle primitives for a vertical (Retail, Gov…)" list={industries} packs={packs} controls={controls} onOpen={onOpen} />}
      {primitives.length + frameworks.length + industries.length === 0 && (
        <Card><p className="py-10 text-center text-sm text-ink-400">No packs match your filter.</p></Card>
      )}
    </>
  )
}

function PackGroup({ title, subtitle, list, packs, controls, onOpen }: { title: string; subtitle: string; list: PolicyPack[]; packs: PolicyPack[]; controls: Control[]; onOpen: (p: PolicyPack) => void }) {
  return (
    <div className="mb-6">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-ink-900">{title} <span className="ml-1 text-ink-400">· {list.length}</span></h3>
        <p className="text-xs text-ink-500">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => <PackCard key={p.id} pack={p} packs={packs} controls={controls} onOpen={onOpen} />)}
      </div>
    </div>
  )
}

function PackCard({ pack, packs, controls, onOpen }: { pack: PolicyPack; packs: PolicyPack[]; controls: Control[]; onOpen: (p: PolicyPack) => void }) {
  const cs = categoryStyle[pack.category]
  const Icon = cs.icon
  const tags = pack.type === 'primitive' ? [] : pack.kind === 'framework' ? pack.frameworks : pack.industries
  return (
    <button onClick={() => onOpen(pack)} className="card card-pad group text-left transition-shadow hover:shadow-cardhover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone="slate">{pack.id}</Badge>
          <Badge tone={pack.type === 'primitive' ? 'blue' : 'green'}>{pack.type === 'primitive' ? 'Primitive' : `Composite · ${pack.kind}`}</Badge>
        </div>
        <span className="font-mono text-[11px] text-ink-400">{controlCount(pack, packs, controls)} controls</span>
      </div>
      <div className="mt-2 flex items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink-600"><Icon className="h-4 w-4" /></div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900 group-hover:text-brand-700">{pack.name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{pack.description}</p>
        </div>
      </div>
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.slice(0, 3).map((t) => <Badge key={t} tone="slate">{t}</Badge>)}
          {tags.length > 3 && <Badge tone="slate">+{tags.length - 3}</Badge>}
        </div>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Controls section                                                    */
/* ------------------------------------------------------------------ */
function ControlsSection({ controls, onOpen }: { controls: Control[]; onOpen: (c: Control) => void }) {
  const [q, setQ] = useState('')
  const [family, setFamily] = useState('All')
  const query = q.trim().toLowerCase()
  const families = useMemo(() => ['All', ...CONTROL_FAMILIES.map((f) => f.prefix)], [])
  const filtered = controls.filter((ct) =>
    (family === 'All' || ct.prefix === family) &&
    (!query || [ct.id, ct.name, ct.detector, ct.decision, ct.obligation].some((f) => f.toLowerCase().includes(query))),
  )

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search controls by id, name, detector, or decision…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <p className="mb-2 text-xs text-ink-500">
        Each control ID reads <span className="font-mono text-ink-700">FAMILY-NUMBER</span> — the prefix names its control family (e.g. <span className="font-mono text-ink-700">DR-01</span> = 1st control in <span className="font-medium text-ink-700">Data Residency &amp; Sovereignty</span>). Filter by family:
      </p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {families.map((f) => (
          <button key={f} onClick={() => setFamily(f)} className={clsx('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors', family === f ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-slate-100 text-ink-700 ring-slate-500/10 hover:bg-slate-200/70')} title={f === 'All' ? 'All families' : familyOf(f)}>
            {f}{f !== 'All' && <span className="ml-1 text-ink-400">{controls.filter((c) => c.prefix === f).length}</span>}
          </button>
        ))}
      </div>
      <Card>
        <CardTitle title="Controls" subtitle={`${family !== 'All' ? `${family} · ${familyOf(family)} — ` : ''}${filtered.length} of ${controls.length} atomic runtime controls · click for detection, decision & evidence`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3">Control</th><th className="py-2 pr-3">Family</th><th className="py-2 pr-3">Detector</th><th className="py-2 pr-3">Decision</th><th className="py-2 pr-3">Mode</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ct) => (
                <tr key={ct.id} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50" onClick={() => onOpen(ct)}>
                  <td className="py-2.5 pr-3"><span className="font-mono text-xs font-semibold text-ink-900">{ct.id}</span><p className="text-xs text-ink-600">{ct.name}</p></td>
                  <td className="py-2.5 pr-3"><span className="text-xs text-ink-500">{familyOf(ct.prefix)}</span></td>
                  <td className="py-2.5 pr-3"><Badge tone="slate">{ct.detector}</Badge></td>
                  <td className="py-2.5 pr-3"><Badge tone={decisionTone[ct.decision]}>{ct.decision}</Badge></td>
                  <td className="py-2.5 pr-3"><Badge tone={ct.mode === 'enforce' ? 'green' : 'yellow'} dot>{ct.mode}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Pack drawer                                                         */
/* ------------------------------------------------------------------ */
function PackDrawer({ pack, packs, controls, onClose, onOpenPack, onOpenControl, onEdit, onDelete }: {
  pack: PolicyPack; packs: PolicyPack[]; controls: Control[]
  onClose: () => void; onOpenPack: (p: PolicyPack) => void; onOpenControl: (c: Control) => void
  onEdit: () => void; onDelete: () => void
}) {
  const { can } = useSession()
  const canManage = can('policy.manage')
  const cs = categoryStyle[pack.category]
  const packControls = controlsForPack(pack, packs, controls)
  const primitives = pack.type === 'composite' ? resolvedPrimitives(pack, packs) : []
  const tags = [...pack.frameworks, ...pack.industries]

  return (
    <Modal
      open onClose={onClose}
      title={<span className="flex items-center gap-2"><span className="font-mono text-base text-ink-500">{pack.id}</span>{pack.name}</span>}
      subtitle={pack.description} maxWidth="max-w-3xl"
      headerRight={<Badge tone={cs.tone} dot>{pack.category}</Badge>}
      footer={
        <div className="flex w-full items-center justify-between">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          {canManage && (
            <div className="flex items-center gap-2">
              <button className="btn-secondary text-rose-600" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete</button>
              <button className="btn-primary" onClick={onEdit}><Pencil className="h-4 w-4" />Edit pack</button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-ink-600">
          {pack.type === 'primitive'
            ? <><span className="font-semibold text-ink-800">Primitive pack</span> — a single-purpose guardrail made of the controls listed below. Composites reuse it.</>
            : <><span className="font-semibold text-ink-800">Composite pack</span> — it doesn't define controls itself; it <span className="font-medium">composes primitives</span> and inherits their controls.</>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KV label="Type" value={pack.type === 'primitive' ? 'Primitive' : `Composite · ${pack.kind}`} />
          <KV label="Region" value={pack.region} />
          <KV label="Controls" value={String(packControls.length)} />
          <KV label="Status" value={`${pack.status} · v${pack.version}`} />
        </div>
        {tags.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">{pack.kind === 'industry' ? 'Industries & frameworks' : 'Frameworks'}</p>
            <div className="flex flex-wrap gap-1.5">{tags.map((t) => <Badge key={t} tone="blue">{t}</Badge>)}</div>
          </div>
        )}
        {primitives.length > 0 && (
          <section>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900"><Layers className="h-4 w-4 text-ink-400" />Composes {primitives.length} primitive pack{primitives.length === 1 ? '' : 's'}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {primitives.map((p) => (
                <button key={p.id} onClick={() => onOpenPack(p)} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/30">
                  <span className="min-w-0"><span className="font-mono text-xs text-ink-500">{p.id}</span> <span className="text-sm text-ink-800">{p.name}</span></span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-300" />
                </button>
              ))}
            </div>
          </section>
        )}
        <section>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900"><SlidersHorizontal className="h-4 w-4 text-ink-400" />{packControls.length} control{packControls.length === 1 ? '' : 's'}</p>
          {packControls.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-4 text-center text-sm text-ink-400">No controls yet{pack.type === 'primitive' ? ' — add one from the Controls tab.' : '.'}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {packControls.map((ct) => (
                <button key={ct.id} onClick={() => onOpenControl(ct)} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50">
                  <span className="min-w-0"><span className="font-mono text-xs font-semibold text-ink-900">{ct.id}</span> <span className="text-sm text-ink-700">{ct.name}</span></span>
                  <Badge tone={decisionTone[ct.decision]}>{ct.decision}</Badge>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Control drawer                                                      */
/* ------------------------------------------------------------------ */
function ControlDrawer({ control: ct, packs, onClose, onOpenPack, onEdit, onDelete }: {
  control: Control; packs: PolicyPack[]; onClose: () => void; onOpenPack: (p: PolicyPack) => void; onEdit: () => void; onDelete: () => void
}) {
  const { can } = useSession()
  const canManage = can('policy.manage')
  const pack = packById(ct.packId, packs)
  const rego = `package plcy.${ct.prefix.toLowerCase()}

# ${ct.id} — ${ct.name}
decision := "${ct.decision.toLowerCase()}" {
  input.detector == "${ct.detector.toLowerCase()}"
  # ${ct.obligation}
}`
  return (
    <Modal
      open onClose={onClose}
      title={<span className="font-mono text-base">{ct.id}</span>} subtitle={ct.name} maxWidth="max-w-2xl"
      headerRight={<Badge tone={decisionTone[ct.decision]}>{ct.decision}</Badge>}
      footer={
        <div className="flex w-full items-center justify-between">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          {canManage && (
            <div className="flex items-center gap-2">
              <button className="btn-secondary text-rose-600" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete</button>
              <button className="btn-primary" onClick={onEdit}><Pencil className="h-4 w-4" />Edit control</button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-ink-600">
          <span className="font-semibold text-ink-800">Control</span> — a single atomic rule enforced at runtime. Its ID <span className="font-mono text-ink-800">{ct.id}</span> means control <span className="font-mono">{ct.id.split('-')[1]}</span> in the <span className="font-medium text-ink-800">{familyOf(ct.prefix)}</span> family (<span className="font-mono">{ct.prefix}</span>).
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KV label="Family" value={familyOf(ct.prefix)} />
          <KV label="Detector" value={ct.detector} />
          <KV label="Decision" value={ct.decision} />
          <KV label="Default mode" value={ct.mode} />
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Enforcement obligation</p>
          <p className="mt-1 text-sm text-ink-800">{ct.obligation}</p>
        </div>
        {pack && (
          <button onClick={() => onOpenPack(pack)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/30">
            <span className="text-sm text-ink-700"><span className="text-ink-400">From pack </span><span className="font-mono text-xs">{pack.id}</span> · {pack.name}</span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-300" />
          </button>
        )}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Evidence fields (OTel)</p>
          <div className="flex flex-wrap gap-1.5">{ct.evidence.map((e) => <span key={e} className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-ink-700">{e}</span>)}</div>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400"><FileCode2 className="h-3.5 w-3.5" />OPA / Rego</p>
          <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-[12px] leading-relaxed text-slate-100">{rego}</pre>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Pack form                                                           */
/* ------------------------------------------------------------------ */
function PackForm({ mode, initial, packs, controls, onClose, onSave, onAddPrimitive }: {
  mode: 'create' | 'edit'; initial?: PolicyPack; packs: PolicyPack[]; controls: Control[]
  onClose: () => void; onSave: (p: PolicyPack, mode: 'create' | 'edit') => void; onAddPrimitive: (p: PolicyPack) => void
}) {
  const [type, setType] = useState<PackType>(initial?.type ?? 'composite')
  const [kind, setKind] = useState<CompositeKind>(initial?.kind ?? 'framework')
  const [id, setId] = useState(initial?.id ?? suggestPackId('composite', 'framework', packs))
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<PackCategory>(initial?.category ?? 'Compliance')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [region, setRegion] = useState(initial?.region ?? 'Global')
  const [frameworks, setFrameworks] = useState((initial?.frameworks ?? []).join(', '))
  const [industries, setIndustries] = useState((initial?.industries ?? []).join(', '))
  const [deps, setDeps] = useState<string[]>(initial?.dependencies ?? [])
  const [status, setStatus] = useState<Lifecycle>(initial?.status ?? 'live')
  const [version, setVersion] = useState(initial?.version ?? '1.0')
  // Inline "new primitive" creator
  const [newPrim, setNewPrim] = useState<{ name: string; category: PackCategory } | null>(null)

  const isComposite = type === 'composite'
  const pickType = (t: PackType) => { setType(t); if (mode === 'create') setId(suggestPackId(t, kind, packs)) }
  const pickKind = (k: CompositeKind) => { setKind(k); if (mode === 'create') setId(suggestPackId('composite', k, packs)) }

  const applyTemplate = (srcId: string) => {
    const src = packs.find((p) => p.id === srcId)
    if (!src) return
    setType(src.type); setKind(src.kind ?? 'framework'); setCategory(src.category)
    setName(`${src.name} (copy)`); setDescription(src.description); setRegion(src.region)
    setFrameworks(src.frameworks.join(', ')); setIndustries(src.industries.join(', '))
    setDeps([...src.dependencies]); setStatus(src.status); setVersion(src.version)
    setId(suggestPackId(src.type, src.kind ?? 'framework', packs))
  }

  const idClash = mode === 'create' && packs.some((p) => p.id === id.trim())
  const valid = id.trim() && name.trim() && !idClash
  const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)
  const toggleDep = (pid: string) => setDeps((prev) => prev.includes(pid) ? prev.filter((d) => d !== pid) : [...prev, pid])

  const submit = () => {
    if (!valid) return
    onSave({
      id: id.trim(), name: name.trim(), type,
      kind: isComposite ? kind : undefined,
      category, description: description.trim(), region: region.trim() || 'Global',
      frameworks: isComposite ? list(frameworks) : [],
      industries: isComposite && kind === 'industry' ? list(industries) : [],
      dependencies: isComposite ? deps : [],
      status, version: version.trim() || '1.0',
    }, mode)
  }

  const createInlinePrimitive = () => {
    if (!newPrim || !newPrim.name.trim()) return
    const pid = suggestPackId('primitive', 'framework', packs)
    onAddPrimitive({ id: pid, name: newPrim.name.trim(), type: 'primitive', category: newPrim.category, description: '', frameworks: [], industries: [], region: 'Global', dependencies: [], status: 'live', version: '1.0' })
    setDeps((prev) => [...prev, pid])
    setNewPrim(null)
  }

  const primitivePacks = packs.filter((p) => p.type === 'primitive')
  const compositePacks = packs.filter((p) => p.type === 'composite' && p.id !== id)

  return (
    <Modal
      open onClose={onClose} title={mode === 'edit' ? `Edit ${initial?.id}` : 'New policy pack'}
      subtitle={isComposite ? 'A composite bundles primitives to satisfy a framework or industry' : 'A single-purpose, composable runtime guardrail'}
      maxWidth="max-w-2xl"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary disabled:opacity-50" onClick={submit} disabled={!valid}><Check className="h-4 w-4" />{mode === 'edit' ? 'Save changes' : 'Create pack'}</button></>}
    >
      <div className="space-y-4">
        {mode === 'create' && (
          <Field label="Start from (optional)">
            <select className="input" defaultValue="" onChange={(e) => { if (e.target.value) applyTemplate(e.target.value); e.target.value = '' }}>
              <option value="">Blank pack…</option>
              <optgroup label="Framework packs">{packs.filter((p) => p.kind === 'framework').map((p) => <option key={p.id} value={p.id}>Clone {p.id} · {p.name}</option>)}</optgroup>
              <optgroup label="Industry packs">{packs.filter((p) => p.kind === 'industry').map((p) => <option key={p.id} value={p.id}>Clone {p.id} · {p.name}</option>)}</optgroup>
            </select>
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type">
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              {(['composite', 'primitive'] as PackType[]).map((t) => (
                <button key={t} onClick={() => pickType(t)} className={clsx('flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize', type === t ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500')}>{t}</button>
              ))}
            </div>
          </Field>
          {isComposite ? (
            <Field label="Kind">
              <div className="flex rounded-lg bg-slate-100 p-0.5">
                {(['framework', 'industry'] as CompositeKind[]).map((k) => (
                  <button key={k} onClick={() => pickKind(k)} className={clsx('flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize', kind === k ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500')}>{k}</button>
                ))}
              </div>
            </Field>
          ) : <div />}
          <Field label="ID">
            <input className="input font-mono" value={id} onChange={(e) => setId(e.target.value)} disabled={mode === 'edit'} />
            {idClash && <p className="mt-1 text-xs text-rose-600">ID already exists.</p>}
          </Field>
          <Field label="Category">
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as PackCategory)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
        </div>
        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HIPAA PHI Protection Pack" autoFocus /></Field>
        <Field label="Description"><textarea className="input min-h-[64px]" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Region"><input className="input" value={region} onChange={(e) => setRegion(e.target.value)} /></Field>
          <Field label="Status"><select className="input" value={status} onChange={(e) => setStatus(e.target.value as Lifecycle)}>{LIFECYCLES.map((l) => <option key={l}>{l}</option>)}</select></Field>
          <Field label="Version"><input className="input" value={version} onChange={(e) => setVersion(e.target.value)} /></Field>
        </div>

        {isComposite && (
          <>
            <Field label="Frameworks (comma-separated)"><input className="input" value={frameworks} onChange={(e) => setFrameworks(e.target.value)} placeholder="HIPAA, SOC 2" /></Field>
            {kind === 'industry' && <Field label="Industries (comma-separated)"><input className="input" value={industries} onChange={(e) => setIndustries(e.target.value)} placeholder="Healthcare" /></Field>}

            {/* Primitive checklist */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-ink-700">Primitives in this pack <span className="text-ink-400">· {deps.filter((d) => primitivePacks.some((p) => p.id === d)).length} selected</span></label>
                <div className="flex items-center gap-2 text-xs">
                  <button className="text-brand-600 hover:text-brand-700" onClick={() => setDeps((prev) => Array.from(new Set([...prev, ...primitivePacks.map((p) => p.id)])))}>Select all</button>
                  <span className="text-ink-300">·</span>
                  <button className="text-ink-500 hover:text-ink-700" onClick={() => setDeps((prev) => prev.filter((d) => !primitivePacks.some((p) => p.id === d)))}>Clear</button>
                </div>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1.5">
                {primitivePacks.map((p) => {
                  const on = deps.includes(p.id)
                  return (
                    <button key={p.id} onClick={() => toggleDep(p.id)} className={clsx('flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors', on ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                      <span className={clsx('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}>{on && <Check className="h-3 w-3" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2"><span className="font-mono text-xs text-ink-500">{p.id}</span><span className="text-sm font-medium text-ink-900">{p.name}</span><span className="ml-auto shrink-0 text-[11px] text-ink-400">{controlCount(p, packs, controls)} controls</span></span>
                        {p.description && <span className="mt-0.5 block truncate text-xs text-ink-500">{p.description}</span>}
                      </span>
                    </button>
                  )
                })}
                {/* Inline new-primitive creator */}
                {newPrim ? (
                  <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50/40 p-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input className="input h-8 flex-1 py-1 text-sm" placeholder="New primitive name" value={newPrim.name} onChange={(e) => setNewPrim({ ...newPrim, name: e.target.value })} autoFocus />
                      <select className="input h-8 w-full py-1 text-sm sm:w-40" value={newPrim.category} onChange={(e) => setNewPrim({ ...newPrim, category: e.target.value as PackCategory })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
                      <div className="flex gap-1">
                        <button className="btn-primary h-8 px-2.5 py-1 text-xs" onClick={createInlinePrimitive} disabled={!newPrim.name.trim()}><Check className="h-3.5 w-3.5" />Add</button>
                        <button className="btn-ghost h-8 px-2 py-1 text-xs" onClick={() => setNewPrim(null)}>Cancel</button>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-400">Creates a new primitive (id auto-assigned) and selects it. Add its controls later from the Controls tab.</p>
                  </div>
                ) : (
                  <button className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 p-2 text-left text-sm text-brand-600 hover:bg-brand-50/40" onClick={() => setNewPrim({ name: '', category: 'Security' })}>
                    <Plus className="h-4 w-4" />New primitive…
                  </button>
                )}
              </div>
            </div>

            {compositePacks.length > 0 && (
              <Field label="Also compose other composites (optional)">
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 p-2">
                  {compositePacks.map((p) => {
                    const on = deps.includes(p.id)
                    return (
                      <button key={p.id} onClick={() => toggleDep(p.id)} className={clsx('rounded-lg border px-2 py-1 text-xs transition-colors', on ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-ink-500 hover:border-slate-300')}>
                        <span className="font-mono">{p.id}</span> {p.name}
                      </button>
                    )
                  })}
                </div>
              </Field>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Control form                                                        */
/* ------------------------------------------------------------------ */
function ControlForm({ mode, initial, packs, onClose, onSave }: {
  mode: 'create' | 'edit'; initial?: Control; packs: PolicyPack[]; onClose: () => void; onSave: (c: Control, mode: 'create' | 'edit') => void
}) {
  const primitivePacks = packs.filter((p) => p.type === 'primitive')
  const [packId, setPackId] = useState(initial?.packId ?? primitivePacks[0]?.id ?? '')
  const [id, setId] = useState(initial?.id ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [detector, setDetector] = useState<DetectorType>(initial?.detector ?? 'Metadata')
  const [decision, setDecision] = useState<Decision>(initial?.decision ?? 'Deny')
  const [obligation, setObligation] = useState(initial?.obligation ?? '')
  const [evidence, setEvidence] = useState((initial?.evidence ?? []).join(', '))
  const [modeVal, setModeVal] = useState<ControlMode>(initial?.mode ?? 'enforce')

  const prefix = id.includes('-') ? id.split('-')[0].toUpperCase() : ''
  const valid = id.trim() && /-/.test(id) && name.trim() && packId

  const submit = () => {
    if (!valid) return
    onSave({
      id: id.trim(), packId, prefix: id.trim().split('-')[0].toUpperCase(),
      name: name.trim(), detector, decision, obligation: obligation.trim(),
      evidence: evidence.split(',').map((x) => x.trim()).filter(Boolean),
      mode: modeVal,
    }, mode)
  }

  return (
    <Modal
      open onClose={onClose} title={mode === 'edit' ? `Edit ${initial?.id}` : 'New control'}
      subtitle="An atomic runtime rule enforced at the Policy Enforcement Point"
      maxWidth="max-w-2xl"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary disabled:opacity-50" onClick={submit} disabled={!valid}><Check className="h-4 w-4" />{mode === 'edit' ? 'Save changes' : 'Create control'}</button></>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Control ID">
            <input className="input font-mono" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. OUT-01" disabled={mode === 'edit'} />
            {id && !/-/.test(id) && <p className="mt-1 text-xs text-rose-600">Use a PREFIX-NN format (e.g. OUT-01).</p>}
            {prefix && <p className="mt-1 text-xs text-ink-400">Family: {familyOf(prefix)}</p>}
          </Field>
          <Field label="Pack">
            <select className="input" value={packId} onChange={(e) => setPackId(e.target.value)}>
              {primitivePacks.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Require grounded citations in output" autoFocus /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Detector"><select className="input" value={detector} onChange={(e) => setDetector(e.target.value as DetectorType)}>{DETECTORS.map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="OPA decision"><select className="input" value={decision} onChange={(e) => setDecision(e.target.value as Decision)}>{DECISIONS.map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Default mode"><select className="input" value={modeVal} onChange={(e) => setModeVal(e.target.value as ControlMode)}>{MODES.map((m) => <option key={m}>{m}</option>)}</select></Field>
        </div>
        <Field label="Enforcement obligation"><input className="input" value={obligation} onChange={(e) => setObligation(e.target.value)} placeholder="e.g. Strip ungrounded claims from output" /></Field>
        <Field label="Evidence fields (comma-separated OTel keys)"><input className="input font-mono text-xs" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="grounded_ratio, citations_count" /></Field>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Hierarchy legend                                                    */
/* ------------------------------------------------------------------ */
function HierarchyLegend() {
  const items: { label: string; tone: Tone; def: string }[] = [
    { label: 'Control', tone: 'orange', def: 'A single runtime rule (e.g. DR-01) — one detector, one decision, one obligation.' },
    { label: 'Primitive', tone: 'blue', def: 'A single-purpose guardrail = a bundle of related controls (e.g. P1 · Data Residency).' },
    { label: 'Composite', tone: 'green', def: 'Primitives bundled to satisfy a framework or industry (e.g. GDPR, SOC 2).' },
  ]
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="mb-2.5 text-xs font-semibold text-ink-700">How policy is structured — <span className="font-mono text-ink-900">Control ⊂ Primitive ⊂ Composite</span> <span className="font-normal text-ink-400">(each level contains the one before it)</span></p>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((i) => (
          <div key={i.label} className="flex items-start gap-2">
            <Badge tone={i.tone}>{i.label}</Badge>
            <p className="text-xs text-ink-600">{i.def}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>{children}</div>
}
function KV({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-medium text-ink-500">{label}</p><p className="mt-0.5 text-sm font-semibold capitalize text-ink-900">{value}</p></div>
}
