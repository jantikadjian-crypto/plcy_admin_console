/**
 * Fleet Governance Posture Report — a point-in-time, scope-aware snapshot of the
 * command-center Dashboard, assembled into a document a PLCY lead can hand to an
 * exec, a customer's security team, or an auditor.
 *
 * Everything is derived from the same live sources the Dashboard reads, so the
 * report can never disagree with the screen. When a single customer is selected
 * in the sidebar scope, the KPIs / posture signals / risk register narrow to
 * that customer; platform-wide sections (compliance domains, risk mix, control
 * coverage) are always fleet-level and labelled as such.
 */
import { customers, instances, models, incidents, complianceScores, riskDistribution, totals } from '@/data/mock'
import { slaTargets, slaByCustomer } from '@/data/sla'
import { customerBilling } from '@/data/billing'
import { deployments } from '@/data/fleet'
import { terraformFor, imageDriftForDeployment } from '@/data/clusters'
import { registryImages, currentTagOf } from '@/data/registry'
import { policyTotals } from '@/data/policy'
import type { PromotedMap } from '@/data/registryStore'

export type Rag = 'red' | 'amber' | 'green'
export type Sev = 'critical' | 'high' | 'medium'

export interface ReportKpi { label: string; value: string; sub: string }
export interface ReportSignal { key: string; label: string; value: string; rag: Rag; note: string; platform?: boolean }
export interface ReportRisk { sev: Sev; title: string; detail: string; domain: string }

export interface PostureReport {
  scope: string
  isAll: boolean
  generatedBy: string
  generatedAt: string
  overall: Rag
  overallLabel: string
  kpis: ReportKpi[]
  signals: ReportSignal[]
  risks: ReportRisk[]
  compliance: { name: string; score: number }[]
  riskMix: { name: string; value: number; color: string }[]
  coverage: { packs: number; controls: number; primitives: number; frameworks: number; industries: number }
}

const fmtMoney = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`)
const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`
const sevOfIncident = (s: string): Sev => (s === 'Critical' ? 'critical' : s === 'High' ? 'high' : 'medium')

