import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  KeyRound,
  Users,
  Fingerprint,
  RotateCw,
} from 'lucide-react'
import {
  Card,
  CardTitle,
  PageHeader,
  StatCard,
  Badge,
  StatusBadge,
  Table,
  Tr,
  Td,
  Avatar,
} from '@/components/ui'
import { admins, effectiveRoleById } from '@/data/roles'
import { SecurityPostureBanner } from '@/components/SecurityPostureBanner'
import { scoreSecurity, loadSecurityPolicy } from '@/data/security'

interface ApiKey {
  name: string
  prefix: string
  scopes: string[]
  created: string
  lastUsed: string
  status: string
}

const apiKeys: ApiKey[] = [
  { name: 'Production Console', prefix: 'plcy_live_…a1b2', scopes: ['read', 'write', 'admin'], created: '2024-11-02', lastUsed: '3 min ago', status: 'Active' },
  { name: 'CI/CD Pipeline', prefix: 'plcy_live_…9f3c', scopes: ['read', 'deploy'], created: '2025-01-14', lastUsed: '1 hour ago', status: 'Active' },
  { name: 'Analytics Export', prefix: 'plcy_live_…7d40', scopes: ['read'], created: '2025-03-09', lastUsed: '6 hours ago', status: 'Active' },
  { name: 'Legacy Webhook', prefix: 'plcy_live_…0e18', scopes: ['read', 'write'], created: '2023-08-22', lastUsed: '90 days ago', status: 'Expired' },
]

const scopeTone: Record<string, 'red' | 'blue' | 'green' | 'orange' | 'slate' | 'purple'> = {
  admin: 'red',
  write: 'orange',
  deploy: 'purple',
  read: 'blue',
}

const mfaEnrolled = Math.round((admins.filter((a) => a.mfa).length / admins.length) * 100)

export default function AdminSecurity() {
  const posture = scoreSecurity(loadSecurityPolicy())
  return (
    <>
      <PageHeader
        title="Admin Security"
        description="Manage administrator access, authentication, and platform credentials"
        actions={
          <button className="btn-primary">
            <ShieldCheck className="h-4 w-4" />
            Security review
          </button>
        }
      />

      <div className="mb-6">
        <SecurityPostureBanner />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Admin users" value={admins.length} icon={Users} tone="blue" footer="With console access" />
        <StatCard label="MFA enrolled" value={`${mfaEnrolled}%`} icon={Fingerprint} tone="green" footer={`${admins.filter((a) => !a.mfa).length} pending`} />
        <StatCard label="Active sessions" value={9} icon={ShieldCheck} tone="purple" footer="Across all admins" />
        <StatCard label="SSO status" value="On" icon={KeyRound} tone="orange" footer="Okta SAML 2.0" />
      </div>

      {/* Admin users table */}
      <Card className="mt-6">
        <CardTitle title="Administrator Accounts" subtitle="PLCY staff with elevated privileges" />
        <Table columns={['User', 'Role', 'MFA', 'Last active', 'Status']}>
          {admins.map((u) => (
            <Tr key={u.email}>
              <Td>
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{u.name}</p>
                    <p className="text-xs text-ink-500">{u.email}</p>
                  </div>
                </div>
              </Td>
              <Td>
                {(() => {
                  const role = effectiveRoleById(u.roleId)
                  return <Badge tone={role?.tone ?? 'slate'}>{role?.name ?? 'Unassigned'}</Badge>
                })()}
              </Td>
              <Td>
                {u.mfa ? (
                  <Badge tone="green" dot>Enabled</Badge>
                ) : (
                  <Badge tone="red" dot>Disabled</Badge>
                )}
              </Td>
              <Td className="text-ink-700">{u.lastActive}</Td>
              <Td>
                <StatusBadge status={u.status} />
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* SSO config + Recommendations */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle
            title="Single Sign-On"
            subtitle="SAML 2.0 identity provider"
            action={<Badge tone="green" dot>Connected</Badge>}
          />
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-ink-900">Okta</p>
              <p className="text-xs text-ink-500">plcy.okta.com · SAML 2.0</p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {[
              { label: 'Enforce SSO for all users', on: true },
              { label: 'Auto-provision new members (SCIM)', on: true },
              { label: 'Allow password fallback', on: false },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-3">
                <span className="text-sm text-ink-700">{s.label}</span>
                <div
                  className={`flex h-6 w-11 items-center rounded-full px-0.5 ${
                    s.on ? 'justify-end bg-brand-600' : 'justify-start bg-slate-200'
                  }`}
                >
                  <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle
            title="Security Recommendations"
            subtitle="Live gaps from the configured security policy"
            action={<Link to="/settings?tab=Security" className="btn-ghost px-2 py-1 text-xs">Configure</Link>}
          />
          {posture.findings.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              Every hardening control in the security policy is enabled — no open gaps.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {posture.findings.map((f, i) => (
                <li key={f.label} className="flex items-start gap-3 py-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i < 2 ? 'bg-rose-500' : i < 4 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{f.label}</p>
                    <p className="text-xs text-ink-500">{f.fix}</p>
                  </div>
                  <Badge tone="slate">{f.group}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* API keys */}
      <Card className="mt-6">
        <CardTitle title="API Keys" subtitle="Platform credentials for programmatic access" />
        <Table columns={['Name', 'Key', 'Scopes', 'Created', 'Last used', 'Status', '']}>
          {apiKeys.map((k) => (
            <Tr key={k.prefix}>
              <Td className="font-semibold text-ink-900">{k.name}</Td>
              <Td className="font-mono text-xs text-ink-500">{k.prefix}</Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  {k.scopes.map((s) => (
                    <Badge key={s} tone={scopeTone[s] ?? 'slate'}>{s}</Badge>
                  ))}
                </div>
              </Td>
              <Td className="text-ink-700">{k.created}</Td>
              <Td className="text-ink-500">{k.lastUsed}</Td>
              <Td>
                <StatusBadge status={k.status} />
              </Td>
              <Td className="text-right">
                <button className="btn-secondary">
                  <RotateCw className="h-4 w-4" />
                  Rotate
                </button>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
