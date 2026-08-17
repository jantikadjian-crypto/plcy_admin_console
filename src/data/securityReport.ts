/**
 * Security & Vulnerability Report — supply-chain integrity and CVE posture for
 * the platform images PLCY ships. Combines the Supply Chain page's image + CVE
 * data (@/data/ops) with the container registry's signing / quarantine / promoted
 * -tag state (@/data/registry), so the report is one artifact a SOC or a
 * customer's security team can read or export.
 */
import { images, cves, opsTotals } from '@/data/ops'
import type { Image, Cve } from '@/data/ops'
import { registryImages, currentTagOf } from '@/data/registry'
import { platformPromotedTag } from '@/data/registryStore'
import type { PromotedMap } from '@/data/registryStore'

export type SecRag = 'green' | 'amber' | 'red'

export interface SecurityKpi { label: string; value: string; sub: string }
export interface SecurityReport {
  generatedBy: string
  generatedAt: string
  overall: SecRag
  overallLabel: string
  kpis: SecurityKpi[]
  images: Image[]
  cves: Cve[]
  integrity: {
    signed: string
    slsaHigh: number
    quarantined: string[]
    promotedTag: string
    patchesPending: number
    criticalPatch: string[]
  }
}

const sevRank: Record<Cve['severity'], number> = { Critical: 0, High: 1, Medium: 2 }
const statusRank: Record<Cve['status'], number> = { Open: 0, Mitigated: 1, Patched: 2 }

export function buildSecurityReport(promoted: PromotedMap, generatedBy: string, generatedAt: string): SecurityReport {
  const signedImages = opsTotals.signedImages
  const slsaHigh = images.filter((i) => i.slsa >= 3).length
  const quarantined = registryImages.filter((r) => r.quarantined).map((r) => r.name)
  const patchesPending = images.filter((i) => i.patchStatus !== 'Up to date').length
  const criticalPatch = images.filter((i) => i.patchStatus === 'Critical patch').map((i) => i.name)
  // A promoted tag still carrying critical CVEs is a live exposure.
  const promotedCritical = registryImages.some((r) => currentTagOf(r).criticalCves > 0)

  const overall: SecRag =
    opsTotals.criticalCves > 0 || quarantined.length > 0 || promotedCritical
      ? 'red'
      : opsTotals.openCves > 0 || patchesPending > 0
        ? 'amber'
        : 'green'
  const overallLabel = overall === 'red' ? 'Action required' : overall === 'amber' ? 'Patches pending' : 'Clean'

  // CVEs: unresolved first, then by severity.
  const sortedCves = [...cves].sort((a, b) => statusRank[a.status] - statusRank[b.status] || sevRank[a.severity] - sevRank[b.severity])

  const kpis: SecurityKpi[] = [
    { label: 'Platform images', value: String(opsTotals.images), sub: 'Shipped as OCI' },
    { label: 'Signed', value: `${signedImages}/${opsTotals.images}`, sub: 'Cosign-verified' },
    { label: 'SLSA ≥ L3', value: `${slsaHigh}/${opsTotals.images}`, sub: 'High provenance' },
    { label: 'Critical CVEs', value: String(opsTotals.criticalCves), sub: 'Across images' },
    { label: 'Open CVEs', value: String(opsTotals.openCves), sub: 'Unresolved' },
    { label: 'Quarantined', value: String(quarantined.length), sub: 'Blocked from deploy' },
  ]

  return {
    generatedBy,
    generatedAt,
    overall,
    overallLabel,
    kpis,
    images,
    cves: sortedCves,
    integrity: {
      signed: `${signedImages}/${opsTotals.images}`,
      slsaHigh,
      quarantined,
      promotedTag: platformPromotedTag(promoted),
      patchesPending,
      criticalPatch,
    },
  }
}
