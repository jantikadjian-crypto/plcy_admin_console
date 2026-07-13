/**
 * Org-wide security policy — the configuration surface behind Settings →
 * Security. These are the *rules* the platform enforces; the Admin Security
 * page reports the live posture against them. Persisted to localStorage so the
 * choices survive a reload, exactly like the RBAC access map.
 */
export type MfaMethod = 'Passkey' | 'TOTP' | 'SMS'
export type AllowlistMode = 'Off' | 'Audit' | 'Enforce'

export interface SecurityPolicy {
  // Authentication
  enforceMfa: boolean
  mfaMethods: MfaMethod[]
  enforceSso: boolean
  stepUpReauth: boolean
  passwordMinLength: number
  passwordRotationDays: number // 0 = never
  // Sessions
  sessionTimeoutHours: number // 1 | 4 | 8 | 24
  idleLockMinutes: number // 0 = off
  maxConcurrentSessions: number
  rememberDeviceDays: number // 0 = off
  // Network & devices
  ipAllowlist: string
  allowlistMode: AllowlistMode
  blockAnonymizers: boolean
  requireManagedDevice: boolean
  requireCompanyVpn: boolean
  // API access
  tokenMaxLifetimeDays: number // 30 | 60 | 90 | 365
  autoExpireUnusedDays: number // 0 = off
  requireScopedTokens: boolean
  // Data protection
  customerManagedKeys: boolean
}

export const MFA_METHODS: { id: MfaMethod; label: string; note: string }[] = [
  { id: 'Passkey', label: 'Passkey / WebAuthn', note: 'Phishing-resistant' },
  { id: 'TOTP', label: 'Authenticator (TOTP)', note: 'App-based codes' },
  { id: 'SMS', label: 'SMS', note: 'Weakest — SIM-swap risk' },
]

export const SESSION_TIMEOUTS = [1, 4, 8, 24]
export const IDLE_LOCK_OPTIONS = [0, 5, 10, 15, 30, 60]
export const REMEMBER_DEVICE_OPTIONS = [0, 7, 14, 30]
export const TOKEN_LIFETIME_OPTIONS = [30, 60, 90, 365]
export const AUTO_EXPIRE_OPTIONS = [0, 30, 60, 90]
export const ROTATION_OPTIONS = [0, 30, 60, 90, 180]

export const defaultSecurityPolicy: SecurityPolicy = {
  enforceMfa: true,
  mfaMethods: ['Passkey', 'TOTP'],
  enforceSso: true,
  stepUpReauth: true,
  passwordMinLength: 14,
  passwordRotationDays: 90,
  sessionTimeoutHours: 8,
  idleLockMinutes: 15,
  maxConcurrentSessions: 3,
  rememberDeviceDays: 14,
  ipAllowlist: '',
  allowlistMode: 'Off',
  blockAnonymizers: true,
  requireManagedDevice: false,
  requireCompanyVpn: true,
  tokenMaxLifetimeDays: 90,
  autoExpireUnusedDays: 60,
  requireScopedTokens: true,
  customerManagedKeys: true,
}

const STORAGE_KEY = 'plcy_security_policy'

export function loadSecurityPolicy(): SecurityPolicy {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultSecurityPolicy }
    return { ...defaultSecurityPolicy, ...(JSON.parse(raw) as Partial<SecurityPolicy>) }
  } catch {
    return { ...defaultSecurityPolicy }
  }
}

export function saveSecurityPolicy(p: SecurityPolicy) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Posture scoring                                                     */
/* ------------------------------------------------------------------ */
export type PostureRag = 'green' | 'amber' | 'red'
export interface SecurityCheck {
  id: string
  label: string
  group: string
  weight: number
  ok: (p: SecurityPolicy) => boolean
  /** Remediation shown when the check is not satisfied. */
  fix: string
}

