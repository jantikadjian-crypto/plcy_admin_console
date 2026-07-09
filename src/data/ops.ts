/**
 * Operational data for Day-0 provisioning, backup/DR, and supply-chain
 * security across the PLCY fleet of single-tenant deployments.
 */

/* ------------------------------------------------------------------ */
/* Provisioning (Day-0 onboarding via IaC)                             */
/* ------------------------------------------------------------------ */
export type ProvTemplate = 'SaaS' | 'Sovereign Cloud' | 'Air-gapped'
export type ProvStatus = 'Requested' | 'Provisioning' | 'Configuring' | 'Ready' | 'Failed'

/** Onboarding prerequisites captured when an environment is requested. */
export interface OnboardingState {
  plan: string
  byok: boolean
  residency: boolean
  dpa: boolean
  offlineLicense: boolean
  escortedAccess: boolean
  contacts: boolean
}

export interface Provision {
  id: string
  customer: string
  template: ProvTemplate
  regionCode: string
  status: ProvStatus
  progress: number
  requested: string
  owner: string
  /** Present when created via the onboarding wizard; drives the readiness checklist. */
  onboarding?: OnboardingState
}

export const provisions: Provision[] = [
  { id: 'prov_aurora', customer: 'Aurora Systems', template: 'SaaS', regionCode: 'us-east-1', status: 'Provisioning', progress: 55, requested: '2026-07-07 07:40', owner: 'dana.cole@plcy.app' },
  { id: 'prov_bluefin', customer: 'Bluefin Capital', template: 'Sovereign Cloud', regionCode: 'eu-central-1', status: 'Configuring', progress: 80, requested: '2026-07-06 15:10', owner: 'marcus.ihde@plcy.app' },
  { id: 'prov_cedar', customer: 'Cedar Health', template: 'Air-gapped', regionCode: 'de-sov-1', status: 'Requested', progress: 10, requested: '2026-07-07 09:02', owner: 'priya.nair@plcy.app' },
  { id: 'prov_delta', customer: 'Delta Freight', template: 'SaaS', regionCode: 'ap-southeast-1', status: 'Ready', progress: 100, requested: '2026-07-04 11:25', owner: 'dana.cole@plcy.app' },
  { id: 'prov_echo', customer: 'Echo Media', template: 'SaaS', regionCode: 'us-west-2', status: 'Failed', progress: 40, requested: '2026-07-05 20:15', owner: 'marcus.ihde@plcy.app' },
]

/** Cloud (SaaS / Sovereign Cloud) IaC pipeline. */
export const CLOUD_STEPS = [
  'Approve request',
  'Terraform plan',
  'Provision VPC & EKS',
  'Bootstrap cluster',
  'Deploy PLCY (Helm)',
  'Apply baseline policies',
  'Handover',
]
/** Air-gapped path — no cloud provisioning; a signed bundle is shipped and imported on-prem. */
export const AIRGAP_STEPS = [
  'Approve request',
  'Build signed bundle',
  'Deliver to site (offline)',
  'Import & verify signature',
  'Activate on-prem',
  'Issue offline license',
  'Escorted handover',
]
export const PROVISION_STEPS = CLOUD_STEPS
export const provisionSteps = (template: ProvTemplate): string[] => (template === 'Air-gapped' ? AIRGAP_STEPS : CLOUD_STEPS)

export function provisionStep(status: ProvStatus): number {
  switch (status) {
    case 'Requested': return 1
    case 'Provisioning': return 3
    case 'Configuring': return 5
    case 'Ready': return CLOUD_STEPS.length
    case 'Failed': return 3
  }
}

/* ------------------------------------------------------------------ */
/* Onboarding readiness — gates that must be in order before handover   */
/* ------------------------------------------------------------------ */
export interface ChecklistItem {
  key: string
  label: string
  done: boolean
  critical: boolean
}

