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
  Save,
  Check,
  KeyRound,
  RotateCcw,
  Lock,
  ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, PageHeader, Badge, Progress } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
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
    enforceMfa: true,
    ipAllowlist: false,
  })

  const flip = (k: string) => setToggles((p) => ({ ...p, [k]: !p[k] }))

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
    logAction({ action: 'settings.save', target: 'roles & permissions', category: 'settings' })
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
            <Card>
              <CardTitle title="Security" subtitle="Access controls and authentication" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Session timeout">
                  <select className="input" defaultValue="8 hours">
                    <option>1 hour</option>
                    <option>4 hours</option>
                    <option>8 hours</option>
                    <option>24 hours</option>
                  </select>
                </Field>
                <Field label="IP allowlist (CIDR)">
                  <input className="input" placeholder="10.4.0.0/16, 52.9.44.0/24" />
                </Field>
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Enforce MFA</p>
                    <p className="text-xs text-ink-500">Require a second factor for every admin sign-in.</p>
                  </div>
                  <Toggle on={toggles.enforceMfa} onClick={() => flip('enforceMfa')} />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Restrict to IP allowlist</p>
                    <p className="text-xs text-ink-500">Block console access from outside allowed ranges.</p>
                  </div>
                  <Toggle on={toggles.ipAllowlist} onClick={() => flip('ipAllowlist')} />
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
