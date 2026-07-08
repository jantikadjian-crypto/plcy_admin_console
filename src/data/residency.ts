/**
 * Data-residency policy engine. Beyond model routing (which governs where
 * inference runs), this governs where a customer's DATA may live and move:
 * storage, backups, replication/transfer, telemetry, and support access.
 *
 * Each region carries a residency policy; evaluateResidency() turns a proposed
 * data operation into an enforced decision (Allow / Require safeguard / Block).
 * Policies are editable and persisted so the console reflects the live ruleset.
 */
import { regions, regionByCode } from './fleet'

export type ResidencyDecision = 'Allow' | 'Require safeguard' | 'Block'
export type ResidencyOp = 'Store' | 'Backup' | 'Replicate' | 'Transfer' | 'Telemetry' | 'Support access'
export type Mechanism = 'SCCs' | 'Adequacy decision' | 'BCRs' | 'Explicit consent'
export type TelemetryLevel = 'None' | 'Metadata only' | 'Full'
export type SupportAccess = 'In-region staff' | 'Break-glass (approved)' | 'None'

export const OPERATIONS: ResidencyOp[] = ['Store', 'Backup', 'Replicate', 'Transfer', 'Telemetry', 'Support access']
export const MECHANISMS: Mechanism[] = ['SCCs', 'Adequacy decision', 'BCRs', 'Explicit consent']
export const DATA_CATEGORIES = ['Prompts · PII', 'PHI', 'Financial', 'Model inference', 'Backups (DR)', 'Operational metadata']

export interface ResidencyPolicy {
  regionCode: string
  /** Region codes data may be replicated/transferred to (besides its own). Empty = locked in-region. */
  allowedTargets: string[]
  /** Cross-jurisdiction moves need a valid transfer mechanism. */
  crossBorderRequiresSafeguard: boolean
  allowedMechanisms: Mechanism[]
  /** Region codes backups may reside in. */
  backupRegions: string[]
  telemetry: TelemetryLevel
  supportAccess: SupportAccess
}

const peers = (code: string): string[] => {
  const r = regionByCode(code)
  if (!r) return []
  return regions.filter((x) => x.code !== code && x.jurisdiction === r.jurisdiction && x.sovereignty !== 'Air-gapped').map((x) => x.code)
}

export function defaultResidencyPolicy(code: string): ResidencyPolicy {
  const r = regionByCode(code)
  const p = peers(code)
  if (r?.sovereignty === 'Air-gapped') {
    return { regionCode: code, allowedTargets: [], crossBorderRequiresSafeguard: true, allowedMechanisms: [], backupRegions: [code], telemetry: 'None', supportAccess: 'Break-glass (approved)' }
  }
  if (r?.sovereignty === 'Sovereign Cloud') {
    return { regionCode: code, allowedTargets: p, crossBorderRequiresSafeguard: true, allowedMechanisms: ['SCCs', 'Adequacy decision'], backupRegions: [code, ...p], telemetry: 'Metadata only', supportAccess: 'In-region staff' }
  }
  return { regionCode: code, allowedTargets: p, crossBorderRequiresSafeguard: false, allowedMechanisms: ['SCCs', 'Adequacy decision', 'BCRs'], backupRegions: [code, ...p], telemetry: 'Full', supportAccess: 'Break-glass (approved)' }
}

const sameJurisdiction = (a: string, b: string) => regionByCode(a)?.jurisdiction === regionByCode(b)?.jurisdiction

export interface ResidencyRequest {
  sourceRegion: string
  operation: ResidencyOp
  targetRegion?: string
  mechanism?: Mechanism
  dataCategory?: string
}
export interface ResidencyResult {
  decision: ResidencyDecision
  reason: string
  safeguard?: string
}

