import { useState } from 'react'
import { BellRing, MessageSquare, Siren, Mail, Webhook, Plus, UserCheck, Bell } from 'lucide-react'
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
  notifTotals,
} from '@/data/notifications'
import type { ChannelType, RoutingRule, AlertSeverity, DeliveryStatus } from '@/data/notifications'

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
  const [rules, setRules] = useState<RoutingRule[]>(seedRules)
  const canManage = can('settings.modify')

  const toggleRule = (id: string) => {
    const rule = rules.find((r) => r.id === id)
    if (!rule) return
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
    logAction({ action: `notification.rule.${rule.enabled ? 'disable' : 'enable'}`, target: rule.event, category: 'notifications' })
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Alert routing, channels, and on-call across the fleet"
        actions={
          <GatedButton cap="settings.modify" className="btn-primary">
            <Plus className="h-4 w-4" />
            New rule
          </GatedButton>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Alerts today" value={notifTotals.today} icon={Bell} tone="blue" footer="Across all rules" />
        <StatCard label="Channels connected" value={`${notifTotals.channelsConnected}/${notifTotals.channelsTotal}`} icon={BellRing} tone="green" footer="Delivery integrations" />
        <StatCard label="On-call now" value={notifTotals.onCall} icon={UserCheck} tone="purple" footer="Primary responder" />
        <StatCard label="Rules enabled" value={`${rules.filter((r) => r.enabled).length}/${rules.length}`} icon={Siren} tone="orange" footer="Active routing rules" />
      </div>

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
