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

/* ------------------------------------------------------------------ */
/* Namespace guardrails (quotas, network policy, pod security)          */
/* ------------------------------------------------------------------ */
export type PSALevel = 'privileged' | 'baseline' | 'restricted'
export type PSAMode = 'enforce' | 'audit' | 'warn'
export type NetDirection = 'Ingress' | 'Egress'
export interface NetRule {
  name: string
  direction: NetDirection
  peer: string
  ports: string
  allowed: boolean
}
export interface NamespaceGuardrails {
  namespace: string
  psa: PSALevel
  psaMode: PSAMode
  cpuUsed: number
  cpuQuota: number
  memUsed: number
  memQuota: number
  podsUsed: number
  podsQuota: number
  defaultDeny: boolean
  rules: NetRule[]
}

export function namespacesFor(d: Deployment): NamespaceGuardrails[] {
  const air = d.connectivity === 'Air-gapped'
  const u = (quota: number) => Math.round(quota * (d.cpuPct / 100) * 10) / 10
  const dns: NetRule = { name: 'allow-dns', direction: 'Egress', peer: 'kube-dns', ports: 'UDP/53', allowed: true }
  return [
    {
      namespace: 'plcy-system', psa: 'restricted', psaMode: 'enforce',
      cpuUsed: u(16), cpuQuota: 16, memUsed: Math.round(32 * (d.memPct / 100)), memQuota: 32, podsUsed: Math.min(d.podsHealthy, 40), podsQuota: 40,
      defaultDeny: true,
      rules: [
        dns,
        { name: 'egress-control-plane', direction: 'Egress', peer: 'control-plane', ports: 'TCP/443', allowed: true },
        { name: 'egress-model-providers', direction: 'Egress', peer: 'external model APIs', ports: 'TCP/443', allowed: !air },
        { name: 'ingress-from-gateway', direction: 'Ingress', peer: 'ingress-nginx', ports: 'TCP/8080', allowed: true },
      ],
    },
    {
      namespace: 'plcy-data', psa: 'restricted', psaMode: 'enforce',
      cpuUsed: u(8), cpuQuota: 8, memUsed: Math.round(24 * (d.memPct / 100)), memQuota: 24, podsUsed: 4, podsQuota: 12,
      defaultDeny: true,
      rules: [
        dns,
        { name: 'ingress-from-system', direction: 'Ingress', peer: 'plcy-system', ports: 'TCP/5432,6379', allowed: true },
        { name: 'egress-external', direction: 'Egress', peer: 'internet', ports: 'any', allowed: false },
      ],
    },
    {
      namespace: 'ingress', psa: 'baseline', psaMode: 'enforce',
      cpuUsed: u(4), cpuQuota: 4, memUsed: Math.round(8 * (d.memPct / 100)), memQuota: 8, podsUsed: d.nodes, podsQuota: 10,
      defaultDeny: false,
      rules: [
        { name: 'ingress-internet', direction: 'Ingress', peer: 'load balancer', ports: 'TCP/443', allowed: true },
        { name: 'egress-to-system', direction: 'Egress', peer: 'plcy-system', ports: 'TCP/8080', allowed: true },
      ],
    },
    {
      namespace: 'cert-manager', psa: 'restricted', psaMode: 'enforce',
      cpuUsed: u(1), cpuQuota: 2, memUsed: 1, memQuota: 4, podsUsed: 2, podsQuota: 6,
      defaultDeny: true,
      rules: [
        dns,
        { name: 'egress-acme', direction: 'Egress', peer: "Let's Encrypt ACME", ports: 'TCP/443', allowed: !air },
      ],
    },
    {
      namespace: 'monitoring', psa: 'baseline', psaMode: 'audit',
      cpuUsed: u(6), cpuQuota: 6, memUsed: Math.round(12 * (d.memPct / 100)), memQuota: 12, podsUsed: 8, podsQuota: 20,
      defaultDeny: true,
      rules: [
        dns,
        { name: 'egress-scrape', direction: 'Egress', peer: 'all namespaces (metrics)', ports: 'TCP/9090-9100', allowed: true },
      ],
    },
  ]
}

/* Fleet-level helpers */
export const clusterTotals = (deps: Deployment[]) => {
  const drifted = deps.filter((d) => terraformFor(d).drift === 'Drift detected').length
  const workloads = deps.reduce((s, d) => s + (d.status === 'Offline' ? 0 : workloadsFor(d).length), 0)
  return { drifted, workloads }
}

/* ------------------------------------------------------------------ */
/* Image drift — registry promoted tag vs what a cluster runs           */
/* ------------------------------------------------------------------ */
/**
 * Maps a cluster workload to the registry image whose *promoted* tag defines
 * its desired version. The core PLCY platform components ship together from the
 * platform chart, so those without a dedicated image track the platform image
 * (policy-engine). Mirrored infra images (postgres, redis, ingress) aren't
 * promoted through the PLCY registry, so they're untracked.
 */