/** Per-environment onboarding gates, tailored to the deployment mode. */
export function onboardingChecklist(p: Provision): ChecklistItem[] {
  const air = p.template === 'Air-gapped'
  const sov = p.template !== 'SaaS'
  const ob = p.onboarding
  // For wizard-created rows, use the captured selections; otherwise infer from progress.
  const at = (frac: number) => p.status === 'Ready' || p.progress >= frac
  const items: ChecklistItem[] = [
    { key: 'plan', label: 'Contract & plan confirmed', done: ob ? !!ob.plan : at(10), critical: false },
    { key: 'region', label: 'Region & sovereignty selected', done: true, critical: false },
    { key: 'env', label: air ? 'Signed bundle delivered to site' : 'Environment provisioned (IaC)', done: at(air ? 50 : 60), critical: true },
    { key: 'policies', label: 'Baseline policy packs applied', done: at(80), critical: false },
    { key: 'dpa', label: 'DPA & sub-processors reviewed', done: ob ? ob.dpa : at(45), critical: false },
    { key: 'contacts', label: 'Notification contacts set', done: ob ? ob.contacts : at(85), critical: false },
  ]
  if (sov) {
    items.push({ key: 'byok', label: 'BYOK / in-region encryption', done: ob ? ob.byok : at(60), critical: true })
    items.push({ key: 'residency', label: 'Data residency policy configured', done: ob ? ob.residency : at(70), critical: true })
  }
  if (air) {
    items.push({ key: 'license', label: 'Offline license issued', done: ob ? ob.offlineLicense : at(90), critical: true })
    items.push({ key: 'escort', label: 'Escorted-access rule configured', done: ob ? ob.escortedAccess : at(90), critical: true })
  }
  return items
}

/* ------------------------------------------------------------------ */
/* Backups & disaster recovery                                         */
/* ------------------------------------------------------------------ */
export type BackupStatus = 'Healthy' | 'Warning' | 'Failed'

export interface Backup {
  id: string
  customer: string
  regionCode: string
  lastBackup: string
  frequency: string
  rpoMin: number
  rtoMin: number
  retentionDays: number
  restorePoints: number
  sizeGb: number
  status: BackupStatus
  lastDrTest: string
  encrypted: boolean
}

export const backups: Backup[] = [
  { id: 'bak_meridian', customer: 'Meridian Bank', regionCode: 'us-east-1', lastBackup: '12 min ago', frequency: 'Every 15 min', rpoMin: 15, rtoMin: 60, retentionDays: 90, restorePoints: 412, sizeGb: 340, status: 'Healthy', lastDrTest: '2026-06-18', encrypted: true },
  { id: 'bak_helix', customer: 'Helix Health', regionCode: 'de-sov-1', lastBackup: '1 h ago', frequency: 'Hourly (local)', rpoMin: 60, rtoMin: 120, retentionDays: 180, restorePoints: 210, sizeGb: 280, status: 'Healthy', lastDrTest: '2026-05-30', encrypted: true },
  { id: 'bak_northwind', customer: 'Northwind Retail', regionCode: 'eu-central-1', lastBackup: '9 min ago', frequency: 'Every 15 min', rpoMin: 15, rtoMin: 60, retentionDays: 90, restorePoints: 388, sizeGb: 150, status: 'Healthy', lastDrTest: '2026-06-22', encrypted: true },
  { id: 'bak_vertex', customer: 'Vertex Capital', regionCode: 'ap-southeast-1', lastBackup: '2 h ago', frequency: 'Hourly', rpoMin: 60, rtoMin: 90, retentionDays: 120, restorePoints: 176, sizeGb: 220, status: 'Warning', lastDrTest: '2026-04-11', encrypted: true },
  { id: 'bak_ferro', customer: 'Ferro Manufacturing', regionCode: 'de-sov-1', lastBackup: '3 h ago', frequency: 'Daily (local)', rpoMin: 240, rtoMin: 240, retentionDays: 365, restorePoints: 96, sizeGb: 110, status: 'Healthy', lastDrTest: '2026-06-01', encrypted: true },
  { id: 'bak_pinecrest', customer: 'Pinecrest Insurance', regionCode: 'us-east-1', lastBackup: '7 min ago', frequency: 'Every 15 min', rpoMin: 15, rtoMin: 60, retentionDays: 90, restorePoints: 401, sizeGb: 180, status: 'Healthy', lastDrTest: '2026-06-15', encrypted: true },
  { id: 'bak_orbit', customer: 'Orbit Telecom', regionCode: 'ap-southeast-1', lastBackup: '14 days ago', frequency: 'Hourly', rpoMin: 60, rtoMin: 90, retentionDays: 60, restorePoints: 0, sizeGb: 0, status: 'Failed', lastDrTest: '2026-02-20', encrypted: true },
]

