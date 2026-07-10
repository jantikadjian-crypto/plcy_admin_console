import { useState } from 'react'
import { ShieldCheck, ShieldBan, Flag, Gauge } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardTitle, StatCard, PageHeader, Table, Tr, Td } from '@/components/ui'
import { fmtNum, fmtCompact } from '@/data/mock'
import { packs as policyPacks, controlsForPack } from '@/data/policy'
import type { PolicyPack } from '@/data/policy'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const trafficTrend = [
  { day: 'Jun 30', allowed: 40200, flagged: 1180, blocked: 420 },
  { day: 'Jul 1', allowed: 47500, flagged: 1420, blocked: 510 },
  { day: 'Jul 2', allowed: 44800, flagged: 1310, blocked: 470 },
  { day: 'Jul 3', allowed: 51200, flagged: 1560, blocked: 610 },
  { day: 'Jul 4', allowed: 58900, flagged: 1740, blocked: 690 },
  { day: 'Jul 5', allowed: 55100, flagged: 1610, blocked: 640 },
  { day: 'Jul 6', allowed: 60400, flagged: 1890, blocked: 720 },
]

const modes = ['Monitor', 'Warn', 'Block'] as const
type Mode = (typeof modes)[number]

/* Enforcement rows derive from the live policy catalog (@/data/policy) so the
 * page always reflects the real packs, controls, and composites — no separate
 * hardcoded list to drift. Scope / hits / last-triggered are deterministic
 * pseudo-values keyed off each pack id (mock telemetry, stable across renders). */
const hash = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
const lastOptions = ['1 min ago', '4 min ago', '11 min ago', '18 min ago', '26 min ago', '41 min ago']

/** A pack enforced only through monitor-mode controls reports Monitor; privacy/
 * security/sovereignty/compliance packs Block; governance/cost packs Warn. */
function modeFor(pack: PolicyPack): Mode {
  const ctrls = controlsForPack(pack)
  if (ctrls.length > 0 && ctrls.every((c) => c.mode === 'monitor')) return 'Monitor'
  if (pack.category === 'Governance' || pack.category === 'Cost') return 'Warn'
  return 'Block'
}

interface EnforcementRow {
  pack: PolicyPack
  controls: number
  mode: Mode
  scope: string
  hits: number
  last: string
}

// Composite packs are what customers deploy as enforced bundles; show the live ones.
const enforcementRows: EnforcementRow[] = policyPacks
  .filter((p) => p.type === 'composite' && p.status === 'live')
  .map((pack) => {
    const h = hash(pack.id)
    const customers = 1 + (h % 6)
    const instances = customers + (h % 4)
    const controls = controlsForPack(pack).length
    return {
      pack,
      controls,
      mode: modeFor(pack),
      scope: `${customers} customer${customers > 1 ? 's' : ''} · ${instances} instance${instances > 1 ? 's' : ''}`,
      hits: 120 + ((h % 47) * controls * 8),
      last: lastOptions[h % lastOptions.length],
    }
  })
  .sort((a, b) => b.hits - a.hits)

function ModePills({ active }: { active: Mode }) {
  const tone: Record<Mode, string> = {
    Monitor: 'bg-blue-600 text-white',
    Warn: 'bg-orange-500 text-white',
    Block: 'bg-rose-500 text-white',
  }
  return (
    <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-inset ring-slate-200">
      {modes.map((m) => (
        <span
          key={m}
          className={
            'px-2.5 py-1 text-[11px] font-semibold ' +
            (m === active ? tone[m] : 'bg-white text-ink-400')
          }
        >
          {m}
        </span>
      ))}
    </div>
  )
}

export default function Enforcement() {
  const [enabled, setEnabled] = useState(true)

  const evaluatedToday = trafficTrend[trafficTrend.length - 1]
  const total = evaluatedToday.allowed + evaluatedToday.flagged + evaluatedToday.blocked
  const allowRate = ((evaluatedToday.allowed / total) * 100).toFixed(1)

  return (
    <>
      <PageHeader
        title="Enforcement Controls"
        description="Real-time policy enforcement across all governed traffic"
      />

      {/* Master switch */}
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={
              'flex h-11 w-11 items-center justify-center rounded-xl ' +
              (enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')
            }
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Global enforcement</h2>
            <p className="text-xs text-ink-500">
              {enabled
                ? 'Policies are actively enforced on all inbound and outbound traffic.'
                : 'Enforcement paused — traffic is passing through unchecked.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          className={
            'flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors ' +
            (enabled ? 'bg-brand-600' : 'bg-slate-300')
          }
          aria-label="Toggle global enforcement"
        >
          <span
            className={
              'h-6 w-6 rounded-full bg-white shadow-sm transition-transform ' +
              (enabled ? 'translate-x-5' : 'translate-x-0')
            }
          />
        </button>
      </Card>

      {/* Stat row */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requests evaluated today" value={fmtCompact(total)} icon={Gauge} tone="blue" footer="Across all instances" />
        <StatCard label="Blocked" value={fmtNum(evaluatedToday.blocked)} icon={ShieldBan} tone="red" footer="Policy violations stopped" />
        <StatCard label="Flagged" value={fmtNum(evaluatedToday.flagged)} icon={Flag} tone="orange" footer="Sent for review" />
        <StatCard label="Allow rate" value={`${allowRate}%`} icon={ShieldCheck} tone="green" footer="Clean traffic" />
      </div>

      {/* Chart */}
      <Card className="mt-6">
        <CardTitle title="Enforcement Outcomes" subtitle="Allowed, flagged, and blocked traffic over the last 7 days" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gAllowed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gFlagged" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gBlocked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v / 1000}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Area type="monotone" dataKey="allowed" name="Allowed" stroke="#10b981" strokeWidth={2} fill="url(#gAllowed)" />
              <Area type="monotone" dataKey="flagged" name="Flagged" stroke="#f59e0b" strokeWidth={2} fill="url(#gFlagged)" />
              <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#ef4444" strokeWidth={2} fill="url(#gBlocked)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Rules table */}
      <Card className="mt-6">
        <CardTitle
          title="Active Enforcement Rules"
          subtitle="Each row is a live composite pack (framework or industry bundle). Mode, scope, and control count come straight from the policy catalog."
        />
        <Table columns={['Policy pack', 'Controls', 'Scope', 'Mode', 'Hits (today)', 'Last triggered']}>
          {enforcementRows.map(({ pack, controls, mode, scope, hits, last }) => (
            <Tr key={pack.id}>
              <Td>
                <div className="font-medium text-ink-900">{pack.name}</div>
                <div className="text-xs text-ink-400">
                  {pack.id} · {pack.category} · {pack.kind === 'industry' ? 'Industry' : 'Framework'} composite
                </div>
              </Td>
              <Td className="text-ink-700">{controls}</Td>
              <Td className="text-ink-700">{scope}</Td>
              <Td>
                <ModePills active={mode} />
              </Td>
              <Td className="font-medium text-ink-900">{fmtNum(hits)}</Td>
              <Td className="text-ink-500">{last}</Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
