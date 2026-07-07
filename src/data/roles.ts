/**
 * Shared role & access-control definitions.
 * Used by both Settings → Roles & Permissions (to edit roles) and
 * Admin Security (to show each administrator's role).
 */
import { Crown, UserCog, ShieldCheck, FlaskConical, Eye } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type RoleTone = 'purple' | 'blue' | 'green' | 'orange' | 'slate'

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
  icon: LucideIcon
  tone: RoleTone
  /** Grant state for each of the seven BASE_CAPS, in order. */
  baseFlags: boolean[]
  /** Role-specific capabilities, always granted. */
  extra: string[]
}

export const roleDefs: RoleDef[] = [
  {
    id: 'superuser',
    name: 'Superuser',
    desc: 'Complete system control and multi-tenant administration',
    icon: Crown,
    tone: 'purple',
    baseFlags: [true, true, true, true, true, true, true],
    extra: [],
  },
  {
    id: 'platform-admin',
    name: 'Platform Admin',
    desc: 'Initial onboarding and infrastructure updates',
    icon: UserCog,
    tone: 'blue',
    baseFlags: [true, false, true, true, true, false, true],
    extra: [],
  },
  {
    id: 'compliance-officer',
    name: 'Compliance Officer',
    desc: 'Regulatory reporting and drift monitoring',
    icon: ShieldCheck,
    tone: 'green',
    baseFlags: [false, false, false, false, false, false, false],
    extra: ['Audit Logs', 'Policy Review', 'Factsheets'],
  },
  {
    id: 'model-validator',
    name: 'Model Validator',
    desc: 'Verifying model safety before client rollout',
    icon: FlaskConical,
    tone: 'orange',
    baseFlags: [false, false, false, false, false, false, false],
    extra: ['Sandbox Access', 'Testing', 'Bias Evaluation'],
  },
  {
    id: 'read-only',
    name: 'Read Only',
    desc: 'View-only access to dashboards, reports, and audit trails',
    icon: Eye,
    tone: 'slate',
    baseFlags: [false, false, false, false, false, false, false],
    extra: ['View Dashboards', 'View Reports'],
  },
]

export const roleIconTone: Record<RoleTone, string> = {
  purple: 'bg-violet-50 text-violet-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-orange-50 text-orange-600',
  slate: 'bg-slate-100 text-slate-500',
}

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

export const roleById = (id: string) => roleDefs.find((r) => r.id === id)
export const assignedCount = (roleId: string) => admins.filter((a) => a.roleId === roleId).length
