import { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Check, X, Clock, Hash } from 'lucide-react'
import { Card, Badge } from '@/components/ui'
import { Diagram } from '@/components/diagrams'
import { DOC_CATEGORIES, docType } from '@/data/docs'
import type { DocArticle, DocCategory, DocSection } from '@/data/docs'
import { newDocId, uniqueSlug, isCustomDoc } from '@/data/docsStore'

/**
 * In-place article editor. Renders inside the article pane and mirrors the
 * article layout so content is edited live, in context — title, summary,
 * content sections, and tags are all editable. Diagram sections render as the
 * real figure and are preserved read-only (authored in code).
 */
type Style = 'paras' | 'bullets' | 'steps' | 'diagram'
interface EditSection {
  key: string
  heading: string
  style: Style
  text: string
  diagram?: 'network' | 'architecture'
}

let uid = 0
const nextKey = () => String(++uid)

const STYLE_LABEL: Record<Exclude<Style, 'diagram'>, string> = {
  paras: 'Paragraphs',
  bullets: 'Bullet list',
  steps: 'Numbered steps',
}
const STYLE_HINT: Record<Exclude<Style, 'diagram'>, string> = {
  paras: 'One paragraph per line.',
  bullets: 'One bullet per line.',
  steps: 'One step per line — numbered automatically.',
}

function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function toEdit(sections: DocSection[]): EditSection[] {
  return sections.map((s) => {
    if (s.diagram) return { key: nextKey(), heading: s.heading ?? '', style: 'diagram', text: '', diagram: s.diagram }
    if (s.steps) return { key: nextKey(), heading: s.heading ?? '', style: 'steps', text: s.steps.join('\n') }
    if (s.bullets) return { key: nextKey(), heading: s.heading ?? '', style: 'bullets', text: s.bullets.join('\n') }
    return { key: nextKey(), heading: s.heading ?? '', style: 'paras', text: (s.paras ?? []).join('\n') }
  })
}

function toSection(e: EditSection): DocSection {
  const heading = e.heading.trim() || undefined
  if (e.style === 'diagram') return { heading, diagram: e.diagram }
  const lines = e.text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (e.style === 'bullets') return { heading, bullets: lines }
  if (e.style === 'steps') return { heading, steps: lines }
  return { heading, paras: lines }
}

