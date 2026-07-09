import { useState } from 'react'
import { Plus, Eye, Boxes, ShieldCheck, ShieldAlert, FileCheck2, Ban } from 'lucide-react'
import { PageHeader, StatCard, Badge, Table, Tr, Td, Modal } from '@/components/ui'
import { Card, CardTitle } from '@/components/ui'
import { subprocessors, privacyTotals } from '@/data/privacy'
import type { Subprocessor, SubprocStatus } from '@/data/privacy'
import { regionByCode } from '@/data/fleet'

const accessTone: Record<Subprocessor['dataAccess'], 'red' | 'orange' | 'blue' | 'slate'> = {
  Content: 'red',
  PII: 'orange',
  Metadata: 'blue',
  None: 'slate',
}
const statusTone: Record<SubprocStatus, 'green' | 'orange' | 'red'> = {
  Approved: 'green',
  'Under review': 'orange',
  Restricted: 'red',
}

const regionName = (code: string) => regionByCode(code)?.name ?? code

export default function Subprocessors() {
  const [sel, setSel] = useState<Subprocessor | null>(null)

  const approved = subprocessors.filter((s) => s.status === 'Approved').length
  const dpaSigned = subprocessors.filter((s) => s.dpa).length

  return (
    <>
      <PageHeader
        title="Sub-processors"
        description="Approved processors and the regions where they may operate. The third-party vendors PLCY relies on to run the service (cloud, monitoring, support), what customer data each can touch, and where they're allowed to operate — the list customers and auditors ask for."
        actions={<button className="btn-primary"><Plus className="h-4 w-4" />Add sub-processor</button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={privacyTotals.subprocessors} icon={Boxes} tone="blue" footer="Registered processors" />
        <StatCard label="Approved" value={approved} icon={ShieldCheck} tone="green" footer="Cleared for use" />
        <StatCard label="Restricted" value={privacyTotals.subprocRestricted} icon={ShieldAlert} tone="red" footer="Region-limited" />
        <StatCard label="DPA signed" value={dpaSigned} icon={FileCheck2} tone="purple" footer={`of ${privacyTotals.subprocessors} processors`} />
      </div>

      <Card className="mt-6">
        <CardTitle title="Sub-processor Registry" subtitle={`${subprocessors.length} processors with access to customer environments`} />
        <Table columns={['Name', 'Purpose', 'Location', 'Data access', 'DPA', 'Status', 'Restricted-in', '']}>
          {subprocessors.map((s) => (
            <Tr key={s.id}>
              <Td className="font-semibold text-ink-900">{s.name}</Td>
              <Td className="text-ink-700">{s.purpose}</Td>
              <Td className="text-ink-700">{s.location}</Td>
              <Td><Badge tone={accessTone[s.dataAccess]}>{s.dataAccess}</Badge></Td>
              <Td><Badge tone={s.dpa ? 'green' : 'red'}>{s.dpa ? 'Signed' : 'Missing'}</Badge></Td>
              <Td><Badge tone={statusTone[s.status]} dot>{s.status}</Badge></Td>
              <Td className="text-ink-700">
                {s.restrictedRegions.length > 0 ? s.restrictedRegions.length : <span className="text-ink-400">—</span>}
              </Td>
              <Td>
                <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${s.name}`} onClick={() => setSel(s)}>
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
          title={sel.name}
          subtitle={sel.location}
          headerRight={<Badge tone={statusTone[sel.status]} dot>{sel.status}</Badge>}
          footer={
            <div className="flex justify-end">
              <button className="btn-secondary" onClick={() => setSel(null)}>Close</button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KV label="Purpose" value={sel.purpose} />
              <KV label="Location" value={sel.location} />
              <KV label="Data access" value={sel.dataAccess} />
              <KV label="DPA" value={sel.dpa ? 'Signed' : 'Missing'} />
              <KV label="Status" value={sel.status} />
            </div>

            <section>
              <h4 className="mb-3 text-sm font-semibold text-ink-900">Regional restrictions</h4>
              {sel.restrictedRegions.length > 0 ? (
                <div className="space-y-3">
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {sel.restrictedRegions.map((code) => (
                      <li key={code} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                        <span className="text-sm text-ink-900">{regionName(code)}</span>
                        <span className="ml-auto font-mono text-xs text-ink-400">{code}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <Ban className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                    <p className="text-sm text-rose-900">
                      Not permitted in these sovereign / air-gapped regions — traffic is blocked at the gateway.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-sm text-emerald-900">Permitted in all regions.</p>
                </div>
              )}
            </section>
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
