import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Search,
  Book,
  Cpu,
  Sparkles,
  Shield,
  ChevronRight,
  Clock,
  Hash,
  ArrowLeft,
  BookText,
  Library,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, PageHeader, Badge } from '@/components/ui'
import type { Tone } from '@/components/ui'
import { Diagram } from '@/components/diagrams'
import {
  docs,
  DOC_CATEGORIES,
  docBySlug,
  docSearchText,
} from '@/data/docs'
import type { DocArticle, DocCategory } from '@/data/docs'
import {
  glossary,
  glossaryById,
  GLOSSARY_GROUPS,
  glossaryId,
  glossarySearchText,
} from '@/data/glossary'
import type { GlossaryGroup, GlossaryTerm } from '@/data/glossary'

const CAT_ICON: Record<'book' | 'cpu' | 'sparkles' | 'shield', LucideIcon> = {
  book: Book,
  cpu: Cpu,
  sparkles: Sparkles,
  shield: Shield,
}
const CAT_TONE: Record<DocCategory, Tone> = {
  'System Usage': 'blue',
  Technical: 'purple',
  Features: 'green',
  Policies: 'orange',
}
const catMeta = (cat: DocCategory) => DOC_CATEGORIES.find((c) => c.key === cat)!

type CatFilter = DocCategory | 'All'

