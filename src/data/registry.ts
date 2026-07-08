/**
 * Container registry model. PLCY signs and ships its platform as OCI images to
 * registry.plcy.app; each image carries multiple tags (with digests, sizes, and
 * per-tag CVE counts), an SBOM, a signing/SLSA attestation, and a quarantine
 * flag. Operators promote/roll back the deployed tag, re-scan, view the SBOM,
 * and quarantine images with unresolved CVEs.
 */

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function digest(s: string): string {
  let out = ''
  let h = hash(s)
  for (let i = 0; i < 16; i++) {
    out += (h & 0xf).toString(16)
    h = Math.imul(h ^ (h >>> 4), 16777619) >>> 0
  }
  return `sha256:${out}`
}

export type Channel = 'stable' | 'rc'

export interface ImageTag {
  tag: string
  digest: string
  sizeMb: number
  pushed: string
  channel: Channel
  criticalCves: number
  highCves: number
  mediumCves: number
}
export interface RegistryImage {
  id: string
  repo: string
  name: string
  signed: boolean
  slsa: number
  tags: ImageTag[]
  currentTag: string
  quarantined: boolean
  lastScan: string
}
export interface SbomEntry {
  name: string
  version: string
  license: string
  cves: number
}

const REG = 'registry.plcy.app'
const t = (name: string, tag: string, channel: Channel, sizeMb: number, pushed: string, c: number, h: number, m: number): ImageTag => ({
  tag,
  digest: digest(name + tag),
  sizeMb,
  pushed,
  channel,
  criticalCves: c,
  highCves: h,
  mediumCves: m,
})

export const registryImages: RegistryImage[] = [
  {
    id: 'img_policy_engine', repo: `${REG}/plcy/policy-engine`, name: 'plcy/policy-engine', signed: true, slsa: 3, quarantined: false, lastScan: '2026-07-07 06:00', currentTag: 'v4.8.2',
    tags: [
      t('policy-engine', 'v4.9.0-rc1', 'rc', 262, '2026-07-01', 0, 0, 2),
      t('policy-engine', 'v4.8.2', 'stable', 258, '2026-06-10', 0, 1, 4),
      t('policy-engine', 'v4.8.1', 'stable', 256, '2026-05-20', 0, 2, 5),
    ],
  },
  {
    id: 'img_model_gateway', repo: `${REG}/plcy/model-gateway`, name: 'plcy/model-gateway', signed: true, slsa: 3, quarantined: false, lastScan: '2026-07-07 06:00', currentTag: 'v4.8.2',
    tags: [
      t('model-gateway', 'v4.9.0-rc1', 'rc', 318, '2026-07-01', 0, 1, 3),
      t('model-gateway', 'v4.8.2', 'stable', 302, '2026-06-10', 1, 2, 7),
      t('model-gateway', 'v4.8.1', 'stable', 298, '2026-05-20', 1, 3, 8),
    ],
  },
  {
    id: 'img_api_gateway', repo: `${REG}/plcy/api-gateway`, name: 'plcy/api-gateway', signed: true, slsa: 3, quarantined: false, lastScan: '2026-07-07 06:00', currentTag: 'v4.8.2',
    tags: [
      t('api-gateway', 'v4.9.0-rc1', 'rc', 192, '2026-07-01', 0, 0, 1),
      t('api-gateway', 'v4.8.2', 'stable', 188, '2026-06-10', 0, 0, 2),
    ],
  },
  {
    id: 'img_data_pipeline', repo: `${REG}/plcy/data-pipeline`, name: 'plcy/data-pipeline', signed: true, slsa: 2, quarantined: false, lastScan: '2026-07-07 06:00', currentTag: 'v4.8.2',
    tags: [
      t('data-pipeline', 'v4.9.0-rc1', 'rc', 260, '2026-07-01', 0, 1, 6),
      t('data-pipeline', 'v4.8.2', 'stable', 256, '2026-06-10', 0, 3, 9),
      t('data-pipeline', 'v4.8.1', 'stable', 254, '2026-05-20', 0, 4, 11),
    ],
  },
  {
    id: 'img_console', repo: `${REG}/plcy/console`, name: 'plcy/console', signed: true, slsa: 3, quarantined: false, lastScan: '2026-07-07 06:00', currentTag: 'v4.8.2',
    tags: [
      t('console', 'v4.9.0-rc1', 'rc', 410, '2026-07-01', 0, 0, 3),
      t('console', 'v4.8.2', 'stable', 402, '2026-06-10', 0, 0, 5),
    ],
  },
  {
    id: 'img_sidecar', repo: `${REG}/plcy/enforcement-sidecar`, name: 'plcy/enforcement-sidecar', signed: true, slsa: 3, quarantined: false, lastScan: '2026-07-07 06:00', currentTag: 'v4.8.2',
    tags: [
      t('sidecar', 'v4.9.0-rc1', 'rc', 98, '2026-07-01', 0, 0, 1),
      t('sidecar', 'v4.8.2', 'stable', 96, '2026-06-10', 0, 1, 1),
      t('sidecar', 'v4.8.1', 'stable', 95, '2026-05-20', 0, 1, 2),
    ],
  },
]

export const tagOf = (img: RegistryImage, tag: string) => img.tags.find((x) => x.tag === tag)
export const currentTagOf = (img: RegistryImage) => tagOf(img, img.currentTag) ?? img.tags[0]

/* SBOM — synthesized top components per image, with CVE counts baked in. */
const BASE_SBOM: SbomEntry[] = [
  { name: 'openssl', version: '3.0.11', license: 'Apache-2.0', cves: 0 },
  { name: 'grpc', version: '1.62.0', license: 'Apache-2.0', cves: 0 },
  { name: 'protobuf', version: '25.3', license: 'BSD-3-Clause', cves: 0 },
  { name: 'python', version: '3.12.4', license: 'PSF-2.0', cves: 0 },
  { name: 'urllib3', version: '2.1.0', license: 'MIT', cves: 0 },
  { name: 'cryptography', version: '42.0.5', license: 'Apache-2.0', cves: 0 },
  { name: 'zlib', version: '1.3', license: 'Zlib', cves: 0 },
  { name: 'openssh', version: '9.6', license: 'BSD-2-Clause', cves: 0 },
]

export function sbomFor(img: RegistryImage): SbomEntry[] {
  const cur = currentTagOf(img)
  const flagged = cur.criticalCves + cur.highCves
  return BASE_SBOM.map((c, i) => ({ ...c, cves: i < flagged ? 1 : 0 }))
}

export const totalCves = (tag: ImageTag) => tag.criticalCves + tag.highCves + tag.mediumCves
