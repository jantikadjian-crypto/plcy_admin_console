import { useMemo, useRef, useState } from 'react'
import {
  Gauge,
  CalendarPlus,
  CalendarClock,
  ShieldCheck,
  AlertTriangle,
  CircleDollarSign,
} from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Progress, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useCustomerScope } from '@/context/CustomerScope'
import { slaTargets, maintenanceWindows, slaTotals } from '@/data/sla'
import type {
  SlaTarget,
  SlaTier,
  SlaStatus,
  MaintenanceWindow,
  WindowType,
  WindowImpact,
  WindowStatus,
} from '@/data/sla'

/* ------------------------------------------------------------------ */
/* Tone maps                                                           */
/* ------------------------------------------------------------------ */
const tierTone: Record<SlaTier, 'purple' | 'yellow' | 'slate'> = {
  Platinum: 'purple',
  Gold: 'yellow',
  Silver: 'slate',
}
const slaStatusTone: Record<SlaStatus, 'green' | 'orange' | 'red'> = {
  Meeting: 'green',
  'At risk': 'orange',
  Breached: 'red',
}
const progressTone: Record<SlaStatus, 'green' | 'orange' | 'red'> = {
  Meeting: 'green',
  'At risk': 'orange',
  Breached: 'red',
}
const impactTone: Record<WindowImpact, 'green' | 'orange' | 'yellow'> = {
  'No downtime': 'green',
  'Brief downtime': 'orange',
  'Read-only': 'yellow',
}
const windowStatusTone: Record<WindowStatus, 'blue' | 'orange' | 'green' | 'slate'> = {
  Scheduled: 'blue',
  'In progress': 'orange',
  Completed: 'green',
  Cancelled: 'slate',
}

const WINDOW_TYPES: WindowType[] = ['Patch', 'Upgrade', 'Infra', 'DR test']
const WINDOW_IMPACTS: WindowImpact[] = ['No downtime', 'Brief downtime', 'Read-only']

/** Sort so Breached/At risk float to the top. */
const statusRank: Record<SlaStatus, number> = { Breached: 0, 'At risk': 1, Meeting: 2 }

/** Bar value reflecting headroom above/below target, clamped 0..100. */
function attainmentBar(target: number, mtd: number): number {
  const v = ((mtd - (target - 0.5)) / 0.5) * 100
  return Math.min(100, Math.max(0, v))
}

const fmtUptime = (n: number) => `${n.toFixed(2)}%`
const FLEET_WIDE = 'Fleet-wide'

/* ------------------------------------------------------------------ */
/* Field helper                                                        */
/* ------------------------------------------------------------------ */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  )
}