export default function Docs() {
  const { slug } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const glossaryMode = pathname.endsWith('/docs/glossary')

  return (
    <>
      <PageHeader
        title="Documentation"
        description="Help center for the PLCY team and users — how to operate the console, how the platform is built, what each feature does, and the policies behind it. Browse the guides, or look up any term in the glossary."
        actions={
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            <button
              onClick={() => navigate('/docs')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${!glossaryMode ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
            >
              <BookText className="h-4 w-4" /> Guides
            </button>
            <button
              onClick={() => navigate('/docs/glossary')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${glossaryMode ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
            >
              <Library className="h-4 w-4" /> Glossary
            </button>
          </div>
        }
      />

      {glossaryMode ? <GlossaryView /> : <Guides slug={slug} />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Guides (articles)                                                   */
/* ------------------------------------------------------------------ */
function Guides({ slug }: { slug?: string }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<CatFilter>('All')

  const query = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (cat !== 'All' && d.category !== cat) return false
      if (query && !docSearchText(d).includes(query)) return false
      return true
    })
  }, [cat, query])

  const active = slug ? docBySlug(slug) : undefined

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* Left rail — search + category filter + article list */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search guides…"
            aria-label="Search documentation"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {(['All', ...DOC_CATEGORIES.map((c) => c.key)] as CatFilter[]).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                cat === c ? 'bg-brand-600 text-white' : 'bg-slate-100 text-ink-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <Card padded={false} className="overflow-hidden">
          <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
            {filtered.map((d) => {
              const Icon = CAT_ICON[catMeta(d.category).icon]
              const isActive = d.slug === slug
              return (
                <li key={d.id}>
                  <button
                    onClick={() => navigate(`/docs/${d.slug}`)}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-brand-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-ink-500'}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-medium ${isActive ? 'text-brand-700' : 'text-ink-900'}`}>{d.title}</span>
                      <span className="block truncate text-xs text-ink-500">{d.category}</span>
                    </span>
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink-400">No guides match “{q}”.</li>
            )}
          </ul>
        </Card>
      </div>

      {/* Right pane — article or landing */}
      <div className="min-w-0">
        {active ? <Article doc={active} onBack={() => navigate('/docs')} /> : <Landing onOpen={(s) => navigate(`/docs/${s}`)} />}
      </div>
    </div>
  )
}

function Landing({ onOpen }: { onOpen: (slug: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {DOC_CATEGORIES.map((c) => {
        const Icon = CAT_ICON[c.icon]
        const list = docs.filter((d) => d.category === c.key)
        return (
          <Card key={c.key}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${CAT_SWATCH[c.tone]}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-ink-900">{c.key}</h3>
                <p className="text-xs text-ink-500">{c.blurb}</p>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {list.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => onOpen(d.slug)}
                    className="flex w-full items-center gap-2 py-2 text-left text-sm text-ink-700 transition-colors hover:text-brand-700"
                  >
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-300" />
                    <span className="flex-1 truncate">{d.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}

function Article({ doc, onBack }: { doc: DocArticle; onBack: () => void }) {
  const Icon = CAT_ICON[catMeta(doc.category).icon]
  return (
    <Card>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-ink-800">
        <ArrowLeft className="h-3.5 w-3.5" /> All documentation
      </button>

      <div className="mb-4 flex items-center gap-2">
        <Badge tone={CAT_TONE[doc.category]}>
          <Icon className="mr-1 h-3 w-3" />
          {doc.category}
        </Badge>
        <span className="inline-flex items-center gap-1 text-xs text-ink-400">
          <Clock className="h-3 w-3" /> Updated {doc.updated}
        </span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-ink-900">{doc.title}</h1>
      <p className="mt-1.5 text-sm text-ink-600">{doc.summary}</p>

      <div className="mt-6 space-y-6">
        {doc.sections.map((s, i) => (
          <section key={i}>
            {s.heading && <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-400">{s.heading}</h2>}
            {s.diagram && <Diagram kind={s.diagram} />}
            {s.paras?.map((p, j) => (
              <p key={j} className="mb-2 text-sm leading-relaxed text-ink-700">{p}</p>
            ))}
            {s.bullets && (
              <ul className="mt-1 space-y-1.5">
                {s.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm leading-relaxed text-ink-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {doc.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-4">
          <Hash className="h-3.5 w-3.5 text-ink-300" />
          {doc.tags.map((t) => (
            <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-ink-500">{t}</span>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Glossary                                                            */
/* ------------------------------------------------------------------ */
type GroupFilter = GlossaryGroup | 'All'

function GlossaryView() {
  const [params] = useSearchParams()
  const deepLinked = params.get('term') ?? ''
  const [q, setQ] = useState(deepLinked)
  const [group, setGroup] = useState<GroupFilter>('All')

  // A ⌘K deep-link (?term=…) navigates here while this view may already be
  // mounted, so sync the search box whenever the term param changes.
  useEffect(() => {
    const t = deepLinked ? glossaryById(deepLinked) : undefined
    if (t) {
      setQ(t.term)
      setGroup('All')
    }
  }, [deepLinked])

  const query = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    return glossary.filter((t) => {
      if (group !== 'All' && t.group !== group) return false
      if (query && !glossarySearchText(t).includes(query)) return false
      return true
    })
  }, [group, query])

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Look up a term or acronym — SCIM, BYOK, DSAR, drift…"
            aria-label="Search glossary"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <p className="shrink-0 text-xs text-ink-400">{filtered.length} of {glossary.length} terms</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {(['All', ...GLOSSARY_GROUPS.map((g) => g.key)] as GroupFilter[]).map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              group === g ? 'bg-brand-600 text-white' : 'bg-slate-100 text-ink-600 hover:bg-slate-200'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-ink-400">No terms match “{q}”.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TermCard key={t.term} t={t} highlight={glossaryId(t.term) === deepLinked} onSee={(name) => setQ(name)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TermCard({ t, highlight, onSee }: { t: GlossaryTerm; highlight: boolean; onSee: (term: string) => void }) {
  const tone = GLOSSARY_GROUPS.find((g) => g.key === t.group)?.tone ?? 'slate'
  return (
    <div
      id={glossaryId(t.term)}
      className={`flex flex-col rounded-xl border bg-white p-4 transition-shadow ${highlight ? 'border-brand-400 ring-2 ring-brand-200' : 'border-slate-200'}`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-900">{t.term}</h3>
          {t.full && <p className="text-xs text-ink-400">{t.full}</p>}
        </div>
        <Badge tone={tone}>{t.group.split(' ')[0]}</Badge>
      </div>
      <p className="text-sm leading-relaxed text-ink-700">{t.def}</p>
      {t.where && (
        <p className="mt-2 text-xs text-ink-500">
          <span className="font-medium text-ink-600">Where:</span> {t.where}
        </p>
      )}
      {t.see && t.see.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-ink-400">
          <span>See also:</span>
          {t.see.map((s) => (
            <button key={s} onClick={() => onSee(s)} className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-brand-600 transition-colors hover:bg-slate-200">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* Full class strings so Tailwind keeps them; category tone → swatch. */
const CAT_SWATCH: Record<'blue' | 'purple' | 'green' | 'orange', string> = {
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-violet-50 text-violet-600',
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-orange-50 text-orange-600',
}
