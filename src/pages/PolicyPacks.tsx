import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  Package, Boxes, Puzzle, SlidersHorizontal, Search, ShieldCheck, Scale, Lock, Users, Coins, Globe,
  ArrowUpRight, FileCode2, Layers,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, StatCard, Badge, PageHeader, Modal } from '@/components/ui'
import type { Tone } from '@/components/ui'
import {
  packs, controls, controlsForPack, controlCount, resolvedPrimitives, packById,
  CONTROL_FAMILIES, familyOf, policyTotals,
} from '@/data/policy'
import type { PolicyPack, Control, PackCategory, Decision } from '@/data/policy'

/* ------------------------------------------------------------------ */
/* Tones                                                               */
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

type Tab = 'packs' | 'controls'
type PackFilter = 'all' | 'primitive' | 'framework' | 'industry'

export default function PolicyPacks() {
  const [tab, setTab] = useState<Tab>('packs')
  const [selPack, setSelPack] = useState<PolicyPack | null>(null)
  const [selControl, setSelControl] = useState<Control | null>(null)

  return (
    <>
      <PageHeader
        title="Policy Packs"
        description="The governance guardrails PLCY enforces at runtime. Primitive packs are single-purpose controls (residency routing, consent gates, tool firewalls…); composite packs bundle those primitives to satisfy a framework (GDPR, SOC 2, PCI DSS…) or an industry. The Controls tab lists the atomic rules inside them."
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Policy packs" value={policyTotals.packs} icon={Package} tone="blue" footer={`${policyTotals.primitives} primitive · ${policyTotals.frameworks + policyTotals.industries} composite`} />
        <StatCard label="Framework packs" value={policyTotals.frameworks} icon={Scale} tone="green" footer="GDPR, SOC 2, PCI DSS…" />
        <StatCard label="Industry packs" value={policyTotals.industries} icon={Puzzle} tone="purple" footer="Retail, Gov, HR…" />
        <StatCard label="Controls" value={policyTotals.controls} icon={SlidersHorizontal} tone="orange" footer="Atomic runtime rules" />
      </div>

      {/* Section tabs */}
      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {([['packs', 'Packs', Boxes], ['controls', 'Controls', SlidersHorizontal]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx('-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors', tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800')}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'packs' ? <PacksSection onOpen={setSelPack} /> : <ControlsSection onOpen={setSelControl} />}
      </div>

      {selPack && <PackDrawer pack={selPack} onClose={() => setSelPack(null)} onOpenPack={setSelPack} onOpenControl={setSelControl} />}
      {selControl && <ControlDrawer control={selControl} onClose={() => setSelControl(null)} onOpenPack={(p) => { setSelControl(null); setSelPack(p) }} />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Packs section                                                       */
/* ------------------------------------------------------------------ */
function PacksSection({ onOpen }: { onOpen: (p: PolicyPack) => void }) {
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

      {primitives.length > 0 && <PackGroup title="Primitive packs" subtitle="Single-purpose, composable runtime guardrails" packs={primitives} onOpen={onOpen} />}
      {frameworks.length > 0 && <PackGroup title="Framework packs" subtitle="Bundle primitives to satisfy a standard" packs={frameworks} onOpen={onOpen} />}
      {industries.length > 0 && <PackGroup title="Industry packs" subtitle="Vertical-specific governance bundles" packs={industries} onOpen={onOpen} />}
      {primitives.length + frameworks.length + industries.length === 0 && (
        <Card><p className="py-10 text-center text-sm text-ink-400">No packs match your filter.</p></Card>
      )}
    </>
  )
}

function PackGroup({ title, subtitle, packs: list, onOpen }: { title: string; subtitle: string; packs: PolicyPack[]; onOpen: (p: PolicyPack) => void }) {
  return (
    <div className="mb-6">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-ink-900">{title} <span className="ml-1 text-ink-400">· {list.length}</span></h3>
        <p className="text-xs text-ink-500">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => <PackCard key={p.id} pack={p} onOpen={onOpen} />)}
      </div>
    </div>
  )
}

function PackCard({ pack, onOpen }: { pack: PolicyPack; onOpen: (p: PolicyPack) => void }) {
  const cs = categoryStyle[pack.category]
  const Icon = cs.icon
  const tags = pack.type === 'primitive' ? [] : pack.kind === 'framework' ? pack.frameworks : pack.industries
  return (
    <button onClick={() => onOpen(pack)} className="card card-pad group text-left transition-shadow hover:shadow-cardhover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone="slate">{pack.id}</Badge>
          <Badge tone={cs.tone} dot>{pack.category}</Badge>
        </div>
        <span className="font-mono text-[11px] text-ink-400">{controlCount(pack)} controls</span>
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
function ControlsSection({ onOpen }: { onOpen: (c: Control) => void }) {
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
      <div className="mb-4 flex flex-wrap gap-1.5">
        {families.map((f) => (
          <button key={f} onClick={() => setFamily(f)} className={clsx('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors', family === f ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-slate-100 text-ink-700 ring-slate-500/10 hover:bg-slate-200/70')} title={f === 'All' ? 'All families' : familyOf(f)}>
            {f}{f !== 'All' && <span className="ml-1 text-ink-400">{controls.filter((c) => c.prefix === f).length}</span>}
          </button>
        ))}
      </div>

      <Card>
        <CardTitle title="Controls" subtitle={`${filtered.length} of ${controls.length} atomic runtime controls · click for detection, decision & evidence`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3">Control</th>
                <th className="py-2 pr-3">Family</th>
                <th className="py-2 pr-3">Detector</th>
                <th className="py-2 pr-3">Decision</th>
                <th className="py-2 pr-3">Mode</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ct) => (
                <tr key={ct.id} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50" onClick={() => onOpen(ct)}>
                  <td className="py-2.5 pr-3">
                    <span className="font-mono text-xs font-semibold text-ink-900">{ct.id}</span>
                    <p className="text-xs text-ink-600">{ct.name}</p>
                  </td>
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
function PackDrawer({ pack, onClose, onOpenPack, onOpenControl }: {
  pack: PolicyPack
  onClose: () => void
  onOpenPack: (p: PolicyPack) => void
  onOpenControl: (c: Control) => void
}) {
  const cs = categoryStyle[pack.category]
  const packControls = controlsForPack(pack)
  const primitives = pack.type === 'composite' ? resolvedPrimitives(pack) : []
  const tags = [...pack.frameworks, ...pack.industries]

  return (
    <Modal
      open
      onClose={onClose}
      title={<span className="flex items-center gap-2"><span className="font-mono text-base text-ink-500">{pack.id}</span>{pack.name}</span>}
      subtitle={pack.description}
      maxWidth="max-w-3xl"
      headerRight={<Badge tone={cs.tone} dot>{pack.category}</Badge>}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="space-y-5">
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
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {packControls.map((ct) => (
              <button key={ct.id} onClick={() => onOpenControl(ct)} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50">
                <span className="min-w-0"><span className="font-mono text-xs font-semibold text-ink-900">{ct.id}</span> <span className="text-sm text-ink-700">{ct.name}</span></span>
                <Badge tone={decisionTone[ct.decision]}>{ct.decision}</Badge>
              </button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Control drawer                                                      */
/* ------------------------------------------------------------------ */
function ControlDrawer({ control: ct, onClose, onOpenPack }: { control: Control; onClose: () => void; onOpenPack: (p: PolicyPack) => void }) {
  const pack = packById(ct.packId)
  const rego = `package plcy.${ct.prefix.toLowerCase()}

# ${ct.id} — ${ct.name}
decision := "${ct.decision.toLowerCase()}" {
  input.detector == "${ct.detector.toLowerCase()}"
  # ${ct.obligation}
}`
  return (
    <Modal
      open
      onClose={onClose}
      title={<span className="font-mono text-base">{ct.id}</span>}
      subtitle={ct.name}
      maxWidth="max-w-2xl"
      headerRight={<Badge tone={decisionTone[ct.decision]}>{ct.decision}</Badge>}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="space-y-5">
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

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold capitalize text-ink-900">{value}</p>
    </div>
  )
}
