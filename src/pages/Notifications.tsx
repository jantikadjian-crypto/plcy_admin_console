import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, MessageSquare, Siren, Mail, Webhook, Plus, UserCheck, Radio, ShieldAlert, Send, Check, ArrowUpRight, Pencil, Trash2, ArrowUp, ArrowDown, CalendarClock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import {
  channels as seedChannels,
  routingRules as seedRules,
  loadOnCall,
  saveOnCall,
  loadRotation,
  saveRotation,
  loadEscalation,
  saveEscalation,
  recentAlerts,
} from '@/data/notifications'
import type { ChannelType, ChannelConfig, RoutingRule, AlertSeverity, DeliveryStatus, OnCallShift, RotationWeek } from '@/data/notifications'
import { employeesSeed } from '@/data/team'
import { useRegistryPromoted } from '@/data/registryStore'
import { collectLiveSignals, evaluateRouting, routingSummary } from '@/data/alerting'
import type { RoutingStatus } from '@/data/alerting'
import { ContactChannels, channelIcon } from '@/components/ContactChannels'

const channelTone: Record<ChannelType, 'purple' | 'red' | 'blue' | 'slate'> = {
  Slack: 'purple',
  PagerDuty: 'red',
  Email: 'blue',
  Webhook: 'slate',
}
const sevTone: Record<AlertSeverity, 'red' | 'orange' | 'yellow' | 'slate'> = {
  Critical: 'red',
  High: 'orange',
  Medium: 'yellow',
  Low: 'slate',
}
const deliveryTone: Record<DeliveryStatus, 'green' | 'slate' | 'red'> = {
  Delivered: 'green',
  Muted: 'slate',
  Failed: 'red',
}
const routingStatusTone: Record<RoutingStatus, 'green' | 'slate' | 'orange' | 'red'> = {
  routed: 'green',
  below: 'slate',
  disabled: 'orange',
  unrouted: 'red',
}
const routingStatusLabel: Record<RoutingStatus, string> = {
  routed: 'Routed',
  below: 'Below threshold',
  disabled: 'Rule disabled',
  unrouted: 'No route',
}

function moveItem<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= list.length) return list
  const next = list.slice()
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

function ChannelBadges({ list }: { list: ChannelType[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((c) => (
        <Badge key={c} tone={channelTone[c]}>{c}</Badge>
      ))}
    </div>
  )
}

