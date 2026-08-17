import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Code2, X, FileText, ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'
import { useSession } from '@/context/Session'
import { EAccessRole } from '@/data/access'
import { Badge } from '@/components/ui'
import {
  DEV_MODULES,
  PLATFORM,
  moduleForPath,
  FIDELITY_LABEL,
} from '@/data/devNotes'
import type { DevModule, Fidelity } from '@/data/devNotes'

/**
 * In-app developer handover notes.
 *
 * Renders `src/data/devNotes.ts` — the same module that generates
 * `docs/plcy_admin_console-developer-notes.md`. There is one copy of the
 * content, so the panel and the doc cannot drift.
 *
 * The button follows the reader: it opens on whichever module covers the
 * current route, so notes are one click away from the screen they describe.
 */

/* ------------------------------------------------------------------ */
/* Visibility                                                          */
/* ------------------------------------------------------------------ */

/**
 * Who sees the button.
 *
 * Always present in a dev server. In a production build it survives only for
 * Superuser, so the deployed preview can show it without any end user meeting
 * it. `import.meta.env.DEV` is statically replaced at build time, but the role
 * check is runtime — so the notes content does ship in the production bundle.
 * If that is unacceptable (it is internal engineering commentary, not secrets),
 * change this to `import.meta.env.DEV` alone and the whole module tree gets
 * tree-shaken out of the production build.
 */
function useDevNotesVisible(): boolean {
  const { actingRole } = useSession()
  return import.meta.env.DEV || actingRole === EAccessRole.Superuser
}

const fidelityTone: Record<Fidelity, 'green' | 'yellow' | 'red'> = {
  'rule-real': 'green',
  'value-placeholder': 'yellow',
  illustrative: 'red',
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

type Tab = 'overview' | 'rules' | 'fields' | 'edge' | 'integrations' | 'permissions' | 'platform'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'rules', label: 'Business rules' },
  { key: 'fields', label: 'Data fields' },
  { key: 'edge', label: 'Edge cases' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'permissions', label: 'Permissions' },
  { key: 'platform', label: 'Platform' },
]

