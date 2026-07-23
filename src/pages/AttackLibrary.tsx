import { useState } from 'react'
import { Crosshair, ShieldCheck, ShieldAlert, ShieldX, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge, Modal } from '@/components/ui'
import {
  attackLibrary, ATTACK_CATEGORIES, coverageTone, owaspName, atlasName, atlasTactic, familyOf,
} from '@/data/evals'
import type { AttackTechnique, Coverage } from '@/data/evals'

const diffTone = { Low: 'slate', Medium: 'yellow', High: 'orange' } as const

export function AttackLibrary() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [framework, setFramework] = useState<'owasp' | 'atlas'>('owasp')
  const [sel, setSel] = useState<AttackTechnique | null>(null)
  const query = q.trim().toLowerCase()

  const rows = attackLibrary.filter(
    (a) => (cat === 'All' || a.category === cat) && (!query || [a.name, a.description, a.owasp, a.atlas, a.category].some((f) => f.toLowerCase().includes(query))),
  )
  const count = (c: Coverage) => attackLibrary.filter((a) => a.coverage === c).length

  // Coverage grouped by the selected framework.
  const groups = new Map<string, { label: string; sub: string; items: AttackTechnique[] }>()
  for (const a of attackLibrary) {
    const key = framework === 'owasp' ? a.owasp : a.atlas
    const label = framework === 'owasp' ? `${a.owasp} · ${owaspName(a.owasp)}` : `${a.atlas} · ${atlasName(a.atlas)}`
    const sub = framework === 'owasp' ? 'OWASP LLM' : atlasTactic(a.atlas)
    if (!groups.has(key)) groups.set(key, { label, sub, items: [] })
    groups.get(key)!.items.push(a)
  }

  return (
    <div>
      <PageHeader
        title="Attack Library"
        description="The reusable arsenal of adversarial techniques, mapped to OWASP LLM Top-10 and MITRE ATLAS — the source campaigns and eval suites draw from."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Techniques" value={attackLibrary.length} icon={Crosshair} tone="blue" footer={`${ATTACK_CATEGORIES.length} categories`} />
        <StatCard label="Caught" value={count('caught')} icon={ShieldCheck} tone="green" footer="Controls block this today" />
        <StatCard label="Partial" value={count('partial')} icon={ShieldAlert} tone="orange" footer="Blocks some variants" />
        <StatCard label="Bypassable" value={count('bypassable')} icon={ShieldX} tone="red" footer="Open gap — needs tuning" />
      </div>

      <Card className="mb-6">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9" placeholder="Search techniques…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...ATTACK_CATEGORIES].map((c) => (
              <button key={c} onClick={() => setCat(c)} className={clsx('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors', cat === c ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-slate-100 text-ink-700 ring-slate-500/10 hover:bg-slate-200/70')}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <Table columns={['Technique', 'Category', 'OWASP', 'MITRE ATLAS', 'Target control', 'Coverage', 'Difficulty']}>
          {rows.map((a) => (
            <Tr key={a.id} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setSel(a)}>
              <Td>
                <p className="font-medium text-ink-900">{a.name}</p>
                <p className="max-w-md truncate text-xs text-ink-500">{a.description}</p>
              </Td>
              <Td className="text-xs text-ink-600">{a.category}</Td>
              <Td><span className="font-mono text-xs text-ink-600" title={owaspName(a.owasp)}>{a.owasp}</span></Td>
              <Td><span className="font-mono text-xs text-ink-600" title={`${atlasName(a.atlas)} · ${atlasTactic(a.atlas)}`}>{a.atlas}</span></Td>
              <Td><span className="font-mono text-xs font-semibold text-ink-700" title={familyOf(a.targetControl)}>{a.targetControl}</span></Td>
              <Td><Badge tone={coverageTone[a.coverage]}>{a.coverage}</Badge></Td>
              <Td><Badge tone={diffTone[a.difficulty]}>{a.difficulty}</Badge></Td>
            </Tr>
          ))}
        </Table>
      </Card>

      <Card>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Coverage by framework</h3>
            <p className="text-xs text-ink-500">How our controls fare against each mapped category</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {(['owasp', 'atlas'] as const).map((f) => (
              <button key={f} onClick={() => setFramework(f)} className={clsx('rounded-md px-2.5 py-1 transition-colors', framework === f ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500')}>
                {f === 'owasp' ? 'OWASP LLM' : 'MITRE ATLAS'}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {[...groups.values()].sort((a, b) => a.label.localeCompare(b.label)).map((g) => {
            const c = g.items.filter((i) => i.coverage === 'caught').length
            const pa = g.items.filter((i) => i.coverage === 'partial').length
            const by = g.items.filter((i) => i.coverage === 'bypassable').length
            const total = g.items.length
            return (
              <div key={g.label} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800">{g.label}</p>
                  <p className="text-[11px] text-ink-400">{g.sub} · {total} technique{total === 1 ? '' : 's'}</p>
                </div>
                <div className="flex h-2.5 w-40 overflow-hidden rounded-full bg-slate-100">
                  {c > 0 && <div className="bg-emerald-400" style={{ width: `${(c / total) * 100}%` }} />}
                  {pa > 0 && <div className="bg-amber-400" style={{ width: `${(pa / total) * 100}%` }} />}
                  {by > 0 && <div className="bg-rose-400" style={{ width: `${(by / total) * 100}%` }} />}
                </div>
                <span className="w-16 text-right text-xs tabular-nums text-ink-500">{c}/{total} held</span>
              </div>
            )
          })}
        </div>
      </Card>

      {sel && (
        <Modal
          open onClose={() => setSel(null)}
          title={sel.name}
          subtitle={`${sel.category} · difficulty ${sel.difficulty}`}
          maxWidth="max-w-2xl"
          headerRight={<Badge tone={coverageTone[sel.coverage]}>{sel.coverage}</Badge>}
          footer={<button className="btn-secondary" onClick={() => setSel(null)}>Close</button>}
        >
          <div className="space-y-4">
            <p className="text-sm text-ink-700">{sel.description}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KV label="OWASP LLM" value={`${sel.owasp}`} sub={owaspName(sel.owasp)} />
              <KV label="MITRE ATLAS" value={sel.atlas} sub={`${atlasName(sel.atlas)} · ${atlasTactic(sel.atlas)}`} />
              <KV label="Target control" value={sel.targetControl} sub={familyOf(sel.targetControl)} />
            </div>
            <section>
              <h4 className="mb-1.5 text-sm font-semibold text-ink-900">Example payload</h4>
              <p className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-xs text-ink-700">{sel.payload}</p>
            </section>
          </div>
        </Modal>
      )}
    </div>
  )
}

function KV({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-ink-900">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500">{sub}</p>
    </div>
  )
}