/** Build a scope-aware posture snapshot. `promoted` comes from the registry store. */
export function buildPostureReport(
  scope: string,
  isAll: boolean,
  promoted: PromotedMap,
  generatedBy: string,
  generatedAt: string,
): PostureReport {
  const inScope = (customer: string) => isAll || customer === scope

  /* -------- customer-keyed collections, narrowed to scope -------- */
  const scopedSla = slaTargets.filter((s) => inScope(s.customer))
  const scopedBilling = customerBilling.filter((b) => inScope(b.customer))
  const scopedIncidents = incidents.filter((i) => i.status !== 'Resolved' && inScope(i.customer))
  const scopedDeployments = deployments.filter((d) => inScope(d.customer))
  const scopedInstances = instances.filter((i) => inScope(i.customer))
  const scopedModels = models.filter((m) => inScope(m.customer))

  const slaBreached = scopedSla.filter((s) => s.status === 'Breached').length
  const slaAtRisk = scopedSla.filter((s) => s.status === 'At risk').length
  const pastDue = scopedBilling.filter((b) => b.status === 'Past due')
  const pastDueAmt = pastDue.reduce((s, b) => s + b.mrr, 0)
  const tfDrift = scopedDeployments.filter((d) => terraformFor(d).drift === 'Drift detected')
  const imgDrift = scopedDeployments
    .map((d) => ({ d, r: imageDriftForDeployment(d, promoted) }))
    .filter(({ r }) => !r.offline && r.behind > 0)

  /* -------- platform-wide (registry is not customer-keyed) -------- */
  const criticalImages = registryImages.filter((i) => currentTagOf(i).criticalCves > 0)
  const quarantined = registryImages.filter((i) => i.quarantined)

  /* -------- posture signals -------- */
  const signals: ReportSignal[] = [
    { key: 'sla', label: 'SLA breaches', value: String(slaBreached), rag: slaBreached ? 'red' : slaAtRisk ? 'amber' : 'green', note: `${slaAtRisk} at risk` },
    { key: 'billing', label: 'Billing past due', value: fmtMoney(pastDueAmt), rag: pastDueAmt ? 'red' : 'green', note: plural(pastDue.length, 'invoice') },
    { key: 'drift', label: 'Terraform drift', value: String(tfDrift.length), rag: tfDrift.length ? 'amber' : 'green', note: 'Clusters out of sync' },
    { key: 'incidents', label: 'Open incidents', value: String(scopedIncidents.length), rag: scopedIncidents.some((i) => i.severity === 'Critical') ? 'red' : scopedIncidents.length ? 'amber' : 'green', note: 'Unresolved' },
    { key: 'imgdrift', label: 'Image drift', value: String(imgDrift.length), rag: imgDrift.length ? 'amber' : 'green', note: 'Clusters behind promoted' },
    { key: 'cve', label: 'Critical CVEs', value: String(criticalImages.length), rag: criticalImages.length ? 'red' : 'green', note: 'Images on current tag', platform: true },
    { key: 'quarantine', label: 'Quarantined images', value: String(quarantined.length), rag: quarantined.length ? 'amber' : 'green', note: 'Blocked from deploy', platform: true },
  ]

  /* -------- risk & attention register -------- */
  const risks: ReportRisk[] = [
    ...scopedSla.filter((s) => s.status !== 'Meeting').map<ReportRisk>((s) => ({
      sev: s.status === 'Breached' ? 'critical' : 'high',
      title: `${s.customer} — SLA ${s.status.toLowerCase()}`,
      detail: `${s.uptimeMtd}% vs ${s.uptimeTarget}% target${s.creditsOwed ? ` · ${fmtMoney(s.creditsOwed)} credits` : ''}`,
      domain: 'SLA',
    })),
    ...pastDue.map<ReportRisk>((b) => ({
      sev: 'high',
      title: `${b.customer} — billing past due`,
      detail: `${b.plan} · ${fmtMoney(b.mrr)} MRR · next invoice ${b.nextInvoice}`,
      domain: 'Billing',
    })),
    ...criticalImages.map<ReportRisk>((i) => ({
      sev: 'critical',
      title: `${i.name} — critical CVE`,
      detail: `on ${i.currentTag} · re-scan or quarantine`,
      domain: 'Security',
    })),
    ...scopedIncidents.map<ReportRisk>((i) => ({
      sev: sevOfIncident(i.severity),
      title: i.title,
      detail: `${i.customer} · ${i.severity} · ${i.status}`,
      domain: 'Incident',
    })),
    ...tfDrift.map<ReportRisk>((d) => ({
      sev: 'medium',
      title: `${d.customer} — Terraform drift`,
      detail: `${terraformFor(d).driftedResources} resources differ · plan pending`,
      domain: 'Infrastructure',
    })),
    ...imgDrift.map<ReportRisk>(({ d, r }) => ({
      sev: 'medium',
      title: `${d.customer} — image drift`,
      detail: `${plural(r.behind, 'workload')} behind promoted tag`,
      domain: 'Infrastructure',
    })),
  ].sort((a, b) => rank(a.sev) - rank(b.sev))

  /* -------- KPIs (scope-aware) -------- */
  let kpis: ReportKpi[]
  if (isAll) {
    kpis = [
      { label: 'Customers', value: String(totals.customers), sub: `${totals.activeCustomers} active` },
      { label: 'Instances', value: String(totals.instances), sub: `${totals.healthyInstances} healthy` },
      { label: 'Governed models', value: String(totals.models), sub: 'Under policy' },
      { label: 'Avg compliance', value: `${totals.avgCompliance}%`, sub: 'Fleet score' },
      { label: 'Open risk items', value: String(risks.length), sub: `${risks.filter((r) => r.sev === 'critical').length} critical` },
      { label: 'Recurring revenue', value: fmtMoney(totals.mrr), sub: 'MRR' },
    ]
  } else {
    const cust = customers.find((c) => c.name === scope)
    const bill = customerBilling.find((b) => b.customer === scope)
    const sla = slaByCustomer(scope)
    kpis = [
      { label: 'Compliance score', value: cust ? `${cust.complianceScore}%` : '—', sub: cust?.plan ?? 'Customer' },
      { label: 'Instances', value: String(scopedInstances.length), sub: `${scopedInstances.filter((i) => i.status === 'Healthy').length} healthy` },
      { label: 'Governed models', value: String(scopedModels.length), sub: 'Under policy' },
      { label: 'SLA status', value: sla ? sla.status : '—', sub: sla ? `${sla.uptimeMtd}% vs ${sla.uptimeTarget}%` : 'No SLA' },
      { label: 'Open risk items', value: String(risks.length), sub: `${risks.filter((r) => r.sev === 'critical').length} critical` },
      { label: 'Recurring revenue', value: bill ? fmtMoney(bill.mrr) : '—', sub: 'MRR' },
    ]
  }

  /* -------- overall RAG -------- */
  const anyRed = signals.some((s) => s.rag === 'red') || risks.some((r) => r.sev === 'critical')
  const anyAmber = signals.some((s) => s.rag === 'amber') || risks.length > 0
  const overall: Rag = anyRed ? 'red' : anyAmber ? 'amber' : 'green'
  const overallLabel = overall === 'red' ? 'Action required' : overall === 'amber' ? 'Watch items open' : 'Healthy'

  return {
    scope,
    isAll,
    generatedBy,
    generatedAt,
    overall,
    overallLabel,
    kpis,
    signals,
    risks,
    compliance: complianceScores,
    riskMix: riskDistribution,
    coverage: {
      packs: policyTotals.packs,
      controls: policyTotals.controls,
      primitives: policyTotals.primitives,
      frameworks: policyTotals.frameworks,
      industries: policyTotals.industries,
    },
  }
}

const rank = (s: Sev) => (s === 'critical' ? 0 : s === 'high' ? 1 : 2)
