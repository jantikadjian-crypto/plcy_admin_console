import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus2, Eye, FolderOpen, AlertTriangle, CircleCheck, Clock, ArrowRight, FileBarChart } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { dsarRequests } from '@/data/privacy'
import type { DSAR as DSARRow, DSARType, DSARStatus } from '@/data/privacy'
import { regionByCode } from '@/data/fleet'
import { useCustomerScope } from '@/context/CustomerScope'

const typeTone: Record<DSARType, 'blue' | 'red' | 'purple' | 'orange' | 'slate'> = {
  Access: 'blue',
  Erasure: 'red',
  Portability: 'purple',
  Rectification: 'orange',
  Objection: 'slate',
}

const statusTone: Record<DSARStatus, 'blue' | 'orange' | 'green' | 'red'> = {
  New: 'blue',
  'In progress': 'orange',
  Completed: 'green',
  Overdue: 'red',
}

const STEPS = ['Received', 'Verify identity', 'Locate data', 'Fulfil', 'Close']
function stepProgress(status: DSARStatus): number {
  if (status === 'New') return 1
  if (status === 'In progress') return 3
  if (status === 'Completed') return 5
  return 2 // Overdue
}

function nextStatus(status: DSARStatus): DSARStatus | null {
  if (status === 'New') return 'In progress'
  if (status === 'In progress' || status === 'Overdue') return 'Completed'
  return null
}

export default function DSAR() {
  const navigate = useNavigate()
  const { scope, isAll } = useCustomerScope()
  const { logAction } = useSession()
  const [rows, setRows] = useState<DSARRow[]>(dsarRequests)
  const [sel, setSel] = useState<DSARRow | null>(null)

  const scoped = isAll ? rows : rows.filter((d) => d.customer === scope)

  const advance = (id: string) => {
    logAction({ action: 'dsar.advance', target: id, category: 'dsar' })
    setRows((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d
        const nx = nextStatus(d.status)
        return nx ? { ...d, status: nx } : d
      }),
    )
  }

  const open = scoped.filter((d) => d.status !== 'Completed').length
  const overdue = scoped.filter((d) => d.status === 'Overdue').length
  const completed = scoped.filter((d) => d.status === 'Completed').length

  // Keep the selected row in sync with state after advancing.
  const selLive = sel ? rows.find((d) => d.id === sel.id) ?? null : null
  const selNext = selLive ? nextStatus(selLive.status) : null

  return (
    <>
      <PageHeader
        title="Data Requests"
        description="Data-subject requests (DSAR) across jurisdictions"
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate('/reports/dsar')}>
              <FileBarChart className="h-4 w-4" />
              Generate report
            </button>
            <button className="btn-primary">
              <FilePlus2 className="h-4 w-4" />
              New request
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open" value={open} icon={FolderOpen} tone="blue" footer="Awaiting fulfilment" />
        <StatCard label="Overdue" value={overdue} icon={AlertTriangle} tone="red" footer="Past statutory SLA" />
        <StatCard label="Completed" value={completed} icon={CircleCheck} tone="green" footer="Fulfilled & closed" />
        <StatCard label="Avg days to close" value="18 days" icon={Clock} tone="purple" footer="Trailing 90 days" />
      </div>

      <Card className="mt-6">
        <CardTitle
          title="Data-subject requests"
          subtitle={`${scoped.length} request${scoped.length === 1 ? '' : 's'}${isAll ? '' : ` · ${scope}`}`}
        />
        <Table columns={['ID', 'Type', 'Subject', 'Customer', 'Region', 'Law', 'Due', 'Status', 'Assignee', '']}>
          {scoped.map((d) => (
            <Tr key={d.id}>
              <Td className="font-mono text-xs text-ink-700">{d.id}</Td>
              <Td>
                <Badge tone={typeTone[d.type]}>{d.type}</Badge>
              </Td>
              <Td className="text-ink-700">{d.subject}</Td>
              <Td className="font-medium text-ink-900">{d.customer}</Td>
              <Td className="font-mono text-xs text-ink-500">{d.region}</Td>
              <Td className="text-sm text-ink-700">{d.law}</Td>
              <Td className={`text-sm ${d.status === 'Overdue' ? 'font-semibold text-rose-600' : 'text-ink-700'}`}>{d.due}</Td>
              <Td>
                <Badge tone={statusTone[d.status]} dot>
                  {d.status}
                </Badge>
              </Td>
              <Td className="text-xs text-ink-500">
                {d.assignee === 'unassigned' ? <span className="italic text-ink-400">unassigned</span> : d.assignee}
              </Td>
              <Td>
                <button
                  className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600"
                  aria-label={`View ${d.id}`}
                  onClick={() => setSel(d)}
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
          subtitle={`${selLive.subject} · ${selLive.customer}`}
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
              {selNext && (
                <GatedButton cap="dsar.manage" className="btn-primary" onClick={() => advance(selLive.id)}>
                  <ArrowRight className="h-4 w-4" />
                  {selLive.status === 'New' ? 'Start' : 'Mark complete'}
                </GatedButton>
              )}
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KV label="Type" value={selLive.type} />
              <KV label="Law" value={selLive.law} />
              <KV label="Subject" value={selLive.subject} />
              <KV label="Customer" value={selLive.customer} />
              <KV label="Region" value={regionByCode(selLive.region)?.name ?? selLive.region} />
              <KV label="Received" value={selLive.received} />
              <KV label="Due" value={selLive.due} mono />
            </div>

            <section>
              <h4 className="mb-3 text-sm font-semibold text-ink-900">Workflow</h4>
              <ol className="space-y-2.5">
                {STEPS.map((step, i) => {
                  const done = i < stepProgress(selLive.status)
                  const active = i === stepProgress(selLive.status) && selLive.status !== 'Completed'
                  return (
                    <li key={step} className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          done
                            ? 'bg-emerald-500 text-white'
                            : active
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {done ? '✓' : i + 1}
                      </span>
                      <span className={`text-sm ${done || active ? 'text-ink-900' : 'text-ink-400'}`}>{step}</span>
                      {active && selLive.status === 'Overdue' && <Badge tone="red">Overdue</Badge>}
                    </li>
                  )
                })}
              </ol>
            </section>

            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
              <p className="text-sm text-ink-700">
                Statutory SLA —{' '}
                <strong>
                  {selLive.law.startsWith('GDPR')
                    ? 'GDPR requires fulfilment within 30 days'
                    : selLive.law.startsWith('CCPA')
                      ? 'CCPA requires a response within 45 days'
                      : 'response is due within the local statutory window'}
                </strong>{' '}
                of a verified request. This request is due <strong>{selLive.due}</strong>.
              </p>
            </div>
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