export default function Sla() {
  const { can, logAction } = useSession()
  const { scope, isAll } = useCustomerScope()

  const [windows, setWindows] = useState<MaintenanceWindow[]>(maintenanceWindows)
  const [open, setOpen] = useState(false)
  const counter = useRef(0)

  const canNotify = can('settings.modify')

  /* --- form state --- */
  const customerNames = useMemo(() => slaTargets.map((t) => t.customer), [])
  const [fTitle, setFTitle] = useState('')
  const [fCustomer, setFCustomer] = useState<string>(FLEET_WIDE)
  const [fRegion, setFRegion] = useState('')
  const [fStart, setFStart] = useState('')
  const [fDuration, setFDuration] = useState('')
  const [fType, setFType] = useState<WindowType>('Patch')
  const [fImpact, setFImpact] = useState<WindowImpact>('No downtime')
  const [fNotice, setFNotice] = useState(3)

  /* --- SLA rows: scope + sort --- */
  const slaRows = useMemo(() => {
    const rows = isAll ? slaTargets : slaTargets.filter((t) => t.customer === scope)
    return [...rows].sort((a, b) => statusRank[a.status] - statusRank[b.status])
  }, [isAll, scope])

  /* --- Maintenance rows: scope (Fleet-wide 'All' always shows) --- */
  const windowRows = useMemo(
    () => (isAll ? windows : windows.filter((w) => w.customer === 'All' || w.customer === scope)),
    [isAll, scope, windows],
  )

  const toggleNotified = (id: string) => {
    if (!canNotify) return
    const w = windows.find((x) => x.id === id)
    if (!w) return
    setWindows((prev) => prev.map((x) => (x.id === id ? { ...x, notified: !x.notified } : x)))
    logAction({ action: 'maintenance.notify', target: w.title, category: 'operations' })
  }

  const resetForm = () => {
    setFTitle('')
    setFCustomer(FLEET_WIDE)
    setFRegion('')
    setFStart('')
    setFDuration('')
    setFType('Patch')
    setFImpact('No downtime')
    setFNotice(3)
  }

  const scheduleWindow = () => {
    const title = fTitle.trim() || 'Untitled window'
    counter.current += 1
    const next: MaintenanceWindow = {
      id: `mw_new_${counter.current}`,
      title,
      customer: fCustomer === FLEET_WIDE ? 'All' : fCustomer,
      region: fRegion.trim() || '—',
      start: fStart.trim() || 'TBD',
      duration: fDuration.trim() || '—',
      type: fType,
      impact: fImpact,
      noticeDays: Number.isFinite(fNotice) ? fNotice : 0,
      notified: false,
      status: 'Scheduled',
    }
    setWindows((prev) => [next, ...prev])
    logAction({ action: 'maintenance.schedule', target: title, category: 'operations' })
    setOpen(false)
    resetForm()
  }

  const openScheduler = () => {
    resetForm()
    setOpen(true)
  }

  const atRiskBreached = slaTotals.atRisk + slaTotals.breached

  return (
    <>
      <PageHeader
        title="SLA & Maintenance"
        description="Uptime commitments by customer and planned changes across the fleet"
        actions={
          <GatedButton cap="provision.manage" className="btn-primary" onClick={openScheduler}>
            <CalendarPlus className="h-4 w-4" />
            Schedule window
          </GatedButton>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Avg attainment"
          value={`${slaTotals.avgAttainment}%`}
          icon={Gauge}
          tone="blue"
          footer="Fleet, month-to-date"
        />
        <StatCard
          label="Meeting SLA"
          value={`${slaTotals.meeting}/${slaTotals.total}`}
          icon={ShieldCheck}
          tone="green"
          footer="On or above target"
        />
        <StatCard
          label="At risk + Breached"
          value={atRiskBreached}
          icon={AlertTriangle}
          tone="orange"
          footer={`${slaTotals.atRisk} at risk · ${slaTotals.breached} breached`}
        />
        <StatCard
          label="Service credits owed"
          value={`$${slaTotals.creditsOwed.toLocaleString()}`}
          icon={CircleDollarSign}
          tone="red"
          footer="This billing cycle"
        />
      </div>

      {/* SLA attainment */}
      <Card className="mt-6">
        <CardTitle title="SLA Attainment" subtitle="Uptime vs. contractual target, month-to-date" />
        <Table
          columns={['Customer', 'Tier', 'Target', 'Attainment', 'Response / Restore', 'Breaches', 'Credits', 'Status']}
        >
          {slaRows.map((t: SlaTarget) => (
            <Tr key={t.customer}>
              <Td className="font-semibold text-ink-900">{t.customer}</Td>
              <Td>
                <Badge tone={tierTone[t.tier]}>{t.tier}</Badge>
              </Td>
              <Td className="whitespace-nowrap font-mono text-xs text-ink-600">{fmtUptime(t.uptimeTarget)}</Td>
              <Td>
                <div className="w-24">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-ink-900">{fmtUptime(t.uptimeMtd)}</span>
                  </div>
                  <Progress value={attainmentBar(t.uptimeTarget, t.uptimeMtd)} tone={progressTone[t.status]} />
                </div>
              </Td>
              <Td className="whitespace-nowrap text-ink-700">{t.responseTarget} / {t.restoreTarget}</Td>
              <Td className="text-ink-700">{t.breachesMtd}</Td>
              <Td className="whitespace-nowrap text-ink-700">
                {t.creditsOwed > 0 ? `$${t.creditsOwed.toLocaleString()}` : <span className="text-ink-400">—</span>}
              </Td>
              <Td>
                <Badge tone={slaStatusTone[t.status]} dot>
                  {t.status}
                </Badge>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* Maintenance windows */}
      <Card className="mt-6">
        <CardTitle title="Maintenance Windows" subtitle="Planned changes across the fleet" />
        <Table
          columns={['Window', 'Customer', 'When', 'Type', 'Impact', 'Notice', 'Notified', 'Status']}
        >
          {windowRows.map((w) => (
            <Tr key={w.id}>
              <Td>
                <div className="font-semibold text-ink-900">{w.title}</div>
                <div className="font-mono text-[11px] text-ink-400">{w.region}</div>
              </Td>
              <Td>
                {w.customer === 'All' ? (
                  <Badge tone="blue">Fleet-wide</Badge>
                ) : (
                  <span className="text-ink-700">{w.customer}</span>
                )}
              </Td>
              <Td className="whitespace-nowrap">
                <div className="text-ink-800">{w.start}</div>
                <div className="text-xs text-ink-400">{w.duration}</div>
              </Td>
              <Td>
                <Badge tone="slate">{w.type}</Badge>
              </Td>
              <Td>
                <Badge tone={impactTone[w.impact]}>{w.impact}</Badge>
              </Td>
              <Td className="whitespace-nowrap text-ink-700">{w.noticeDays}d</Td>
              <Td>
                <button
                  onClick={() => toggleNotified(w.id)}
                  disabled={!canNotify}
                  aria-pressed={w.notified}
                  title={canNotify ? 'Toggle customer notification' : 'Your role does not permit this action'}
                  className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                    w.notified ? 'justify-end bg-brand-600' : 'justify-start bg-slate-200'
                  } ${!canNotify ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                </button>
              </Td>
              <Td>
                <Badge tone={windowStatusTone[w.status]} dot>
                  {w.status}
                </Badge>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* Schedule window modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Schedule maintenance window"
        subtitle="Plan a change and set the customer-facing notice period"
        headerRight={<CalendarClock className="h-5 w-5 text-ink-400" />}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <GatedButton cap="provision.manage" className="btn-primary" onClick={scheduleWindow}>
              <CalendarPlus className="h-4 w-4" />
              Schedule
            </GatedButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title">
              <input
                className="input"
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                placeholder="Security patch v4.8.4"
              />
            </Field>
          </div>
          <Field label="Customer">
            <select className="input" value={fCustomer} onChange={(e) => setFCustomer(e.target.value)}>
              <option value={FLEET_WIDE}>{FLEET_WIDE}</option>
              {customerNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Region">
            <input
              className="input"
              value={fRegion}
              onChange={(e) => setFRegion(e.target.value)}
              placeholder="us-east-1"
            />
          </Field>
          <Field label="Start">
            <input
              className="input"
              value={fStart}
              onChange={(e) => setFStart(e.target.value)}
              placeholder="2026-07-15 02:00 UTC"
            />
          </Field>
          <Field label="Duration">
            <input
              className="input"
              value={fDuration}
              onChange={(e) => setFDuration(e.target.value)}
              placeholder="2 h"
            />
          </Field>
          <Field label="Type">
            <select className="input" value={fType} onChange={(e) => setFType(e.target.value as WindowType)}>
              {WINDOW_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Impact">
            <select className="input" value={fImpact} onChange={(e) => setFImpact(e.target.value as WindowImpact)}>
              {WINDOW_IMPACTS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notice days">
            <input
              type="number"
              min={0}
              className="input"
              value={fNotice}
              onChange={(e) => setFNotice(Number(e.target.value))}
            />
          </Field>
        </div>
      </Modal>
    </>
  )
}
