/**
 * Editable cluster configuration (desired state) — the operator-controlled
 * knobs that sit on top of the observed cluster. Seeded from the deployment,
 * persisted to localStorage per cluster id, and surfaced on the cluster page.
 */
import type { Deployment } from './fleet'
import { nodePoolsFor, addonsFor } from './clusters'
import { releases } from './fleet'

export interface PoolConfig {
  name: string
  instance: string
  desired: number
  min: number
  max: number
}
export interface AddonConfig {
  name: string
  component: string
  version: string
  enabled: boolean
}
export interface LabelPair {
  key: string
  value: string
}

export interface ClusterConfig {
  autoscaling: boolean
  pools: PoolConfig[]
  targetK8s: string
  targetRelease: string
  maintenanceWindow: string
  autoApply: boolean
  cpuAlert: number
  memAlert: number
  addons: AddonConfig[]
  labels: LabelPair[]
}

export const K8S_VERSIONS = ['1.27', '1.28', '1.29', '1.30']
export const RELEASE_OPTIONS = releases.map((r) => r.version)

export function defaultConfig(d: Deployment): ClusterConfig {
  const slug = d.customer.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return {
    autoscaling: true,
    pools: nodePoolsFor(d).map((p) => ({
      name: p.name,
      instance: p.instance,
      desired: p.count,
      min: Math.max(1, p.count - 1),
      max: p.count + 3,
    })),
    targetK8s: d.k8sVersion,
    targetRelease: d.target,
    maintenanceWindow: 'Sat 02:00–04:00 UTC',
    autoApply: d.connectivity !== 'Air-gapped',
    cpuAlert: 85,
    memAlert: 85,
    addons: addonsFor(d).map((a) => ({ name: a.name, component: a.component, version: a.version, enabled: true })),
    labels: [
      { key: 'tenant', value: slug },
      { key: 'sovereignty', value: d.sovereignty },
      { key: 'managed-by', value: 'terraform' },
    ],
  }
}

const key = (id: string) => `plcy.cluster.cfg.${id}`

export function loadConfig(id: string, d: Deployment): ClusterConfig {
  try {
    const raw = localStorage.getItem(key(id))
    if (!raw) return defaultConfig(d)
    return JSON.parse(raw) as ClusterConfig
  } catch {
    return defaultConfig(d)
  }
}

export function saveConfig(id: string, cfg: ClusterConfig): boolean {
  try {
    localStorage.setItem(key(id), JSON.stringify(cfg))
    return true
  } catch {
    return false
  }
}

export function resetConfig(id: string): void {
  try {
    localStorage.removeItem(key(id))
  } catch {
    /* ignore */
  }
}