const COMPONENT_IMAGE: Record<string, string> = {
  'plcy-policy-engine': 'img_policy_engine',
  'plcy-model-gateway': 'img_model_gateway',
  'plcy-api': 'img_api_gateway',
  'plcy-redactor': 'img_policy_engine',
  'plcy-evaluator': 'img_policy_engine',
  'plcy-audit-sink': 'img_policy_engine',
}

export type ImageDriftStatus = 'In sync' | 'Behind' | 'Ahead' | 'Untracked'
export interface ImageDrift {
  imageId: string | null
  deployedTag: string
  promotedTag: string
  status: ImageDriftStatus
}

/** The tag portion of a workload image ref, e.g. `…/policy-engine:v4.8.2` → `v4.8.2`. */
export function deployedTagOf(w: Workload): string {
  const i = w.image.lastIndexOf(':')
  return i > w.image.lastIndexOf('/') ? w.image.slice(i + 1) : ''
}

/** Rough semver compare that treats `-rc*` as just below the same core release. */
function verValue(v: string): number[] {
  const [core, pre] = v.replace(/^v/, '').split('-')
  const nums = core.split('.').map((n) => Number(n) || 0)
  while (nums.length < 3) nums.push(0)
  // pre-release ranks below the final of the same core version
  nums.push(pre ? -1 : 0)
  return nums
}
export function compareVer(a: string, b: string): number {
  const av = verValue(a)
  const bv = verValue(b)
  for (let i = 0; i < Math.max(av.length, bv.length); i++) {
    const d = (av[i] ?? 0) - (bv[i] ?? 0)
    if (d !== 0) return d < 0 ? -1 : 1
  }
  return 0
}

export function imageDriftFor(w: Workload, promoted: Record<string, string>): ImageDrift {
  const imageId = COMPONENT_IMAGE[w.name] ?? null
  const deployedTag = deployedTagOf(w)
  if (!imageId) return { imageId: null, deployedTag, promotedTag: '', status: 'Untracked' }
  const promotedTag = promoted[imageId] ?? ''
  if (!promotedTag || !deployedTag) return { imageId, deployedTag, promotedTag, status: 'Untracked' }
  const c = compareVer(deployedTag, promotedTag)
  return { imageId, deployedTag, promotedTag, status: c === 0 ? 'In sync' : c < 0 ? 'Behind' : 'Ahead' }
}

/** Per-deployment roll-up of tracked workloads that are behind/ahead of promoted. */
export function imageDriftForDeployment(d: Deployment, promoted: Record<string, string>) {
  if (d.status === 'Offline') return { behind: 0, ahead: 0, inSync: 0, tracked: 0, offline: true }
  let behind = 0
  let ahead = 0
  let inSync = 0
  for (const w of workloadsFor(d)) {
    const drift = imageDriftFor(w, promoted)
    if (drift.status === 'Untracked') continue
    if (drift.status === 'Behind') behind++
    else if (drift.status === 'Ahead') ahead++
    else inSync++
  }
  return { behind, ahead, inSync, tracked: behind + ahead + inSync, offline: false }
}

/** Fleet adoption of a single image's promoted tag across live clusters. */
export function imageAdoption(imageId: string, deps: Deployment[], promoted: Record<string, string>) {
  const promotedTag = promoted[imageId] ?? ''
  let onPromoted = 0
  let behind = 0
  let ahead = 0
  for (const d of deps) {
    if (d.status === 'Offline') continue
    const w = workloadsFor(d).find((x) => COMPONENT_IMAGE[x.name] === imageId)
    if (!w) continue
    const c = compareVer(deployedTagOf(w), promotedTag)
    if (c === 0) onPromoted++
    else if (c < 0) behind++
    else ahead++
  }
  return { promotedTag, onPromoted, behind, ahead, live: onPromoted + behind + ahead }
}

/** Per-cluster view of a single image: which tenants run it and whether they're behind. */
export interface ImageClusterRow {
  id: string
  customer: string
  regionCode: string
  deployedTag: string
  status: ImageDriftStatus
  offline: boolean
}
export function imageClusters(imageId: string, deps: Deployment[], promoted: Record<string, string>): ImageClusterRow[] {
  const promotedTag = promoted[imageId] ?? ''
  const rows: ImageClusterRow[] = []
  for (const d of deps) {
    const w = workloadsFor(d).find((x) => COMPONENT_IMAGE[x.name] === imageId)
    if (!w) continue
    const deployedTag = deployedTagOf(w)
    const offline = d.status === 'Offline'
    const c = compareVer(deployedTag, promotedTag)
    rows.push({
      id: d.id,
      customer: d.customer,
      regionCode: d.regionCode,
      deployedTag,
      status: offline ? 'Untracked' : c === 0 ? 'In sync' : c < 0 ? 'Behind' : 'Ahead',
      offline,
    })
  }
  return rows
}

