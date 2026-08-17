/**
 * PLCY production access-control model.
 *
 * This mirrors the real platform's `EAccessRole` / `EAccessFeature` / `AccessMap`
 * so the console gates actions exactly the way production does. The map lists,
 * per feature, which roles may use it; Superuser is granted every feature
 * implicitly (prepended when the map is built), and a feature with an empty
 * role list is therefore Superuser-only.
 *
 * Fixes applied vs. the original draft (see PR discussion) — each is annotated
 * inline with `// fix:`:
 *   1. UserManageRoles is CSAdmin-only (was all CS staff) — prevents a CSUser
 *      from escalating their own privileges by editing role assignments.
 *   2. Duplicate roles removed (e.g. InvoiceList listed CSAdmin twice) — the
 *      builder de-dupes anyway, but the source is now clean.
 *   3. The map is an exhaustive `Record` (not `Partial`) so a newly added
 *      feature is a compile error until its access is declared — no silent
 *      "Superuser-only by omission".
 */

export enum EAccessRole {
  Superuser = 'superuser',
  CSAdmin = 'cs-admin',
  CSUser = 'cs-user',
  Billing = 'billing',
  Engineer = 'engineer',
  Analyst = 'analyst',
  DevAdvocate = 'dev-advocate',
}

/** All roles, in display order. */
export const ROLES: EAccessRole[] = [
  EAccessRole.Superuser,
  EAccessRole.CSAdmin,
  EAccessRole.CSUser,
  EAccessRole.Billing,
  EAccessRole.Engineer,
  EAccessRole.Analyst,
  EAccessRole.DevAdvocate,
]

export enum EAccessFeature {
  ApplicationList = 'ApplicationList',
  BlogAdd = 'BlogAdd',
  BlogDelete = 'BlogDelete',
  BlogEdit = 'BlogEdit',
  BlogList = 'BlogList',
  BuildList = 'BuildList',
  BulkPromoAssign = 'BulkPromoAssign',
  ClusterList = 'ClusterList',
  ClusterManageResources = 'ClusterManageResources',
  ClusterMonitor = 'ClusterMonitor',
  ComponentList = 'ComponentList',
  DealList = 'DealList',
  EnterpriseManagement = 'EnterpriseManagement',
  GlobalUserEventList = 'GlobalUserEventList',
  HealthList = 'HealthList',
  InstanceAdd = 'InstanceAdd',
  InstanceArchiveList = 'InstanceArchiveList',
  InstanceArchive = 'InstanceArchive',
  InstanceBackupList = 'InstanceBackupList',
  InstanceBackup = 'InstanceBackup',
  InstanceCancel = 'InstanceCancel',
  InstanceConnect = 'InstanceConnect',
  InstanceJobs = 'InstanceJobs',
  InstanceList = 'InstanceList',
  InstanceManageAgency = 'InstanceManageAgency',
  InstanceManageInfrastructure = 'InstanceManageInfrastructure',
  InstanceManagePackage = 'InstanceManagePackage',
  InstanceManageResources = 'InstanceManageResources',
  InstanceManageSchedule = 'InstanceManageSchedule',
  InstanceManage = 'InstanceManage',
  InstanceMonitorList = 'InstanceMonitorList',
  InstanceNoSubList = 'InstanceNoSubList',
  InstanceRestoreBackup = 'InstanceRestoreBackup',
  InstanceRestore = 'InstanceRestore',
  InstanceStatsList = 'InstanceStatsList',
  InstanceStats = 'InstanceStats',
  InstanceUsage = 'InstanceUsage',
  InviteList = 'InviteList',
  InviteManage = 'InviteManage',
  InvoiceList = 'InvoiceList',
  InvoicePastDueList = 'InvoicePastDueList',
  InvoicePayoutList = 'InvoicePayoutList',
  InvoicePendingList = 'InvoicePendingList',
  JobList = 'JobList',
  MarketItemEdit = 'MarketItemEdit',
  MarketItemList = 'MarketItemList',
  MembershipList = 'MembershipList',
  MembershipManage = 'MembershipManage',
  NodeArchiveList = 'NodeArchiveList',
  NodeArchived = 'NodeArchived',
  NodeList = 'NodeList',
  NodeMonitor = 'NodeMonitor',
  PackageList = 'PackageList',
  PageEngineering = 'PageEngineering',
  PromoAdd = 'PromoAdd',
  PromoList = 'PromoList',
  ReleaseList = 'ReleaseList',
  ResourceList = 'ResourceList',
  Stripe = 'Stripe',
  SubscriptionList = 'SubscriptionList',
  SubscriptionManage = 'SubscriptionManage',
  SubscriptionReprocess = 'SubscriptionReprocess',
  SubscriptionUpgrades = 'SubscriptionUpgrades',
  UsageList = 'UsageList',
  UserArchiveList = 'UserArchiveList',
  UserArchive = 'UserArchive',
  UserImpersonateReadOnly = 'UserImpersonateReadOnly',
  UserImpersonate = 'UserImpersonate',
  UserIssueCredit = 'UserIssueCredit',
  UserList = 'UserList',
  UserManagePartnerAttributes = 'UserManagePartnerAttributes',
  UserManagePartner = 'UserManagePartner',
  UserManagePayoutPartner = 'UserManagePayoutPartner',
  UserManagePromo = 'UserManagePromo',
  UserManageReferredByPartner = 'UserManageReferredByPartner',
  UserManageRoles = 'UserManageRoles',
  UserRestoreAccess = 'UserRestoreAccess',
  UserRestoreFull = 'UserRestoreFull',
}

