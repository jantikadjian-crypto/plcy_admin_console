/**
 * Shared source of truth for each registry image's *promoted* tag.
 *
 * The Container Registry page promotes/rolls back tags here; the cluster views
 * read from the same store to decide whether what a tenant actually runs matches
 * what has been promoted for rollout. Promoting a tag in Registry therefore
 * immediately re-computes image drift across every cluster.
 *
 * Backed by localStorage and exposed as a tiny observable so both pages stay in
 * sync within a session via useSyncExternalStore.
 */
import { useSyncExternalStore } from 'react'
import { registryImages } from './registry'

const KEY = 'plcy.registry.promoted.v1'

/** imageId -> promoted tag */
export type PromotedMap = Record<string, string>

function seed(): PromotedMap {
  const m: PromotedMap = {}
  for (const im of registryImages) m[im.id] = im.currentTag
  return m
}

function load(): PromotedMap {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...seed(), ...(JSON.parse(raw) as PromotedMap) }
  } catch {
    /* ignore malformed / unavailable storage */
  }
  return seed()
}

let state: PromotedMap = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

const getSnapshot = () => state

export function promotedTag(imageId: string): string {
  return state[imageId] ?? registryImages.find((i) => i.id === imageId)?.currentTag ?? ''
}

export function setPromotedTag(imageId: string, tag: string) {
  if (state[imageId] === tag) return
  state = { ...state, [imageId]: tag }
  persist()
  listeners.forEach((l) => l())
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** React binding — re-renders the caller whenever any promoted tag changes. */
export function useRegistryPromoted(): PromotedMap {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
