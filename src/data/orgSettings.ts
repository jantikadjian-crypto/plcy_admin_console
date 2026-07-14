/**
 * Org-wide General & Branding settings behind Settings → General / Branding.
 * Persisted to localStorage so edits survive a reload, like the security
 * policy and RBAC access map.
 */
export interface OrgSettings {
  orgName: string
  supportEmail: string
  defaultRegion: string
  defaultPlan: string
  accentColor: string
  tagline: string
}

export const defaultOrgSettings: OrgSettings = {
  orgName: 'PLCY, Inc.',
  supportEmail: 'support@plcy.app',
  defaultRegion: 'US-East',
  defaultPlan: 'Business',
  accentColor: '#1f47f5',
  tagline: 'Govern every model. Enforce every policy.',
}

const STORAGE_KEY = 'plcy_org_settings'

export function loadOrgSettings(): OrgSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultOrgSettings }
    return { ...defaultOrgSettings, ...(JSON.parse(raw) as Partial<OrgSettings>) }
  } catch {
    return { ...defaultOrgSettings }
  }
}

export function saveOrgSettings(s: OrgSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}
