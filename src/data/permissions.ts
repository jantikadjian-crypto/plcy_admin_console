/**
 * Bridge between the console's coarse UI action gates and the real production
 * access model (`AccessMap` in access.ts).
 *
 * Each page guards an action with a `Capability` (e.g. `license.manage`). Rather
 * than maintain a second, parallel permission table, every capability maps to a
 * concrete `EAccessFeature`, and the check resolves through the same `AccessMap`
 * production uses. Change a role's access to a feature and the console's gating
 * follows automatically.
 */
import {
  EAccessRole,
  EAccessFeature,
  hasAccess,
  featureLabel,
  effectiveAccessMap,
} from './access'

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
  | 'evals.view'
  | 'evals.run'
  | 'settings.modify'

/** Each console action gate resolves to a real production feature. */
export const CAP_TO_FEATURE: Record<Capability, EAccessFeature> = {
  'customer.manage': EAccessFeature.InstanceManage,
  'provision.manage': EAccessFeature.InstanceManageInfrastructure,
  'release.rollout': EAccessFeature.ReleaseList,
  'license.manage': EAccessFeature.SubscriptionManage,
  'access.approve': EAccessFeature.UserManageRoles,
  'access.breakglass': EAccessFeature.UserRestoreFull, // Superuser-only
  'dsar.manage': EAccessFeature.UserArchive,
  'transfer.approve': EAccessFeature.InstanceManageInfrastructure,
  'policy.manage': EAccessFeature.InstanceManagePackage,
  'model.register': EAccessFeature.PackageList,
  'incident.manage': EAccessFeature.ClusterMonitor,
  'evals.view': EAccessFeature.ClusterMonitor, // read the efficacy/eval surfaces
  'evals.run': EAccessFeature.InstanceManagePackage, // launch campaigns / run evals (governance mutation)
  'settings.modify': EAccessFeature.UserManageRoles,
}

export interface CapabilityMeta {
  key: Capability
  label: string
  feature: EAccessFeature
}

export const CAPABILITIES: CapabilityMeta[] = (Object.keys(CAP_TO_FEATURE) as Capability[]).map((key) => ({
  key,
  label: featureLabel(CAP_TO_FEATURE[key]),
  feature: CAP_TO_FEATURE[key],
}))

/** Can a role perform a console action? Resolves through the effective access map. */
export function roleCan(roleId: string, cap: Capability): boolean {
  const role = roleId as EAccessRole
  return hasAccess(role, CAP_TO_FEATURE[cap], effectiveAccessMap())
}

/** All console capabilities a role holds (for display). */
export function roleCapabilities(roleId: string): Capability[] {
  return (Object.keys(CAP_TO_FEATURE) as Capability[]).filter((cap) => roleCan(roleId, cap))
}
