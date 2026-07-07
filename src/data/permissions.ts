/**
 * Capability-based permission model. Each RBAC role (from roles.ts) maps to a
 * set of action capabilities; the UI gates actions on these.
 */

export type Capability =
  | 'customer.manage'
  | 'provision.manage'
  | 'release.rollout'
  | 'license.manage'
  | 'access.approve'
  | 'access.breakglass'
  | 'dsar.manage'
  | 'transfer.approve'
  | 'policy.manage'
  | 'model.register'
  | 'incident.manage'
  | 'settings.modify'

export interface CapabilityMeta {
  key: Capability
  label: string
}

export const CAPABILITIES: CapabilityMeta[] = [
  { key: 'customer.manage', label: 'Manage customers' },
  { key: 'provision.manage', label: 'Provision environments' },
  { key: 'release.rollout', label: 'Roll out releases' },
  { key: 'license.manage', label: 'Manage licenses' },
  { key: 'access.approve', label: 'Approve access requests' },
  { key: 'access.breakglass', label: 'Approve break-glass root' },
  { key: 'dsar.manage', label: 'Handle data-subject requests' },
  { key: 'transfer.approve', label: 'Approve data transfers' },
  { key: 'policy.manage', label: 'Manage policies' },
  { key: 'model.register', label: 'Register models' },
  { key: 'incident.manage', label: 'Manage incidents' },
  { key: 'settings.modify', label: 'Modify settings' },
]

/** '*' grants every capability. */
const roleCaps: Record<string, Capability[] | ['*']> = {
  superuser: ['*'],
  'platform-admin': ['customer.manage', 'provision.manage', 'release.rollout', 'license.manage', 'model.register', 'incident.manage', 'settings.modify', 'access.approve', 'policy.manage'],
  'compliance-officer': ['dsar.manage', 'transfer.approve', 'incident.manage'],
  'model-validator': ['model.register'],
  'read-only': [],
}

export function roleCan(roleId: string, cap: Capability): boolean {
  const caps = roleCaps[roleId] ?? []
  return caps[0] === '*' || (caps as Capability[]).includes(cap)
}

/** All capabilities a role holds (for display). */
export function roleCapabilities(roleId: string): Capability[] {
  const caps = roleCaps[roleId]
  if (!caps) return []
  if (caps[0] === '*') return CAPABILITIES.map((c) => c.key)
  return caps as Capability[]
}
