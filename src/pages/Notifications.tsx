import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, MessageSquare, Siren, Mail, Webhook, Plus, UserCheck, Radio, ShieldAlert, Send, Check, ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import {
  channels,
  routingRules as seedRules,
  onCall,
  rotation,
  escalation,
  recentAlerts,
} from '@/data/notifications'
import type { ChannelType, RoutingRule, AlertSeverity, DeliveryStatus } from '@/data/notifications'
import { useRegistryPromoted } from '@/data/registryStore'
import { collectLiveSignals, evaluateRouting, routingSummary } from '@/data/alerting'
import type { RoutingStatus } from '@/data/alerting'

const channelIcon: Record<ChannelType, LucideIcon> = {
  Slack: MessageSquare,
  PagerDuty: Siren,
  Email: Mail,
  Webhook: Webhook,
}
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
  const canManage = can('settings.modify')

  const signals = collectLiveSignals(promoted)
  const summary = routingSummary(signals, rules)
  const primaryOnCall = onCall.find((o) => o.role === 'Primary')?.name ?? '—'

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

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Alert routing, channels, and on-call across the fleet. Every live fleet signal is run through the routing rules below so you can see exactly who gets paged — and which signals fall through the cracks."
        actions={
          <GatedButton cap="settings.modify" className="btn-primary">
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
                const o = evaluateRouting(s, rules)
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
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {channels.map((c) => {
          const Icon = channelIcon[c.type]
          return (
            <Card key={c.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.connected ? 'bg-slate-100 text-ink-600' : 'bg-slate-50 text-ink-400'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink-900">{c.type}</p>
                    <p className="font-mono text-xs text-ink-500">{c.target}</p>
                  </div>
                </div>
                {c.connected ? <Badge tone="green" dot>Connected</Badge> : <Badge tone="slate">Off</Badge>}
              </div>
              <p className="mt-3 text-xs text-ink-500">{c.desc}</p>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Routing rules */}
        <Card className="lg:col-span-2">
          <CardTitle title="Routing Rules" subtitle="Which events page which channels" />
          <Table columns={['Event', 'Category', 'Min severity', 'Channels', 'Enabled']}>
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
              </Tr>
            ))}
          </Table>
        </Card>

        {/* On-call */}
        <Card>
          <CardTitle title="On-Call" subtitle="Current rotation & escalation" />
          <div className="space-y-2">
            {onCall.map((o) => (
              <div key={o.role} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{o.name}</p>
                  <p className="text-xs text-ink-500">{o.window}</p>
                </div>
                <Badge tone={o.role === 'Primary' ? 'green' : o.role === 'Secondary' ? 'blue' : 'purple'} dot>{o.role}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-ink-900">Escalation policy</p>
            <ol className="space-y-1.5">
              {escalation.map((step, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-ink-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-ink-500">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </Card>
      </div>

      {/* Rotation */}
      <Card className="mt-6">
        <CardTitle title="Upcoming Rotation" subtitle="Primary & secondary on-call by week" />
        <Table columns={['Week', 'Primary', 'Secondary']}>
          {rotation.map((r) => (
            <Tr key={r.week}>
              <Td className="font-medium text-ink-900">{r.week}</Td>
              <Td className="text-ink-700">{r.primary}</Td>
              <Td className="text-ink-700">{r.secondary}</Td>
            </Tr>
          ))}
        </Table>
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
    </>
  )
}
