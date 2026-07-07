/**
 * Shared role & access-control definitions.
 * Used by Settings → Roles & Permissions (edit + persist), Admin Security
 * (each admin's role), and the sidebar profile (current user's role).
 *
 * Edits are persisted to localStorage so they survive reloads. Icons are
 * referenced by a serializable key (a lucide component can't be stored).
 */
import { Crown, UserCog, ShieldCheck, FlaskConical, Eye, KeyRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type RoleTone = 'purple' | 'blue' | 'green' | 'orange' | 'slate'

/** Serializable icon registry — keys are safe to persist to storage. */
export const ICONS = {
  crown: Crown,
  'user-cog': UserCog,
  shield: ShieldCheck,
  flask: FlaskConical,
  eye: Eye,
  key: KeyRound,
} as const
export type IconKey = keyof typeof ICONS
export const iconFor = (key: string): LucideIcon => ICONS[key as IconKey] ?? KeyRound

/** The seven baseline capabilities every role is measured against. */
export const BASE_CAPS = [
  'User Enrollment',
  'Define Admin Accounts',
  'Full Read/Write',
  'Policy Management',
  'Model Deployment',
  'Access All Clients',
  'Modify Settings',
] as const

export interface RoleDef {
  id: string
  name: string
  desc: string
  iconKey: IconKey
  tone: RoleTone
  /** Grant state for each of the seven BASE_CAPS, in order. */
  baseFlags: boolean[]
  /** Role-specific capabilities, always granted. */
  extra: string[]
}

export const roleDefs: RoleDef[] = [
  { id: 'superuser', name: 'Superuser', desc: 'Complete system control and multi-tenant administration', iconKey: 'crown', tone: 'purple', baseFlags: [true, true, true, true, true, true, true], extra: [] },
  { id: 'platform-admin', name: 'Platform Admin', desc: 'Initial onboarding and infrastructure updates', iconKey: 'user-cog', tone: 'blue', baseFlags: [true, false, true, true, true, false, true], extra: [] },
  { id: 'compliance-officer', name: 'Compliance Officer', desc: 'Regulatory reporting and drift monitoring', iconKey: 'shield', tone: 'green', baseFlags: [false, false, false, false, false, false, false], extra: ['Audit Logs', 'Policy Review', 'Factsheets'] },
  { id: 'model-validator', name: 'Model Validator', desc: 'Verifying model safety before client rollout', iconKey: 'flask', tone: 'orange', baseFlags: [false, false, false, false, false, false, false], extra: ['Sandbox Access', 'Testing', 'Bias Evaluation'] },
  { id: 'read-only', name: 'Read Only', desc: 'View-only access to dashboards, reports, and audit trails', iconKey: 'eye', tone: 'slate', baseFlags: [false, false, false, false, false, false, false], extra: ['View Dashboards', 'View Reports'] },
]

export const roleIconTone: Record<RoleTone, string> = {
  purple: 'bg-violet-50 text-violet-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-orange-50 text-orange-600',
  slate: 'bg-slate-100 text-slate-500',
}

/* ------------------------------------------------------------------ */
/* Editable / persisted role shape                                     */
/* ------------------------------------------------------------------ */
export interface Cap {
  label: string
  granted: boolean
}
export interface StoredRole {
  id: string
  name: string
  desc: string
  iconKey: string
  tone: RoleTone
  caps: Cap[]
}

/** Flatten the static defs into the editable/persisted shape. */
export function buildStoredFromDefs(): StoredRole[] {
  return roleDefs.map((r) => ({
    id: r.id,
    name: r.name,
    desc: r.desc,
    iconKey: r.iconKey,
    tone: r.tone,
    caps: [
      ...BASE_CAPS.map((label, i) => ({ label, granted: r.baseFlags[i] })),
      ...r.extra.map((label) => ({ label, granted: true })),
    ],
  }))
}

const STORAGE_KEY = 'plcy.rbac.roles.v1'

/** Load persisted roles, or null if none / storage unavailable. */
export function loadRoles(): StoredRole[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? (parsed as StoredRole[]) : null
  } catch {
    return null
  }
}

/** Persist roles. Returns false if storage is unavailable (e.g. sandboxed). */
export function saveRoles(roles: StoredRole[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roles))
    return true
  } catch {
    return false
  }
}

/** Clear persisted roles (revert to defaults on next load). */
export function resetRoles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** The effective roles right now: persisted overrides, else the defaults. */
export const effectiveRoles = (): StoredRole[] => loadRoles() ?? buildStoredFromDefs()
export const effectiveRoleById = (id: string) => effectiveRoles().find((r) => r.id === id)

/* ------------------------------------------------------------------ */
/* Administrators (assigned to the roles above)                        */
/* ------------------------------------------------------------------ */
export interface AdminUser {
  name: string
  email: string
  roleId: string
  mfa: boolean
  lastActive: string
  status: string
}

export const admins: AdminUser[] = [
  { name: 'Jack Reed', email: 'jack@plcy.app', roleId: 'superuser', mfa: true, lastActive: '2 min ago', status: 'Active' },
  { name: 'Dana Cole', email: 'dana.cole@plcy.app', roleId: 'platform-admin', mfa: true, lastActive: '18 min ago', status: 'Active' },
  { name: 'Marcus Ihde', email: 'marcus.ihde@plcy.app', roleId: 'platform-admin', mfa: true, lastActive: '1 hour ago', status: 'Active' },
  { name: 'Priya Nair', email: 'priya.nair@plcy.app', roleId: 'compliance-officer', mfa: true, lastActive: '3 hours ago', status: 'Active' },
  { name: 'Sofia Alvarez', email: 'sofia.alvarez@plcy.app', roleId: 'model-validator', mfa: false, lastActive: '2 days ago', status: 'Active' },
  { name: 'Tom Becker', email: 'tom.becker@plcy.app', roleId: 'read-only', mfa: false, lastActive: '11 days ago', status: 'Suspended' },
]

/** The signed-in administrator (drives the sidebar profile). */
export const currentUser: AdminUser = admins.find((a) => a.email === 'jack@plcy.app') ?? admins[0]

export const roleById = (id: string) => roleDefs.find((r) => r.id === id)
export const assignedCount = (roleId: string) => admins.filter((a) => a.roleId === roleId).length
