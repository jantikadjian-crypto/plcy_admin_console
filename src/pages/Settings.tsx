import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Settings as SettingsIcon,
  Palette,
  Bell,
  CreditCard,
  Plug,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Save,
  Check,
  KeyRound,
  RotateCcw,
  Lock,
  ChevronDown,
  Fingerprint,
  Clock,
  Network,
  KeySquare,
  DatabaseZap,
  AlertTriangle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, PageHeader, Badge, Progress } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import ManagedDevices from '@/components/ManagedDevices'
import { useSession } from '@/context/Session'
import {
  MFA_METHODS,
  SESSION_TIMEOUTS,
  IDLE_LOCK_OPTIONS,
  REMEMBER_DEVICE_OPTIONS,
  TOKEN_LIFETIME_OPTIONS,
  AUTO_EXPIRE_OPTIONS,
  ROTATION_OPTIONS,
  defaultSecurityPolicy,
  loadSecurityPolicy,
  saveSecurityPolicy,
  scoreSecurity,
} from '@/data/security'
import type { SecurityPolicy, MfaMethod, AllowlistMode, PostureRag } from '@/data/security'
import {
  roleDefs,
  assignedCount,
  roleIconTone,
  iconFor,
  currentUser,
} from '@/data/roles'
import {
  EAccessRole,
  EAccessFeature,
  FEATURE_DOMAINS,
  featureLabel,
  hasAccess,
  effectiveAccessMap,
  saveAccessMap,
  resetAccessMap,
} from '@/data/access'

type TabKey =
  | 'General'
  | 'Branding'
  | 'Notifications'
  | 'Billing'
  | 'Integrations'
  | 'Roles & Permissions'
  | 'Security'

const tabs: { key: TabKey; icon: LucideIcon }[] = [
  { key: 'General', icon: SettingsIcon },
  { key: 'Branding', icon: Palette },
  { key: 'Notifications', icon: Bell },
  { key: 'Billing', icon: CreditCard },
  { key: 'Integrations', icon: Plug },
  { key: 'Roles & Permissions', icon: KeyRound },
  { key: 'Security', icon: Shield },
]

type AccessMap = Record<EAccessFeature, EAccessRole[]>

/* ------------------------------------------------------------------ */
/* Role summary cards — at-a-glance access per domain                   */
/* ------------------------------------------------------------------ */
const barTone: Record<string, string> = {
  purple: 'bg-violet-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  orange: 'bg-orange-500',
  red: 'bg-rose-500',
  yellow: 'bg-amber-500',
  slate: 'bg-slate-400',
}