const everyone = ROLES
const csStaff = [EAccessRole.CSAdmin, EAccessRole.CSUser]

/**
 * Raw role grants per feature (Superuser implied). Empty array = Superuser only.
 * Exhaustive `Record` — every EAccessFeature must appear.
 */
const RAW_ACCESS: Record<EAccessFeature, EAccessRole[]> = {
  [EAccessFeature.ApplicationList]: [],
  [EAccessFeature.BlogAdd]: [],
  [EAccessFeature.BlogDelete]: [],
  [EAccessFeature.BlogEdit]: [],
  [EAccessFeature.BlogList]: [],
  [EAccessFeature.BuildList]: [],
  [EAccessFeature.BulkPromoAssign]: [EAccessRole.Billing, EAccessRole.CSAdmin],
  [EAccessFeature.ClusterList]: [EAccessRole.Engineer, EAccessRole.Analyst],
  [EAccessFeature.ClusterManageResources]: [],
  [EAccessFeature.ClusterMonitor]: [EAccessRole.Engineer, EAccessRole.Analyst],
  [EAccessFeature.ComponentList]: [],
  [EAccessFeature.DealList]: [],
  [EAccessFeature.EnterpriseManagement]: [],
  [EAccessFeature.GlobalUserEventList]: [...csStaff, EAccessRole.Analyst, EAccessRole.DevAdvocate],
  [EAccessFeature.HealthList]: [],
  [EAccessFeature.InstanceAdd]: [EAccessRole.CSAdmin],
  [EAccessFeature.InstanceArchiveList]: [...csStaff],
  [EAccessFeature.InstanceArchive]: [...csStaff],
  [EAccessFeature.InstanceBackupList]: [...csStaff],
  [EAccessFeature.InstanceBackup]: [...csStaff],
  [EAccessFeature.InstanceCancel]: [],
  [EAccessFeature.InstanceConnect]: [],
  [EAccessFeature.InstanceJobs]: [...csStaff],
  [EAccessFeature.InstanceList]: [...csStaff, EAccessRole.Analyst, EAccessRole.DevAdvocate],
  [EAccessFeature.InstanceManageAgency]: [EAccessRole.CSAdmin, EAccessRole.DevAdvocate],
  [EAccessFeature.InstanceManageInfrastructure]: [...csStaff],
  [EAccessFeature.InstanceManagePackage]: [EAccessRole.CSAdmin],
  [EAccessFeature.InstanceManageResources]: [],
  [EAccessFeature.InstanceManageSchedule]: [],
  [EAccessFeature.InstanceManage]: [EAccessRole.CSAdmin],
  [EAccessFeature.InstanceMonitorList]: [EAccessRole.Analyst],
  [EAccessFeature.InstanceNoSubList]: [],
  [EAccessFeature.InstanceRestoreBackup]: [...csStaff],
  [EAccessFeature.InstanceRestore]: [...csStaff],
  [EAccessFeature.InstanceStatsList]: [...csStaff],
  [EAccessFeature.InstanceStats]: [...csStaff],
  [EAccessFeature.InstanceUsage]: [],
  [EAccessFeature.InviteList]: [...csStaff, EAccessRole.Billing],
  [EAccessFeature.InviteManage]: [...csStaff, EAccessRole.Billing],
  [EAccessFeature.InvoiceList]: [EAccessRole.CSAdmin, EAccessRole.CSUser, EAccessRole.Billing], // fix: was [...csStaff, CSAdmin, Billing] — CSAdmin duped
  [EAccessFeature.InvoicePastDueList]: [EAccessRole.Billing],
  [EAccessFeature.InvoicePayoutList]: [EAccessRole.Billing],
  [EAccessFeature.InvoicePendingList]: [EAccessRole.Billing],
  [EAccessFeature.JobList]: [...csStaff, EAccessRole.Analyst],
  [EAccessFeature.MarketItemEdit]: [],
  [EAccessFeature.MarketItemList]: [],
  [EAccessFeature.MembershipList]: [],
  [EAccessFeature.MembershipManage]: [],
  [EAccessFeature.NodeArchiveList]: [EAccessRole.Analyst],
  [EAccessFeature.NodeArchived]: [EAccessRole.Analyst],
  [EAccessFeature.NodeList]: [EAccessRole.Analyst],
  [EAccessFeature.NodeMonitor]: [EAccessRole.Analyst],
  [EAccessFeature.PackageList]: [EAccessRole.Analyst],
  [EAccessFeature.PageEngineering]: everyone,
  [EAccessFeature.PromoAdd]: [EAccessRole.Billing, EAccessRole.CSAdmin],
  [EAccessFeature.PromoList]: [EAccessRole.Billing, EAccessRole.CSAdmin],
  [EAccessFeature.ReleaseList]: [EAccessRole.Engineer, EAccessRole.Analyst],
  [EAccessFeature.ResourceList]: [],
  [EAccessFeature.Stripe]: [EAccessRole.CSAdmin],
  [EAccessFeature.SubscriptionList]: [EAccessRole.CSAdmin, EAccessRole.Billing],
  [EAccessFeature.SubscriptionManage]: [EAccessRole.CSAdmin, EAccessRole.Billing],
  [EAccessFeature.SubscriptionReprocess]: [EAccessRole.CSAdmin],
  [EAccessFeature.SubscriptionUpgrades]: [],
  [EAccessFeature.UsageList]: [],
  [EAccessFeature.UserArchiveList]: [EAccessRole.CSAdmin],
  [EAccessFeature.UserArchive]: [...csStaff],
  [EAccessFeature.UserImpersonateReadOnly]: [...csStaff],
  [EAccessFeature.UserImpersonate]: [...csStaff],
  [EAccessFeature.UserIssueCredit]: [...csStaff],
  [EAccessFeature.UserList]: [...csStaff, EAccessRole.Billing],
  [EAccessFeature.UserManagePartnerAttributes]: [EAccessRole.CSAdmin, EAccessRole.Billing],
  [EAccessFeature.UserManagePartner]: [EAccessRole.CSAdmin],
  [EAccessFeature.UserManagePayoutPartner]: [EAccessRole.Billing],
  [EAccessFeature.UserManagePromo]: [...csStaff, EAccessRole.Billing],
  [EAccessFeature.UserManageReferredByPartner]: [EAccessRole.CSAdmin, EAccessRole.Billing],
  [EAccessFeature.UserManageRoles]: [EAccessRole.CSAdmin], // fix: was [...csStaff] — privilege-escalation risk
  [EAccessFeature.UserRestoreAccess]: [],
  [EAccessFeature.UserRestoreFull]: [],
}

