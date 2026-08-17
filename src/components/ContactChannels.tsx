/**
 * Reusable notification-channel editor. Renders a grid of channel cards
 * (Slack / PagerDuty / Email / Webhook); clicking one opens a modal to enter
 * its connection details and toggle whether it's connected. Used for the global
 * delivery channels (Notifications), per-employee contact methods (Team), and
 * per-customer notification contacts (Customers).
 */
import { useState } from 'react'
import { MessageSquare, Siren, Mail, Webhook, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Modal } from '@/components/ui'
import type { ChannelType, ChannelConfig } from '@/data/notifications'

export const channelIcon: Record<ChannelType, LucideIcon> = {
  Slack: MessageSquare,
  PagerDuty: Siren,
  Email: Mail,
  Webhook: Webhook,
}

interface FieldSpec {
  targetLabel: string
  targetPlaceholder: string
  endpointLabel?: string
  endpointPlaceholder?: string
  endpointHint?: string
}
export const CHANNEL_FIELDS: Record<ChannelType, FieldSpec> = {
  Slack: { targetLabel: 'Channel', targetPlaceholder: '#plcy-alerts', endpointLabel: 'Incoming webhook URL', endpointPlaceholder: 'https://hooks.slack.com/services/…', endpointHint: 'Create an incoming webhook in Slack and paste the URL here.' },
  PagerDuty: { targetLabel: 'Service', targetPlaceholder: 'PLCY On-Call · P1', endpointLabel: 'Integration (routing) key', endpointPlaceholder: 'R0ABCD1234…', endpointHint: 'Events API v2 integration key from the PagerDuty service.' },
  Email: { targetLabel: 'Recipients', targetPlaceholder: 'oncall@plcy.app, sre@plcy.app', endpointHint: 'Comma-separate multiple addresses.' },
  Webhook: { targetLabel: 'Name', targetPlaceholder: 'SIEM', endpointLabel: 'Endpoint URL', endpointPlaceholder: 'https://hooks.plcy.app/incoming', endpointHint: 'Alerts POST as JSON to this URL.' },
}

export function ChannelModal({ channel, canEdit, onClose, onSave }: {
  channel: ChannelConfig
  canEdit: boolean
  onClose: () => void
  onSave: (c: ChannelConfig) => void
}) {
  const spec = CHANNEL_FIELDS[channel.type]
  const Icon = channelIcon[channel.type]
  const [target, setTarget] = useState(channel.target)
  const [endpoint, setEndpoint] = useState(channel.endpoint)
  const [connected, setConnected] = useState(channel.connected)

  const valid = target.trim().length > 0 && (!spec.endpointLabel || endpoint.trim().length > 0)
  const save = () => valid && onSave({ ...channel, target: target.trim(), endpoint: endpoint.trim(), connected })

  return (
    <Modal
      open
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Icon className="h-5 w-5 text-ink-500" />{channel.type}</span>}
      subtitle={channel.desc}
      maxWidth="max-w-lg"
      headerRight={<Badge tone={connected ? 'green' : 'slate'} dot>{connected ? 'Connected' : 'Off'}</Badge>}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          {canEdit ? (
            <button className="btn-primary disabled:opacity-50" onClick={save} disabled={!valid}><Check className="h-4 w-4" />Save channel</button>
          ) : (
            <span className="text-xs text-ink-400">Your role can’t edit channels.</span>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">{spec.targetLabel}</label>
          <input className="input" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={spec.targetPlaceholder} disabled={!canEdit} autoFocus />
        </div>

        {spec.endpointLabel && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{spec.endpointLabel}</label>
            <input className="input font-mono text-xs" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder={spec.endpointPlaceholder} disabled={!canEdit} spellCheck={false} />
          </div>
        )}
        {spec.endpointHint && <p className="text-xs text-ink-400">{spec.endpointHint}</p>}

        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
          <div>
            <p className="text-sm font-medium text-ink-900">Connected</p>
            <p className="text-xs text-ink-500">Only connected channels actually deliver.</p>
          </div>
          <button
            onClick={() => canEdit && setConnected((v) => !v)}
            aria-pressed={connected}
            disabled={!canEdit}
            className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${connected ? 'justify-end bg-brand-600' : 'justify-start bg-slate-300'} ${!canEdit ? 'opacity-50' : ''}`}
          >
            <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** A grid of clickable channel cards with the edit modal wired in. */
export function ContactChannels({ channels, canEdit, onSave, columns = 4 }: {
  channels: ChannelConfig[]
  canEdit: boolean
  onSave: (c: ChannelConfig) => void
  columns?: 2 | 3 | 4
}) {
  const [sel, setSel] = useState<ChannelConfig | null>(null)
  const colClass = columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4'
  return (
    <>
      <div className={`grid grid-cols-1 gap-4 ${colClass}`}>
        {channels.map((c) => {
          const Icon = channelIcon[c.type]
          return (
            <button key={c.id} onClick={() => setSel(c)} className="rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/30 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.connected ? 'bg-slate-100 text-ink-600' : 'bg-slate-50 text-ink-400'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{c.type}</p>
                    <p className="truncate font-mono text-xs text-ink-500">{c.target || '—'}</p>
                  </div>
                </div>
                {c.connected ? <Badge tone="green" dot>Connected</Badge> : <Badge tone="slate">Off</Badge>}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="truncate text-xs text-ink-500">{c.endpoint || c.desc}</p>
                <span className="ml-2 shrink-0 text-xs font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">Configure →</span>
              </div>
            </button>
          )
        })}
      </div>
      {sel && (
        <ChannelModal
          channel={sel}
          canEdit={canEdit}
          onClose={() => setSel(null)}
          onSave={(c) => { onSave(c); setSel(null) }}
        />
      )}
    </>
  )
}
