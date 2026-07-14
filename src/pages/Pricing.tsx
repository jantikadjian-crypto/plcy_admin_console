import { useEffect, useMemo, useState } from 'react'
import { BadgeDollarSign, Package, Layers, Percent, Calculator, Plus, Pencil, Copy, Archive, ArchiveRestore, Trash2, Check, Download, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, PageHeader, Badge, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import {
  loadPlans, savePlans, loadAddOns, saveAddOns, loadDiscounts, saveDiscounts,
  newPlanId, newAddOnId, CAPACITY_META, FEATURE_ENUMS, FEATURE_TEXTS, FEATURE_BOOLS,
  THROUGHPUT_TIERS, ENTITLEMENTS,
  money, money2, pct, compact, effectivePrice, packUnitPrice, packSavingsPct, computeQuote,
} from '@/data/pricing'
import type { Plan, PlanCapacity, PlanFeatures, AddOn, Discounts, Cadence, QuoteInput } from '@/data/pricing'
import { downloadCSV, downloadMarkdown, reportStem } from '@/lib/download'

type Tab = 'Plans' | 'Add-ons' | 'Discounts' | 'Quote'
const TABS: { key: Tab; icon: LucideIcon; label: string }[] = [
  { key: 'Plans', icon: Package, label: 'Plans' },
  { key: 'Add-ons', icon: Layers, label: 'Add-ons & packs' },
  { key: 'Discounts', icon: Percent, label: 'Discounts & levers' },
  { key: 'Quote', icon: Calculator, label: 'Quote builder' },
]

export default function Pricing() {
  const { can, logAction } = useSession()
  const canManage = can('license.manage')
  const [tab, setTab] = useState<Tab>('Plans')
  const [plans, setPlans] = useState<Plan[]>(loadPlans)
  const [addOns, setAddOns] = useState<AddOn[]>(loadAddOns)
  const [discounts, setDiscounts] = useState<Discounts>(loadDiscounts)

  useEffect(() => savePlans(plans), [plans])
  useEffect(() => saveAddOns(addOns), [addOns])
  useEffect(() => saveDiscounts(discounts), [discounts])

  return (
    <>
      <PageHeader
        title="Pricing & Plans"
        description="The pricing catalog — plans and included capacity, add-ons with bulk packs, discount levers, and a live quote builder. Edits feed the billing and quoting flows."
      />

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
            >
              <Icon className="h-4 w-4" />{t.label}
            </button>
          )
        })}
      </div>

      {tab === 'Plans' && <PlansTab plans={plans} setPlans={setPlans} canManage={canManage} log={logAction} />}
      {tab === 'Add-ons' && <AddOnsTab addOns={addOns} setAddOns={setAddOns} canManage={canManage} log={logAction} />}
      {tab === 'Discounts' && <DiscountsTab discounts={discounts} setDiscounts={setDiscounts} canManage={canManage} />}
      {tab === 'Quote' && <QuoteTab plans={plans} addOns={addOns} discounts={discounts} log={logAction} />}
    </>
  )
}

type Log = ReturnType<typeof useSession>['logAction']

