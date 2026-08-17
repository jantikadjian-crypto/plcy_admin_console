import { useState } from 'react'
import { Inbox, Flame, TimerOff, UserX } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useSuccess, setTicketStatus, assignTicket } from '@/data/successStore'
import { priorityTone, ticketStatusTone, slaTone } from '@/data/success'
import type { Ticket, TicketStatus } from '@/data/success'

const STATUS_FILTERS = ['All', 'Open', 'In progress', 'Waiting', 'Resolved']

export function Support() {
  const { tickets } = useSuccess()
  const { logAction } = useSession()
  const [filter, setFilter] = useState('Open')
  const [selId, setSelId] = useState<string | null>(null)

  const openT = tickets.filter((t) => t.status !== 'Resolved')
  const urgent = openT.filter((t) => t.priority === 'Urgent').length
  const breached = openT.filter((t) => t.sla === 'Breached').length
  const unassigned = openT.filter((t) => !t.assignee).length
  const rows = tickets.filter((t) => (filter === 'All' ? true : t.status === filter))
  const sel = tickets.find((t) => t.id === selId)

  return (
    <div>
      <PageHeader title="Support" description="Customer support queue — triage, assign, and resolve cases across the whole customer base." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open" value={openT.length} icon={Inbox} tone="blue" footer={`${tickets.length} total`} />
        <StatCard label="Urgent" value={urgent} icon={Flame} tone={urgent ? 'red' : 'green'} footer="Need attention now" />
        <StatCard label="SLA breached" value={breached} icon={TimerOff} tone={breached ? 'red' : 'green'} footer="Past target response" />
        <StatCard label="Unassigned" value={unassigned} icon={UserX} tone={unassigned ? 'orange' : 'green'} footer="No owner yet" />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle title="Tickets" subtitle="Click a ticket to work it" />
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={clsx('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors', filter === s ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-slate-100 text-ink-700 ring-slate-500/10 hover:bg-slate-200/70')}>{s}</button>
            ))}
          </div>
        </div>
        <Table columns={['ID', 'Customer', 'Subject', 'Priority', 'Status', 'SLA', 'Assignee', 'Updated']} noun="tickets">
          {rows.map((t) => (
            <Tr key={t.id} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setSelId(t.id)}>
              <Td className="font-mono text-xs font-semibold text-ink-900">{t.id}</Td>
              <Td className="text-ink-700">{t.customer}</Td>
              <Td className="max-w-md truncate text-ink-700">{t.subject}</Td>
              <Td><Badge tone={priorityTone[t.priority]}>{t.priority}</Badge></Td>
              <Td><Badge tone={ticketStatusTone[t.status]} dot>{t.status}</Badge></Td>
              <Td><Badge tone={slaTone[t.sla]}>{t.sla}</Badge></Td>
              <Td className="text-xs text-ink-500">{t.assignee ?? <span className="text-ink-400">—</span>}</Td>
              <Td className="whitespace-nowrap text-xs text-ink-400">{t.updated}</Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {sel && <TicketModal ticket={sel} onClose={() => setSelId(null)} logAction={logAction} />}
    </div>
  )
}

function TicketModal({ ticket: t, onClose, logAction }: { ticket: Ticket; onClose: () => void; logAction: (i: { action: string; target: string; category?: string }) => void }) {
  const { can } = useSession()
  const assign = () => { assignTicket(t.id, 'You'); logAction({ action: 'support.ticket.assign', target: `${t.id} → You`, category: 'customer' }) }
  const setStatus = (s: TicketStatus) => { setTicketStatus(t.id, s); logAction({ action: 'support.ticket.status', target: `${t.id} → ${s}`, category: 'customer' }) }
  const statuses: TicketStatus[] = ['Open', 'In progress', 'Waiting', 'Resolved']
  return (
    <Modal
      open onClose={onClose}
      title={<span className="flex items-baseline gap-2"><span className="font-mono text-base">{t.id}</span><span className="text-sm font-normal text-ink-500">{t.customer}</span></span>}
      subtitle={t.subject}
      maxWidth="max-w-2xl"
      headerRight={<Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KV label="Status" value={t.status} />
          <KV label="SLA" value={t.sla} />
          <KV label="Category" value={t.category} />
          <KV label="Assignee" value={t.assignee ?? 'Unassigned'} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-ink-700">{t.description}</div>
        <div className="flex flex-wrap items-center gap-2">
          {!t.assignee && (
            <GatedButton cap="customer.manage" showLock={false} className="btn-secondary px-2.5 py-1 text-xs" onClick={assign} disabled={!can('customer.manage')}>Assign to me</GatedButton>
          )}
          <span className="text-xs font-medium text-ink-500">Set status:</span>
          {statuses.map((s) => (
            <GatedButton key={s} cap="customer.manage" showLock={false} onClick={() => setStatus(s)} disabled={!can('customer.manage') || t.status === s}
              className={clsx('rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors', t.status === s ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-white text-ink-600 ring-slate-300 hover:bg-slate-50')}>
              {s}
            </GatedButton>
          ))}
        </div>
        <p className="text-xs text-ink-400">Opened {t.opened} · last updated {t.updated}</p>
      </div>
    </Modal>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-medium text-ink-500">{label}</p><p className="mt-0.5 text-sm font-semibold text-ink-900">{value}</p></div>
}
