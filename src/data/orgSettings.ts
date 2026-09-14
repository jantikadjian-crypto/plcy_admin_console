/**
 * Org-wide settings behind Settings → General.
 *
 * Persisted to localStorage and exposed as a tiny observable so edits show up
 * live (the sidebar reads `logo` and `orgName` via useSyncExternalStore).
 *
 * `accentColor` and `logo` have no editor: the Branding tab that set them was
 * removed. Both are still read — the sidebar renders a stored logo and the
 * shell applies a stored accent — so any value saved before the tab went away
 * still applies. Delete the fields too if that behaviour isn't wanted.
 */
import { useSyncExternalStore } from 'react'

export interface OrgSettings {
  orgName: string
  supportEmail: string
  defaultRegion: string
  defaultPlan: string
  accentColor: string
  /** Uploaded logo as a data URL (PNG/SVG/JPEG); empty falls back to the default mark. */
  logo?: string
}

export const defaultOrgSettings: OrgSettings = {
  orgName: 'PLCY, Inc.',
  supportEmail: 'support@plcy.app',
  defaultRegion: 'US-East',
  defaultPlan: 'Business',
  accentColor: '#1f47f5',
  logo: '',
}

const STORAGE_KEY = 'plcy_org_settings'

function read(): OrgSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultOrgSettings }
    return { ...defaultOrgSettings, ...(JSON.parse(raw) as Partial<OrgSettings>) }
  } catch {
    return { ...defaultOrgSettings }
  }
}

let state: OrgSettings = read()
const listeners = new Set<() => void>()

/** A snapshot copy — safe to edit locally without mutating the store. */
export function loadOrgSettings(): OrgSettings {
  return { ...state }
}

export function saveOrgSettings(s: OrgSettings) {
  state = { ...s }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore (e.g. quota exceeded from a large logo) */
  }
  listeners.forEach((l) => l())
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** React binding — re-renders on any saved change (used by the sidebar brand mark). */
export function useOrgSettings(): OrgSettings {
  return useSyncExternalStore(subscribe, () => state, () => state)
}
