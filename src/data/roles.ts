/**
 * Role display metadata and the PLCY staff assigned to each role.
 *
 * Role identity (id / name / description / icon / colour) lives here; the actual
 * per-feature permissions live in the production access map (access.ts). The
 * role ids are the `EAccessRole` values so the two stay in lock-step.
 *
 * Consumed by: the sidebar profile (current user's role), the "view as role"
 * switcher, Admin Security (each admin's role), and Settings → Roles.
 */
import { Crown, UserCog, Headset, CreditCard, Wrench, BarChart3, Megaphone, KeyRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EAccessRole } from './access'

export type RoleTone = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'yellow' | 'slate'

/** Serializable icon registry — keys are safe to persist / reference by string. */
export const ICONS = {
  crown: Crown,
  'user-cog': UserCog,
  headset: Headset,
  'credit-card': CreditCard,
  wrench: Wrench,
  'bar-chart': BarChart3,
  megaphone: Megaphone,
  key: KeyRound,
} as const
export type IconKey = keyof typeof ICONS
export const iconFor = (key: string): LucideIcon => ICONS[key as IconKey] ?? KeyRound

export interface RoleDef {
  id: EAccessRole
  name: string
  desc: string
  iconKey: IconKey
  tone: RoleTone
}

export const roleDefs: RoleDef[] = [
  {
    id: EAccessRole.Superuser,
    name: 'Superuser',
    desc: 'Unrestricted control across every feature and customer.',
    iconKey: 'crown',
    tone: 'purple',
  },
  {
    id: EAccessRole.CSAdmin,
    name: 'CS Admin',
    desc: 'Customer-success lead — full instance, subscription and user management.',
    iconKey: 'user-cog',
    tone: 'blue',
  },
  {
    id: EAccessRole.CSUser,
    name: 'CS Agent',
    desc: 'Front-line support — day-to-day instance and user operations.',
    iconKey: 'headset',
    tone: 'green',
  },
  {
    id: EAccessRole.Billing,
    name: 'Billing',
    desc: 'Invoices, subscriptions, payouts and promotions.',
    iconKey: 'credit-card',
    tone: 'orange',
  },
  {
    id: EAccessRole.Engineer,
    name: 'Engineer',
    desc: 'Clusters, releases and platform engineering surfaces.',
    iconKey: 'wrench',
    tone: 'red',
  },
  {
    id: EAccessRole.Analyst,
    name: 'Analyst',
    desc: 'Read & monitor across instances, nodes, clusters and packages.',
    iconKey: 'bar-chart',
    tone: 'yellow',
  },
  {
    id: EAccessRole.DevAdvocate,
    name: 'Dev Advocate',
    desc: 'Developer relations — limited instance and agency visibility.',
    iconKey: 'megaphone',
    tone: 'slate',
  },
]

export const roleIconTone: Record<RoleTone, string> = {
  purple: 'bg-violet-50 text-violet-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-rose-50 text-rose-600',
  yellow: 'bg-amber-50 text-amber-600',
  slate: 'bg-slate-100 text-slate-500',
}

export const roleById = (id: string): RoleDef | undefined => roleDefs.find((r) => r.id === id)
/** Alias kept for callers that used the persisted-roles lookup. */
export const effectiveRoleById = roleById

/* ------------------------------------------------------------------ */
/* Administrators (assigned to the roles above)                        */
/* ------------------------------------------------------------------ */
export interface AdminUser {
  name: string
  email: string
  roleId: EAccessRole
  mfa: boolean
  lastActive: string
  status: string
}

export const admins: AdminUser[] = [
  { name: 'Jack Antikadjian', email: 'jack@plcy.app', roleId: EAccessRole.Superuser, mfa: true, lastActive: '2 min ago', status: 'Active' },
  { name: 'Dana Cole', email: 'dana.cole@plcy.app', roleId: EAccessRole.CSAdmin, mfa: true, lastActive: '18 min ago', status: 'Active' },
  { name: 'Priya Nair', email: 'priya.nair@plcy.app', roleId: EAccessRole.CSUser, mfa: true, lastActive: '3 hours ago', status: 'Active' },
  { name: 'Nora Fields', email: 'nora.fields@plcy.app', roleId: EAccessRole.Billing, mfa: true, lastActive: '40 min ago', status: 'Active' },
  { name: 'Marcus Ihde', email: 'marcus.ihde@plcy.app', roleId: EAccessRole.Engineer, mfa: true, lastActive: '1 hour ago', status: 'Active' },
  { name: 'Sofia Alvarez', email: 'sofia.alvarez@plcy.app', roleId: EAccessRole.Analyst, mfa: false, lastActive: '2 days ago', status: 'Active' },
  { name: 'Tom Becker', email: 'tom.becker@plcy.app', roleId: EAccessRole.DevAdvocate, mfa: false, lastActive: '11 days ago', status: 'Suspended' },
]

/** The signed-in administrator (drives the sidebar profile). */
export const currentUser: AdminUser = admins.find((a) => a.email === 'jack@plcy.app') ?? admins[0]

export const assignedCount = (roleId: string) => admins.filter((a) => a.roleId === roleId).length
