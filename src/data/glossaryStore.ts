/**
 * Editable, persisted store for glossary terms — mirrors docsStore. Seeds from
 * the static glossary, assigns each term a stable id (so same-named acronyms
 * like the two "RAG" entries coexist), and lets the glossary page add / edit /
 * remove terms. Backed by localStorage and exposed via useSyncExternalStore so
 * the page and ⌘K search stay in sync. Seed terms can be edited but not
 * deleted; user-created terms carry the CUSTOM_PREFIX.
 */
import { useSyncExternalStore } from 'react'
import { glossary as seedGlossary, glossaryId } from './glossary'
import type { GlossaryTerm } from './glossary'

export type StoredTerm = GlossaryTerm & { id: string }

const KEY = 'plcy.glossary.v1'
export const CUSTOM_PREFIX = 'gterm_'

/** Seed terms with deterministic, collision-safe ids (gt_<slug>, gt_<slug>-2…). */
function seedTerms(): StoredTerm[] {
  const used = new Set<string>()
  return seedGlossary.map((t) => {
    const base = `gt_${glossaryId(t.term)}`
    let id = base
    let n = 2
    while (used.has(id)) id = `${base}-${n++}`
    used.add(id)
    return { ...t, id }
  })
}

function mergeSeeds(stored: StoredTerm[]): StoredTerm[] {
  const ids = new Set(stored.map((t) => t.id))
  const extra = seedTerms().filter((t) => !ids.has(t.id))
  return [...stored, ...extra]
}

function read(): StoredTerm[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return mergeSeeds(JSON.parse(raw) as StoredTerm[])
  } catch {
    /* ignore malformed / unavailable storage */
  }
  return seedTerms()
}

let state: StoredTerm[] = read()
const listeners = new Set<() => void>()

const getSnapshot = () => state

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function upsertTerm(term: StoredTerm) {
  const i = state.findIndex((t) => t.id === term.id)
  if (i === -1) state = [...state, term]
  else state = state.map((t) => (t.id === term.id ? term : t))
  emit()
}

export function deleteTerm(id: string) {
  if (!id.startsWith(CUSTOM_PREFIX)) return // seeds are protected
  state = state.filter((t) => t.id !== id)
  emit()
}

export const isCustomTerm = (id: string) => id.startsWith(CUSTOM_PREFIX)
export const termById = (id: string): StoredTerm | undefined => state.find((t) => t.id === id)
export function newTermId(): string {
  return `${CUSTOM_PREFIX}${Date.now().toString(36)}`
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useGlossary(): StoredTerm[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