/* ================================================================== */
/* Plans                                                               */
/* ================================================================== */
function PlansTab({ plans, setPlans, canManage, log }: { plans: Plan[]; setPlans: (f: (p: Plan[]) => Plan[]) => void; canManage: boolean; log: Log }) {
  const [edit, setEdit] = useState<Plan | null>(null)
  const [creating, setCreating] = useState(false)

  const savePlan = (plan: Plan) => {
    setPlans((prev) => (prev.some((p) => p.id === plan.id) ? prev.map((p) => (p.id === plan.id ? plan : p)) : [...prev, plan]))
    log({ action: 'pricing.plan.save', target: plan.name, category: 'settings' })
    setEdit(null); setCreating(false)
  }
  const duplicate = (p: Plan) => {
    const copy: Plan = { ...p, id: newPlanId(), name: `${p.name} (copy)`, capacity: { ...p.capacity }, features: { ...p.features }, archived: false }
    setPlans((prev) => [...prev, copy])
    log({ action: 'pricing.plan.duplicate', target: p.name, category: 'settings' })
  }
  const toggleArchive = (p: Plan) => {
    setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, archived: !x.archived } : x)))
    log({ action: p.archived ? 'pricing.plan.restore' : 'pricing.plan.archive', target: p.name, category: 'settings' })
  }

  const emptyPlan = (): Plan => ({
    id: newPlanId(), name: 'New plan', monthly: 0, quarterlyDiscount: 0.05, annualDiscount: 0.17,
    capacity: { requests: 100000, seats: 5, apps: 3, packs: 2, primitives: 6, promptGb: 2, logGb: 2, cacheGb: 1, retentionDays: 30 },
    features: { rbac: 'Basic roles', throughputTier: 'Standard', deployment: 'Shared multi-tenant', backups: 'Daily', support: 'Email support', sso: false, scim: false, immutableLogs: false, advancedReporting: false, hitl: false, bedrock: false, customModels: false },
    notes: '',
  })

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500">{plans.filter((p) => !p.archived).length} active plans · click a plan to edit its price, capacity, and features.</p>
        <GatedButton cap="license.manage" className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />New plan
        </GatedButton>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className={`flex flex-col ${p.archived ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-ink-900">{p.name}</h3>
                  {p.archived && <Badge tone="slate">Archived</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-ink-500">{p.notes || '—'}</p>
              </div>
              <BadgeDollarSign className="h-5 w-5 shrink-0 text-ink-300" />
            </div>

            <div className="mt-3 flex items-end gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-ink-900">{money(p.monthly)}</span>
              <span className="pb-0.5 text-xs text-ink-500">/mo</span>
              {p.annualDiscount > 0 && <span className="pb-0.5 text-xs text-emerald-600">· {money(effectivePrice(p.monthly, p.annualDiscount))}/mo annual</span>}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {CAPACITY_META.map((c) => (
                <div key={c.key} className="flex items-center justify-between">
                  <span className="text-ink-500">{c.short}</span>
                  <span className="font-medium text-ink-800">{c.key === 'retentionDays' ? `${p.capacity[c.key]}d` : compact(p.capacity[c.key])}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {p.features.rbac !== 'None' && <Badge tone="blue">{p.features.rbac}</Badge>}
              <Badge tone="slate">{p.features.throughputTier} throughput</Badge>
              {p.features.sso && <Badge tone="purple">SSO{p.features.scim ? ' + SCIM' : ''}</Badge>}
              {p.features.deployment.includes('Dedicated') && <Badge tone="orange">Dedicated</Badge>}
              {p.features.bedrock && <Badge tone="green">Bedrock</Badge>}
              {p.features.customModels && <Badge tone="green">Custom models</Badge>}
            </div>

            {canManage && (
              <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
                <button className="btn-secondary flex-1 px-2 py-1.5 text-xs" onClick={() => setEdit(p)}><Pencil className="h-3.5 w-3.5" />Edit</button>
                <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" onClick={() => duplicate(p)} title="Duplicate"><Copy className="h-4 w-4" /></button>
                <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-ink-700" onClick={() => toggleArchive(p)} title={p.archived ? 'Restore' : 'Archive'}>{p.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {(edit || creating) && (
        <PlanModal plan={edit ?? emptyPlan()} onClose={() => { setEdit(null); setCreating(false) }} onSave={savePlan} />
      )}
    </>
  )
}

function NumField({ label, value, onChange, step = 1, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-500">{label}</label>
      <div className="relative">
        <input type="number" step={step} className="input" value={value} onChange={(e) => onChange(Number(e.target.value))} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">{suffix}</span>}
      </div>
    </div>
  )
}

function FeatureToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${on ? 'justify-end bg-brand-600' : 'justify-start bg-slate-200'}`}>
      <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </button>
  )
}

