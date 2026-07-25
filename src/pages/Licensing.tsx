import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { KeyRound, Users, Clock, CircleX, Eye, RefreshCw, Check, X, Lock } from 'lucide-react'
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
  Progress,
  Modal,
} from '@/components/ui'
import { deployments as seedDeployments, regionByCode } from '@/data/fleet'
import type { Deployment, License } from '@/data/fleet'
import { useCustomerScope } from '@/context/CustomerScope'
import { useSession } from '@/context/Session'
import { GatedButton } from '@/components/GatedButton'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const planTone = (plan: string): 'purple' | 'blue' | 'green' | 'slate' =>
  plan === 'Enterprise' ? 'purple' : plan === 'Business' ? 'blue' : plan === 'Growth' ? 'green' : 'slate'

const statusTone = (s: License['status']): 'green' | 'orange' | 'red' | 'purple' =>
  s === 'Active' ? 'green' : s === 'Expiring' ? 'orange' : s === 'Expired' ? 'red' : 'purple'

const utilization = (l: License): number => (l.seats > 0 ? Math.round((l.seatsUsed / l.seats) * 100) : 0)
const utilTone = (pct: number): 'green' | 'orange' | 'red' => (pct > 90 ? 'red' : pct > 75 ? 'orange' : 'green')

/** Entitlements synthesized per plan. */
const ENTITLEMENTS: readonly string[] = [
  'All policy packs',
  'Unlimited models',
  'BYOK / HSM',
  '24×7 support',
  'Air-gapped bundles',
  'SSO / SCIM',
  'Audit export',
]
const planGrants: Record<string, readonly string[]> = {
  Enterprise: ENTITLEMENTS,
  Business: ['All policy packs', 'SSO / SCIM', 'Audit export', '24×7 support'],
  Growth: ['SSO / SCIM', 'Audit export'],
  Trial: ['Audit export'],
}

/** Deterministic offline license key for air-gapped sites. */
function offlineKey(d: Deployment): string {
  const seed = `${d.id}${d.customer}`
  const block = (n: number): string => {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i) + n * 97) >>> 0
    return h.toString(36).toUpperCase().padStart(4, '0').slice(0, 4)
  }
  return `PLCY-AGAP-${block(1)}-${block(2)}-${block(3)}`
}

/** Extend expiry by one year from today and mark Active. */
function renewedLicense(l: License): License {
  const next = new Date()
  next.setFullYear(next.getFullYear() + 1)
  return { ...l, status: 'Active', expiry: next.toISOString().slice(0, 10) }
}

/** A license is comfortably active if Active and expiring more than 90 days out. */
function farActive(l: License): boolean {
  if (l.status !== 'Active') return false
  const days = (new Date(l.expiry).getTime() - Date.now()) / 86_400_000
  return days > 90
}