/** Fleet-wide count of clusters running at least one workload behind promoted. */
export function imageDriftTotals(deps: Deployment[], promoted: Record<string, string>) {
  let clustersBehind = 0
  let workloadsBehind = 0
  for (const d of deps) {
    const r = imageDriftForDeployment(d, promoted)
    if (r.behind > 0) {
      clustersBehind++
      workloadsBehind += r.behind
    }
  }
  return { clustersBehind, workloadsBehind }
}

/* ------------------------------------------------------------------ */
/* Fleet posture — guardrails + drift rolled up across every tenant     */
/* ------------------------------------------------------------------ */
export type ClusterHealth = 'Healthy' | 'Degraded' | 'Offline'

/** Per-namespace posture summary derived from its guardrails. */
export interface NsPosture {
  namespace: string
  maxQuotaPct: number
  quotaHot: boolean
  quotaWarn: boolean
  psa: PSALevel
  psaMode: PSAMode
  psaWeak: boolean
  defaultDeny: boolean
  extEgress: boolean
}

/** One row per tenant: drift + guardrail posture, ready for a fleet table. */
export interface ClusterPosture {
  d: Deployment
  health: ClusterHealth
  tfDrift: DriftStatus
  tfDriftedResources: number
  imageBehind: number
  imageAhead: number
  namespaces: NsPosture[]
  quotaHot: number
  maxQuotaPct: number
  psaWeak: number
  extEgress: number
  hasDrift: boolean
  score: number
}

const EXTERNAL_PEER = /external|internet|model|acme|encrypt/i

function nsPosture(ns: NamespaceGuardrails): NsPosture {
  const pct = (u: number, q: number) => (q ? (u / q) * 100 : 0)
  const maxQuotaPct = Math.round(Math.max(pct(ns.cpuUsed, ns.cpuQuota), pct(ns.memUsed, ns.memQuota), pct(ns.podsUsed, ns.podsQuota)))
  return {
    namespace: ns.namespace,
    maxQuotaPct,
    quotaHot: maxQuotaPct >= 90,
    quotaWarn: maxQuotaPct >= 75,
    psa: ns.psa,
    psaMode: ns.psaMode,
    psaWeak: ns.psa === 'privileged' || ns.psaMode !== 'enforce',
    defaultDeny: ns.defaultDeny,
    extEgress: ns.rules.some((r) => r.direction === 'Egress' && r.allowed && EXTERNAL_PEER.test(r.peer)),
  }
}

export function clusterPosture(d: Deployment, promoted: Record<string, string>): ClusterPosture {
  const health: ClusterHealth = d.status === 'Offline' ? 'Offline' : d.podsHealthy < d.podsTotal ? 'Degraded' : 'Healthy'
  const tf = terraformFor(d)
  const img = imageDriftForDeployment(d, promoted)
  const namespaces = namespacesFor(d).map(nsPosture)
  const quotaHot = namespaces.filter((n) => n.quotaHot).length
  const maxQuotaPct = namespaces.reduce((m, n) => Math.max(m, n.maxQuotaPct), 0)
  const psaWeak = namespaces.filter((n) => n.psaWeak).length
  const extEgress = namespaces.filter((n) => n.extEgress).length
  const hasDrift = tf.drift === 'Drift detected' || img.behind > 0
  // Weighted so the most at-risk tenants sort to the top.
  const score =
    (health === 'Offline' ? 50 : health === 'Degraded' ? 20 : 0) +
    (tf.drift === 'Drift detected' ? 10 : 0) +
    img.behind * 4 +
    quotaHot * 6 +
    psaWeak * 2
  return {
    d,
    health,
    tfDrift: tf.drift,
    tfDriftedResources: tf.driftedResources,
    imageBehind: img.behind,
    imageAhead: img.ahead,
    namespaces,
    quotaHot,
    maxQuotaPct,
    psaWeak,
    extEgress,
    hasDrift,
    score,
  }
}

export function fleetPosture(deps: Deployment[], promoted: Record<string, string>): ClusterPosture[] {
  return deps.map((d) => clusterPosture(d, promoted)).sort((a, b) => b.score - a.score)
}

/** Headline counters for the fleet-posture summary cards. */
export function fleetPostureTotals(rows: ClusterPosture[]) {
  return {
    clustersDrift: rows.filter((r) => r.hasDrift).length,
    quotaHotNamespaces: rows.reduce((s, r) => s + r.quotaHot, 0),
    psaWeakNamespaces: rows.reduce((s, r) => s + r.psaWeak, 0),
    clustersExtEgress: rows.filter((r) => r.extEgress > 0).length,
  }
}