export function evaluateResidency(policy: ResidencyPolicy, req: ResidencyRequest): ResidencyResult {
  const src = regionByCode(policy.regionCode)
  const laws = src?.laws.join(', ') ?? ''

  if (req.operation === 'Store') {
    return { decision: 'Allow', reason: `Data is stored in-region (${src?.name}); residency satisfied.` }
  }

  if (req.operation === 'Telemetry') {
    if (policy.telemetry === 'None') return { decision: 'Block', reason: `Telemetry egress is disabled for ${src?.name} (${laws}).` }
    if (policy.telemetry === 'Metadata only') return { decision: 'Require safeguard', reason: `Only metadata may leave ${src?.name}.`, safeguard: 'Metadata-only roll-up (no payloads)' }
    return { decision: 'Allow', reason: `Full telemetry permitted from ${src?.name}.` }
  }

  if (req.operation === 'Support access') {
    if (policy.supportAccess === 'None') return { decision: 'Block', reason: `Support access to ${src?.name} is disabled.` }
    if (policy.supportAccess === 'Break-glass (approved)') return { decision: 'Require safeguard', reason: `Support access to ${src?.name} needs approval.`, safeguard: 'Break-glass, recorded session' }
    return { decision: 'Allow', reason: `In-region support staff may access ${src?.name}.` }
  }

  const target = req.targetRegion
  if (req.operation === 'Backup') {
    if (!target || target === policy.regionCode) return { decision: 'Allow', reason: `Backup stays in-region (${src?.name}).` }
    if (!policy.backupRegions.includes(target)) return { decision: 'Block', reason: `${regionByCode(target)?.name} is not an approved backup region for ${src?.name} (${laws}).` }
    // approved backup region — check cross-border
  }

  // Replicate / Transfer / (approved) Backup to another region
  if (!target || target === policy.regionCode) {
    return { decision: 'Allow', reason: `Operation stays in-region (${src?.name}).` }
  }
  const isBackup = req.operation === 'Backup'
  const whitelisted = isBackup ? policy.backupRegions.includes(target) : policy.allowedTargets.includes(target)
  if (!whitelisted) {
    return { decision: 'Block', reason: `${src?.name} data may not move to ${regionByCode(target)?.name} — residency rule (${laws}).` }
  }
  if (!sameJurisdiction(policy.regionCode, target) && policy.crossBorderRequiresSafeguard) {
    if (req.mechanism && policy.allowedMechanisms.includes(req.mechanism)) {
      return { decision: 'Require safeguard', reason: `Cross-border to ${regionByCode(target)?.name} permitted under ${req.mechanism}.`, safeguard: req.mechanism }
    }
    return { decision: 'Block', reason: `Cross-border to ${regionByCode(target)?.name} needs a valid safeguard (${policy.allowedMechanisms.join(', ') || 'none configured'}).` }
  }
  return { decision: 'Allow', reason: `${regionByCode(target)?.name} is an approved in-jurisdiction target for ${src?.name}.` }
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = 'plcy.residency.v1'

export function defaultPolicies(): Record<string, ResidencyPolicy> {
  const out: Record<string, ResidencyPolicy> = {}
  for (const r of regions) out[r.code] = defaultResidencyPolicy(r.code)
  return out
}

export function loadPolicies(): Record<string, ResidencyPolicy> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPolicies()
    const parsed = JSON.parse(raw) as Record<string, ResidencyPolicy>
    const base = defaultPolicies()
    return { ...base, ...parsed }
  } catch {
    return defaultPolicies()
  }
}
export function savePolicies(map: Record<string, ResidencyPolicy>): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    return true
  } catch {
    return false
  }
}
export function resetPolicies(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Enforcement log                                                     */
/* ------------------------------------------------------------------ */
export interface ResidencyEvent {
  id: string
  time: string
  customer: string
  operation: ResidencyOp
  source: string
  target: string
  decision: ResidencyDecision
  detail: string
}

export const recentResidency: ResidencyEvent[] = [
  { id: 're_1', time: '10:44:02', customer: 'Saffron Foods', operation: 'Transfer', source: 'eu-west-1', target: 'us-east-1', decision: 'Block', detail: 'Model inference · no safeguard' },
  { id: 're_2', time: '10:43:31', customer: 'Meridian Bank', operation: 'Backup', source: 'us-east-1', target: 'us-west-2', decision: 'Allow', detail: 'DR snapshot · in-jurisdiction' },
  { id: 're_3', time: '10:42:58', customer: 'Helix Health', operation: 'Support access', source: 'de-sov-1', target: '—', decision: 'Require safeguard', detail: 'Break-glass, recorded' },
  { id: 're_4', time: '10:42:10', customer: 'Atlas Logistics', operation: 'Transfer', source: 'us-east-1', target: 'eu-central-1', decision: 'Require safeguard', detail: 'Analytics export · SCCs' },
  { id: 're_5', time: '10:41:26', customer: 'Ferro Manufacturing', operation: 'Telemetry', source: 'de-sov-1', target: '—', decision: 'Block', detail: 'Air-gapped · telemetry disabled' },
  { id: 're_6', time: '10:40:44', customer: 'Northwind Retail', operation: 'Replicate', source: 'eu-central-1', target: 'eu-west-1', decision: 'Require safeguard', detail: 'HA replica · Adequacy decision' },
  { id: 're_7', time: '10:40:02', customer: 'Vertex Capital', operation: 'Telemetry', source: 'ap-southeast-1', target: '—', decision: 'Require safeguard', detail: 'Metadata-only roll-up' },
]