export default function Licensing() {
  const { scope, isAll } = useCustomerScope()
  const { logAction } = useSession()
  const [rows, setRows] = useState<Deployment[]>(seedDeployments)
  const [selId, setSelId] = useState<string | null>(null)

  const scoped = isAll ? rows : rows.filter((d) => d.customer === scope)
  const sel = selId ? scoped.find((d) => d.id === selId) ?? null : null

  const renew = (id: string) =>
    setRows((prev) => prev.map((d) => (d.id === id ? { ...d, license: renewedLicense(d.license) } : d)))

  const active = scoped.filter((d) => d.license.status === 'Active').length
  const expiring = scoped.filter((d) => d.license.status === 'Expiring').length
  const expired = scoped.filter((d) => d.license.status === 'Expired').length
  const seatsUsed = scoped.reduce((s, d) => s + d.license.seatsUsed, 0)
  const seatsTotal = scoped.reduce((s, d) => s + d.license.seats, 0)

  const chartData = scoped.map((d) => ({ customer: d.customer, pct: utilization(d.license) }))

  return (
    <>
      <PageHeader
        title="Licensing"
        description={isAll ? 'Licenses & entitlements across the client fleet' : `Licensing for ${scope}`}
        actions={
          <GatedButton cap="license.manage" className="btn-primary">
            <KeyRound className="h-4 w-4" />
            Issue license
          </GatedButton>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active licenses" value={active} icon={KeyRound} tone="green" footer={`of ${scoped.length} deployments`} />
        <StatCard label="Seats used" value={`${seatsUsed}/${seatsTotal}`} icon={Users} tone="blue" footer={`${seatsTotal > 0 ? Math.round((seatsUsed / seatsTotal) * 100) : 0}% of provisioned seats`} />
        <StatCard label="Expiring soon" value={expiring} icon={Clock} tone="orange" footer="Renewal due" />
        <StatCard label="Expired" value={expired} icon={CircleX} tone="red" footer="Action required" />
      </div>

      {/* Seat utilization chart */}
      <Card className="mt-6">
        <CardTitle title="Seat Utilization by Client" subtitle="Seats consumed as a share of licensed seats — bars turn rose above 90%" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="customer" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={54} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(v: number) => [`${v}%`, 'Utilization']} />
              <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {chartData.map((d) => (
                  <Cell key={d.customer} fill={d.pct > 90 ? '#f43f5e' : '#3366ff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* License table */}
      <Card className="mt-6">
        <CardTitle title="Licenses" subtitle={`${scoped.length} client license${scoped.length === 1 ? '' : 's'}${isAll ? '' : ` · ${scope}`}`} />
        <Table columns={['Customer', 'Plan', 'Seats', 'Utilization', 'Expiry', 'Status', 'Actions', '']} noun="licenses">
          {scoped.map((d) => {
            const l = d.license
            const pct = utilization(l)
            return (
              <Tr key={d.id}>
                <Td className="font-semibold text-ink-900">{d.customer}</Td>
                <Td>
                  <Badge tone={planTone(l.plan)}>{l.plan}</Badge>
                </Td>
                <Td>
                  <div className="w-40">
                    <Progress value={pct} tone={utilTone(pct)} />
                    <p className="mt-1 font-mono text-xs text-ink-500">{l.seatsUsed}/{l.seats} used</p>
                  </div>
                </Td>
                <Td className="font-mono text-sm text-ink-700">{pct}%</Td>
                <Td className="font-mono text-xs text-ink-500">{l.expiry}</Td>
                <Td>
                  <Badge tone={statusTone(l.status)} dot>{l.status}</Badge>
                </Td>
                <Td>
                  <GatedButton
                    cap="license.manage"
                    className="btn-secondary px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => {
                      logAction({ action: 'license.renew', target: d.customer, category: 'license' })
                      renew(d.id)
                    }}
                    disabled={farActive(l)}
                    title={farActive(l) ? 'License is active with a distant expiry' : 'Extend expiry by one year'}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Renew
                  </GatedButton>
                </Td>
                <Td>
                  <button
                    className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600"
                    aria-label={`View ${d.customer} license`}
                    onClick={() => setSelId(d.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

      {/* Detail drawer */}
      {sel && (
        <Modal
          open
          onClose={() => setSelId(null)}
          title={sel.customer}
          subtitle={`${sel.license.plan} plan · ${sel.connectivity}`}
          headerRight={<StatusBadge status={sel.license.status} />}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setSelId(null)}>Close</button>
              <GatedButton
                cap="license.manage"
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  logAction({ action: 'license.renew', target: sel.customer, category: 'license' })
                  renew(sel.id)
                }}
                disabled={farActive(sel.license)}
              >
                <RefreshCw className="h-4 w-4" />
                Renew license
              </GatedButton>
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KV label="Plan" value={sel.license.plan} />
              <KV label="Seats" value={`${sel.license.seatsUsed} / ${sel.license.seats}`} mono />
              <KV label="Utilization" value={`${utilization(sel.license)}%`} mono />
              <KV label="Expiry" value={sel.license.expiry} mono />
              <KV label="Status" value={sel.license.status} />
              <KV label="Region" value={regionByCode(sel.regionCode)?.name ?? sel.regionCode} />
            </div>

            <section>
              <h4 className="mb-3 text-sm font-semibold text-ink-900">Entitlements</h4>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {ENTITLEMENTS.map((ent) => {
                  const granted = (planGrants[sel.license.plan] ?? []).includes(ent)
                  return (
                    <li key={ent} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      {granted ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <X className="h-4 w-4 shrink-0 text-slate-300" />
                      )}
                      <span className={granted ? 'text-ink-900' : 'text-ink-400 line-through'}>{ent}</span>
                    </li>
                  )
                })}
              </ul>
            </section>

            {sel.connectivity === 'Air-gapped' && (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <Lock className="h-4 w-4" />
                  Offline license key
                </p>
                <code className="block rounded-lg bg-white px-3 py-2 font-mono text-sm text-ink-900 ring-1 ring-amber-200">
                  {offlineKey(sel)}
                </code>
                <p className="mt-2 text-xs text-amber-800">
                  Activated offline — the air-gapped site imports and verifies this key locally; no phone-home is required.
                </p>
              </section>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 font-semibold text-ink-900 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  )
}
