import { useState } from 'react'
import { KeyRound, Eye, Clock3, Activity, ShieldAlert, Video, Check, X } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Avatar, Table, Tr, Td, Modal } from '@/components/ui'
import { accessRequests } from '@/data/privacy'
import type { AccessRequest, AccessScope, AccessStatus } from '@/data/privacy'
import { regionByCode } from '@/data/fleet'

const scopeTone: Record<AccessScope, 'slate' | 'blue' | 'red'> = {
  'Read-only': 'slate',
  Operator: 'blue',
  'Break-glass root': 'red',
}

const statusTone: Record<AccessStatus, 'orange' | 'blue' | 'green' | 'slate' | 'red'> = {
  'Pending approval': 'orange',
  Approved: 'blue',
  Active: 'green',
  Expired: 'slate',
  Denied: 'red',
}

export default function PrivilegedAccess() {
  const [rows, setRows] = useState<AccessRequest[]>(accessRequests)
  const [sel, setSel] = useState<AccessRequest | null>(null)

  const decide = (id: string, status: AccessStatus) =>
    setRows((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))

  const pending = rows.filter((a) => a.status === 'Pending approval').length
  const active = rows.filter((a) => a.status === 'Active').length
  const breakGlass = rows.filter((a) => a.scope === 'Break-glass root').length
  const recordedPct = rows.length ? Math.round((rows.filter((a) => a.recorded).length / rows.length) * 100) : 0

  const selLive = sel ? rows.find((a) => a.id === sel.id) ?? null : null

  return (
    <>
      <PageHeader
        title="Privileged Access"
        description="Break-glass & just-in-time access to client environments"
        actions={
          <button className="btn-primary">
            <KeyRound className="h-4 w-4" />
            Request access
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending approval" value={pending} icon={Clock3} tone="orange" footer="Awaiting review" />
        <StatCard label="Active sessions" value={active} icon={Activity} tone="green" footer="Live right now" />
        <StatCard label="Break-glass" value={breakGlass} icon={ShieldAlert} tone="red" footer="Elevated root grants" />
        <StatCard label="Sessions recorded" value={`${recordedPct}%`} icon={Video} tone="blue" footer="Full session capture" />
      </div>

      <Card className="mt-6">
        <CardTitle title="Access requests" subtitle={`${rows.length} request${rows.length === 1 ? '' : 's'}`} />
        <Table columns={['ID', 'Engineer', 'Customer', 'Environment', 'Scope', 'Status', 'Expires in', 'Actions', '']}>
          {rows.map((a) => (
            <Tr key={a.id}>
              <Td className="font-mono text-xs text-ink-700">{a.id}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Avatar name={a.engineer} />
                  <span className="text-xs text-ink-500">{a.engineer}</span>
                </div>
              </Td>
              <Td className="font-medium text-ink-900">{a.customer}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs text-ink-700">{a.environment}</span>
                  {a.airgapped && <Badge tone="red">air-gapped</Badge>}
                </div>
              </Td>
              <Td>
                <Badge tone={scopeTone[a.scope]}>{a.scope}</Badge>
              </Td>
              <Td>
                <Badge tone={statusTone[a.status]} dot>
                  {a.status}
                </Badge>
              </Td>
              <Td className="text-sm text-ink-700">{a.expiresIn}</Td>
              <Td>
                {a.status === 'Pending approval' ? (
                  <div className="flex gap-1">
                    <button className="btn-secondary px-2.5 py-1 text-xs" onClick={() => decide(a.id, 'Active')}>
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button className="btn-ghost px-2 py-1 text-xs text-rose-600" onClick={() => decide(a.id, 'Denied')}>
                      <X className="h-3.5 w-3.5" />
                      Deny
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-ink-400">—</span>
                )}
              </Td>
              <Td>
                <button
                  className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600"
                  aria-label={`View ${a.id}`}
                  onClick={() => setSel(a)}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {selLive && (
        <Modal
          open
          onClose={() => setSel(null)}
          title={<span className="font-mono">{selLive.id}</span>}
          subtitle={selLive.reason}
          headerRight={
            <Badge tone={statusTone[selLive.status]} dot>
              {selLive.status}
            </Badge>
          }
          footer={
            <>
              <button className="btn-secondary" onClick={() => setSel(null)}>
                Close
              </button>
              {selLive.status === 'Pending approval' && (
                <>
                  <button className="btn-ghost text-rose-600" onClick={() => decide(selLive.id, 'Denied')}>
                    <X className="h-4 w-4" />
                    Deny
                  </button>
                  <button className="btn-primary" onClick={() => decide(selLive.id, 'Active')}>
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                </>
              )}
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KV label="Engineer" value={selLive.engineer} />
              <KV label="Customer" value={selLive.customer} />
              <KV label="Environment" value={selLive.environment} mono />
              <KV label="Region" value={regionByCode(selLive.region)?.name ?? selLive.region} />
              <KV label="Scope" value={selLive.scope} />
              <KV label="Approver" value={selLive.approver} />
              <KV label="Requested" value={selLive.requested} />
              <KV label="Expires in" value={selLive.expiresIn} />
            </div>

            <div
              className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${
                selLive.recorded ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {selLive.recorded ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              Session {selLive.recorded ? 'recorded' : 'not recorded'}
            </div>

            {selLive.scope === 'Break-glass root' && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <p className="text-sm text-rose-900">
                  Elevated root access — fully recorded and audited; auto-expires.
                </p>
              </div>
            )}
            {selLive.airgapped && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">
                  Air-gapped site — access via escorted jump-host; no remote root without on-site approval.
                </p>
              </div>
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
