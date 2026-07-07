import { useState } from 'react'
import { Plus, Eye, ArrowRight, ShieldCheck, ShieldAlert, Ban } from 'lucide-react'
import { PageHeader, StatCard, Badge, StatusBadge, Table, Tr, Td, Modal } from '@/components/ui'
import { Card, CardTitle } from '@/components/ui'
import { transfers as seed } from '@/data/privacy'
import type { Transfer, TransferMechanism, TIA } from '@/data/privacy'
import { regionByCode } from '@/data/fleet'
import { useCustomerScope } from '@/context/CustomerScope'

const mechanismTone: Record<TransferMechanism, 'green' | 'blue' | 'purple' | 'slate' | 'red'> = {
  'In-region only': 'green',
  'Adequacy decision': 'blue',
  SCCs: 'purple',
  'Air-gapped (no egress)': 'slate',
  Blocked: 'red',
}
const tiaTone: Record<TIA, 'green' | 'orange' | 'slate'> = {
  Complete: 'green',
  Pending: 'orange',
  'N/A': 'slate',
}

const regionName = (code: string) => regionByCode(code)?.name ?? code
const isInRegion = (m: TransferMechanism) => m === 'In-region only' || m === 'Air-gapped (no egress)'

export default function Transfers() {
  const { scope, isAll } = useCustomerScope()
  const [rows, setRows] = useState<Transfer[]>(seed)
  const [sel, setSel] = useState<Transfer | null>(null)

  const scoped = isAll ? rows : rows.filter((t) => t.customer === scope)

  const inRegion = scoped.filter((t) => isInRegion(t.mechanism)).length
  const blocked = scoped.filter((t) => t.status === 'Blocked').length
  const underReview = scoped.filter((t) => t.status === 'Under review').length

  const approve = (id: string) => {
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

      <Card className="mt-6">
        <CardTitle title="Transfer Register" subtitle={`${scoped.length} data flow${scoped.length === 1 ? '' : 's'}${isAll ? '' : ` · ${scope}`}`} />
        <Table columns={['ID', 'Customer', 'Route', 'Data category', 'Mechanism', 'TIA', 'Status', 'Reviewed', '']}>
          {scoped.map((t) => (
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
              <Td><Badge tone={tiaTone[t.tia]}>{t.tia}</Badge></Td>
              <Td><StatusBadge status={t.status} /></Td>
              <Td className="text-xs text-ink-500">{t.reviewed}</Td>
              <Td>
                <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${t.id}`} onClick={() => setSel(t)}>
                  <Eye className="h-4 w-4" />
                </button>
              </Td>
            </Tr>
          ))}
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
                <button className="btn-primary" onClick={() => approve(sel.id)}>
                  <ShieldCheck className="h-4 w-4" />Approve transfer
                </button>
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
