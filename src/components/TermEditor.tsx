import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui'
import { GLOSSARY_GROUPS } from '@/data/glossary'
import type { GlossaryGroup } from '@/data/glossary'
import { newTermId, isCustomTerm } from '@/data/glossaryStore'
import type { StoredTerm } from '@/data/glossaryStore'

/** Add / edit a glossary term. Seed terms can be edited but not deleted. */
export function TermEditor({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  initial?: StoredTerm
  onClose: () => void
  onSave: (term: StoredTerm, isNew: boolean) => void
  onDelete?: (id: string) => void
}) {
  const isNew = !initial
  const [term, setTerm] = useState(initial?.term ?? '')
  const [full, setFull] = useState(initial?.full ?? '')
  const [group, setGroup] = useState<GlossaryGroup>(initial?.group ?? 'Platform & Architecture')
  const [def, setDef] = useState(initial?.def ?? '')
  const [where, setWhere] = useState(initial?.where ?? '')
  const [see, setSee] = useState((initial?.see ?? []).join(', '))

  const canSave = term.trim().length > 0 && def.trim().length > 0

  const save = () => {
    if (!canSave) return
    onSave(
      {
        id: initial?.id ?? newTermId(),
        term: term.trim(),
        full: full.trim() || undefined,
        group,
        def: def.trim(),
        where: where.trim() || undefined,
        see: see.split(',').map((s) => s.trim()).filter(Boolean),
      },
      isNew,
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'Add glossary term' : 'Edit term'}
      subtitle={isNew ? 'Define a term, acronym, or concept for the help center.' : `Editing “${initial?.term}”`}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div>
            {!isNew && onDelete && initial && isCustomTerm(initial.id) && (
              <button onClick={() => onDelete(initial.id)} className="btn-ghost text-rose-600 hover:bg-rose-50" title="Delete this term">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={!canSave} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {isNew ? 'Add term' : 'Save changes'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Term / acronym</span>
            <input className="input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. RAG" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Expansion <span className="font-normal text-ink-400">— optional</span></span>
            <input className="input" value={full} onChange={(e) => setFull(e.target.value)} placeholder="e.g. Retrieval-Augmented Generation" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Group</span>
          <select className="input" value={group} onChange={(e) => setGroup(e.target.value as GlossaryGroup)}>
            {GLOSSARY_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>{g.key}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Definition</span>
          <textarea className="input min-h-[100px] font-normal" value={def} onChange={(e) => setDef(e.target.value)} placeholder="Plain-language definition." />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Where it appears <span className="font-normal text-ink-400">— optional</span></span>
          <input className="input" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="e.g. Fleet Posture; Provisioning." />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">See also <span className="font-normal text-ink-400">— comma-separated related terms</span></span>
          <input className="input" value={see} onChange={(e) => setSee(e.target.value)} placeholder="Data plane, Data classification" />
        </label>
      </div>
    </Modal>
  )
}