function PlanModal({ plan, onClose, onSave }: { plan: Plan; onClose: () => void; onSave: (p: Plan) => void }) {
  const [d, setD] = useState<Plan>(() => ({ ...plan, capacity: { ...plan.capacity }, features: { ...plan.features } }))
  const setCap = (k: keyof PlanCapacity, v: number) => setD((p) => ({ ...p, capacity: { ...p.capacity, [k]: v } }))
  const setFeat = (k: keyof PlanFeatures, v: string | boolean) => setD((p) => ({ ...p, features: { ...p.features, [k]: v } }))
  return (
    <Modal open onClose={onClose} title={plan.name === 'New plan' ? 'New plan' : `Edit ${plan.name}`} subtitle="Price, included capacity, and features" maxWidth="max-w-2xl"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave(d)}><Check className="h-4 w-4" />Save plan</button></>}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium text-ink-500">Plan name</label><input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></div>
          <NumField label="Base price / mo" value={d.monthly} onChange={(v) => setD({ ...d, monthly: v })} suffix="$" />
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Quarterly discount" value={Math.round(d.quarterlyDiscount * 100)} onChange={(v) => setD({ ...d, quarterlyDiscount: v / 100 })} suffix="%" />
            <NumField label="Annual discount" value={Math.round(d.annualDiscount * 100)} onChange={(v) => setD({ ...d, annualDiscount: v / 100 })} suffix="%" />
          </div>
        </div>

        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Included capacity</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CAPACITY_META.map((c) => <NumField key={c.key} label={c.label} value={d.capacity[c.key]} onChange={(v) => setCap(c.key, v)} />)}
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Tiers & levels</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FEATURE_ENUMS.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-medium text-ink-500">{f.label}</label>
                <select className="input" value={d.features[f.key]} onChange={(e) => setFeat(f.key, e.target.value)}>
                  {f.options.map((o) => <option key={o} value={o}>{o}{f.key === 'throughputTier' ? ` — ${money(THROUGHPUT_TIERS.find((t) => t.name === o)?.monthly ?? 0)}` : ''}</option>)}
                </select>
              </div>
            ))}
            {FEATURE_TEXTS.map((f) => (
              <div key={f.key} className="sm:col-span-3 sm:grid sm:grid-cols-2 sm:gap-3">
                <div className="sm:col-span-1"><label className="mb-1 block text-xs font-medium text-ink-500">{f.label}</label><input className="input" value={d.features[f.key]} onChange={(e) => setFeat(f.key, e.target.value)} /></div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Included entitlements</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FEATURE_BOOLS.map((f) => (
              <div key={f.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <span className="text-sm text-ink-700">{f.label}</span>
                <FeatureToggle on={d.features[f.key]} onClick={() => setFeat(f.key, !d.features[f.key])} />
              </div>
            ))}
          </div>
        </section>

        <div><label className="mb-1 block text-xs font-medium text-ink-500">Notes</label><input className="input" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></div>
      </div>
    </Modal>
  )
}

/* ================================================================== */
/* Add-ons                                                             */
/* ================================================================== */
function AddOnsTab({ addOns, setAddOns, canManage, log }: { addOns: AddOn[]; setAddOns: (f: (a: AddOn[]) => AddOn[]) => void; canManage: boolean; log: Log }) {
  const [edit, setEdit] = useState<AddOn | null>(null)
  const [creating, setCreating] = useState(false)

  const saveAddOn = (a: AddOn) => {
    setAddOns((prev) => (prev.some((x) => x.id === a.id) ? prev.map((x) => (x.id === a.id ? a : x)) : [...prev, a]))
    log({ action: 'pricing.addon.save', target: a.name, category: 'settings' })
    setEdit(null); setCreating(false)
  }
  const remove = (a: AddOn) => {
    setAddOns((prev) => prev.filter((x) => x.id !== a.id))
    log({ action: 'pricing.addon.remove', target: a.name, category: 'settings' })
  }
  const empty = (): AddOn => ({ id: newAddOnId(), name: 'New add-on', kind: 'capacity', unitPrice: 10, packSize: 10, packPrice: 75, unitLabel: 'unit/mo', notes: '' })

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500">Bulk packs are priced below the per-unit rate — the quote builder auto-picks whichever is cheaper.</p>
        <GatedButton cap="license.manage" className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New add-on</GatedButton>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="px-4 py-2.5 font-medium">Add-on</th>
                <th className="px-4 py-2.5 font-medium">Unit price</th>
                <th className="px-4 py-2.5 font-medium">Pack</th>
                <th className="px-4 py-2.5 font-medium">Pack / unit</th>
                <th className="px-4 py-2.5 font-medium">Bulk savings</th>
                {canManage && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {addOns.map((a) => {
                const sav = packSavingsPct(a)
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink-900">{a.name}</p>
                      <p className="text-xs text-ink-400">{a.kind === 'capacity' ? `Capacity · ${a.unitLabel}` : `Feature · ${a.unitLabel}`}{a.notes ? ` · ${a.notes}` : ''}</p>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-ink-700">{a.unitPrice == null ? <span className="text-ink-400">pack only</span> : `${money(a.unitPrice)}`}</td>
                    <td className="px-4 py-2.5 tabular-nums text-ink-700">{a.packSize} → {money(a.packPrice)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-ink-700">{money2(packUnitPrice(a))}</td>
                    <td className="px-4 py-2.5">{sav > 0 ? <Badge tone="green">−{pct(sav)}</Badge> : <span className="text-xs text-ink-400">—</span>}</td>
                    {canManage && (
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" onClick={() => setEdit(a)} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                          <button className="rounded-md p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => remove(a)} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {(edit || creating) && <AddOnModal addOn={edit ?? empty()} onClose={() => { setEdit(null); setCreating(false) }} onSave={saveAddOn} />}
    </>
  )
}

function AddOnModal({ addOn, onClose, onSave }: { addOn: AddOn; onClose: () => void; onSave: (a: AddOn) => void }) {
  const [d, setD] = useState<AddOn>(() => ({ ...addOn }))
  return (
    <Modal open onClose={onClose} title={addOn.name === 'New add-on' ? 'New add-on' : `Edit ${addOn.name}`} subtitle="Unit price and discounted bulk pack" maxWidth="max-w-lg"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave(d)}><Check className="h-4 w-4" />Save add-on</button></>}>
      <div className="space-y-4">
        <div><label className="mb-1 block text-xs font-medium text-ink-500">Name</label><input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500">Kind</label>
            <select className="input" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as AddOn['kind'] })}>
              <option value="capacity">Capacity</option>
              <option value="feature">Feature</option>
            </select>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-ink-500">Unit label</label><input className="input" value={d.unitLabel} onChange={(e) => setD({ ...d, unitLabel: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumField label="Unit price ($, 0 = pack only)" value={d.unitPrice ?? 0} onChange={(v) => setD({ ...d, unitPrice: v === 0 ? null : v })} />
          <NumField label="Pack size" value={d.packSize} onChange={(v) => setD({ ...d, packSize: Math.max(1, v) })} />
          <NumField label="Pack price ($)" value={d.packPrice} onChange={(v) => setD({ ...d, packPrice: v })} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-ink-600">
          Effective pack rate <strong>{money2(packUnitPrice(d))}</strong> / {d.unitLabel}
          {d.unitPrice ? <> · bulk savings <strong className="text-emerald-600">{pct(packSavingsPct(d))}</strong> vs {money(d.unitPrice)} unit</> : null}
        </div>
        <div><label className="mb-1 block text-xs font-medium text-ink-500">Notes</label><input className="input" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></div>
      </div>
    </Modal>
  )
}

/* ================================================================== */
/* Discounts & levers                                                  */
/* ================================================================== */
function DiscountsTab({ discounts, setDiscounts, canManage }: { discounts: Discounts; setDiscounts: (f: (d: Discounts) => Discounts) => void; canManage: boolean }) {
  const set = (k: keyof Discounts, v: number) => canManage && setDiscounts((p) => ({ ...p, [k]: v / 100 }))
  const rows: { key: keyof Discounts; label: string; desc: string }[] = [
    { key: 'quarterly', label: 'Quarterly billing', desc: 'Discount off standard monthly for quarterly billing' },
    { key: 'annual', label: 'Annual billing', desc: 'Discount off standard monthly for annual billing' },
    { key: 'term24', label: '24-month term', desc: 'Extra discount for a 24-month commitment' },
    { key: 'term36', label: '36-month term', desc: 'Extra discount for a 36-month commitment' },
    { key: 'premiumSupport', label: 'Premium support', desc: 'Uplift applied on the recurring subscription' },
    { key: 'managedLlmFee', label: 'PLCY-managed LLM fee', desc: 'Service fee on managed model credits (BYOK stays default)' },
    { key: 'byokMarkup', label: 'BYOK markup', desc: 'Markup for bring-your-own-key access' },
    { key: 'cacheHitDiscount', label: 'Cache-hit discount', desc: 'How much a cached prompt is discounted off a billable request (100% = cache hits are free)' },
  ]
  return (
    <Card>
      <CardTitle title="Discount & fee levers" subtitle="Global rates applied by the quote builder" />
      {!canManage && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Read-only — your role cannot change pricing levers.</p>}
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-ink-900">{r.label}</p>
              <p className="text-xs text-ink-500">{r.desc}</p>
            </div>
            <div className="relative w-28 shrink-0">
              <input type="number" className="input pr-7 text-right" value={Math.round(discounts[r.key] * 1000) / 10} onChange={(e) => set(r.key, Number(e.target.value))} disabled={!canManage} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ================================================================== */
/* Quote builder                                                       */
/* ================================================================== */
function QuoteTab({ plans, addOns, discounts, log }: { plans: Plan[]; addOns: AddOn[]; discounts: Discounts; log: Log }) {
  const active = plans.filter((p) => !p.archived)
  const [client, setClient] = useState('Acme Customer, Inc.')
  const [input, setInput] = useState<QuoteInput>(() => {
    const p = active.find((x) => x.name === 'Business') ?? active[0]
    return {
      planId: p?.id ?? '', cadence: 'Annual', termMonths: 12, commercialPct: 0,
      demand: p ? { ...p.capacity } : { requests: 0, seats: 0, apps: 0, packs: 0, primitives: 0, promptGb: 0, logGb: 0, cacheGb: 0, retentionDays: 0 },
      throughputTier: p?.features.throughputTier ?? 'Standard',
      entitlements: { sso: false, scim: false, immutableLogs: false, advancedReporting: true, hitl: true, bedrock: false, customModels: false },
      premiumSupport: false, cacheHitRate: 0,
      modelAccess: 'BYOK', managedCreditsMonthly: 0, setupFee: 1000, trainingFee: 500, migrationFee: 0,
    }
  })
  const set = (patch: Partial<QuoteInput>) => setInput((p) => ({ ...p, ...patch }))
  const setDemand = (k: keyof PlanCapacity, v: number) => setInput((p) => ({ ...p, demand: { ...p.demand, [k]: v } }))

  const quote = useMemo(() => computeQuote(input, plans, addOns, discounts), [input, plans, addOns, discounts])

  const exportCSV = () => {
    downloadCSV(`${reportStem('quote')}.csv`, ['Line item', 'Basis', 'Monthly', 'Notes'], quote.lines.map((l) => [l.label, l.basis, l.monthly, l.notes]))
    log({ action: 'pricing.quote.export', target: client, category: 'settings' })
  }
  const exportMD = () => {
    const L = [`# Quote — ${client}`, '', `**Plan:** ${quote.plan?.name} · **Cadence:** ${input.cadence} · **Term:** ${input.termMonths} mo`, '', '| Line item | Basis | Monthly |', '| --- | --- | --- |']
    quote.lines.forEach((l) => L.push(`| ${l.label} | ${l.basis} | ${money(l.monthly)} |`))
    L.push('', `**Net monthly:** ${money(quote.netMonthly)} · **Annual ACV:** ${money(quote.annualAcv)} · **First-year booking:** ${money(quote.firstYear)}`)
    downloadMarkdown(`${reportStem('quote')}.md`, L.join('\n'))
    log({ action: 'pricing.quote.export', target: client, category: 'settings' })
  }

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} aria-pressed={on} className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${on ? 'justify-end bg-brand-600' : 'justify-start bg-slate-200'}`}><span className="h-5 w-5 rounded-full bg-white shadow-sm" /></button>
  )

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
      {/* Inputs */}
      <div className="space-y-4">
        <Card>
          <CardTitle title="Deal setup" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium text-ink-500">Client / business name</label><input className="input" value={client} onChange={(e) => setClient(e.target.value)} /></div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">Plan</label>
              <select className="input" value={input.planId} onChange={(e) => { const p = plans.find((x) => x.id === e.target.value); set({ planId: e.target.value, demand: p ? { ...p.capacity } : input.demand, throughputTier: p?.features.throughputTier ?? input.throughputTier }) }}>
                {active.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.monthly)}/mo</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">Billing cadence</label>
              <select className="input" value={input.cadence} onChange={(e) => set({ cadence: e.target.value as Cadence })}>
                {(['Monthly', 'Quarterly', 'Annual'] as Cadence[]).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">Contract term</label>
              <select className="input" value={input.termMonths} onChange={(e) => set({ termMonths: Number(e.target.value) as QuoteInput['termMonths'] })}>
                {[12, 24, 36].map((m) => <option key={m} value={m}>{m} months</option>)}
              </select>
            </div>
            <NumField label="Commercial discount %" value={Math.round(input.commercialPct * 100)} onChange={(v) => set({ commercialPct: v / 100 })} suffix="%" />
          </div>
        </Card>

        <Card>
          <CardTitle title="Demand" subtitle="Overages beyond the plan's included capacity are priced by the cheaper of unit or pack" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CAPACITY_META.map((c) => <NumField key={c.key} label={c.short} value={input.demand[c.key]} onChange={(v) => setDemand(c.key, v)} />)}
          </div>
        </Card>

        <Card>
          <CardTitle title="Options" />
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">Throughput tier</label>
              <select className="input" value={input.throughputTier} onChange={(e) => set({ throughputTier: e.target.value })}>
                {THROUGHPUT_TIERS.map((t) => <option key={t.name} value={t.name}>{t.name} — {money(t.monthly)}/mo</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 sm:mt-5">
              <span className="text-sm text-ink-700">Cache hit rate</span>
              <div className="relative w-24">
                <input type="number" min={0} max={100} className="input py-1.5 pr-7 text-right text-sm" value={Math.round(input.cacheHitRate * 100)} onChange={(e) => set({ cacheHitRate: Math.min(100, Math.max(0, Number(e.target.value))) / 100 })} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ENTITLEMENTS.map((e) => (
              <div key={e.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                <span className="text-sm text-ink-700">{e.label}</span>
                <Toggle on={input.entitlements[e.key]} onClick={() => setInput((p) => ({ ...p, entitlements: { ...p.entitlements, [e.key]: !p.entitlements[e.key] } }))} />
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
              <span className="text-sm text-ink-700">Premium support (+{pct(discounts.premiumSupport)})</span>
              <Toggle on={input.premiumSupport} onClick={() => set({ premiumSupport: !input.premiumSupport })} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">Model access</label>
              <select className="input" value={input.modelAccess} onChange={(e) => set({ modelAccess: e.target.value as QuoteInput['modelAccess'] })}>
                <option value="BYOK">BYOK (default)</option>
                <option value="Managed">PLCY-managed credits</option>
              </select>
            </div>
            {input.modelAccess === 'Managed' && <NumField label="Managed LLM credits / mo" value={input.managedCreditsMonthly} onChange={(v) => set({ managedCreditsMonthly: v })} suffix="$" />}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NumField label="Setup / onboarding" value={input.setupFee} onChange={(v) => set({ setupFee: v })} suffix="$" />
            <NumField label="Training" value={input.trainingFee} onChange={(v) => set({ trainingFee: v })} suffix="$" />
            <NumField label="Migration" value={input.migrationFee} onChange={(v) => set({ migrationFee: v })} suffix="$" />
          </div>
        </Card>
      </div>

      {/* Output */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle title="Order form" subtitle={client} />
          </div>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-2 font-medium">Line item</th>
                  <th className="py-2 text-right font-medium">Monthly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quote.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-2"><p className="font-medium text-ink-800">{l.label}</p><p className="text-[11px] text-ink-400">{l.basis}</p></td>
                    <td className="py-2 text-right tabular-nums text-ink-800">{money(l.monthly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
            <Row label="Gross monthly" value={money(quote.grossMonthly)} />
            {quote.billingDiscount > 0 && <Row label={`${input.cadence} billing discount`} value={`−${pct(quote.billingDiscount)}`} tone="emerald" />}
            {quote.termDiscount > 0 && <Row label={`${input.termMonths}-mo term discount`} value={`−${pct(quote.termDiscount)}`} tone="emerald" />}
            {quote.commercialDiscount > 0 && <Row label="Commercial discount" value={`−${pct(quote.commercialDiscount)}`} tone="emerald" />}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-ink-900">
              <span>Net monthly</span><span className="tabular-nums">{money(quote.netMonthly)}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <Stat label="Annual ACV" value={money(quote.annualAcv)} />
            <Stat label="Eff. $/seat/mo" value={money2(quote.effPerSeat)} />
            <Stat label="One-time" value={money(quote.oneTime)} />
            <Stat label="First-year booking" value={money(quote.firstYear)} accent />
          </div>

          <div className="mt-4 flex gap-2">
            <button className="btn-secondary flex-1" onClick={exportCSV}><Download className="h-4 w-4" />CSV</button>
            <button className="btn-secondary flex-1" onClick={exportMD}><FileText className="h-4 w-4" />Markdown</button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'emerald' }) {
  return <div className="flex items-center justify-between"><span className="text-ink-500">{label}</span><span className={`tabular-nums ${tone === 'emerald' ? 'font-medium text-emerald-600' : 'text-ink-700'}`}>{value}</span></div>
}
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 ${accent ? 'border-brand-200 bg-brand-50' : 'border-slate-200'}`}>
      <p className="text-[11px] font-medium text-ink-500">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${accent ? 'text-brand-700' : 'text-ink-900'}`}>{value}</p>
    </div>
  )
}
