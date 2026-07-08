/**
 * Cluster internals: the workloads (containers/images) running inside each
 * single-tenant Kubernetes cluster, the Terraform/IaC that provisions it, its
 * Helm releases, and platform add-ons. Derived deterministically from the
 * deployment record so the fleet stays internally consistent.
 */
import type { Deployment } from './fleet'

/* Deterministic short hex "digest" so images look real without randomness. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function shortDigest(s: string): string {
  let out = ''
  let h = hash(s)
  for (let i = 0; i < 12; i++) {
    out += (h & 0xf).toString(16)
    h = Math.imul(h ^ (h >>> 4), 16777619) >>> 0
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Workloads                                                           */
/* ------------------------------------------------------------------ */
export type WorkloadKind = 'Deployment' | 'StatefulSet' | 'DaemonSet'
export type WorkloadStatus = 'Running' | 'Degraded' | 'Pending'

export interface Workload {
  name: string
  namespace: string
  kind: WorkloadKind
  image: string
  digest: string
  replicas: number
  replicasReady: number
  restarts: number
  cpu: string
  mem: string
  status: WorkloadStatus
  signed: boolean
  cves: number
}

const PLCY_COMPONENTS: { name: string; ns: string; base: number; cpu: string; mem: string; gpu?: boolean }[] = [
  { name: 'policy-engine', ns: 'plcy-system', base: 3, cpu: '500m', mem: '1Gi' },
  { name: 'model-gateway', ns: 'plcy-system', base: 3, cpu: '1', mem: '2Gi' },
  { name: 'api', ns: 'plcy-system', base: 2, cpu: '500m', mem: '1Gi' },
  { name: 'redactor', ns: 'plcy-system', base: 2, cpu: '250m', mem: '512Mi' },
  { name: 'evaluator', ns: 'plcy-system', base: 2, cpu: '500m', mem: '1Gi', gpu: true },
  { name: 'audit-sink', ns: 'plcy-system', base: 1, cpu: '250m', mem: '512Mi' },
]

const REG = 'registry.plcy.app'

export function workloadsFor(d: Deployment): Workload[] {
  const offline = d.status === 'Offline'
  const bad = d.podsHealthy < d.podsTotal
  const comps = PLCY_COMPONENTS.filter((c) => !c.gpu || d.gpuNodes > 0)

  const list: Workload[] = comps.map((c, i) => {
    const replicas = c.base + (d.nodes > 4 ? 1 : 0)
    const degraded = !offline && bad && i === 0
    return {
      name: `plcy-${c.name}`,
      namespace: c.ns,
      kind: 'Deployment',
      image: `${REG}/plcy/${c.name}:${d.version}`,
      digest: `sha256:${shortDigest(c.name + d.version)}`,
      replicas,
      replicasReady: offline ? 0 : degraded ? replicas - 1 : replicas,
      restarts: offline ? 0 : degraded ? 4 : 0,
      cpu: c.cpu,
      mem: c.mem,
      status: offline ? 'Pending' : degraded ? 'Degraded' : 'Running',
      signed: true,
      // Deprecated release still ships an unpatched gateway CVE.
      cves: c.name === 'model-gateway' && d.version === 'v4.6.4' ? 1 : 0,
    }
  })

  const infra: Workload[] = [
    { name: 'postgres', namespace: 'plcy-data', kind: 'StatefulSet', image: `${REG}/mirror/postgres:16.3`, digest: `sha256:${shortDigest('postgres16.3')}`, replicas: 1, replicasReady: offline ? 0 : 1, restarts: 0, cpu: '1', mem: '2Gi', status: offline ? 'Pending' : 'Running', signed: true, cves: 0 },
    { name: 'redis', namespace: 'plcy-data', kind: 'StatefulSet', image: `${REG}/mirror/redis:7.2`, digest: `sha256:${shortDigest('redis7.2')}`, replicas: 1, replicasReady: offline ? 0 : 1, restarts: 0, cpu: '250m', mem: '512Mi', status: offline ? 'Pending' : 'Running', signed: true, cves: 0 },
    { name: 'ingress-nginx', namespace: 'ingress', kind: 'DaemonSet', image: `${REG}/mirror/ingress-nginx:1.10.1`, digest: `sha256:${shortDigest('ingress1.10.1')}`, replicas: d.nodes, replicasReady: offline ? 0 : d.nodes, restarts: 0, cpu: '100m', mem: '256Mi', status: offline ? 'Pending' : 'Running', signed: true, cves: 0 },
  ]

  return [...list, ...infra]
}

