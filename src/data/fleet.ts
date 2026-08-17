/**
 * Fleet, release, region and sovereignty data for the PLCY control plane.
 *
 * PLCY runs single-tenant deployments (each client has its own Docker/K8s
 * compute on AWS) across SaaS and air-gapped enterprise clients, pinned to a
 * region/jurisdiction. This module is the shared source of truth for the
 * Fleet (Releases, Update Bundles, Cluster Health, Licensing) and Sovereignty
 * (Regions) pages.
 */

/* ------------------------------------------------------------------ */
/* Regions                                                             */
/* ------------------------------------------------------------------ */
export interface Region {
  code: string
  name: string
  jurisdiction: string
  laws: string[]
  residency: string
  keyCustody: string
  controlPlane: string
  sovereignty: SovereigntyTier
  compliance: number
}

export type SovereigntyTier = 'Standard' | 'Sovereign Cloud' | 'Air-gapped'
export type Connectivity = 'SaaS' | 'Air-gapped'

export const regions: Region[] = [
  { code: 'us-east-1', name: 'US East (N. Virginia)', jurisdiction: 'United States', laws: ['CCPA / CPRA', 'HIPAA', 'SOC 2'], residency: 'In-region', keyCustody: 'In-region KMS', controlPlane: 'Regional', sovereignty: 'Standard', compliance: 95 },
  { code: 'us-west-2', name: 'US West (Oregon)', jurisdiction: 'United States', laws: ['CCPA / CPRA', 'HIPAA', 'SOC 2'], residency: 'In-region', keyCustody: 'In-region KMS', controlPlane: 'Regional', sovereignty: 'Standard', compliance: 93 },
  { code: 'eu-central-1', name: 'EU Central (Frankfurt)', jurisdiction: 'European Union', laws: ['GDPR', 'EU AI Act', 'BSI C5'], residency: 'In-region (no transfer)', keyCustody: 'Customer HSM (BYOK)', controlPlane: 'Regional · metadata-only roll-up', sovereignty: 'Sovereign Cloud', compliance: 98 },
  { code: 'eu-west-1', name: 'EU West (Ireland)', jurisdiction: 'European Union', laws: ['GDPR', 'EU AI Act'], residency: 'In-region (no transfer)', keyCustody: 'In-region KMS', controlPlane: 'Regional · metadata-only roll-up', sovereignty: 'Sovereign Cloud', compliance: 96 },
  { code: 'ap-southeast-1', name: 'APAC (Singapore)', jurisdiction: 'Singapore', laws: ['PDPA', 'Cross-border transfer rules'], residency: 'In-region', keyCustody: 'In-region KMS', controlPlane: 'Regional', sovereignty: 'Sovereign Cloud', compliance: 91 },
  { code: 'de-sov-1', name: 'Germany Sovereign (on-prem)', jurisdiction: 'Germany', laws: ['GDPR', 'EU AI Act', 'BSI C5'], residency: 'On-premise · air-gapped', keyCustody: 'Customer HSM (BYOK)', controlPlane: 'Air-gapped · bundle sync', sovereignty: 'Air-gapped', compliance: 99 },
]

export const regionByCode = (code: string) => regions.find((r) => r.code === code)

/**
 * Full names for the abbreviated privacy/compliance laws shown on region cards
 * and detail. Returns undefined for already-spelled-out entries (e.g.
 * "Cross-border transfer rules") so callers skip the redundant label.
 */
export const LAW_FULL: Record<string, string> = {
  GDPR: 'General Data Protection Regulation',
  HIPAA: 'Health Insurance Portability and Accountability Act',
  'SOC 2': 'System & Organization Controls 2',
  'CCPA / CPRA': 'California Consumer Privacy Act / Privacy Rights Act',
  'EU AI Act': 'European Union Artificial Intelligence Act',
  'BSI C5': 'BSI Cloud Computing Compliance Criteria Catalogue',
  PDPA: 'Personal Data Protection Act',
}
export const lawFull = (law: string): string | undefined => LAW_FULL[law]

/* ------------------------------------------------------------------ */
/* Releases                                                            */
/* ------------------------------------------------------------------ */
export type Channel = 'Stable' | 'RC' | 'Canary'
export interface Release {
  version: string
  channel: Channel
  released: string
  status: 'Release candidate' | 'GA · current' | 'GA' | 'Supported' | 'Deprecated'
  notes: string[]
}

export const releases: Release[] = [
  { version: 'v4.9.0-rc1', channel: 'RC', released: '2026-07-01', status: 'Release candidate', notes: ['Multi-turn safety evaluation', 'EU AI Act conformity pack (beta)', 'Faster policy sync (<5s)'] },
  { version: 'v4.8.2', channel: 'Stable', released: '2026-06-10', status: 'GA · current', notes: ['PII redaction v3.2', 'Prompt injection defense v1.9', 'Bug fixes'] },
  { version: 'v4.8.1', channel: 'Stable', released: '2026-05-20', status: 'GA', notes: ['SSO / SCIM hardening', 'Audit export improvements'] },
  { version: 'v4.7.9', channel: 'Stable', released: '2026-04-02', status: 'Supported', notes: ['Fairness monitor v2.1'] },
  { version: 'v4.6.4', channel: 'Stable', released: '2026-01-15', status: 'Deprecated', notes: ['End of support 2026-08-01'] },
]

