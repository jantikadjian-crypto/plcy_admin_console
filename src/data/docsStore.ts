/**
 * Editable, persisted store for documentation articles. Seeds from the static
 * `docs` catalog and lets the Documentation page add / edit / remove articles.
 * Backed by localStorage and exposed as a tiny observable so the docs page and
 * the ⌘K search stay in sync within a session (useSyncExternalStore).
 *
 * Seed articles can be edited but not deleted (a code update can add more, and
 * they merge back in); user-created articles carry the CUSTOM_PREFIX and can be
 * removed.
 */
import { useSyncExternalStore } from 'react'
import { docs as seedDocs } from './docs'
import type { DocArticle } from './docs'

const KEY = 'plcy.docs.v1'
export const CUSTOM_PREFIX = 'doc_custom_'

/** Merge stored articles with any seed articles they don't already contain. */
function mergeSeeds(stored: DocArticle[]): DocArticle[] {
  const ids = new Set(stored.map((d) => d.id))
  const extra = seedDocs.filter((d) => !ids.has(d.id))
  return [...stored, ...extra]
}

function load(): DocArticle[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return mergeSeeds(JSON.parse(raw) as DocArticle[])
  } catch {
    /* ignore malformed / unavailable storage */
  }
  return [...seedDocs]
}

let state: DocArticle[] = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

const getSnapshot = () => state

function emit() {
  persist()
  listeners.forEach((l) => l())
}

/** Insert a new article or replace an existing one (matched by id). */
export function upsertDoc(article: DocArticle) {
  const i = state.findIndex((d) => d.id === article.id)
  if (i === -1) state = [...state, article]
  else state = state.map((d) => (d.id === article.id ? article : d))
  emit()
}

/** Remove a user-created article (seeds are protected). */
export function deleteDoc(id: string) {
  if (!id.startsWith(CUSTOM_PREFIX)) return
  state = state.filter((d) => d.id !== id)
  emit()
}

export const isCustomDoc = (id: string) => id.startsWith(CUSTOM_PREFIX)

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** React binding — re-renders the caller whenever the doc set changes. */
export function useDocs(): DocArticle[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function newDocId(): string {
  return `${CUSTOM_PREFIX}${Date.now().toString(36)}`
}

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** A slug derived from the title, made unique against the current set. */
export function uniqueSlug(title: string, ignoreId?: string): string {
  const base = slugify(title) || 'untitled'
  const taken = new Set(state.filter((d) => d.id !== ignoreId).map((d) => d.slug))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
