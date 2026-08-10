import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Gauge,
  CalendarPlus,
  CalendarClock,
  ShieldCheck,
  AlertTriangle,
  CircleDollarSign,
  FileBarChart,
  Timer,
} from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Progress, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useCustomerScope } from '@/context/CustomerScope'
import { useMaintenanceWindows } from '@/context/MaintenanceWindows'
import { useCreateIntent } from '@/hooks/useCreateIntent'
import { slaTargets, slaTotals, latencyFor } from '@/data/sla'
import type { LatencyStatus } from '@/data/latency'
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
const latencyTone: Record<LatencyStatus, 'green' | 'orange' | 'red'> = {
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

/** Deterministic breach ledger for a customer's accrued credits. */
function breachLedger(t: SlaTarget): { date: string; duration: string; credit: number }[] {
  if (t.breachesMtd === 0) return []
  const dates = ['2026-07-02', '2026-07-05', '2026-07-06', '2026-07-07']
  const durations = ['1 h 12 m', '24 m', '3 h 40 m', '52 m']
  const per = Math.round(t.creditsOwed / t.breachesMtd)
  return Array.from({ length: t.breachesMtd }, (_, i) => ({
    date: dates[i % dates.length],
    duration: durations[i % durations.length],
    credit: i === t.breachesMtd - 1 ? t.creditsOwed - per * (t.breachesMtd - 1) : per,
  }))
}

export default function Sla() {
  const { can, logAction } = useSession()
  const { scope, isAll } = useCustomerScope()
  const navigate = useNavigate()
  const { windows, schedule, toggleNotified: storeToggleNotified } = useMaintenanceWindows()

  const [open, setOpen] = useState(false)
  const [detailCustomer, setDetailCustomer] = useState<SlaTarget | null>(null)
  const [detailWindow, setDetailWindow] = useState<MaintenanceWindow | null>(null)

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
    storeToggleNotified(id)
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
    schedule({
      title,
      customer: fCustomer === FLEET_WIDE ? 'All' : fCustomer,
      region: fRegion.trim() || '—',
      start: fStart.trim() || 'TBD',
      duration: fDuration.trim() || '—',
      type: fType,
      impact: fImpact,
      noticeDays: Number.isFinite(fNotice) ? fNotice : 0,
    })
    logAction({ action: 'maintenance.schedule', target: title, category: 'operations' })
    setOpen(false)
    resetForm()
  }

  const openScheduler = () => {
    resetForm()
    setOpen(true)
  }
  useCreateIntent(openScheduler)

  const atRiskBreached = slaTotals.atRisk + slaTotals.breached

  return (
    <>
      <PageHeader
        title="SLA & Maintenance"
        description="Uptime and latency commitments by customer, and planned changes across the fleet"
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate('/reports/sla')}>
              <FileBarChart className="h-4 w-4" />
              Generate report
            </button>
            <GatedButton cap="provision.manage" className="btn-primary" onClick={openScheduler}>
              <CalendarPlus className="h-4 w-4" />
              Schedule window
            </GatedButton>
          </>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
        <StatCard
          label="Latency objective"
          value={`${slaTotals.latencyMeeting}/${slaTotals.total}`}
          icon={Timer}
          tone={slaTotals.latencyBreached ? 'red' : slaTotals.latencyAtRisk ? 'orange' : 'green'}
          footer={
            slaTotals.latencyBreached
              ? `${slaTotals.latencyBreached} breaching p95 by up to ${slaTotals.worstOverBy} ms`
              : slaTotals.latencyAtRisk
                ? `${slaTotals.latencyAtRisk} within 10% of the ceiling`
                : 'All accounts inside their p95 ceiling'
          }
        />
      </div>

      {/* SLA attainment */}
      <Card className="mt-6">
        <CardTitle title="SLA Attainment" subtitle="Uptime and gateway p95 vs. contractual targets, month-to-date · click a customer to drill down" />
        <Table
          columns={['Customer', 'Tier', 'Target', 'Attainment', 'p95 latency', 'Response / Restore', 'Breaches', 'Credits', 'Status']}
          noun="customers"
        >
          {slaRows.map((t: SlaTarget) => (
            <Tr key={t.customer} onClick={() => setDetailCustomer(t)}>
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
              <Td className="whitespace-nowrap">
                {(() => {
                  const l = latencyFor(t)
                  return (
                    <span className="flex items-baseline gap-1.5" title={`p50 ${l.p50} ms · p95 ${l.p95} ms · p99 ${l.p99} ms over ${l.count.toLocaleString()} requests`}>
                      <span className={`font-mono text-xs font-semibold ${l.status === 'Breached' ? 'text-rose-600' : l.status === 'At risk' ? 'text-amber-700' : 'text-ink-900'}`}>
                        {l.p95} ms
                      </span>
                      <span className="font-mono text-[11px] text-ink-400">/ {l.targetMs}</span>
                    </span>
                  )
                })()}
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
        <CardTitle title="Maintenance Windows" subtitle="Planned changes across the fleet · click a window for details" />
        <Table
          columns={['Window', 'Customer', 'When', 'Type', 'Impact', 'Notice', 'Notified', 'Status']}
          noun="windows"
        >
          {windowRows.map((w) => (
            <Tr key={w.id} onClick={() => setDetailWindow(w)}>
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
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleNotified(w.id)
                  }}
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

      {/* SLA customer drill-down */}
      {detailCustomer && (
        <Modal
          open
          onClose={() => setDetailCustomer(null)}
          title={detailCustomer.customer}
          subtitle={`${detailCustomer.tier} tier · ${detailCustomer.region}`}
          headerRight={<Badge tone={slaStatusTone[detailCustomer.status]} dot>{detailCustomer.status}</Badge>}
          footer={<button className="btn-secondary" onClick={() => setDetailCustomer(null)}>Close</button>}
        >
          <div className="space-y-5">
            {/* Uptime */}
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium text-ink-700">Uptime, month-to-date</span>
                <span className="font-mono text-sm">
                  <span className="font-bold text-ink-900">{fmtUptime(detailCustomer.uptimeMtd)}</span>
                  <span className="mx-1.5 text-ink-400">/ target</span>
                  <span className="text-ink-600">{fmtUptime(detailCustomer.uptimeTarget)}</span>
                </span>
              </div>
              <Progress value={attainmentBar(detailCustomer.uptimeTarget, detailCustomer.uptimeMtd)} tone={progressTone[detailCustomer.status]} />
            </div>

            {/* Latency objective — the other half of the contract */}
            {(() => {
              const l = latencyFor(detailCustomer)
              return (
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-sm font-medium text-ink-700">Gateway latency, month-to-date</span>
                    <Badge tone={latencyTone[l.status]} dot>{l.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {([['p50', l.p50], ['p95', l.p95], ['p99', l.p99]] as const).map(([k, v]) => (
                      <div key={k} className={`rounded-xl border p-3 ${k === 'p95' ? 'border-slate-300 bg-slate-50/70' : 'border-slate-200'}`}>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
                          {k}{k === 'p95' && <span className="ml-1 normal-case text-ink-400">· contractual</span>}
                        </p>
                        <p className={`mt-0.5 text-sm font-semibold ${k === 'p95' && l.status === 'Breached' ? 'text-rose-600' : k === 'p95' && l.status === 'At risk' ? 'text-amber-700' : 'text-ink-900'}`}>
                          {v} ms
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink-500">
                    {l.status === 'Breached'
                      ? <>p95 is <span className="font-semibold text-rose-600">{l.overBy} ms over</span> the {l.targetMs} ms ceiling their {detailCustomer.tier} tier buys. This is chargeable the same way an uptime miss is.</>
                      : l.status === 'At risk'
                        ? <>p95 is inside 10% of the {l.targetMs} ms ceiling — worth acting on before the customer raises it.</>
                        : <>p95 is comfortably inside the {l.targetMs} ms ceiling for {detailCustomer.tier}.</>}
                    {' '}Measured over {l.count.toLocaleString()} requests this month.
                  </p>
                </div>
              )
            })()}

            {/* Commitments */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { k: 'Response', v: detailCustomer.responseTarget },
                { k: 'Restore', v: detailCustomer.restoreTarget },
                { k: 'Breaches (MTD)', v: String(detailCustomer.breachesMtd) },
              ].map((m) => (
                <div key={m.k} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{m.k}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink-900">{m.v}</p>
                </div>
              ))}
            </div>

            {/* Credit ledger */}
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-900">Service credit ledger</p>
              {detailCustomer.breachesMtd === 0 ? (
                <p className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-ink-400">
                  No SLA breaches this month — no credits owed.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  {breachLedger(detailCustomer).map((e, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 last:border-0">
                      <div>
                        <p className="font-mono text-xs text-ink-700">{e.date}</p>
                        <p className="text-xs text-ink-500">Downtime {e.duration}</p>
                      </div>
                      <span className="font-mono text-sm text-rose-600">${e.credit.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                    <span className="text-sm font-semibold text-ink-900">Credits owed</span>
                    <span className="font-mono text-sm font-bold text-rose-600">${detailCustomer.creditsOwed.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Maintenance windows for this customer */}
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-900">Maintenance windows</p>
              {(() => {
                const list = windows.filter((w) => w.customer === detailCustomer.customer || w.customer === 'All')
                return list.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-ink-400">None scheduled.</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    {list.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => { setDetailCustomer(null); setDetailWindow(w) }}
                        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-800">{w.title}</p>
                          <p className="font-mono text-xs text-ink-500">{w.start}</p>
                        </div>
                        <Badge tone={windowStatusTone[w.status]} dot>{w.status}</Badge>
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* Maintenance window drill-down */}
      {detailWindow && (
        <Modal
          open
          onClose={() => setDetailWindow(null)}
          title={detailWindow.title}
          subtitle={`${detailWindow.customer === 'All' ? 'Fleet-wide' : detailWindow.customer} · ${detailWindow.region}`}
          headerRight={<Badge tone={windowStatusTone[detailWindow.status]} dot>{detailWindow.status}</Badge>}
          footer={<button className="btn-secondary" onClick={() => setDetailWindow(null)}>Close</button>}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { k: 'When', v: detailWindow.start },
                { k: 'Duration', v: detailWindow.duration },
                { k: 'Type', v: detailWindow.type },
                { k: 'Impact', v: detailWindow.impact },
                { k: 'Notice', v: `${detailWindow.noticeDays} days` },
                { k: 'Customers notified', v: detailWindow.notified ? 'Yes' : 'No' },
              ].map((m) => (
                <div key={m.k} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{m.k}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink-900">{m.v}</p>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-ink-600">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
              <span>
                {detailWindow.impact === 'No downtime'
                  ? 'A rolling change with no expected downtime.'
                  : detailWindow.impact === 'Read-only'
                    ? 'The environment is read-only for the duration of the window.'
                    : 'A brief interruption is expected during the window.'}
                {' '}
                {detailWindow.customer === 'All' ? 'Applies fleet-wide in ' : 'Applies to '}
                {detailWindow.customer === 'All' ? detailWindow.region : detailWindow.customer}.
              </span>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