export const LATEST_STABLE = 'v4.8.2'
export const LATEST_RC = 'v4.9.0-rc1'

/* ------------------------------------------------------------------ */
/* Deployments (one single-tenant environment per client)             */
/* ------------------------------------------------------------------ */
export type RolloutStatus = 'Up to date' | 'Update available' | 'Rolling out' | 'Rollback' | 'Offline'

export interface License {
  plan: string
  seats: number
  seatsUsed: number
  expiry: string
  status: 'Active' | 'Expiring' | 'Expired' | 'Trial'
}

export interface Deployment {
  id: string
  customer: string
  regionCode: string
  connectivity: Connectivity
  sovereignty: SovereigntyTier
  version: string
  target: string
  status: RolloutStatus
  lastSync: string
  // Kubernetes / infra
  nodes: number
  gpuNodes: number
  cpuPct: number
  memPct: number
  podsHealthy: number
  podsTotal: number
  k8sVersion: string
  // Commercial
  license: License
  // Air-gapped bundle sync (undefined for SaaS)
  bundleState?: 'Delivered' | 'Imported' | 'Verified' | 'Activated' | 'Pending'
}

export const deployments: Deployment[] = [
  { id: 'dep_meridian', customer: 'Meridian Bank', regionCode: 'us-east-1', connectivity: 'SaaS', sovereignty: 'Standard', version: 'v4.8.2', target: 'v4.8.2', status: 'Up to date', lastSync: '2 min ago', nodes: 6, gpuNodes: 4, cpuPct: 62, memPct: 58, podsHealthy: 42, podsTotal: 44, k8sVersion: '1.29', license: { plan: 'Enterprise', seats: 300, seatsUsed: 240, expiry: '2026-11-30', status: 'Active' } },
  { id: 'dep_helix', customer: 'Helix Health', regionCode: 'de-sov-1', connectivity: 'Air-gapped', sovereignty: 'Air-gapped', version: 'v4.8.1', target: 'v4.8.2', status: 'Update available', lastSync: '3 days ago', nodes: 5, gpuNodes: 2, cpuPct: 48, memPct: 51, podsHealthy: 30, podsTotal: 30, k8sVersion: '1.28', license: { plan: 'Enterprise', seats: 200, seatsUsed: 180, expiry: '2026-09-15', status: 'Active' }, bundleState: 'Delivered' },
  { id: 'dep_northwind', customer: 'Northwind Retail', regionCode: 'eu-central-1', connectivity: 'SaaS', sovereignty: 'Sovereign Cloud', version: 'v4.8.2', target: 'v4.8.2', status: 'Up to date', lastSync: '5 min ago', nodes: 3, gpuNodes: 1, cpuPct: 41, memPct: 44, podsHealthy: 18, podsTotal: 18, k8sVersion: '1.29', license: { plan: 'Business', seats: 120, seatsUsed: 96, expiry: '2026-08-01', status: 'Expiring' } },
  { id: 'dep_atlas', customer: 'Atlas Logistics', regionCode: 'us-east-1', connectivity: 'SaaS', sovereignty: 'Standard', version: 'v4.7.9', target: 'v4.8.2', status: 'Update available', lastSync: '8 min ago', nodes: 3, gpuNodes: 1, cpuPct: 55, memPct: 49, podsHealthy: 15, podsTotal: 16, k8sVersion: '1.28', license: { plan: 'Business', seats: 80, seatsUsed: 64, expiry: '2027-03-08', status: 'Active' } },
  { id: 'dep_vertex', customer: 'Vertex Capital', regionCode: 'ap-southeast-1', connectivity: 'SaaS', sovereignty: 'Sovereign Cloud', version: 'v4.9.0-rc1', target: 'v4.9.0-rc1', status: 'Rolling out', lastSync: '1 min ago', nodes: 5, gpuNodes: 3, cpuPct: 71, memPct: 66, podsHealthy: 33, podsTotal: 36, k8sVersion: '1.29', license: { plan: 'Enterprise', seats: 180, seatsUsed: 150, expiry: '2026-11-30', status: 'Active' } },
  { id: 'dep_pinecrest', customer: 'Pinecrest Insurance', regionCode: 'us-east-1', connectivity: 'SaaS', sovereignty: 'Standard', version: 'v4.8.2', target: 'v4.8.2', status: 'Up to date', lastSync: '4 min ago', nodes: 4, gpuNodes: 1, cpuPct: 50, memPct: 47, podsHealthy: 22, podsTotal: 22, k8sVersion: '1.29', license: { plan: 'Business', seats: 140, seatsUsed: 110, expiry: '2026-10-06', status: 'Active' } },
  { id: 'dep_ferro', customer: 'Ferro Manufacturing', regionCode: 'de-sov-1', connectivity: 'Air-gapped', sovereignty: 'Air-gapped', version: 'v4.7.9', target: 'v4.8.2', status: 'Update available', lastSync: '9 days ago', nodes: 3, gpuNodes: 1, cpuPct: 39, memPct: 42, podsHealthy: 14, podsTotal: 14, k8sVersion: '1.27', license: { plan: 'Growth', seats: 40, seatsUsed: 28, expiry: '2026-09-14', status: 'Active' }, bundleState: 'Pending' },
  { id: 'dep_lumen', customer: 'Lumen Media', regionCode: 'us-west-2', connectivity: 'SaaS', sovereignty: 'Standard', version: 'v4.8.2', target: 'v4.8.2', status: 'Up to date', lastSync: '6 min ago', nodes: 2, gpuNodes: 1, cpuPct: 44, memPct: 40, podsHealthy: 12, podsTotal: 12, k8sVersion: '1.29', license: { plan: 'Growth', seats: 40, seatsUsed: 32, expiry: '2026-12-22', status: 'Active' } },
  { id: 'dep_orbit', customer: 'Orbit Telecom', regionCode: 'ap-southeast-1', connectivity: 'SaaS', sovereignty: 'Sovereign Cloud', version: 'v4.6.4', target: 'v4.8.2', status: 'Offline', lastSync: '14 days ago', nodes: 0, gpuNodes: 0, cpuPct: 0, memPct: 0, podsHealthy: 0, podsTotal: 12, k8sVersion: '1.27', license: { plan: 'Business', seats: 100, seatsUsed: 80, expiry: '2026-07-01', status: 'Expired' } },
  { id: 'dep_saffron', customer: 'Saffron Foods', regionCode: 'eu-west-1', connectivity: 'SaaS', sovereignty: 'Sovereign Cloud', version: 'v4.9.0-rc1', target: 'v4.9.0-rc1', status: 'Up to date', lastSync: '3 min ago', nodes: 1, gpuNodes: 0, cpuPct: 22, memPct: 28, podsHealthy: 6, podsTotal: 6, k8sVersion: '1.29', license: { plan: 'Trial', seats: 20, seatsUsed: 12, expiry: '2026-07-18', status: 'Trial' } },
]

