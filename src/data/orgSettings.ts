/**
 * Org-wide General & Branding settings behind Settings → General / Branding.
 * Persisted to localStorage and exposed as a tiny observable so branding edits
 * (e.g. an uploaded logo) show up live in the sidebar via useSyncExternalStore.
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
