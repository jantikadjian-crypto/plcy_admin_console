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

/**
 * The PLCY platform ships as one chart driven by the policy-engine image, so its
 * promoted tag is the version the whole fleet rolls out to.
 */
export const PLATFORM_IMAGE_ID = 'img_policy_engine'

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

/** The version the fleet rolls out to — the promoted tag of the platform image. */
export function platformPromotedTag(promoted: PromotedMap): string {
  return promoted[PLATFORM_IMAGE_ID] ?? promotedTag(PLATFORM_IMAGE_ID)
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