function RoleSummaryCards({ map }: { map: AccessMap }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {roleDefs.map((r) => {
        const Icon = iconFor(r.iconKey)
        const assigned = assignedCount(r.id)
        return (
          <div key={r.id} className="flex flex-col rounded-xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${roleIconTone[r.tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-ink-900">{r.name}</p>
                  <Badge tone={r.tone}>{assigned} {assigned === 1 ? 'user' : 'users'}</Badge>
                </div>
                <p className="mt-0.5 text-xs leading-snug text-ink-500">{r.desc}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {FEATURE_DOMAINS.map((d) => {
                const total = d.features.length
                const granted = d.features.filter((f) => hasAccess(r.id, f, map)).length
                const pct = total ? Math.round((granted / total) * 100) : 0
                return (
                  <div key={d.title}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-ink-600">{d.title}</span>
                      <span className={`font-medium ${granted ? 'text-ink-700' : 'text-ink-300'}`}>
                        {granted}/{total}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${barTone[r.tone] ?? barTone.slate}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Access matrix — one card per domain, features × roles               */
/* ------------------------------------------------------------------ */
function Cell({
  granted,
  locked,
  tone,
  onClick,
}: {
  granted: boolean
  locked?: boolean
  tone: string
  onClick?: () => void
}) {
  if (locked) {
    return (
      <span
        title="Superuser has every permission"
        className="mx-auto flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 text-violet-500"
      >
        <Lock className="h-3.5 w-3.5" />
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={granted}
      className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
        granted ? tone : 'bg-slate-50 text-transparent hover:bg-slate-100'
      }`}
    >
      <Check className="h-3.5 w-3.5" />
    </button>
  )
}

const cellTone: Record<string, string> = {
  purple: 'bg-violet-100 text-violet-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-emerald-100 text-emerald-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-rose-100 text-rose-600',
  yellow: 'bg-amber-100 text-amber-600',
  slate: 'bg-slate-200 text-slate-600',
}

function DomainSection({
  domain,
  map,
  open,
  onOpen,
  onToggle,
}: {
  domain: (typeof FEATURE_DOMAINS)[number]
  map: AccessMap
  open: boolean
  onOpen: () => void
  onToggle: (feature: EAccessFeature, role: EAccessRole) => void
}) {
  return (
    <Card padded={false} className="overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <div>
          <p className="text-[15px] font-semibold text-ink-900">{domain.title}</p>
          <p className="mt-0.5 text-xs text-ink-500">{domain.features.length} features</p>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 pb-4 pt-1">
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pl-1 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Feature
                  </th>
                  {roleDefs.map((r) => (
                    <th key={r.id} className="px-1 pb-2 text-center align-bottom">
                      <span className="block text-[11px] font-semibold leading-tight text-ink-600">{r.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {domain.features.map((f) => (
                  <tr key={f} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="py-1.5 pl-1 pr-3 font-medium text-ink-700">{featureLabel(f)}</td>
                    {roleDefs.map((r) => {
                      const isSuper = r.id === EAccessRole.Superuser
                      const granted = isSuper || map[f].includes(r.id)
                      return (
                        <td key={r.id} className="px-1 py-1.5 text-center">
                          <Cell
                            granted={granted}
                            locked={isSuper}
                            tone={cellTone[r.tone] ?? cellTone.slate}
                            onClick={() => onToggle(f, r.id)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}

function AccessMatrix({
  map,
  onToggle,
}: {
  map: AccessMap
  onToggle: (feature: EAccessFeature, role: EAccessRole) => void
}) {
  // First domain expanded by default so the detail view is discoverable.
  const [open, setOpen] = useState<Record<string, boolean>>({ [FEATURE_DOMAINS[0].title]: true })
  return (
    <div className="space-y-3">
      {FEATURE_DOMAINS.map((domain) => (
        <DomainSection
          key={domain.title}
          domain={domain}
          map={map}
          open={!!open[domain.title]}
          onOpen={() => setOpen((p) => ({ ...p, [domain.title]: !p[domain.title] }))}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
        on ? 'justify-end bg-brand-600' : 'justify-start bg-slate-200'
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </button>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Security policy tab                                                  */
/* ------------------------------------------------------------------ */
const postureBand: Record<PostureRag, string> = {
  green: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-orange-500',
  red: 'from-rose-500 to-rose-600',
}
const postureIcon: Record<PostureRag, LucideIcon> = { green: ShieldCheck, amber: ShieldAlert, red: ShieldAlert }

function SecGroup({ icon: Icon, title, subtitle, children }: { icon: LucideIcon; title: string; subtitle: string; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-1 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-ink-600">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-ink-900">{title}</p>
          <p className="text-xs text-ink-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-2">{children}</div>
    </Card>
  )
}

function SecRow({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="text-xs text-ink-500">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SecuritySettings({ policy, onChange }: { policy: SecurityPolicy; onChange: (p: SecurityPolicy) => void }) {
  const { can } = useSession()
  const canManage = can('settings.modify')
  const posture = scoreSecurity(policy)
  const PostureIcon = postureIcon[posture.rag]

  const set = (patch: Partial<SecurityPolicy>) => canManage && onChange({ ...policy, ...patch })
  const toggleMethod = (m: MfaMethod) =>
    set({ mfaMethods: policy.mfaMethods.includes(m) ? policy.mfaMethods.filter((x) => x !== m) : [...policy.mfaMethods, m] })

  const dirty = JSON.stringify(policy) !== JSON.stringify(defaultSecurityPolicy)

  return (
    <div className="space-y-6">
      {/* Posture banner */}
      <div className={`rounded-2xl bg-gradient-to-r ${postureBand[posture.rag]} p-5 text-white shadow-sm`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15">
              <PostureIcon className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/80">Security posture</p>
              <p className="text-3xl font-bold leading-tight">{posture.score}<span className="text-lg font-medium text-white/70">/100</span></p>
              <p className="text-sm font-medium">{posture.label} · {posture.passed}/{posture.total} controls</p>
            </div>
          </div>
          <div className="flex-1 rounded-xl bg-white/10 p-3 text-sm">
            {posture.findings.length === 0 ? (
              <p className="flex items-center gap-2 font-medium"><Check className="h-4 w-4" /> Every hardening control is enabled.</p>
            ) : (
              <>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/80">
                  <AlertTriangle className="h-3.5 w-3.5" /> Top gaps to close
                </p>
                <ul className="space-y-1">
                  {posture.findings.slice(0, 3).map((f) => (
                    <li key={f.label} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                      <span><span className="font-medium">{f.label}.</span> <span className="text-white/85">{f.fix}</span></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {!canManage && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <Lock className="h-4 w-4 shrink-0" /> Your role can view the security policy but not change it.
        </div>
      )}

      {/* Authentication */}
      <SecGroup icon={Fingerprint} title="Authentication" subtitle="How admins prove who they are">
        <div className="divide-y divide-slate-100">
          <SecRow title="Enforce MFA" desc="Require a second factor for every admin sign-in.">
            <Toggle on={policy.enforceMfa} onClick={() => set({ enforceMfa: !policy.enforceMfa })} />
          </SecRow>
          <div className="py-4">
            <p className="text-sm font-semibold text-ink-900">Allowed MFA methods</p>
            <p className="mb-2.5 text-xs text-ink-500">Prefer phishing-resistant factors. SMS is the weakest.</p>
            <div className="flex flex-wrap gap-2">
              {MFA_METHODS.map((m) => {
                const on = policy.mfaMethods.includes(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMethod(m.id)}
                    disabled={!canManage}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
                      on ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-ink-500 hover:border-slate-300'
                    } ${m.id === 'SMS' && on ? 'border-amber-300 bg-amber-50 text-amber-700' : ''}`}
                  >
                    {m.label}
                    <span className="text-[10px] font-normal opacity-70">{m.note}</span>
                    {on && <Check className="h-3.5 w-3.5" />}
                  </button>
                )
              })}
            </div>
          </div>
          <SecRow title="Enforce SSO" desc="Require SAML sign-in and disable local password login.">
            <Toggle on={policy.enforceSso} onClick={() => set({ enforceSso: !policy.enforceSso })} />
          </SecRow>
          <SecRow title="Step-up re-authentication" desc="Re-verify identity before high-risk actions (key rotation, break-glass).">
            <Toggle on={policy.stepUpReauth} onClick={() => set({ stepUpReauth: !policy.stepUpReauth })} />
          </SecRow>
          <div className="py-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink-900">Password policy</p>
                <p className="text-xs text-ink-500">
                  {policy.enforceSso ? 'Fallback for local login — applies if SSO is ever disabled.' : 'Applies to local password login.'}
                </p>
              </div>
              {policy.enforceSso && <Badge tone="slate">SSO active</Badge>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={`Minimum length · ${policy.passwordMinLength}`}>
                <input
                  type="range"
                  min={8}
                  max={24}
                  value={policy.passwordMinLength}
                  onChange={(e) => set({ passwordMinLength: Number(e.target.value) })}
                  disabled={!canManage}
                  className="w-full accent-brand-600"
                />
              </Field>
              <Field label="Rotation">
                <select className="input" value={policy.passwordRotationDays} onChange={(e) => set({ passwordRotationDays: Number(e.target.value) })} disabled={!canManage}>
                  {ROTATION_OPTIONS.map((d) => <option key={d} value={d}>{d === 0 ? 'Never' : `Every ${d} days`}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </div>
      </SecGroup>

      {/* Sessions */}
      <SecGroup icon={Clock} title="Sessions" subtitle="How long access stays live">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Session timeout">
            <select className="input" value={policy.sessionTimeoutHours} onChange={(e) => set({ sessionTimeoutHours: Number(e.target.value) })} disabled={!canManage}>
              {SESSION_TIMEOUTS.map((h) => <option key={h} value={h}>{h === 1 ? '1 hour' : `${h} hours`}</option>)}
            </select>
          </Field>
          <Field label="Idle lock">
            <select className="input" value={policy.idleLockMinutes} onChange={(e) => set({ idleLockMinutes: Number(e.target.value) })} disabled={!canManage}>
              {IDLE_LOCK_OPTIONS.map((m) => <option key={m} value={m}>{m === 0 ? 'Off' : `After ${m} min`}</option>)}
            </select>
          </Field>
          <Field label="Max concurrent sessions / admin">
            <select className="input" value={policy.maxConcurrentSessions} onChange={(e) => set({ maxConcurrentSessions: Number(e.target.value) })} disabled={!canManage}>
              {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Remember this device">
            <select className="input" value={policy.rememberDeviceDays} onChange={(e) => set({ rememberDeviceDays: Number(e.target.value) })} disabled={!canManage}>
              {REMEMBER_DEVICE_OPTIONS.map((d) => <option key={d} value={d}>{d === 0 ? 'Off — MFA every time' : `${d} days`}</option>)}
            </select>
          </Field>
        </div>
      </SecGroup>

      {/* Network & devices */}
      <SecGroup icon={Network} title="Network & devices" subtitle="Where the console can be reached from">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="IP allowlist (CIDR)">
            <input className="input" placeholder="10.4.0.0/16, 52.9.44.0/24" value={policy.ipAllowlist} onChange={(e) => set({ ipAllowlist: e.target.value })} disabled={!canManage} />
          </Field>
          <Field label="Allowlist enforcement">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {(['Off', 'Audit', 'Enforce'] as AllowlistMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => set({ allowlistMode: m })}
                  disabled={!canManage}
                  aria-pressed={policy.allowlistMode === m}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                    policy.allowlistMode === m ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="mt-1 divide-y divide-slate-100">
          <SecRow title="Block anonymizers & Tor" desc="Reject sign-ins from anonymizing networks and Tor exit nodes.">
            <Toggle on={policy.blockAnonymizers} onClick={() => set({ blockAnonymizers: !policy.blockAnonymizers })} />
          </SecRow>
          <SecRow title="Require company VPN" desc="Console is reachable only through the corporate VPN — enrollment and every session must originate there.">
            <Toggle on={policy.requireCompanyVpn} onClick={() => set({ requireCompanyVpn: !policy.requireCompanyVpn })} />
          </SecRow>
          <SecRow title="Require managed devices" desc="Only allow console access from enrolled, compliant devices.">
            <Toggle on={policy.requireManagedDevice} onClick={() => set({ requireManagedDevice: !policy.requireManagedDevice })} />
          </SecRow>
        </div>
        <ManagedDevices enforcing={policy.requireManagedDevice} requireVpn={policy.requireCompanyVpn} />
      </SecGroup>

      {/* API access */}
      <SecGroup icon={KeySquare} title="API access" subtitle="Governance for programmatic tokens">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Max token lifetime">
            <select className="input" value={policy.tokenMaxLifetimeDays} onChange={(e) => set({ tokenMaxLifetimeDays: Number(e.target.value) })} disabled={!canManage}>
              {TOKEN_LIFETIME_OPTIONS.map((d) => <option key={d} value={d}>{d === 365 ? '1 year' : `${d} days`}</option>)}
            </select>
          </Field>
          <Field label="Auto-expire unused tokens">
            <select className="input" value={policy.autoExpireUnusedDays} onChange={(e) => set({ autoExpireUnusedDays: Number(e.target.value) })} disabled={!canManage}>
              {AUTO_EXPIRE_OPTIONS.map((d) => <option key={d} value={d}>{d === 0 ? 'Never' : `After ${d} days idle`}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-1 divide-y divide-slate-100">
          <SecRow title="Require scoped tokens" desc="Every token must declare least-privilege scopes — no full-access keys.">
            <Toggle on={policy.requireScopedTokens} onClick={() => set({ requireScopedTokens: !policy.requireScopedTokens })} />
          </SecRow>
        </div>
      </SecGroup>

      {/* Data protection */}
      <SecGroup icon={DatabaseZap} title="Data protection" subtitle="Encryption and key custody">
        <div className="divide-y divide-slate-100">
          <SecRow title="Customer-managed keys (BYOK / HSM)" desc="Encryption keys stay under customer control via a dedicated HSM.">
            <Toggle on={policy.customerManagedKeys} onClick={() => set({ customerManagedKeys: !policy.customerManagedKeys })} />
          </SecRow>
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-semibold text-ink-900">Encryption at rest</p>
              <p className="text-xs text-ink-500">AES-256 on all volumes and backups — always on.</p>
            </div>
            <Badge tone="green" dot>Always on</Badge>
          </div>
        </div>
      </SecGroup>

      {canManage && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="text-ink-500">
            {dirty ? 'Policy differs from PLCY recommended defaults.' : 'Matches PLCY recommended defaults.'}
          </span>
          <button className="btn-ghost" onClick={() => onChange({ ...defaultSecurityPolicy })} disabled={!dirty} title="Restore recommended defaults">
            <RotateCcw className="h-4 w-4" />
            Restore defaults
          </button>
        </div>
      )}
    </div>
  )
}

const swatches = [
  { name: 'Brand Blue', hex: '#1f47f5' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#ef4444' },
  { name: 'Slate', hex: '#64748b' },
]

const integrations = [
  { name: 'Stripe', desc: 'Subscriptions, invoices & payments.', connected: true, to: '/billing-integration' },
  { name: 'Slack', desc: 'Send alerts to your workspace channels.', connected: true },
  { name: 'PagerDuty', desc: 'Page on-call for critical incidents.', connected: true },
  { name: 'Datadog', desc: 'Stream metrics and traces.', connected: false },
  { name: 'Okta', desc: 'SAML SSO and SCIM provisioning.', connected: true },
]

export default function Settings() {
  const { logAction } = useSession()
  const navigate = useNavigate()
  const [active, setActive] = useState<TabKey>('General')
  const [accent, setAccent] = useState('#1f47f5')
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    notifyIncidents: true,
    notifyViolations: true,
    notifyBilling: false,
    notifyDigest: true,
    notifyReleases: false,
  })

  const flip = (k: string) => setToggles((p) => ({ ...p, [k]: !p[k] }))

  // Org-wide security policy (persisted); the posture score reacts live.
  const [securityPolicy, setSecurityPolicy] = useState<SecurityPolicy>(loadSecurityPolicy)

  // Editable + persisted access matrix, with a change log
  const [accessMap, setAccessMap] = useState<AccessMap>(() => effectiveAccessMap())
  const [changes, setChanges] = useState<{ id: number; actor: string; text: string; time: string }[]>([])
  const [saved, setSaved] = useState(false)
  const changeId = useRef(0)

  const logChange = (text: string) => {
    changeId.current += 1
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setChanges((prev) => [{ id: changeId.current, actor: currentUser.email, text, time }, ...prev].slice(0, 8))
  }

  const toggleAccess = (feature: EAccessFeature, role: EAccessRole) => {
    if (role === EAccessRole.Superuser) return // Superuser always has everything
    const roleName = roleDefs.find((r) => r.id === role)?.name ?? role
    const has = accessMap[feature].includes(role)
    setAccessMap((prev) => ({
      ...prev,
      [feature]: has ? prev[feature].filter((x) => x !== role) : [...prev[feature], role],
    }))
    logChange(`${has ? 'Revoked' : 'Granted'} “${featureLabel(feature)}” ${has ? 'from' : 'to'} ${roleName}`)
  }

  const resetToDefaults = () => {
    resetAccessMap()
    setAccessMap(effectiveAccessMap())
    logChange('Reset access map to production defaults')
  }

  const saveChanges = () => {
    saveAccessMap(accessMap)
    saveSecurityPolicy(securityPolicy)
    logAction({ action: 'settings.save', target: active === 'Security' ? 'security policy' : 'roles & permissions', category: 'settings' })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure your PLCY organization and platform preferences"
        actions={
          <div className="flex items-center gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <GatedButton cap="settings.modify" className="btn-primary" onClick={saveChanges}>
              <Save className="h-4 w-4" />
              Save changes
            </GatedButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        {/* Tab nav */}
        <nav className="flex flex-row flex-wrap gap-1 lg:flex-col">
          {tabs.map((t) => {
            const Icon = t.icon
            const isActive = active === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-slate-100 hover:text-ink-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.key}
              </button>
            )
          })}
        </nav>

        {/* Section content */}
        <div className="min-w-0">
          {active === 'General' && (
            <Card>
              <CardTitle title="General" subtitle="Organization profile and defaults" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Organization name">
                  <input className="input" defaultValue="PLCY, Inc." />
                </Field>
                <Field label="Support email">
                  <input className="input" defaultValue="support@plcy.app" />
                </Field>
                <Field label="Default region">
                  <select className="input" defaultValue="US-East">
                    <option>US-East</option>
                    <option>US-West</option>
                    <option>EU-Central</option>
                    <option>EU-West</option>
                    <option>APAC</option>
                  </select>
                </Field>
                <Field label="Default plan tier">
                  <select className="input" defaultValue="Business">
                    <option>Enterprise</option>
                    <option>Business</option>
                    <option>Growth</option>
                    <option>Trial</option>
                  </select>
                </Field>
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink-700">Data retention</p>
                  <span className="text-sm font-semibold text-ink-900">400 / 730 days</span>
                </div>
                <div className="mt-2">
                  <Progress value={55} tone="blue" />
                </div>
                <p className="mt-2 text-xs text-ink-500">Audit and evaluation logs are retained for 400 days.</p>
              </div>
            </Card>
          )}

          {active === 'Branding' && (
            <Card>
              <CardTitle title="Branding" subtitle="Customize the console appearance" />
              <p className="mb-3 text-sm font-medium text-ink-700">Accent color</p>
              <div className="flex flex-wrap gap-3">
                {swatches.map((s) => (
                  <button
                    key={s.hex}
                    onClick={() => setAccent(s.hex)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl ring-2 ring-offset-2 transition"
                    style={{
                      backgroundColor: s.hex,
                      boxShadow: accent === s.hex ? `0 0 0 2px ${s.hex}` : 'none',
                    }}
                    aria-label={s.name}
                  >
                    {accent === s.hex && <Check className="h-5 w-5 text-white" />}
                  </button>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-ink-700">Logo</p>
                  <div className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-ink-400">
                    Drop a PNG or SVG here
                  </div>
                </div>
                <Field label="Login page tagline">
                  <input className="input" defaultValue="Govern every model. Enforce every policy." />
                </Field>
              </div>
            </Card>
          )}

          {active === 'Notifications' && (
            <Card>
              <CardTitle title="Notifications" subtitle="Choose which events reach your team" />
              <div className="divide-y divide-slate-100">
                {[
                  { key: 'notifyIncidents', label: 'Critical incidents', desc: 'Immediate alert when a P1 incident opens.' },
                  { key: 'notifyViolations', label: 'Policy violations', desc: 'Notify when enforcement blocks a request.' },
                  { key: 'notifyBilling', label: 'Billing updates', desc: 'Invoices, plan changes, and payment issues.' },
                  { key: 'notifyDigest', label: 'Weekly digest', desc: 'Summary of governance activity each Monday.' },
                  { key: 'notifyReleases', label: 'Product releases', desc: 'New features and platform version updates.' },
                ].map((r) => (
                  <div key={r.key} className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{r.label}</p>
                      <p className="text-xs text-ink-500">{r.desc}</p>
                    </div>
                    <Toggle on={toggles[r.key]} onClick={() => flip(r.key)} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {active === 'Billing' && (
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardTitle title="Current Plan" subtitle="Internal platform tier" action={<Badge tone="purple">Enterprise</Badge>} />
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold tracking-tight text-ink-900">$189,000</span>
                  <span className="pb-1 text-sm text-ink-500">/ month recurring</span>
                </div>
                <p className="mt-1 text-sm text-ink-500">Renews Aug 1, 2026 · billed annually</p>
              </Card>
              <Card>
                <CardTitle title="Usage this cycle" subtitle="Metered platform consumption" />
                {[
                  { label: 'API evaluations', value: 68, detail: '8.4M / 12M' },
                  { label: 'Seats', value: 82, detail: '164 / 200' },
                  { label: 'Storage', value: 41, detail: '410 GB / 1 TB' },
                ].map((u) => (
                  <div key={u.label} className="mb-4 last:mb-0">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-ink-700">{u.label}</span>
                      <span className="font-medium text-ink-900">{u.detail}</span>
                    </div>
                    <Progress value={u.value} tone={u.value > 80 ? 'orange' : 'blue'} />
                  </div>
                ))}
              </Card>
            </div>
          )}

          {active === 'Integrations' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {integrations.map((it) => (
                <Card key={it.name}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Plug className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-900">{it.name}</p>
                        <p className="text-xs text-ink-500">{it.desc}</p>
                      </div>
                    </div>
                    {it.connected ? <Badge tone="green" dot>Connected</Badge> : <Badge tone="slate">Not connected</Badge>}
                  </div>
                  <div className="mt-4">
                    {it.connected ? (
                      <button className="btn-secondary w-full" onClick={() => it.to && navigate(it.to)}>
                        {it.to ? 'Configure' : 'Manage'}
                      </button>
                    ) : (
                      <button className="btn-primary w-full">Connect</button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {active === 'Roles & Permissions' && (
            <div>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-ink-900">Role-Based Access Control</h3>
                  <p className="mt-0.5 text-sm text-ink-500">
                    The production access map · Superuser holds every permission · click any cell to grant or revoke
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button className="btn-ghost" onClick={resetToDefaults} title="Revert to production defaults">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              </div>

              <Card className="mb-6">
                <CardTitle title="Access by role" subtitle="At-a-glance — how much of each domain each role can reach" />
                <RoleSummaryCards map={accessMap} />
              </Card>

              <div className="mb-3">
                <h4 className="text-base font-semibold text-ink-900">Access details</h4>
                <p className="mt-0.5 text-sm text-ink-500">
                  Expand a domain to grant or revoke individual permissions
                </p>
              </div>
              <AccessMatrix map={accessMap} onToggle={toggleAccess} />

              <Card className="mt-6">
                <CardTitle title="Permission Change Log" subtitle="Recent access modifications" />
                {changes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-400">
                    No changes yet — click a cell in the matrix above to grant or revoke a permission.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {changes.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 py-2.5">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                        <p className="min-w-0 flex-1 text-sm text-ink-700">{a.text}</p>
                        <span className="shrink-0 text-xs text-ink-400">
                          {a.actor} · {a.time}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}

          {active === 'Security' && (
            <SecuritySettings policy={securityPolicy} onChange={setSecurityPolicy} />
          )}
        </div>
      </div>
    </>
  )
}