/* ------------------------------------------------------------------ */
/* Supply chain (SBOM / vulnerabilities / signing)                     */
/* ------------------------------------------------------------------ */
export type PatchStatus = 'Up to date' | 'Patch available' | 'Critical patch'

export interface Image {
  id: string
  name: string
  version: string
  components: number
  criticalCves: number
  highCves: number
  mediumCves: number
  signed: boolean
  slsa: number
  patchStatus: PatchStatus
  lastScan: string
}

export const images: Image[] = [
  { id: 'img_policy_engine', name: 'plcy/policy-engine', version: 'v4.8.2', components: 214, criticalCves: 0, highCves: 1, mediumCves: 4, signed: true, slsa: 3, patchStatus: 'Patch available', lastScan: '2026-07-07 06:00' },
  { id: 'img_model_gateway', name: 'plcy/model-gateway', version: 'v4.8.2', components: 302, criticalCves: 1, highCves: 2, mediumCves: 7, signed: true, slsa: 3, patchStatus: 'Critical patch', lastScan: '2026-07-07 06:00' },
  { id: 'img_api_gateway', name: 'plcy/api-gateway', version: 'v4.8.2', components: 188, criticalCves: 0, highCves: 0, mediumCves: 2, signed: true, slsa: 3, patchStatus: 'Up to date', lastScan: '2026-07-07 06:00' },
  { id: 'img_data_pipeline', name: 'plcy/data-pipeline', version: 'v4.8.2', components: 256, criticalCves: 0, highCves: 3, mediumCves: 9, signed: true, slsa: 2, patchStatus: 'Patch available', lastScan: '2026-07-07 06:00' },
  { id: 'img_console', name: 'plcy/console', version: 'v4.8.2', components: 402, criticalCves: 0, highCves: 0, mediumCves: 5, signed: true, slsa: 3, patchStatus: 'Up to date', lastScan: '2026-07-07 06:00' },
  { id: 'img_sidecar', name: 'plcy/enforcement-sidecar', version: 'v4.8.2', components: 96, criticalCves: 0, highCves: 1, mediumCves: 1, signed: true, slsa: 3, patchStatus: 'Patch available', lastScan: '2026-07-07 06:00' },
]

export type CveStatus = 'Open' | 'Patched' | 'Mitigated'
export interface Cve {
  id: string
  severity: 'Critical' | 'High' | 'Medium'
  component: string
  image: string
  status: CveStatus
  published: string
  fixedIn: string
}

export const cves: Cve[] = [
  { id: 'CVE-2026-31820', severity: 'Critical', component: 'libssl 3.0.11', image: 'plcy/model-gateway', status: 'Open', published: '2026-07-05', fixedIn: '3.0.14' },
  { id: 'CVE-2026-30442', severity: 'High', component: 'urllib3 2.1.0', image: 'plcy/data-pipeline', status: 'Open', published: '2026-07-03', fixedIn: '2.2.2' },
  { id: 'CVE-2026-29910', severity: 'High', component: 'grpc 1.62.0', image: 'plcy/model-gateway', status: 'Mitigated', published: '2026-06-28', fixedIn: '1.63.1' },
  { id: 'CVE-2026-28115', severity: 'High', component: 'openssh 9.6', image: 'plcy/policy-engine', status: 'Open', published: '2026-06-25', fixedIn: '9.7p1' },
  { id: 'CVE-2026-27004', severity: 'Medium', component: 'zlib 1.3', image: 'plcy/data-pipeline', status: 'Patched', published: '2026-06-10', fixedIn: '1.3.1' },
]

/* ------------------------------------------------------------------ */
/* Aggregates                                                          */
/* ------------------------------------------------------------------ */
export const opsTotals = {
  provisioning: provisions.filter((p) => p.status !== 'Ready').length,
  provReady: provisions.filter((p) => p.status === 'Ready').length,
  provFailed: provisions.filter((p) => p.status === 'Failed').length,
  backupsHealthy: backups.filter((b) => b.status === 'Healthy').length,
  backupsTotal: backups.length,
  backupsFailed: backups.filter((b) => b.status === 'Failed').length,
  images: images.length,
  signedImages: images.filter((i) => i.signed).length,
  criticalCves: images.reduce((s, i) => s + i.criticalCves, 0),
  openCves: cves.filter((c) => c.status === 'Open').length,
}