export function ArticleEditor({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: DocArticle
  onSave: (article: DocArticle, isNew: boolean) => void
  onCancel: () => void
  onDelete?: (id: string) => void
}) {
  const isNew = !initial
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<DocCategory>(initial?.category ?? 'How-to')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))
  const [sections, setSections] = useState<EditSection[]>(
    initial ? toEdit(initial.sections) : [{ key: nextKey(), heading: '', style: 'paras', text: '' }],
  )

  const canSave = title.trim().length > 0
  const previewType = docType({ id: '', slug: '', title, category, summary, tags: [], updated: '', sections: sections.map(toSection) })

  const setSec = (key: string, patch: Partial<EditSection>) => setSections((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  const addSec = () => setSections((s) => [...s, { key: nextKey(), heading: '', style: 'paras', text: '' }])
  const removeSec = (key: string) => setSections((s) => s.filter((x) => x.key !== key))
  const move = (key: string, dir: -1 | 1) =>
    setSections((s) => {
      const i = s.findIndex((x) => x.key === key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= s.length) return s
      const copy = [...s]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })

  const save = () => {
    if (!canSave) return
    onSave(
      {
        id: initial?.id ?? newDocId(),
        slug: initial?.slug ?? uniqueSlug(title, initial?.id),
        title: title.trim(),
        category,
        summary: summary.trim(),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        updated: today(),
        sections: sections.map(toSection).filter((s) => s.diagram || s.paras?.length || s.bullets?.length || s.steps?.length),
      },
      isNew,
    )
  }

  return (
    <Card>
      {/* Action bar */}
      <div className="sticky top-16 z-10 -mx-6 -mt-6 mb-5 flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
            {isNew ? 'New article' : 'Editing'}
          </span>
          <span className="hidden text-xs text-ink-400 sm:inline">Changes are saved to your browser</span>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && onDelete && initial && isCustomDoc(initial.id) && (
            <button onClick={() => onDelete(initial.id)} className="btn-ghost text-rose-600 hover:bg-rose-50" title="Delete this article">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
          <button onClick={onCancel} className="btn-secondary"><X className="h-4 w-4" /> Cancel</button>
          <button onClick={save} disabled={!canSave} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
            <Check className="h-4 w-4" /> {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      {/* Meta row — category, type, updated */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          className="input h-8 w-auto py-0 text-xs font-medium"
          value={category}
          onChange={(e) => setCategory(e.target.value as DocCategory)}
          aria-label="Category"
        >
          {DOC_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.key}</option>
          ))}
        </select>
        <Badge tone="slate">{previewType}</Badge>
        <span className="inline-flex items-center gap-1 text-xs text-ink-400"><Clock className="h-3 w-3" /> Updated {today()}</span>
      </div>

      {/* Title */}
      <input
        className="w-full rounded-lg border border-transparent bg-transparent text-2xl font-bold tracking-tight text-ink-900 outline-none transition-colors placeholder:text-ink-300 hover:bg-slate-50 focus:border-brand-300 focus:bg-white focus:px-2"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Article title"
        aria-label="Title"
      />

      {/* Summary */}
      <input
        className="mt-1.5 w-full rounded-lg border border-transparent bg-transparent text-sm text-ink-600 outline-none transition-colors placeholder:text-ink-300 hover:bg-slate-50 focus:border-brand-300 focus:bg-white focus:px-2"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="One-line summary shown in lists and search"
        aria-label="Summary"
      />

      {/* Sections */}
      <div className="mt-6 space-y-3">
        {sections.map((s, i) => (
          <div key={s.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                className="input h-8 flex-1 py-0 text-xs font-semibold uppercase tracking-wide"
                value={s.heading}
                onChange={(e) => setSec(s.key, { heading: e.target.value })}
                placeholder="Section heading (optional)"
              />
              {s.style !== 'diagram' && (
                <select className="input h-8 w-40 shrink-0 py-0 text-xs" value={s.style} onChange={(e) => setSec(s.key, { style: e.target.value as Style })}>
                  {(['paras', 'bullets', 'steps'] as const).map((st) => (
                    <option key={st} value={st}>{STYLE_LABEL[st]}</option>
                  ))}
                </select>
              )}
              <div className="flex shrink-0 items-center">
                <button onClick={() => move(s.key, -1)} disabled={i === 0} className="rounded p-1 text-ink-400 hover:bg-slate-200 disabled:opacity-30" title="Move up"><ArrowUp className="h-4 w-4" /></button>
                <button onClick={() => move(s.key, 1)} disabled={i === sections.length - 1} className="rounded p-1 text-ink-400 hover:bg-slate-200 disabled:opacity-30" title="Move down"><ArrowDown className="h-4 w-4" /></button>
                <button onClick={() => removeSec(s.key)} className="rounded p-1 text-rose-500 hover:bg-rose-50" title="Remove section"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {s.style === 'diagram' && s.diagram ? (
              <div>
                <Diagram kind={s.diagram} />
                <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-400"><ImageIcon className="h-3.5 w-3.5 text-violet-500" /> Figure kept as-is (authored in code).</p>
              </div>
            ) : (
              <>
                <textarea
                  className="input min-h-[96px] font-normal"
                  value={s.text}
                  onChange={(e) => setSec(s.key, { text: e.target.value })}
                  placeholder={STYLE_HINT[s.style as Exclude<Style, 'diagram'>]}
                />
                <p className="mt-1 text-[11px] text-ink-400">{STYLE_HINT[s.style as Exclude<Style, 'diagram'>]}</p>
              </>
            )}
          </div>
        ))}
        <button onClick={addSec} className="btn-ghost w-full justify-center border border-dashed border-slate-300 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add section</button>
      </div>

      {/* Tags */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <label className="flex items-center gap-2 text-xs">
          <Hash className="h-3.5 w-3.5 shrink-0 text-ink-300" />
          <input
            className="input h-8 flex-1 py-0"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags — comma separated, for search"
            aria-label="Tags"
          />
        </label>
      </div>
    </Card>
  )
}