/** Build the effective map: prepend Superuser to every feature and de-dupe. */
function buildAccessMap(raw: Record<EAccessFeature, EAccessRole[]>): Record<EAccessFeature, EAccessRole[]> {
  const out = {} as Record<EAccessFeature, EAccessRole[]>
  for (const key of Object.keys(raw) as EAccessFeature[]) {
    out[key] = Array.from(new Set<EAccessRole>([EAccessRole.Superuser, ...raw[key]]))
  }
  return out
}

/** The canonical, immutable production access map. */
export const AccessMap: Record<EAccessFeature, EAccessRole[]> = buildAccessMap(RAW_ACCESS)

export const ALL_FEATURES = Object.keys(AccessMap) as EAccessFeature[]

/** Does a role have access to a feature under a given map (defaults to canonical). */
export function hasAccess(
  role: EAccessRole,
  feature: EAccessFeature,
  map: Record<EAccessFeature, EAccessRole[]> = AccessMap,
): boolean {
  if (role === EAccessRole.Superuser) return true
  return map[feature]?.includes(role) ?? false
}

export const rolesForFeature = (feature: EAccessFeature, map = AccessMap): EAccessRole[] => map[feature] ?? []

/* ------------------------------------------------------------------ */
/* Feature presentation: human labels + domain grouping (for the matrix) */
/* ------------------------------------------------------------------ */

/** Turn a PascalCase feature key into "Words With Spaces". */
function humanize(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
}

export interface FeatureDomain {
  title: string
  features: EAccessFeature[]
}

