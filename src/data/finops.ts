/**
 * FinOps — what it costs PLCY to run each single-tenant deployment, next to the
 * revenue that tenant pays, so margin per customer is visible.
 *
 * Infra cost is modelled from the tenant's real deployment (compute nodes, GPU
 * nodes, storage) plus the operational premium of its sovereignty tier
 * (in-region HSM/BYOK, and the heavy support cost of air-gapped sites). Revenue
 * comes from the billing record. Everything is a monthly figure.
 */
import { deployments } from './fleet'
import type { Deployment } from './fleet'
import { customerBilling } from './billing'

export interface CostBreakdown {
  compute: number
  storage: number
  egress: number
  support: number
  hsm: number
}
export interface FinOpsRow {
  customer: string
  plan: string
  regionCode: string
  sovereignty: string
  connectivity: string
  status: string
  mrr: number
  overage: number
  cost: number
  breakdown: CostBreakdown
  margin: number
  /** null when there is no revenue (trial / suspended) — margin % is undefined. */
  marginPct: number | null
  nodes: number
  gpuNodes: number
}

/* Monthly unit rates (USD). */
const CPU_NODE = 300 // general/system node, reserved
const GPU_NODE = 740 // inference GPU node
const STORAGE_PER_GB = 0.12 // block storage + backup
const BACKUP_BASE = 40
const EGRESS_PER_M_EVALS = 6 // data transfer, scaled by API evaluations
const SUPPORT: Record<string, number> = { Standard: 250, 'Sovereign Cloud': 700, 'Air-gapped': 1600 }
const HSM = 300 // customer-managed keys (BYOK) for regulated tiers

const round = (n: number) => Math.round(n)

export function costForDeployment(d: Deployment): CostBreakdown {
  const air = d.connectivity === 'Air-gapped'
  const b = customerBilling.find((x) => x.customer === d.customer)
  const storageGb = b?.meters.find((m) => m.label === 'Storage')?.used ?? d.nodes * 60
  const evalsM = (b?.meters.find((m) => m.label === 'API evaluations')?.used ?? 0) / 1e6

  return {
    compute: round((d.nodes - d.gpuNodes) * CPU_NODE + d.gpuNodes * GPU_NODE),
    storage: round(storageGb * STORAGE_PER_GB + BACKUP_BASE),
    // Air-gapped sites have no cloud egress; support/handling shows up under support.
    egress: air ? 0 : round(evalsM * EGRESS_PER_M_EVALS),
    support: SUPPORT[d.sovereignty] ?? SUPPORT.Standard,
    hsm: d.sovereignty === 'Standard' ? 0 : HSM,
  }
}

export const costTotal = (c: CostBreakdown) => c.compute + c.storage + c.egress + c.support + c.hsm

export function finopsRows(): FinOpsRow[] {
  return deployments
    .map((d) => {
      const b = customerBilling.find((x) => x.customer === d.customer)
      const breakdown = costForDeployment(d)
      const cost = costTotal(breakdown)
      const mrr = b?.mrr ?? 0
      const margin = mrr - cost
      return {
        customer: d.customer,
        plan: b?.plan ?? '—',
        regionCode: d.regionCode,
        sovereignty: d.sovereignty,
        connectivity: d.connectivity,
        status: d.status,
        mrr,
        overage: b?.overage ?? 0,
        cost,
        breakdown,
        margin,
        marginPct: mrr > 0 ? Math.round((margin / mrr) * 100) : null,
        nodes: d.nodes,
        gpuNodes: d.gpuNodes,
      }
    })
    .sort((a, b) => a.margin - b.margin) // worst margin first — surface money-losers
}

export function finopsTotals(rows: FinOpsRow[]) {
  const mrr = rows.reduce((s, r) => s + r.mrr, 0)
  const cost = rows.reduce((s, r) => s + r.cost, 0)
  const margin = mrr - cost
  return {
    mrr,
    cost,
    margin,
    marginPct: mrr > 0 ? Math.round((margin / mrr) * 100) : 0,
    unprofitable: rows.filter((r) => r.margin < 0).length,
  }
}

/** Fleet cost split by component, for the breakdown chart. */
export function costByComponent(rows: FinOpsRow[]) {
  const sum = (k: keyof CostBreakdown) => rows.reduce((s, r) => s + r.breakdown[k], 0)
  return [
    { name: 'Compute', value: sum('compute'), color: '#3366ff' },
    { name: 'GPU / support', value: sum('support'), color: '#8b5cf6' },
    { name: 'Storage', value: sum('storage'), color: '#10b981' },
    { name: 'HSM / BYOK', value: sum('hsm'), color: '#f59e0b' },
    { name: 'Egress', value: sum('egress'), color: '#64748b' },
  ]
}