export function DevNotes() {
  const visible = useDevNotesVisible()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const [manual, setManual] = useState<string | null>(null)

  // Following the route is the point; an explicit pick from the dropdown wins
  // until the reader navigates again.
  useEffect(() => setManual(null), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!visible) return null

  const routeModule = moduleForPath(pathname)
  const mod: DevModule | undefined = manual ? DEV_MODULES.find((m) => m.key === manual) : routeModule

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Developer notes for this screen"
          aria-label="Open developer notes"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-ink-900/90"
        >
          <Code2 className="h-4 w-4" />
          Dev Notes
          {import.meta.env.DEV && <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium">dev</span>}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Developer notes">
          <button className="flex-1 bg-ink-900/30" aria-label="Close developer notes" onClick={() => setOpen(false)} />
          <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    <Code2 className="h-3.5 w-3.5" /> Developer notes
                  </p>
                  <h2 className="mt-0.5 truncate text-base font-semibold text-ink-900">
                    {mod ? mod.title : 'PLCY Admin Console'}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {mod ? mod.summary : 'No module notes for this route — showing platform notes.'}
                  </p>
                </div>
                <button onClick={() => setOpen(false)} className="shrink-0 text-ink-400 hover:text-ink-700" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <select
                  className="input h-8 w-auto py-0 text-xs"
                  value={mod?.key ?? ''}
                  onChange={(e) => setManual(e.target.value || null)}
                  aria-label="Choose a module"
                >
                  {!mod && <option value="">Platform only</option>}
                  {DEV_MODULES.map((m) => <option key={m.key} value={m.key}>{m.title}</option>)}
                </select>
                {mod && routeModule?.key === mod.key && <Badge tone="blue">this screen</Badge>}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2">
              {TABS.filter((t) => t.key === 'platform' || mod).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={clsx(
                    'whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                    tab === t.key ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-slate-50',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
              {tab === 'platform' || !mod ? <PlatformBody /> : <ModuleBody mod={mod} tab={tab} />}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-[11px] text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Source: <code className="font-mono">src/data/devNotes.ts</code>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                <code className="font-mono">docs/plcy_admin_console-developer-notes.md</code>
              </span>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Bodies                                                              */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{title}</h3>
      {children}
    </section>
  )
}

function PlatformBody() {
  return (
    <>
      <Section title="What this is">
        {PLATFORM.product.map((p) => <p key={p} className="mb-2 text-ink-700">{stripMd(p)}</p>)}
      </Section>
      <Section title="Deployment modes">
        <ul className="space-y-1.5 text-ink-700">{PLATFORM.deploymentModes.map((d) => <li key={d}>• {stripMd(d)}</li>)}</ul>
      </Section>
      <Section title="Architecture & state">
        <ul className="space-y-1.5 text-ink-700">{PLATFORM.architecture.map((d) => <li key={d}>• {stripMd(d)}</li>)}</ul>
      </Section>
      <Section title="Conventions">
        <ul className="space-y-1.5 text-ink-700">{PLATFORM.conventions.map((d) => <li key={d}>• {stripMd(d)}</li>)}</ul>
      </Section>
      <Section title="Not a specification">
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <ul className="space-y-1.5 text-ink-700">{PLATFORM.doNotTreatAsSpec.map((d) => <li key={d}>• {stripMd(d)}</li>)}</ul>
        </div>
      </Section>
      <Section title="Known gaps">
        <ul className="space-y-1.5 text-ink-700">{PLATFORM.knownGaps.map((d) => <li key={d}>• {stripMd(d)}</li>)}</ul>
      </Section>
    </>
  )
}

function ModuleBody({ mod, tab }: { mod: DevModule; tab: Tab }) {
  if (tab === 'overview') {
    return (
      <>
        <Section title="Overview">
          {mod.overview.map((p) => <p key={p} className="mb-2 text-ink-700">{stripMd(p)}</p>)}
        </Section>
        <Section title="Start here">
          <ul className="space-y-1 text-xs text-ink-600">
            {mod.files.map((f) => <li key={f} className="font-mono">{f}</li>)}
          </ul>
        </Section>
        <Section title="Open questions">
          <ul className="space-y-1.5 text-ink-700">{mod.openQuestions.map((q) => <li key={q}>• {q}</li>)}</ul>
        </Section>
      </>
    )
  }

  if (tab === 'rules') {
    return (
      <div className="space-y-3">
        {mod.rules.map((r) => (
          <div key={r.rule} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-1.5">
              <Badge tone={fidelityTone[r.fidelity]}>{FIDELITY_LABEL[r.fidelity]}</Badge>
            </div>
            <p className="text-ink-800">{stripMd(r.rule)}</p>
            {r.example && <p className="mt-1.5 rounded-lg bg-slate-50 p-2 text-xs text-ink-600"><span className="font-semibold">Example:</span> {stripMd(r.example)}</p>}
            {r.source && <p className="mt-1.5 font-mono text-[11px] text-ink-400">{r.source}</p>}
          </div>
        ))}
      </div>
    )
  }

  if (tab === 'fields') {
    return (
      <div className="space-y-2">
        {mod.fields.map((f) => (
          <div key={f.field} className="rounded-xl border border-slate-200 p-3">
            <p className="font-mono text-xs font-semibold text-ink-900">{f.field}</p>
            <p className="mt-0.5 font-mono text-[11px] text-ink-500">{f.type}</p>
            <p className="mt-1.5 text-xs text-ink-600"><span className="font-semibold">Source:</span> {f.source}</p>
            {f.note && <p className="mt-1 text-xs text-ink-600">{stripMd(f.note)}</p>}
          </div>
        ))}
      </div>
    )
  }

  if (tab === 'edge') {
    return <ul className="space-y-2 text-ink-700">{mod.edgeCases.map((e) => <li key={e}>• {stripMd(e)}</li>)}</ul>
  }

  if (tab === 'integrations') {
    return (
      <div className="space-y-2">
        {mod.integrations.map((i) => (
          <div key={i.name} className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold text-ink-900">{i.name}</p>
            <p className="mt-1 text-xs text-ink-600">{i.note}</p>
          </div>
        ))}
        <p className="pt-1 text-[11px] text-ink-400">
          Every integration in this console is a placeholder. None of them make a network call.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {mod.permissions.map((p) => (
        <div key={p.action} className="rounded-xl border border-slate-200 p-3">
          <p className="text-ink-800">{p.action}</p>
          {p.capability && <p className="mt-1 font-mono text-[11px] text-brand-700">{p.capability}</p>}
          {p.note && <p className="mt-1 text-xs text-ink-500">{p.note}</p>}
        </div>
      ))}
    </div>
  )
}

/**
 * The notes carry light markdown emphasis for the generated document. The panel
 * renders plain text, so the markers are stripped rather than shipping a
 * markdown parser for four asterisks.
 */
function stripMd(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').replace(/\*(.+?)\*/g, '$1')
}