/* ------------------------------------------------------------------ */
/* Terraform / IaC                                                     */
/* ------------------------------------------------------------------ */
export type DriftStatus = 'In sync' | 'Drift detected' | 'Unknown'

export interface Terraform {
  workspace: string
  provider: string
  backend: string
  module: string
  moduleVersion: string
  resources: number
  drift: DriftStatus
  driftedResources: number
  lastApply: string
  planPending: boolean
  appliedBy: string
}

const DRIFTED = new Set(['dep_atlas', 'dep_ferro'])

export function terraformFor(d: Deployment): Terraform {
  const slug = d.customer.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const air = d.connectivity === 'Air-gapped'
  const drift: DriftStatus = d.status === 'Offline' ? 'Unknown' : DRIFTED.has(d.id) ? 'Drift detected' : 'In sync'
  return {
    workspace: `plcy-${slug}-${d.regionCode}`,
    provider: air ? 'AWS (isolated VPC)' : 'AWS',
    backend: air ? 'S3-compatible (MinIO) + DynamoDB lock' : 'S3 + DynamoDB lock',
    module: 'plcy/eks-tenant',
    moduleVersion: '1.14.0',
    resources: 38 + d.nodes,
    drift,
    driftedResources: drift === 'Drift detected' ? 2 : 0,
    lastApply: air ? '4 days ago' : '2 days ago',
    planPending: drift === 'Drift detected',
    appliedBy: 'ci-bot@plcy.app',
  }
}

/* ------------------------------------------------------------------ */
/* Helm releases                                                       */
/* ------------------------------------------------------------------ */
export type HelmStatus = 'deployed' | 'pending' | 'failed'
export interface HelmRelease {
  name: string
  chart: string
  chartVersion: string
  appVersion: string
  revision: number
  namespace: string
  status: HelmStatus
}

export function helmFor(d: Deployment): HelmRelease[] {
  const offline = d.status === 'Offline'
  return [
    { name: 'plcy-platform', chart: 'plcy-platform', chartVersion: d.version.replace('v', ''), appVersion: d.version, revision: 12, namespace: 'plcy-system', status: offline ? 'pending' : 'deployed' },
    { name: 'ingress-nginx', chart: 'ingress-nginx', chartVersion: '4.10.1', appVersion: '1.10.1', revision: 3, namespace: 'ingress', status: 'deployed' },
    { name: 'cert-manager', chart: 'cert-manager', chartVersion: '1.14.5', appVersion: '1.14.5', revision: 2, namespace: 'cert-manager', status: 'deployed' },
    { name: 'kube-prometheus-stack', chart: 'kube-prometheus-stack', chartVersion: '58.2.1', appVersion: '0.73.0', revision: 5, namespace: 'monitoring', status: 'deployed' },
  ]
}

/* ------------------------------------------------------------------ */
/* Platform add-ons                                                    */
/* ------------------------------------------------------------------ */
export type AddonStatus = 'Healthy' | 'Degraded'
export interface Addon {
  name: string
  component: string
  version: string
  status: AddonStatus
}

export function addonsFor(d: Deployment): Addon[] {
  const bad = d.podsHealthy < d.podsTotal && d.status !== 'Offline'
  const off = d.status === 'Offline'
  const s = (degraded: boolean): AddonStatus => (off || degraded ? 'Degraded' : 'Healthy')
  return [
    { name: 'CNI', component: 'Cilium', version: '1.15.4', status: s(false) },
    { name: 'Ingress', component: 'ingress-nginx', version: '1.10.1', status: s(false) },
    { name: 'Certificates', component: 'cert-manager', version: '1.14.5', status: s(false) },
    { name: 'Storage (CSI)', component: 'aws-ebs-csi-driver', version: '1.30.0', status: s(false) },
    { name: 'Autoscaler', component: 'cluster-autoscaler', version: '1.29.0', status: s(bad) },
    { name: 'Monitoring', component: 'kube-prometheus-stack', version: '0.73.0', status: s(false) },
    { name: 'Secrets', component: 'external-secrets', version: '0.9.16', status: s(false) },
  ]
}

/* Fleet-level helpers */
export const clusterTotals = (deps: Deployment[]) => {
  const drifted = deps.filter((d) => terraformFor(d).drift === 'Drift detected').length
  const workloads = deps.reduce((s, d) => s + (d.status === 'Offline' ? 0 : workloadsFor(d).length), 0)
  return { drifted, workloads }
}
