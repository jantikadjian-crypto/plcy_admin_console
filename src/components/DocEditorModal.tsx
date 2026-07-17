import { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react'
import { Modal } from '@/components/ui'
import { DOC_CATEGORIES, docType } from '@/data/docs'
import type { DocArticle, DocCategory, DocSection } from '@/data/docs'
import { newDocId, uniqueSlug, isCustomDoc } from '@/data/docsStore'

/* Local, editable representation of a section. Diagram sections are preserved
   read-only (they render a figure and can't be authored from a form). */
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

export function DocEditorModal({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  initial?: DocArticle
  onClose: () => void
  onSave: (article: DocArticle, isNew: boolean) => void
  onDelete?: (id: string) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<DocCategory>(initial?.category ?? 'How-to')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))
  const [sections, setSections] = useState<EditSection[]>(
    initial ? toEdit(initial.sections) : [{ key: nextKey(), heading: '', style: 'paras', text: '' }],
  )

  const isNew = !initial
  const canSave = title.trim().length > 0

  const setSec = (key: string, patch: Partial<EditSection>) =>
    setSections((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)))
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
    const article: DocArticle = {
      id: initial?.id ?? newDocId(),
      slug: initial?.slug ?? uniqueSlug(title, initial?.id),
      title: title.trim(),
      category,
      summary: summary.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      updated: today(),
      sections: sections.map(toSection).filter((s) => s.diagram || s.paras?.length || s.bullets?.length || s.steps?.length),
    }
    onSave(article, isNew)
  }

  // Preview the resulting type from the draft.
  const previewType = docType({
    id: '', slug: '', title, category, summary, tags: [], updated: '',
    sections: sections.map(toSection),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'Add documentation' : 'Edit documentation'}
      subtitle={isNew ? 'Create a new article for the help center.' : `Editing “${initial?.title}”`}
      headerRight={<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-ink-500">{previewType}</span>}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div>
            {!isNew && onDelete && initial && isCustomDoc(initial.id) && (
              <button
                onClick={() => onDelete(initial.id)}
                className="btn-ghost text-rose-600 hover:bg-rose-50"
                title="Delete this article"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={!canSave} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {isNew ? 'Create article' : 'Save changes'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-ink-600">Title</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Configure SSO with Okta" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Category</span>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as DocCategory)}>
              {DOC_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.key}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Summary</span>
          <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One-line description shown in lists and search." />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Tags <span className="font-normal text-ink-400">— comma separated, for search</span></span>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="sso, okta, authentication" />
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-600">Content sections</span>
            <button onClick={addSec} className="btn-ghost px-2 py-1 text-xs"><Plus className="h-3.5 w-3.5" /> Add section</button>
          </div>
          <div className="space-y-3">
            {sections.map((s, i) => (
              <div key={s.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    className="input flex-1"
                    value={s.heading}
                    onChange={(e) => setSec(s.key, { heading: e.target.value })}
                    placeholder="Section heading (optional)"
                  />
                  {s.style !== 'diagram' && (
                    <select className="input w-40 shrink-0" value={s.style} onChange={(e) => setSec(s.key, { style: e.target.value as Style })}>
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
                {s.style === 'diagram' ? (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-ink-500">
                    <ImageIcon className="h-4 w-4 text-violet-500" />
                    Rendered figure — <span className="font-medium">{s.diagram}</span> diagram (kept as-is; edit in code).
                  </div>
                ) : (
                  <>
                    <textarea
                      className="input min-h-[90px] font-normal"
                      value={s.text}
                      onChange={(e) => setSec(s.key, { text: e.target.value })}
                      placeholder={STYLE_HINT[s.style]}
                    />
                    <p className="mt-1 text-[11px] text-ink-400">{STYLE_HINT[s.style]}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
