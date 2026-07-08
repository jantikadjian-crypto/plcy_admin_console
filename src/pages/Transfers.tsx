import { useState } from 'react'
import { Plus, Eye, ArrowRight, ShieldCheck, ShieldAlert, Ban, AlertTriangle } from 'lucide-react'
import { PageHeader, StatCard, Badge, StatusBadge, Table, Tr, Td, Modal } from '@/components/ui'
import { Card, CardTitle } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { transfers as seed } from '@/data/privacy'
import type { Transfer, TransferMechanism } from '@/data/privacy'
import { regionByCode } from '@/data/fleet'
import { loadPolicies, evaluateResidency } from '@/data/residency'
import type { Mechanism, ResidencyDecision, ResidencyResult } from '@/data/residency'
import { useCustomerScope } from '@/context/CustomerScope'

const decisionTone: Record<ResidencyDecision, 'green' | 'yellow' | 'red'> = { Allow: 'green', 'Require safeguard': 'yellow', Block: 'red' }
const residencyPolicies = loadPolicies()
function toMechanism(m: TransferMechanism): Mechanism | undefined {
  if (m === 'SCCs') return 'SCCs'
  if (m === 'Adequacy decision') return 'Adequacy decision'
  return undefined
}
function transferVerdict(t: Transfer): ResidencyResult {
  // Aggregate/unknown sources (e.g. "All regions") are evaluated per-region at the gateway.
  if (!residencyPolicies[t.from]) {
    return { decision: 'Allow', reason: 'Multi-region flow — evaluated per source region at the gateway.' }
  }
  return evaluateResidency(residencyPolicies[t.from], {
    sourceRegion: t.from,
    operation: 'Transfer',
    targetRegion: t.from === t.to ? undefined : t.to,
    mechanism: toMechanism(t.mechanism),
    dataCategory: t.dataCategory,
  })
}
/** A recorded "Approved" that the live policy would Block is a conflict. */
const isConflict = (t: Transfer) => t.status === 'Approved' && transferVerdict(t).decision === 'Block'

const mechanismTone: Record<TransferMechanism, 'green' | 'blue' | 'purple' | 'slate' | 'red'> = {
  'In-region only': 'green',
  'Adequacy decision': 'blue',
  SCCs: 'purple',
  'Air-gapped (no egress)': 'slate',
  Blocked: 'red',
}
const regionName = (code: string) => regionByCode(code)?.name ?? code
const isInRegion = (m: TransferMechanism) => m === 'In-region only' || m === 'Air-gapped (no egress)'