export default function Notifications() {
  const { can, logAction } = useSession()
  const promoted = useRegistryPromoted()
  const [rules, setRules] = useState<RoutingRule[]>(seedRules)
  const [sentIds, setSentIds] = useState<Record<string, true>>({})
  const [ruleModal, setRuleModal] = useState<{ mode: 'create'; category: string } | { mode: 'edit'; rule: RoutingRule } | null>(null)
  const [channelList, setChannelList] = useState<ChannelConfig[]>(seedChannels)
  const [onCallList, setOnCallList] = useState<OnCallShift[]>(loadOnCall)
  const [onCallOpen, setOnCallOpen] = useState(false)
  const [rotationList, setRotationList] = useState<RotationWeek[]>(loadRotation)
  const [escalationList, setEscalationList] = useState<string[]>(loadEscalation)
  const canManage = can('settings.modify')
  const roster = useMemo(() => employeesSeed.map((e) => e.name), [])

  useEffect(() => {
    saveOnCall(onCallList)
  }, [onCallList])
  useEffect(() => {
    saveRotation(rotationList)
  }, [rotationList])
  useEffect(() => {
    saveEscalation(escalationList)
  }, [escalationList])

  const signals = collectLiveSignals(promoted)
  const summary = routingSummary(signals, rules, channelList)
  const primaryOnCall = onCallList.find((o) => o.role === 'Primary' && o.active)?.name ?? '—'

  // Categories with live signals but no rule — the gaps a new rule can close.
  const uncovered = [...new Set(signals.map((s) => s.category))].filter((c) => !rules.some((r) => r.category === c))

  const openNewRule = (category?: string) => setRuleModal({ mode: 'create', category: category ?? uncovered[0] ?? 'Cluster' })
  const openEditRule = (rule: RoutingRule) => setRuleModal({ mode: 'edit', rule })

  const saveRule = (rule: RoutingRule) => {
    setRules((prev) => (prev.some((r) => r.id === rule.id) ? prev.map((r) => (r.id === rule.id ? rule : r)) : [...prev, rule]))
    const editing = rules.some((r) => r.id === rule.id)
    logAction({ action: editing ? 'notification.rule.update' : 'notification.rule.create', target: `${rule.event} (${rule.category})`, category: 'notifications' })
    setRuleModal(null)
  }

  const deleteRule = (rule: RoutingRule) => {
    setRules((prev) => prev.filter((r) => r.id !== rule.id))
    logAction({ action: 'notification.rule.delete', target: `${rule.event} (${rule.category})`, category: 'notifications' })
  }

  const toggleRule = (id: string) => {
    const rule = rules.find((r) => r.id === id)
    if (!rule) return
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
    logAction({ action: `notification.rule.${rule.enabled ? 'disable' : 'enable'}`, target: rule.event, category: 'notifications' })
  }

  const dispatch = (signalId: string, event: string, pages: boolean) => {
    setSentIds((prev) => ({ ...prev, [signalId]: true }))
    logAction({ action: pages ? 'notification.page' : 'notification.dispatch', target: event, category: 'notifications' })
  }

  const saveChannel = (updated: ChannelConfig) => {
    setChannelList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    logAction({ action: 'notification.channel.update', target: `${updated.type} · ${updated.target}`, category: 'notifications' })
  }

  const saveOnCallList = (list: OnCallShift[]) => {
    setOnCallList(list)
    logAction({ action: 'notification.oncall.update', target: `Primary ${list.find((o) => o.role === 'Primary')?.name ?? '—'}`, category: 'notifications' })
    setOnCallOpen(false)
  }

  // Rotation editing
  const setRotationRow = (i: number, patch: Partial<RotationWeek>) =>
    setRotationList((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addWeek = () => {
    setRotationList((prev) => [...prev, { week: `Week ${prev.length + 1}`, primary: roster[0] ?? '', secondary: roster[1] ?? '' }])
    logAction({ action: 'notification.rotation.add', target: 'rotation week', category: 'notifications' })
  }
  const removeWeek = (i: number) => {
    const wk = rotationList[i]?.week
    setRotationList((prev) => prev.filter((_, idx) => idx !== i))
    logAction({ action: 'notification.rotation.remove', target: wk ?? 'week', category: 'notifications' })
  }
  const moveWeek = (i: number, dir: -1 | 1) => setRotationList((prev) => moveItem(prev, i, dir))
  const applyRotationToOnCall = (r: RotationWeek) => {
    setOnCallList((prev) =>
      prev.map((o) =>
        o.role === 'Primary'
          ? { ...o, name: r.primary, window: r.week, active: true }
          : o.role === 'Secondary'
            ? { ...o, name: r.secondary, window: r.week, active: true }
            : o,
      ),
    )
    logAction({ action: 'notification.oncall.rotate', target: `${r.week} → ${r.primary} / ${r.secondary}`, category: 'notifications' })
  }

  // Escalation editing
  const setStep = (i: number, val: string) => setEscalationList((prev) => prev.map((s, idx) => (idx === i ? val : s)))
  const addStep = () => setEscalationList((prev) => [...prev, 'New escalation step'])
  const removeStep = (i: number) => setEscalationList((prev) => prev.filter((_, idx) => idx !== i))
  const moveStep = (i: number, dir: -1 | 1) => setEscalationList((prev) => moveItem(prev, i, dir))

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Alert routing, channels, and on-call across the fleet. Every live fleet signal is run through the routing rules below so you can see exactly who gets paged — and which signals fall through the cracks."
        actions={
          <GatedButton cap="settings.modify" className="btn-primary" onClick={() => openNewRule()}>
            <Plus className="h-4 w-4" />
            New rule
          </GatedButton>
        }
      />

      {/* Live routing stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live signals" value={summary.total} icon={Radio} tone="blue" footer="Firing right now" />
        <StatCard label="Routed" value={`${summary.routed}/${summary.total}`} icon={BellRing} tone={summary.routed === summary.total ? 'green' : 'orange'} footer={`${summary.paged} page on-call`} />
        <StatCard label="Coverage gaps" value={summary.gaps} icon={ShieldAlert} tone={summary.gaps ? 'red' : 'green'} footer="Signals nobody is notified of" />
        <StatCard label="On-call now" value={primaryOnCall} icon={UserCheck} tone="purple" footer="Primary responder" />
      </div>

      {/* Live signal routing — the heart of the page */}
      <Card className="mt-6">
        <CardTitle
          title="Live Signal Routing"
          subtitle="Each signal currently firing across the fleet, resolved against the rules below — who gets notified, and what slips through"
        />
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-ink-600 sm:grid-cols-2 lg:grid-cols-4">
          <p><span className="font-medium text-emerald-600">Routed</span> — an enabled rule matches and notifies its channels.</p>
          <p><span className="font-medium text-slate-500">Below threshold</span> — a rule exists but this severity is under its floor.</p>
          <p><span className="font-medium text-orange-600">Rule disabled</span> — the matching rule is turned off.</p>
          <p><span className="font-medium text-rose-600">No route</span> — no rule covers this — a coverage gap.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3">Signal</th>
                <th className="py-2 pr-3">Severity</th>
                <th className="py-2 pr-3">Routing</th>
                <th className="py-2 pr-3">Notifies</th>
                <th className="py-2 pr-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => {
                const o = evaluateRouting(s, rules, channelList, primaryOnCall)
                const sent = sentIds[s.id]
                return (
                  <tr key={s.id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="py-2.5 pr-3">
                      <Link to={s.to} className="group inline-flex items-center gap-1">
                        <span className="font-medium text-ink-900 group-hover:text-brand-700">{s.event}</span>
                        <ArrowUpRight className="h-3 w-3 text-ink-300 group-hover:text-brand-500" />
                      </Link>
                      <p className="text-xs text-ink-400">{s.category}</p>
                    </td>
                    <td className="py-2.5 pr-3"><Badge tone={sevTone[s.severity]}>{s.severity}</Badge></td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={routingStatusTone[o.status]} dot>{routingStatusLabel[o.status]}</Badge>
                      <p className="mt-0.5 text-[11px] text-ink-400">{o.reason}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      {o.status === 'routed' ? (
                        <div className="space-y-1">
                          <ChannelBadges list={o.channels} />
                          {o.responder && <p className="text-[11px] text-ink-500">→ {o.responder} (on-call)</p>}
                          {o.mutedChannels.length > 0 && <p className="text-[11px] text-rose-500">{o.mutedChannels.join(', ')} not connected</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      {o.status === 'routed' ? (
                        sent ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><Check className="h-3.5 w-3.5" />Sent</span>
                        ) : (
                          <GatedButton cap="settings.modify" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => dispatch(s.id, s.event, o.pages)}>
                            <Send className="h-3.5 w-3.5" />{o.pages ? 'Page now' : 'Notify'}
                          </GatedButton>
                        )
                      ) : o.status === 'unrouted' && canManage ? (
                        <button className="btn-ghost px-2 py-1 text-xs text-brand-600" onClick={() => openNewRule(s.category)}>
                          <Plus className="h-3.5 w-3.5" />Add rule
                        </button>
                      ) : (
                        <span className="text-xs text-ink-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {signals.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-ink-400">No signals firing — the fleet is quiet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Channels */}
      <div className="mb-2 mt-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Delivery channels</h3>
          <p className="text-xs text-ink-500">Where alerts are sent · click a channel to enter its connection details</p>
        </div>
      </div>
      <ContactChannels channels={channelList} canEdit={canManage} onSave={saveChannel} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Routing rules */}
        <Card className="lg:col-span-2">
          <CardTitle
            title="Routing Rules"
            subtitle="Which events page which channels"
            action={canManage ? (
              <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openNewRule()}>
                <Plus className="h-3.5 w-3.5" />Add rule
              </button>
            ) : undefined}
          />
          <Table columns={['Event', 'Category', 'Min severity', 'Channels', 'Enabled', '']}>
            {rules.map((r) => (
              <Tr key={r.id}>
                <Td className="font-semibold text-ink-900">{r.event}</Td>
                <Td className="text-ink-700">{r.category}</Td>
                <Td><Badge tone={sevTone[r.minSeverity]}>{r.minSeverity}</Badge></Td>
                <Td><ChannelBadges list={r.channels} /></Td>
                <Td>
                  <button
                    onClick={() => toggleRule(r.id)}
                    disabled={!canManage}
                    aria-pressed={r.enabled}
                    title={canManage ? 'Toggle rule' : 'Your role does not permit this action'}
                    className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${r.enabled ? 'justify-end bg-brand-600' : 'justify-start bg-slate-200'} ${!canManage ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                  </button>
                </Td>
                <Td>
                  {canManage && (
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => openEditRule(r)} title="Edit rule" aria-label="Edit rule" className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-slate-100 hover:text-brand-600">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteRule(r)} title="Delete rule" aria-label="Delete rule" className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        </Card>

        {/* On-call */}
        <Card>
          <CardTitle
            title="On-Call"
            subtitle="Current rotation & escalation"
            action={canManage ? (
              <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setOnCallOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />Edit
              </button>
            ) : undefined}
          />
          <div className="space-y-2">
            {onCallList.map((o) => (
              <div key={o.role} className={`flex items-center justify-between rounded-xl border border-slate-200 p-3 ${o.active ? '' : 'opacity-60'}`}>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{o.name}{!o.active && <span className="ml-1.5 text-xs font-normal text-ink-400">(unassigned)</span>}</p>
                  <p className="text-xs text-ink-500">{o.window}</p>
                </div>
                <Badge tone={o.role === 'Primary' ? 'green' : o.role === 'Secondary' ? 'blue' : 'purple'} dot>{o.role}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-900">Escalation policy</p>
              {canManage && (
                <button className="btn-ghost px-2 py-1 text-xs" onClick={addStep}>
                  <Plus className="h-3.5 w-3.5" />Step
                </button>
              )}
            </div>
            <ol className="space-y-1.5">
              {escalationList.map((step, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-ink-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-ink-500">{i + 1}</span>
                  {canManage ? (
                    <>
                      <input
                        className="input h-8 flex-1 py-1 text-sm"
                        value={step}
                        onChange={(e) => setStep(i, e.target.value)}
                        aria-label={`Escalation step ${i + 1}`}
                      />
                      <div className="flex shrink-0 items-center">
                        <button className="rounded p-1 text-ink-400 hover:bg-slate-100 hover:text-ink-700 disabled:opacity-30" onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button className="rounded p-1 text-ink-400 hover:bg-slate-100 hover:text-ink-700 disabled:opacity-30" onClick={() => moveStep(i, 1)} disabled={i === escalationList.length - 1} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button className="rounded p-1 text-ink-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => removeStep(i)} aria-label="Remove step"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </>
                  ) : (
                    <span>{step}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </Card>
      </div>

      {/* Rotation */}
      <Card className="mt-6">
        <CardTitle
          title="Upcoming Rotation"
          subtitle="Primary & secondary on-call by week · apply any week to the live assignment"
          action={canManage ? (
            <button className="btn-ghost px-2 py-1 text-xs" onClick={addWeek}>
              <Plus className="h-3.5 w-3.5" />Add week
            </button>
          ) : undefined}
        />
        {canManage ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-3">Week</th>
                  <th className="py-2 pr-3">Primary</th>
                  <th className="py-2 pr-3">Secondary</th>
                  <th className="py-2 pr-3 text-right">Order / actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rotationList.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3">
                      <input className="input h-8 py-1 text-sm" value={r.week} onChange={(e) => setRotationRow(i, { week: e.target.value })} aria-label={`Week ${i + 1} label`} />
                    </td>
                    <td className="py-2 pr-3">
                      <select className="input h-8 py-1 text-sm" value={r.primary} onChange={(e) => setRotationRow(i, { primary: e.target.value })} aria-label={`Week ${i + 1} primary`}>
                        {(roster.includes(r.primary) ? roster : [r.primary, ...roster]).map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <select className="input h-8 py-1 text-sm" value={r.secondary} onChange={(e) => setRotationRow(i, { secondary: e.target.value })} aria-label={`Week ${i + 1} secondary`}>
                        {(roster.includes(r.secondary) ? roster : [r.secondary, ...roster]).map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <button className="rounded p-1.5 text-ink-400 hover:bg-slate-100 hover:text-ink-700 disabled:opacity-30" onClick={() => moveWeek(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
                        <button className="rounded p-1.5 text-ink-400 hover:bg-slate-100 hover:text-ink-700 disabled:opacity-30" onClick={() => moveWeek(i, 1)} disabled={i === rotationList.length - 1} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
                        <button className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50" onClick={() => applyRotationToOnCall(r)} title="Set this week as the current on-call"><CalendarClock className="h-3.5 w-3.5" />Make current</button>
                        <button className="rounded p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30" onClick={() => removeWeek(i)} disabled={rotationList.length <= 1} aria-label="Remove week"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rotationList.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-sm text-ink-400">No weeks scheduled — add one to build the rotation.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <Table columns={['Week', 'Primary', 'Secondary']}>
            {rotationList.map((r, i) => (
              <Tr key={i}>
                <Td className="font-medium text-ink-900">{r.week}</Td>
                <Td className="text-ink-700">{r.primary}</Td>
                <Td className="text-ink-700">{r.secondary}</Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Recent alerts */}
      <Card className="mt-6">
        <CardTitle title="Recent Alerts" subtitle="Notification delivery log" />
        <Table columns={['Time', 'Event', 'Category', 'Severity', 'Channels', 'Delivery']}>
          {recentAlerts.map((a) => (
            <Tr key={a.id}>
              <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{a.time}</Td>
              <Td className="font-medium text-ink-900">{a.event}</Td>
              <Td className="text-ink-700">{a.category}</Td>
              <Td><Badge tone={sevTone[a.severity]}>{a.severity}</Badge></Td>
              <Td><ChannelBadges list={a.channels} /></Td>
              <Td><Badge tone={deliveryTone[a.status]} dot>{a.status}</Badge></Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {ruleModal && (
        <RuleModal
          rule={ruleModal.mode === 'edit' ? ruleModal.rule : undefined}
          defaultCategory={ruleModal.mode === 'create' ? ruleModal.category : ruleModal.rule.category}
          existingIds={rules.map((r) => r.id)}
          uncovered={uncovered}
          onClose={() => setRuleModal(null)}
          onSave={saveRule}
        />
      )}

      {onCallOpen && (
        <OnCallModal
          list={onCallList}
          roster={roster}
          onClose={() => setOnCallOpen(false)}
          onSave={saveOnCallList}
        />
      )}

    </>
  )
}

/* ------------------------------------------------------------------ */
/* Edit on-call assignment                                             */
/* ------------------------------------------------------------------ */
const ROLE_TONE: Record<OnCallShift['role'], 'green' | 'blue' | 'purple'> = { Primary: 'green', Secondary: 'blue', Manager: 'purple' }

function OnCallModal({ list, roster, onClose, onSave }: {
  list: OnCallShift[]
  roster: string[]
  onClose: () => void
  onSave: (list: OnCallShift[]) => void
}) {
  const [draft, setDraft] = useState<OnCallShift[]>(() => list.map((o) => ({ ...o })))
  const setRow = (role: OnCallShift['role'], patch: Partial<OnCallShift>) =>
    setDraft((prev) => prev.map((o) => (o.role === role ? { ...o, ...patch } : o)))

  // Roster options, plus any current assignee not in the roster.
  const options = (current: string) => (roster.includes(current) ? roster : [current, ...roster])

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit on-call"
      subtitle="Reassign the responders paged for fleet alerts"
      maxWidth="max-w-lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(draft)}>
            <Check className="h-4 w-4" />Save on-call
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {draft.map((o) => (
          <div key={o.role} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <Badge tone={ROLE_TONE[o.role]} dot>{o.role}</Badge>
              <button
                onClick={() => setRow(o.role, { active: !o.active })}
                aria-pressed={o.active}
                title={o.active ? 'Assigned' : 'Unassigned'}
                className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${o.active ? 'justify-end bg-brand-600' : 'justify-start bg-slate-200'}`}
              >
                <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
              </button>
            </div>
            <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${o.active ? '' : 'opacity-50'}`}>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-500">Responder</label>
                <select className="input" value={o.name} onChange={(e) => setRow(o.role, { name: e.target.value })} disabled={!o.active}>
                  {options(o.name).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-500">Window</label>
                <input className="input" value={o.window} onChange={(e) => setRow(o.role, { window: e.target.value })} disabled={!o.active} placeholder="e.g. Jul 14 – Jul 21" />
              </div>
            </div>
          </div>
        ))}
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-ink-500">
          The <strong>Primary</strong> responder is who every PagerDuty rule pages first — changing it updates the live routing table and the “On-call now” tile immediately.
        </p>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* New routing rule                                                    */
/* ------------------------------------------------------------------ */
const RULE_CATEGORIES = ['Cluster', 'Supply chain', 'Reliability', 'Billing', 'Disputes', 'Device', 'License', 'Backup', 'Access', 'DSAR', 'Sovereignty']
const SEVERITIES: AlertSeverity[] = ['Critical', 'High', 'Medium', 'Low']
const ALL_CHANNELS: ChannelType[] = ['Slack', 'PagerDuty', 'Email', 'Webhook']

function RuleModal({ rule, defaultCategory, existingIds, uncovered, onClose, onSave }: {
  rule?: RoutingRule
  defaultCategory: string
  existingIds: string[]
  uncovered: string[]
  onClose: () => void
  onSave: (rule: RoutingRule) => void
}) {
  const isEdit = !!rule
  const [event, setEvent] = useState(rule?.event ?? '')
  const [category, setCategory] = useState(rule?.category ?? defaultCategory)
  const [minSeverity, setMinSeverity] = useState<AlertSeverity>(rule?.minSeverity ?? 'High')
  const [selChannels, setSelChannels] = useState<ChannelType[]>(rule?.channels ?? ['Slack'])

  const categories = [...new Set([defaultCategory, ...RULE_CATEGORIES])]
  const toggleChannel = (c: ChannelType) =>
    setSelChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

  const valid = event.trim().length > 0 && selChannels.length > 0

  const submit = () => {
    if (!valid) return
    if (isEdit) {
      onSave({ ...rule, event: event.trim(), category, minSeverity, channels: selChannels })
      return
    }
    // Deterministic, collision-free id.
    let n = existingIds.length
    let id = `r_custom_${n}`
    while (existingIds.includes(id)) id = `r_custom_${++n}`
    onSave({ id, event: event.trim(), category, minSeverity, channels: selChannels, enabled: true })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit routing rule' : 'New routing rule'}
      subtitle="Route a class of fleet events to notification channels"
      maxWidth="max-w-lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary disabled:opacity-50" onClick={submit} disabled={!valid}>
            {isEdit ? <><Check className="h-4 w-4" />Save changes</> : <><Plus className="h-4 w-4" />Create rule</>}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {!isEdit && uncovered.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Currently uncovered by any rule: <strong>{uncovered.join(', ')}</strong>. Pick one of these to close a gap.</span>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">Event name</label>
          <input className="input" value={event} onChange={(e) => setEvent(e.target.value)} placeholder="e.g. Billing past due" autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{c}{uncovered.includes(c) ? ' — gap' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Minimum severity</label>
            <select className="input" value={minSeverity} onChange={(e) => setMinSeverity(e.target.value as AlertSeverity)}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">Channels</label>
          <div className="flex flex-wrap gap-2">
            {ALL_CHANNELS.map((c) => {
              const on = selChannels.includes(c)
              const Icon = channelIcon[c]
              return (
                <button
                  key={c}
                  onClick={() => toggleChannel(c)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${on ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-ink-500 hover:border-slate-300'}`}
                >
                  <Icon className="h-4 w-4" />{c}
                  {on && <Check className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
          {selChannels.includes('PagerDuty') && (
            <p className="mt-2 text-xs text-ink-500">Includes PagerDuty — matching signals will page the primary on-call.</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