export const deploymentByCustomer = (customer: string) => deployments.find((d) => d.customer === customer)

/* ------------------------------------------------------------------ */
/* Update bundles (air-gapped delivery pipeline)                       */
/* ------------------------------------------------------------------ */
export type BundleState = 'Built' | 'Signed' | 'Delivered' | 'Imported' | 'Verified' | 'Activated' | 'Failed'
export interface UpdateBundle {
  id: string
  customer: string
  version: string
  sizeGb: number
  created: string
  state: BundleState
  signed: boolean
  checksum: string
}

export const bundles: UpdateBundle[] = [
  { id: 'bndl_hlx_482', customer: 'Helix Health', version: 'v4.8.2', sizeGb: 12.4, created: '2026-07-05', state: 'Delivered', signed: true, checksum: 'sha256:9f3c…a1b2' },
  { id: 'bndl_frr_482', customer: 'Ferro Manufacturing', version: 'v4.8.2', sizeGb: 11.9, created: '2026-07-06', state: 'Built', signed: true, checksum: 'sha256:7d40…0e18' },
  { id: 'bndl_hlx_481', customer: 'Helix Health', version: 'v4.8.1', sizeGb: 12.1, created: '2026-05-22', state: 'Activated', signed: true, checksum: 'sha256:1a2b…c3d4' },
  { id: 'bndl_frr_479', customer: 'Ferro Manufacturing', version: 'v4.7.9', sizeGb: 11.6, created: '2026-04-05', state: 'Activated', signed: true, checksum: 'sha256:5e6f…7a8b' },
  { id: 'bndl_hlx_479', customer: 'Helix Health', version: 'v4.7.9', sizeGb: 11.6, created: '2026-04-04', state: 'Verified', signed: true, checksum: 'sha256:2c3d…9f0a' },
]

/* ------------------------------------------------------------------ */
/* Aggregates                                                          */
/* ------------------------------------------------------------------ */
export const fleetTotals = {
  deployments: deployments.length,
  upToDate: deployments.filter((d) => d.status === 'Up to date').length,
  updateAvailable: deployments.filter((d) => d.status === 'Update available').length,
  rollingOut: deployments.filter((d) => d.status === 'Rolling out').length,
  offline: deployments.filter((d) => d.status === 'Offline').length,
  airgapped: deployments.filter((d) => d.connectivity === 'Air-gapped').length,
  sovereign: deployments.filter((d) => d.sovereignty !== 'Standard').length,
  regions: regions.length,
}

/** Count of deployments per platform version (for the distribution chart). */
export const versionDistribution = Array.from(
  deployments.reduce((m, d) => m.set(d.version, (m.get(d.version) ?? 0) + 1), new Map<string, number>()),
).map(([version, count]) => ({ version, count }))
