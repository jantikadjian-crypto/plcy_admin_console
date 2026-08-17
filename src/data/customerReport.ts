/**
 * Per-Customer Account Report — a consolidated QBR-style one-pager for a single
 * customer, assembled from every domain the customer detail page reads: profile,
 * SLA & credits, deployment, billing, governed footprint, and open items.
 * Launched from the customer's page (/reports/customer/:id).
 */
import { instances, models, incidents } from '@/data/mock'
import type { Customer } from '@/data/mock'
import { billingByCustomer, invoices } from '@/data/billing'
import type { Invoice } from '@/data/billing'
import { slaByCustomer, maintenanceWindows } from '@/data/sla'
import type { SlaTarget, MaintenanceWindow } from '@/data/sla'
import { deploymentByCustomer } from '@/data/fleet'
import { transfers, dsarRequests } from '@/data/privacy'

export type CustRag = 'green' | 'amber' | 'red'

export interface CustKpi { label: string; value: string; sub: string }
export interface CustFact { label: string; value: string }

export interface CustomerReport {
  name: string
  plan: string
  status: string
  generatedBy: string
  generatedAt: string
  overall: CustRag
  overallLabel: string
  kpis: CustKpi[]
  profile: CustFact[]
  deployment: CustFact[] | null
  sla: SlaTarget | null
  billing: { plan: string; mrr: number; overage: number; nextInvoice: string; status: string } | null
  meters: { label: string; used: number; included: number; unit: string }[]
  invoices: Invoice[]
  instances: { name: string; environment: string; region: string; version: string; uptime: number; status: string }[]
  modelCount: number
  models: { name: string; provider: string; risk: string; status: string }[]
  incidents: { id: string; title: string; severity: string; status: string; opened: string }[]
  openDsar: number
  transfers: number
  windows: MaintenanceWindow[]
  creditsOwed: number
}

const money = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`)

export function buildCustomerReport(c: Customer, generatedBy: string, generatedAt: string): CustomerReport {
  const name = c.name
  const dep = deploymentByCustomer(name)
  const custInstances = instances.filter((i) => i.customer === name)
  const custModels = models.filter((m) => m.customer === name)
  const sla = slaByCustomer(name) ?? null
  const billing = billingByCustomer(name)
  const custInvoices = invoices.filter((i) => i.customer === name)
  const custIncidents = incidents.filter((i) => i.customer === name)
  const openIncidents = custIncidents.filter((i) => i.status !== 'Resolved')
  const custDsar = dsarRequests.filter((d) => d.customer === name)
  const openDsar = custDsar.filter((d) => d.status !== 'Completed').length
  const custTransfers = transfers.filter((t) => t.customer === name)
  const windows = maintenanceWindows.filter((w) => (w.customer === name || w.customer === 'All') && w.status !== 'Cancelled')

  const up = custInstances.filter((i) => i.uptime > 0)
  const avgUptime = up.length ? up.reduce((s, i) => s + i.uptime, 0) / up.length : 0
  const pastDue = custInvoices.some((i) => i.status === 'Past due')
  const creditsOwed = sla?.creditsOwed ?? 0

  const overall: CustRag =
    sla?.status === 'Breached' || openIncidents.some((i) => i.severity === 'Critical') || pastDue
      ? 'red'
      : sla?.status === 'At risk' || openIncidents.length > 0 || (billing?.overage ?? 0) > 0
        ? 'amber'
        : 'green'
  const overallLabel = overall === 'red' ? 'Needs attention' : overall === 'amber' ? 'Watch items open' : 'Healthy'

  const kpis: CustKpi[] = [
    { label: 'MRR', value: money(c.mrr), sub: `${c.plan} plan` },
    { label: 'Seats', value: String(c.seats), sub: 'Licensed' },
    { label: 'Compliance', value: `${c.complianceScore}%`, sub: 'Posture score' },
    { label: 'Uptime MTD', value: avgUptime ? `${avgUptime.toFixed(2)}%` : '—', sub: sla ? `${sla.tier} SLA` : 'No SLA' },
    { label: 'Open incidents', value: String(openIncidents.length), sub: openIncidents.some((i) => i.severity === 'Critical') ? 'Incl. critical' : 'Unresolved' },
    { label: 'Credits owed', value: money(creditsOwed), sub: 'Month-to-date' },
  ]

  const profile: CustFact[] = [
    { label: 'Domain', value: c.domain },
    { label: 'Region', value: c.region },
    { label: 'Assigned CSM', value: c.csm },
    { label: 'Customer since', value: c.since },
    { label: 'Plan', value: c.plan },
    { label: 'Status', value: c.status },
  ]

  const deployment: CustFact[] | null = dep
    ? [
        { label: 'Version', value: dep.version === dep.target ? dep.version : `${dep.version} → ${dep.target}` },
        { label: 'Rollout', value: dep.status },
        { label: 'Connectivity', value: dep.connectivity },
        { label: 'Sovereignty', value: dep.sovereignty },
        { label: 'Region', value: dep.regionCode },
        { label: 'Nodes', value: `${dep.nodes} (${dep.gpuNodes} GPU)` },
      ]
    : null

  return {
    name,
    plan: c.plan,
    status: c.status,
    generatedBy,
    generatedAt,
    overall,
    overallLabel,
    kpis,
    profile,
    deployment,
    sla,
    billing: billing ? { plan: billing.plan, mrr: billing.mrr, overage: billing.overage, nextInvoice: billing.nextInvoice, status: billing.status } : null,
    meters: billing?.meters ?? [],
    invoices: custInvoices,
    instances: custInstances.map((i) => ({ name: i.name, environment: i.environment, region: i.region, version: i.version, uptime: i.uptime, status: i.status })),
    modelCount: custModels.length,
    models: custModels.map((m) => ({ name: m.name, provider: m.provider, risk: m.risk, status: m.status })),
    incidents: openIncidents.map((i) => ({ id: i.id, title: i.title, severity: i.severity, status: i.status, opened: i.opened })),
    openDsar,
    transfers: custTransfers.length,
    windows,
    creditsOwed,
  }
}

export { money as fmtCustMoney }
