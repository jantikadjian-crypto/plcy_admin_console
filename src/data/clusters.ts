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
export interface HelmRevision {
  revision: number
  when: string
  note: string
  values: string
}
export interface HelmRelease {
  name: string
  chart: string
  chartVersion: string
  appVersion: string
  revision: number
  namespace: string
  status: HelmStatus
  /** Live rendered values (YAML). */
  values: string
  history: HelmRevision[]
}

export function helmFor(d: Deployment): HelmRelease[] {
  const offline = d.status === 'Offline'
  const slug = d.customer.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const base = d.nodes > 4 ? 4 : 3

  const platformValues = (tag: string, replicas: number) =>
    [
      `replicaCount: ${replicas}`,
      'image:',
      '  repository: registry.plcy.app/plcy/policy-engine',
      `  tag: ${tag}`,
      'resources:',
      '  requests:',
      '    cpu: 500m',
      '    memory: 1Gi',
      'autoscaling:',
      '  enabled: true',
      `  minReplicas: ${Math.max(1, replicas - 1)}`,
      `  maxReplicas: ${replicas + 3}`,
      'ingress:',
      '  enabled: true',
      `  host: ${slug}.plcy.app`,
      'sovereignty:',
      `  tier: ${d.sovereignty}`,
    ].join('\n')

  const platform: HelmRelease = {
    name: 'plcy-platform', chart: 'plcy-platform', chartVersion: d.version.replace('v', ''), appVersion: d.version, revision: 12,
    namespace: 'plcy-system', status: offline ? 'pending' : 'deployed',
    values: platformValues(d.version, base),
    history: [
      { revision: 12, when: '2 days ago', note: `Upgrade to ${d.version}`, values: platformValues(d.version, base) },
      { revision: 11, when: '3 weeks ago', note: 'Scale up · v4.8.1', values: platformValues('v4.8.1', base) },
      { revision: 10, when: '6 weeks ago', note: 'Initial install · v4.8.1', values: platformValues('v4.8.1', Math.max(1, base - 1)) },
    ],
  }

  const simple = (name: string, chart: string, cv: string, av: string, rev: number, ns: string, extra: string): HelmRelease => {
    const values = [`fullnameOverride: ${name}`, `image:`, `  tag: ${av}`, extra].join('\n')
    return {
      name, chart, chartVersion: cv, appVersion: av, revision: rev, namespace: ns, status: 'deployed',
      values,
      history: [
        { revision: rev, when: '3 weeks ago', note: `Upgrade to ${av}`, values },
        { revision: rev - 1, when: '8 weeks ago', note: 'Initial install', values: values.replace(`tag: ${av}`, 'tag: (previous)') },
      ],
    }
  }

  return [
    platform,
    simple('ingress-nginx', 'ingress-nginx', '4.10.1', '1.10.1', 3, 'ingress', 'controller:\n  replicaCount: 2\n  service:\n    type: LoadBalancer'),
    simple('cert-manager', 'cert-manager', '1.14.5', '1.14.5', 2, 'cert-manager', 'installCRDs: true\nprometheus:\n  enabled: true'),
    simple('kube-prometheus-stack', 'kube-prometheus-stack', '58.2.1', '0.73.0', 5, 'monitoring', 'grafana:\n  enabled: true\nretention: 30d'),
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

/* ------------------------------------------------------------------ */
/* Pods & logs (for a workload)                                        */
/* ------------------------------------------------------------------ */
export type PodStatus = 'Running' | 'CrashLoopBackOff' | 'Pending' | 'Terminating'
export interface Pod {
  name: string
  node: string
  status: PodStatus
  restarts: number
  age: string
}

const POD_AGES = ['2d', '18h', '5h', '47m', '12m', '3m']

export function podsForWorkload(w: Workload, regionCode: string): Pod[] {
  const n = Math.max(w.replicas, 1)
  return Array.from({ length: n }, (_, i) => {
    const bad = w.status !== 'Running' && i === n - 1
    return {
      name: `${w.name}-${shortDigest(w.name + i).slice(0, 8)}-${shortDigest(w.name + 'p' + i).slice(0, 5)}`,
      node: `${regionCode}-node-${String((i % 6) + 1).padStart(2, '0')}`,
      status: w.status === 'Pending' ? 'Pending' : bad ? 'CrashLoopBackOff' : 'Running',
      restarts: bad ? w.restarts : 0,
      age: POD_AGES[i % POD_AGES.length],
    }
  })
}

export function workloadLogs(w: Workload): string[] {
  if (w.status === 'Pending') return ['waiting for scheduler…', `0/${w.replicas} pods ready`]
  const base = [
    `level=info msg="starting ${w.name}" image=${w.image}`,
    `level=info msg="config loaded" policyPacks=6`,
    'level=info msg="connected to control plane"',
    `level=info msg="serving" addr=:8080 ready=${w.replicasReady}/${w.replicas}`,
  ]
  if (w.status === 'Degraded') {
    base.push(`level=warn msg="readiness probe failed" restarts=${w.restarts}`)
    base.push('level=error msg="container OOMKilled — restarting"')
  }
  return base
}

/* ------------------------------------------------------------------ */
/* Node pools                                                          */
/* ------------------------------------------------------------------ */
export interface NodePool {
  name: string
  count: number
  instance: string
}

export function nodePoolsFor(d: Deployment): NodePool[] {
  if (d.nodes === 0) return []
  const pools: NodePool[] = [{ name: 'system', count: 2, instance: 'm5.xlarge' }]
  if (d.gpuNodes > 0) pools.push({ name: 'inference-gpu', count: d.gpuNodes, instance: 'g5.xlarge' })
  const rest = d.nodes - 2 - d.gpuNodes
  if (rest > 0) pools.push({ name: 'general', count: rest, instance: 'm5.2xlarge' })
  return pools
}

/* Fleet-level helpers */
export const clusterTotals = (deps: Deployment[]) => {
  const drifted = deps.filter((d) => terraformFor(d).drift === 'Drift detected').length
  const workloads = deps.reduce((s, d) => s + (d.status === 'Offline' ? 0 : workloadsFor(d).length), 0)
  return { drifted, workloads }
}