export default function Transfers() {
  const { scope, isAll } = useCustomerScope()
  const { logAction } = useSession()
  const [rows, setRows] = useState<Transfer[]>(seed)
  const [sel, setSel] = useState<Transfer | null>(null)

  const scoped = isAll ? rows : rows.filter((t) => t.customer === scope)

  const inRegion = scoped.filter((t) => isInRegion(t.mechanism)).length
  const blocked = scoped.filter((t) => t.status === 'Blocked').length
  const underReview = scoped.filter((t) => t.status === 'Under review').length

  const approve = (id: string) => {
    logAction({ action: 'transfer.approve', target: id, category: 'sovereignty' })
    setRows((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Approved' } : t)))
    setSel((s) => (s && s.id === id ? { ...s, status: 'Approved' } : s))
  }

  return (
    <>
      <PageHeader
        title="Data Transfers"
        description="Cross-border transfer register — legal basis and residency for every data flow"
        actions={<button className="btn-primary"><Plus className="h-4 w-4" />Log transfer</button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total transfers" value={scoped.length} icon={ArrowRight} tone="blue" footer={isAll ? 'Across all clients' : scope} />
        <StatCard label="In-region / no transfer" value={inRegion} icon={ShieldCheck} tone="green" footer="Data stays in jurisdiction" />
        <StatCard label="Blocked" value={blocked} icon={Ban} tone="red" footer="Egress denied at gateway" />
        <StatCard label="Under review" value={underReview} icon={ShieldAlert} tone="orange" footer="Awaiting legal sign-off" />
      </div>

      {scoped.some(isConflict) && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">
            <strong>{scoped.filter(isConflict).length}</strong> approved transfer(s) would be <strong>blocked</strong> by the current residency policy. Review before they run.
          </p>
        </div>
      )}

      <Card className="mt-6">
        <CardTitle title="Transfer Register" subtitle={`${scoped.length} data flow${scoped.length === 1 ? '' : 's'}${isAll ? '' : ` · ${scope}`} · evaluated against residency policy`} />
        <Table columns={['ID', 'Customer', 'Route', 'Data category', 'Mechanism', 'Residency policy', 'Status', 'Reviewed', '']}>
          {scoped.map((t) => {
            const v = transferVerdict(t)
            const conflict = isConflict(t)
            return (
            <Tr key={t.id}>
              <Td className="font-mono text-xs text-ink-700">{t.id}</Td>
              <Td className="text-ink-700">{t.customer}</Td>
              <Td>
                {t.from === t.to ? (
                  <span className="flex items-center gap-2 font-mono text-xs text-ink-700">
                    {t.from}
                    <Badge tone="green">in-region</Badge>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-mono text-xs text-ink-700">
                    {t.from}
                    <ArrowRight className="h-3.5 w-3.5 text-ink-400" />
                    {t.to}
                  </span>
                )}
              </Td>
              <Td className="text-ink-700">{t.dataCategory}</Td>
              <Td><Badge tone={mechanismTone[t.mechanism]}>{t.mechanism}</Badge></Td>
              <Td>
                <div className="flex items-center gap-1.5">
                  <Badge tone={decisionTone[v.decision]} dot>{v.decision}</Badge>
                  {conflict && <span title="Conflicts with recorded status"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /></span>}
                </div>
              </Td>
              <Td><StatusBadge status={t.status} /></Td>
              <Td className="text-xs text-ink-500">{t.reviewed}</Td>
              <Td>
                <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${t.id}`} onClick={() => setSel(t)}>
                  <Eye className="h-4 w-4" />
                </button>
              </Td>
            </Tr>
            )
          })}
        </Table>
      </Card>

      {sel && (
        <Modal
          open
          onClose={() => setSel(null)}
          title={<span className="font-mono">{sel.id}</span>}
          subtitle={sel.customer}
          headerRight={<StatusBadge status={sel.status} />}
          footer={
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setSel(null)}>Close</button>
              {sel.status !== 'Approved' && (
                <GatedButton cap="transfer.approve" className="btn-primary" onClick={() => approve(sel.id)}>
                  <ShieldCheck className="h-4 w-4" />Approve transfer
                </GatedButton>
              )}
            </div>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KV label="From" value={regionName(sel.from)} />
              <KV label="To" value={regionName(sel.to)} />
              <KV label="Data category" value={sel.dataCategory} />
              <KV label="Mechanism" value={sel.mechanism} />
              <KV label="TIA" value={sel.tia} />
              <KV label="Reviewed" value={sel.reviewed} />
            </div>

            {(() => {
              const v = transferVerdict(sel)
              const box =
                v.decision === 'Allow'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : v.decision === 'Block'
                    ? 'border-rose-200 bg-rose-50 text-rose-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
              return (
                <div className={`flex items-start gap-3 rounded-xl border p-4 ${box}`}>
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Residency policy · {v.decision}</p>
                    <p className="mt-0.5 text-sm opacity-90">{v.reason}</p>
                    {v.safeguard && <p className="mt-1 text-xs font-medium opacity-80">Safeguard: {v.safeguard}</p>}
                  </div>
                </div>
              )
            })()}

            {sel.status === 'Blocked' ? (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <Ban className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <p className="text-sm text-rose-900">
                  Cross-border transfer blocked — data must remain in its region of origin.
                </p>
              </div>
            ) : isInRegion(sel.mechanism) ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm text-emerald-900">
                  No transfer — data stays within its jurisdiction.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <p className="text-sm text-blue-900">
                  {sel.mechanism === 'Adequacy decision'
                    ? 'Transfer permitted under an adequacy decision — the destination jurisdiction offers an equivalent level of data protection.'
                    : 'Transfer safeguarded by Standard Contractual Clauses (SCCs) plus a transfer impact assessment covering onward access risk.'}
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
