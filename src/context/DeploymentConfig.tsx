import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { deployments } from '@/data/fleet'

/**
 * Editable, persisted *desired-state* configuration for each customer's
 * single-tenant deployment — AWS region, compute (nodes / GPU / memory),
 * connectivity, and seats. Kept separate from the read-only *observed* metrics
 * in fleet.ts, mirroring the real control plane.
 *
 * Changes are modelled honestly: editing region/compute files a change request
 * (Pending → Applying → Applied), gated by provision.manage and audited by the
 * caller. Region and connectivity moves flag a maintenance window, reflecting
 * that these are real infrastructure operations, not instant field flips.
 */

export interface CustomerConfig {
  regionCode: string
  connectivity: string
  nodes: number
  gpuNodes: number
  memoryGb: number
  seats: number
}

export type ChangeStatus = 'Pending' | 'Applying' | 'Applied'
export interface ChangeRequest {
  id: string
  customer: string
  field: keyof CustomerConfig
  label: string
  from: string
  to: string
  status: ChangeStatus
  requested: string
  requestedBy: string
  needsWindow: boolean
}

export const AWS_REGIONS = ['us-east-1', 'us-west-2', 'eu-central-1', 'eu-west-1', 'ap-southeast-1', 'de-sov-1']
export const CONNECTIVITY_OPTIONS = ['SaaS', 'Sovereign Cloud', 'Air-gapped']

/** Human labels + whether a change to this field needs a maintenance window. */
export const FIELD_META: Record<keyof CustomerConfig, { label: string; unit?: string; window: boolean }> = {
  regionCode: { label: 'AWS region', window: true },
  connectivity: { label: 'Connectivity', window: true },
  nodes: { label: 'Cluster nodes', window: false },
  gpuNodes: { label: 'GPU nodes', window: false },
  memoryGb: { label: 'Cluster memory', unit: 'GB', window: false },
  seats: { label: 'Licensed seats', window: false },
}

interface Store {
  configs: Record<string, CustomerConfig>
  requests: ChangeRequest[]
}

interface DeployConfigValue {
  getConfig: (customer: string, fallbackRegion?: string) => CustomerConfig
  requestsFor: (customer: string) => ChangeRequest[]
  requestChanges: (customer: string, patch: Partial<CustomerConfig>, requestedBy: string) => ChangeRequest[]
  applyRequest: (id: string) => void
  cancelRequest: (id: string) => void
}

const Ctx = createContext<DeployConfigValue | null>(null)
const KEY = 'plcy.deployconfig.v1'

/** Seed one config from a deployment record (memory derived from node count). */
function seedFromDeployments(): Record<string, CustomerConfig> {
  const out: Record<string, CustomerConfig> = {}
  for (const d of deployments) {
    out[d.customer] = {
      regionCode: d.regionCode,
      connectivity: d.connectivity,
      nodes: d.nodes,
      gpuNodes: d.gpuNodes,
      memoryGb: d.nodes * 64,
      seats: d.license.seats,
    }
  }
  return out
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Store
      if (parsed?.configs && Array.isArray(parsed?.requests)) {
        // union any newly-shipped deployment seeds not already stored
        return { configs: { ...seedFromDeployments(), ...parsed.configs }, requests: parsed.requests }
      }
    }
  } catch {
    /* ignore */
  }
  return { configs: seedFromDeployments(), requests: [] }
}

function persist(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const defaultConfig = (regionCode = 'us-east-1'): CustomerConfig => ({
  regionCode,
  connectivity: 'SaaS',
  nodes: 2,
  gpuNodes: 0,
  memoryGb: 128,
  seats: 25,
})

export function DeploymentConfigProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(load)

  const commit = useCallback((next: Store) => {
    setStore(next)
    persist(next)
  }, [])

  const getConfig = useCallback(
    (customer: string, fallbackRegion = 'us-east-1') => store.configs[customer] ?? defaultConfig(fallbackRegion),
    [store],
  )

  const requestsFor = useCallback((customer: string) => store.requests.filter((r) => r.customer === customer), [store])

  let counter = 0
  const requestChanges = useCallback(
    (customer: string, patch: Partial<CustomerConfig>, requestedBy: string) => {
      const current = store.configs[customer] ?? defaultConfig()
      const now = stamp()
      const created: ChangeRequest[] = []
      for (const key of Object.keys(patch) as (keyof CustomerConfig)[]) {
        const to = patch[key]
        if (to === undefined || to === current[key]) continue
        const meta = FIELD_META[key]
        counter += 1
        created.push({
          id: `chg_${Date.now()}_${counter}`,
          customer,
          field: key,
          label: meta.label,
          from: `${current[key]}${meta.unit ? ' ' + meta.unit : ''}`,
          to: `${to}${meta.unit ? ' ' + meta.unit : ''}`,
          status: 'Pending',
          requested: now,
          requestedBy,
          needsWindow: meta.window,
        })
      }
      if (created.length === 0) return []
      // ensure a config row exists so future edits diff correctly
      const configs = store.configs[customer] ? store.configs : { ...store.configs, [customer]: current }
      commit({ configs, requests: [...created, ...store.requests] })
      return created
    },
    [store, commit],
  )

  const applyRequest = useCallback(
    (id: string) => {
      const req = store.requests.find((r) => r.id === id)
      if (!req) return
      const current = store.configs[req.customer] ?? defaultConfig()
      // parse numeric target back out (labels may carry a unit suffix)
      const raw = req.to.replace(/[^0-9.]/g, '')
      const isNumeric = ['nodes', 'gpuNodes', 'memoryGb', 'seats'].includes(req.field)
      const value = isNumeric ? Number(raw) : req.to
      const nextConfig: CustomerConfig = { ...current, [req.field]: value } as CustomerConfig
      commit({
        configs: { ...store.configs, [req.customer]: nextConfig },
        requests: store.requests.map((r) => (r.id === id ? { ...r, status: 'Applied' } : r)),
      })
    },
    [store, commit],
  )

  const cancelRequest = useCallback(
    (id: string) => commit({ ...store, requests: store.requests.filter((r) => r.id !== id) }),
    [store, commit],
  )

  return (
    <Ctx.Provider value={{ getConfig, requestsFor, requestChanges, applyRequest, cancelRequest }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDeploymentConfig(): DeployConfigValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDeploymentConfig must be used within DeploymentConfigProvider')
  return ctx
}