export const securityChecks: SecurityCheck[] = [
  { id: 'mfa', label: 'MFA enforced for every admin', group: 'Authentication', weight: 20, ok: (p) => p.enforceMfa, fix: 'Turn on Enforce MFA so every admin sign-in needs a second factor.' },
  { id: 'phishing', label: 'Phishing-resistant factors only', group: 'Authentication', weight: 12, ok: (p) => p.mfaMethods.includes('Passkey') && !p.mfaMethods.includes('SMS'), fix: 'Allow passkeys and drop SMS — SMS is vulnerable to SIM-swap.' },
  { id: 'sso', label: 'SSO enforced (password login disabled)', group: 'Authentication', weight: 12, ok: (p) => p.enforceSso, fix: 'Enforce SSO so access is governed by your IdP, not local passwords.' },
  { id: 'stepup', label: 'Step-up re-auth on sensitive actions', group: 'Authentication', weight: 8, ok: (p) => p.stepUpReauth, fix: 'Require re-authentication before high-risk actions.' },
  { id: 'pwd', label: 'Strong password policy', group: 'Authentication', weight: 5, ok: (p) => p.enforceSso || (p.passwordMinLength >= 12 && p.passwordRotationDays > 0), fix: 'Require ≥12 characters and periodic rotation (or enforce SSO).' },
  { id: 'timeout', label: 'Session timeout ≤ 8 hours', group: 'Sessions', weight: 6, ok: (p) => p.sessionTimeoutHours <= 8, fix: 'Cap session length at 8 hours or less.' },
  { id: 'idle', label: 'Idle lock enabled', group: 'Sessions', weight: 6, ok: (p) => p.idleLockMinutes > 0, fix: 'Lock idle sessions after a period of inactivity.' },
  { id: 'concurrent', label: 'Concurrent sessions limited', group: 'Sessions', weight: 4, ok: (p) => p.maxConcurrentSessions <= 3, fix: 'Limit each admin to 3 or fewer concurrent sessions.' },
  { id: 'allowlist', label: 'IP allowlist enforced', group: 'Network & devices', weight: 12, ok: (p) => p.allowlistMode === 'Enforce' && p.ipAllowlist.trim().length > 0, fix: 'Add CIDR ranges and set the allowlist to Enforce.' },
  { id: 'anon', label: 'Anonymizers / Tor blocked', group: 'Network & devices', weight: 5, ok: (p) => p.blockAnonymizers, fix: 'Block access from anonymizing networks and Tor exit nodes.' },
  { id: 'device', label: 'Managed devices required', group: 'Network & devices', weight: 6, ok: (p) => p.requireManagedDevice, fix: 'Require a managed / compliant device for console access.' },
  { id: 'vpn', label: 'Company VPN required', group: 'Network & devices', weight: 6, ok: (p) => p.requireCompanyVpn, fix: 'Require devices to reach the console through the company VPN.' },
  { id: 'tokenlife', label: 'API token lifetime ≤ 90 days', group: 'API access', weight: 4, ok: (p) => p.tokenMaxLifetimeDays <= 90, fix: 'Cap token lifetime at 90 days to force rotation.' },
  { id: 'tokenexpire', label: 'Unused tokens auto-expire', group: 'API access', weight: 5, ok: (p) => p.autoExpireUnusedDays > 0, fix: 'Auto-expire tokens that go unused for a set period.' },
  { id: 'tokenscope', label: 'Scoped tokens required', group: 'API access', weight: 5, ok: (p) => p.requireScopedTokens, fix: 'Require least-privilege scopes on every API token.' },
  { id: 'byok', label: 'Customer-managed keys (BYOK/HSM)', group: 'Data protection', weight: 8, ok: (p) => p.customerManagedKeys, fix: 'Enable BYOK so encryption keys stay under customer control.' },
]

const TOTAL_WEIGHT = securityChecks.reduce((s, c) => s + c.weight, 0)

export interface PostureResult {
  score: number
  rag: PostureRag
  label: string
  passed: number
  total: number
  findings: { label: string; group: string; fix: string }[]
}

export function scoreSecurity(p: SecurityPolicy): PostureResult {
  const earned = securityChecks.reduce((s, c) => s + (c.ok(p) ? c.weight : 0), 0)
  const score = Math.round((earned / TOTAL_WEIGHT) * 100)
  const passed = securityChecks.filter((c) => c.ok(p)).length
  const rag: PostureRag = score >= 80 ? 'green' : score >= 55 ? 'amber' : 'red'
  const label = rag === 'green' ? 'Hardened' : rag === 'amber' ? 'Needs attention' : 'At risk'
  const findings = securityChecks
    .filter((c) => !c.ok(p))
    .sort((a, b) => b.weight - a.weight)
    .map((c) => ({ label: c.label, group: c.group, fix: c.fix }))
  return { score, rag, label, passed, total: securityChecks.length, findings }
}
