import { useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { Route, ShieldCheck, ShieldX, Shuffle, CircleCheck, XCircle, ArrowRight } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { regions, regionByCode, deployments } from '@/data/fleet'
import { modelProviders, evaluateRoute, providerAllowed, recentRoutes, routingTotals } from '@/data/routing'
import type { Decision } from '@/data/routing'

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)', fontSize: 12 }

const decisionTone: Record<Decision, 'green' | 'orange' | 'red'> = { Allowed: 'green', Rerouted: 'orange', Blocked: 'red' }
const decisionAccent: Record<Decision, string> = {
  Allowed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Rerouted: 'border-amber-200 bg-amber-50 text-amber-900',
  Blocked: 'border-rose-200 bg-rose-50 text-rose-800',
}
const decisionIcon: Record<Decision, typeof ShieldCheck> = { Allowed: ShieldCheck, Rerouted: Shuffle, Blocked: ShieldX }

const donut = [
  { name: 'Allowed', value: routingTotals.allowed, color: '#10b981' },
  { name: 'Re-routed', value: routingTotals.rerouted, color: '#f59e0b' },
  { name: 'Blocked', value: routingTotals.blocked, color: '#ef4444' },
]

export default function Routing() {
  const { logAction } = useSession()
  const [mode, setMode] = useState<'Block' | 'Monitor'>('Block')
  const [customer, setCustomer] = useState(deployments[2].customer) // Northwind (EU) — good default
  const [provider, setProvider] = useState('OpenAI')

  const region = deployments.find((d) => d.customer === customer)?.regionCode ?? 'us-east-1'
  const result = evaluateRoute(provider, region)
  const effective: Decision = mode === 'Monitor' && result.decision !== 'Allowed' ? 'Allowed' : result.decision
  const DIcon = decisionIcon[effective]

  const setEnforcement = (m: 'Block' | 'Monitor') => {
    setMode(m)
    logAction({ action: 'enforcement.mode', target: `model routing → ${m}`, category: 'enforcement' })
  }

  return (
    <>
      <PageHeader
        title="Model Routing"
        description="Residency & sub-processor enforcement for model inference — sovereignty rules applied at the gateway"
        actions={
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {(['Monitor', 'Block'] as const).map((m) => (
              <GatedButton
                key={m}
                cap="policy.manage"
                showLock={false}
                onClick={() => setEnforcement(m)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === m ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
              >
                {m}
              </GatedButton>
            ))}
          </div>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Routes evaluated" value={`${(routingTotals.evaluatedToday / 1000).toFixed(1)}k`} icon={Route} tone="blue" footer="Today" />
        <StatCard label="Allowed" value={`${Math.round((routingTotals.allowed / routingTotals.evaluatedToday) * 100)}%`} icon={ShieldCheck} tone="green" footer={`${routingTotals.allowed.toLocaleString()} routes`} />
        <StatCard label="Re-routed in-region" value={routingTotals.rerouted.toLocaleString()} icon={Shuffle} tone="orange" footer="Residency reroute" />
        <StatCard label="Blocked" value={routingTotals.blocked.toLocaleString()} icon={ShieldX} tone="red" footer="No in-region path" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Simulator */}
        <Card className="lg:col-span-2">
          <CardTitle title="Routing Simulator" subtitle="Evaluate whether a provider may serve a client in its region" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Customer</label>
              <select className="input" value={customer} onChange={(e) => setCustomer(e.target.value)}>
                {deployments.map((d) => (
                  <option key={d.id} value={d.customer}>{d.customer}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-ink-500">
                Region: <span className="font-mono">{region}</span> · {regionByCode(region)?.jurisdiction}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Requested model provider</label>
              <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                {modelProviders.map((p) => (
                  <option key={p.name} value={p.name}>{p.name} · {p.home}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-ink-500">Enforcement: <span className="font-medium">{mode}</span></p>
            </div>
          </div>

          {/* Decision */}
          <div className={`mt-4 rounded-xl border p-4 ${decisionAccent[effective]}`}>
            <div className="flex items-center gap-2">
              <DIcon className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-wide">{effective}</span>
              {mode === 'Monitor' && result.decision !== 'Allowed' && (
                <Badge tone="slate">would be {result.decision.toLowerCase()} in Block mode</Badge>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{provider}</span>
              <ArrowRight className="h-4 w-4" />
              <span className="font-semibold">{effective === 'Allowed' ? provider : result.routedTo}</span>
            </div>
            <p className="mt-1.5 text-sm opacity-90">{result.reason}.</p>
          </div>
        </Card>

        {/* Enforcement mix */}
        <Card>
          <CardTitle title="Enforcement Mix" subtitle="Routing decisions today" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
                  {donut.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toLocaleString()} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Allow-list matrix */}
      <Card className="mt-6">
        <CardTitle title="Provider × Region Allow-list" subtitle="Which model providers may serve each region (derived from the sub-processor registry)" />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-th">Provider</th>
                {regions.map((r) => (
                  <th key={r.code} className="table-th whitespace-nowrap text-center font-mono normal-case">{r.code}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modelProviders.map((p) => (
                <tr key={p.name} className="hover:bg-slate-50/70">
                  <td className="table-td whitespace-nowrap font-medium text-ink-900">{p.name}</td>
                  {regions.map((r) => {
                    const ok = providerAllowed(p.name, r.code)
                    return (
                      <td key={r.code} className="table-td text-center">
                        {ok ? <CircleCheck className="mx-auto h-4 w-4 text-emerald-500" /> : <XCircle className="mx-auto h-4 w-4 text-rose-400" />}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent decisions */}
      <Card className="mt-6">
        <CardTitle title="Recent Routing Decisions" subtitle="Live enforcement log" />
        <Table columns={['Time', 'Customer', 'Region', 'Requested', 'Decision', 'Routed to']} noun="decisions" recent>
          {recentRoutes.map((e) => (
            <Tr key={e.id}>
              <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{e.time}</Td>
              <Td className="font-medium text-ink-900">{e.customer}</Td>
              <Td className="font-mono text-xs text-ink-500">{e.regionCode}</Td>
              <Td className="text-ink-700">{e.requested}</Td>
              <Td><Badge tone={decisionTone[e.decision]} dot>{e.decision}</Badge></Td>
              <Td className="text-ink-700">{e.routedTo}</Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
