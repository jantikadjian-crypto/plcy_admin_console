import { useState, useRef } from 'react'
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
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, PageHeader, Badge, Progress } from '@/components/ui'
import { roleDefs, roleIconTone, assignedCount, BASE_CAPS } from '@/data/roles'
import type { RoleTone } from '@/data/roles'

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

/* ------------------------------------------------------------------ */
/* Role-based access control (editable)                                */
/* ------------------------------------------------------------------ */
interface EditCap {
  label: string
  granted: boolean
}

interface EditRole {
  id: string
  name: string
  desc: string
  icon: LucideIcon
  tone: RoleTone
  assigned: number
  caps: EditCap[]
}

// Seed editable role state from the shared role definitions.
const buildRoles = (): EditRole[] =>
  roleDefs.map((r) => ({
    id: r.id,
    name: r.name,
    desc: r.desc,
    icon: r.icon,
    tone: r.tone,
    assigned: assignedCount(r.id),
    caps: [
      ...BASE_CAPS.map((label, i) => ({ label, granted: r.baseFlags[i] })),
      ...r.extra.map((label) => ({ label, granted: true })),
    ],
  }))

function RoleCard({
  role,
  onToggle,
  onRename,
  onRenameCommit,
}: {
  role: EditRole
  onToggle: (roleId: string, label: string) => void
  onRename: (roleId: string, name: string) => void
  onRenameCommit: (roleId: string) => void
}) {
  const Icon = role.icon
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${roleIconTone[role.tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <input
              value={role.name}
              onChange={(e) => onRename(role.id, e.target.value)}
              onBlur={() => onRenameCommit(role.id)}
              aria-label="Role name"
              className="-mx-1 w-full max-w-xs rounded-md bg-transparent px-1 text-[15px] font-semibold text-ink-900 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            />
            <p className="mt-0.5 text-sm text-ink-500">{role.desc}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs font-medium text-ink-500 sm:inline">
            {role.assigned} {role.assigned === 1 ? 'user' : 'users'}
          </span>
          <Badge tone={role.tone}>{role.name || 'Untitled'}</Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {role.caps.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onToggle(role.id, c.label)}
            className="-mx-1 flex items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-slate-50"
          >
            {c.granted ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-slate-300" />
            )}
            <span className={`text-sm ${c.granted ? 'text-ink-700' : 'text-slate-400'}`}>{c.label}</span>
          </button>
        ))}
      </div>
    </Card>
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
  { name: 'Slack', desc: 'Send alerts to your workspace channels.', connected: true },
  { name: 'PagerDuty', desc: 'Page on-call for critical incidents.', connected: true },
  { name: 'Datadog', desc: 'Stream metrics and traces.', connected: false },
  { name: 'Okta', desc: 'SAML SSO and SCIM provisioning.', connected: true },
]

export default function Settings() {
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

  // Editable RBAC state + change log
  const [rbacRoles, setRbacRoles] = useState<EditRole[]>(buildRoles)
  const [audit, setAudit] = useState<{ id: number; actor: string; text: string; time: string }[]>([])
  const auditId = useRef(0)

  const logChange = (text: string) => {
    auditId.current += 1
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setAudit((prev) => [{ id: auditId.current, actor: 'jack@plcy.app', text, time }, ...prev].slice(0, 8))
  }

  const toggleCap = (roleId: string, label: string) => {
    const role = rbacRoles.find((r) => r.id === roleId)
    const nowGranted = !role?.caps.find((c) => c.label === label)?.granted
    setRbacRoles((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? { ...r, caps: r.caps.map((c) => (c.label === label ? { ...c, granted: !c.granted } : c)) }
          : r,
      ),
    )
    if (role) logChange(`${nowGranted ? 'Granted' : 'Revoked'} “${label}” ${nowGranted ? 'to' : 'from'} ${role.name}`)
  }

  const renameRole = (roleId: string, name: string) =>
    setRbacRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, name } : r)))

  const commitRename = (roleId: string) => {
    const role = rbacRoles.find((r) => r.id === roleId)
    if (role) logChange(`Renamed a role to “${role.name || 'Untitled'}”`)
  }

  const addRole = () => {
    const n = rbacRoles.filter((r) => r.id.startsWith('custom-')).length + 1
    setRbacRoles((prev) => [
      ...prev,
      {
        id: `custom-${n}`,
        name: 'New Role',
        desc: 'Describe this role’s responsibilities',
        icon: KeyRound,
        tone: 'slate',
        assigned: 0,
        caps: BASE_CAPS.map((label) => ({ label, granted: false })),
      },
    ])
    logChange('Created a new role')
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure your PLCY organization and platform preferences"
        actions={
          <button className="btn-primary">
            <Save className="h-4 w-4" />
            Save changes
          </button>
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
        <div>
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
                      <button className="btn-secondary w-full">Manage</button>
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
                    Access is strictly segmented by role profile · click any capability to toggle it
                  </p>
                </div>
                <button className="btn-secondary shrink-0" onClick={addRole}>
                  <Plus className="h-4 w-4" />
                  Add role
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {rbacRoles.map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    onToggle={toggleCap}
                    onRename={renameRole}
                    onRenameCommit={commitRename}
                  />
                ))}
              </div>

              <Card className="mt-6">
                <CardTitle title="Permission Change Log" subtitle="Recent role and access modifications" />
                {audit.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-400">
                    No changes yet — toggle a capability, rename a role, or add one to see it logged here.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {audit.map((a) => (
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