/** Features grouped by product domain, in the order shown in Settings → Roles. */
export const FEATURE_DOMAINS: FeatureDomain[] = [
  {
    title: 'Instances',
    features: [
      EAccessFeature.InstanceAdd,
      EAccessFeature.InstanceList,
      EAccessFeature.InstanceManage,
      EAccessFeature.InstanceManageAgency,
      EAccessFeature.InstanceManageInfrastructure,
      EAccessFeature.InstanceManagePackage,
      EAccessFeature.InstanceManageResources,
      EAccessFeature.InstanceManageSchedule,
      EAccessFeature.InstanceArchive,
      EAccessFeature.InstanceArchiveList,
      EAccessFeature.InstanceBackup,
      EAccessFeature.InstanceBackupList,
      EAccessFeature.InstanceRestore,
      EAccessFeature.InstanceRestoreBackup,
      EAccessFeature.InstanceCancel,
      EAccessFeature.InstanceConnect,
      EAccessFeature.InstanceJobs,
      EAccessFeature.InstanceStats,
      EAccessFeature.InstanceStatsList,
      EAccessFeature.InstanceMonitorList,
      EAccessFeature.InstanceNoSubList,
      EAccessFeature.InstanceUsage,
    ],
  },
  {
    title: 'Infrastructure',
    features: [
      EAccessFeature.ClusterList,
      EAccessFeature.ClusterMonitor,
      EAccessFeature.ClusterManageResources,
      EAccessFeature.NodeList,
      EAccessFeature.NodeMonitor,
      EAccessFeature.NodeArchived,
      EAccessFeature.NodeArchiveList,
      EAccessFeature.PackageList,
      EAccessFeature.ReleaseList,
      EAccessFeature.BuildList,
      EAccessFeature.ComponentList,
      EAccessFeature.JobList,
      EAccessFeature.HealthList,
      EAccessFeature.ResourceList,
      EAccessFeature.EnterpriseManagement,
      EAccessFeature.UsageList,
    ],
  },
  {
    title: 'Billing & Revenue',
    features: [
      EAccessFeature.SubscriptionList,
      EAccessFeature.SubscriptionManage,
      EAccessFeature.SubscriptionReprocess,
      EAccessFeature.SubscriptionUpgrades,
      EAccessFeature.InvoiceList,
      EAccessFeature.InvoicePendingList,
      EAccessFeature.InvoicePastDueList,
      EAccessFeature.InvoicePayoutList,
      EAccessFeature.Stripe,
      EAccessFeature.PromoAdd,
      EAccessFeature.PromoList,
      EAccessFeature.BulkPromoAssign,
      EAccessFeature.DealList,
    ],
  },
  {
    title: 'Users & Access',
    features: [
      EAccessFeature.UserList,
      EAccessFeature.UserArchive,
      EAccessFeature.UserArchiveList,
      EAccessFeature.UserImpersonate,
      EAccessFeature.UserImpersonateReadOnly,
      EAccessFeature.UserIssueCredit,
      EAccessFeature.UserManageRoles,
      EAccessFeature.UserManagePromo,
      EAccessFeature.UserManagePartner,
      EAccessFeature.UserManagePartnerAttributes,
      EAccessFeature.UserManagePayoutPartner,
      EAccessFeature.UserManageReferredByPartner,
      EAccessFeature.UserRestoreAccess,
      EAccessFeature.UserRestoreFull,
      EAccessFeature.GlobalUserEventList,
      EAccessFeature.InviteList,
      EAccessFeature.InviteManage,
      EAccessFeature.MembershipList,
      EAccessFeature.MembershipManage,
    ],
  },
  {
    title: 'Content & Marketplace',
    features: [
      EAccessFeature.ApplicationList,
      EAccessFeature.BlogList,
      EAccessFeature.BlogAdd,
      EAccessFeature.BlogEdit,
      EAccessFeature.BlogDelete,
      EAccessFeature.MarketItemList,
      EAccessFeature.MarketItemEdit,
      EAccessFeature.PageEngineering,
    ],
  },
]

export const featureLabel = (f: EAccessFeature): string => humanize(f)

/* ------------------------------------------------------------------ */
/* Editable overlay (Settings → Roles & Permissions) — persisted        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'plcy.access.map.v1'

/** A persisted override serialises as feature -> roles (Superuser excluded). */
type StoredAccess = Partial<Record<EAccessFeature, EAccessRole[]>>

export function loadAccessMap(): Record<EAccessFeature, EAccessRole[]> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAccess
    const out = {} as Record<EAccessFeature, EAccessRole[]>
    for (const key of ALL_FEATURES) {
      const roles = parsed[key] ?? AccessMap[key]
      out[key] = Array.from(new Set<EAccessRole>([EAccessRole.Superuser, ...roles]))
    }
    return out
  } catch {
    return null
  }
}

export function saveAccessMap(map: Record<EAccessFeature, EAccessRole[]>): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    return true
  } catch {
    return false
  }
}

export function resetAccessMap(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Effective map right now: persisted override, else the canonical map. */
export const effectiveAccessMap = (): Record<EAccessFeature, EAccessRole[]> => loadAccessMap() ?? AccessMap
