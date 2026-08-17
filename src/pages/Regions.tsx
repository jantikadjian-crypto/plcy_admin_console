import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Globe, Shield, Scale, Server, Lock, Users, MapPin, Landmark } from 'lucide-react'
import {
  Card,
  CardTitle,
  PageHeader,
  StatCard,
  Badge,
  Progress,
  Modal,
} from '@/components/ui'
import { regions, deployments, fleetTotals, lawFull } from '@/data/fleet'
import type { Region, SovereigntyTier } from '@/data/fleet'

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)', fontSize: 12 }

type BadgeTone = 'red' | 'purple' | 'slate'
const sovTone = (s: SovereigntyTier): BadgeTone =>
  s === 'Air-gapped' ? 'red' : s === 'Sovereign Cloud' ? 'purple' : 'slate'

const complianceTone = (v: number): 'green' | 'blue' | 'orange' =>
  v >= 97 ? 'green' : v >= 92 ? 'blue' : 'orange'

const clientsIn = (code: string) => deployments.filter((d) => d.regionCode === code)

const chartData = regions.map((r) => ({ code: r.code, count: clientsIn(r.code).length }))

const jurisdictionCount = new Set(regions.map((r) => r.jurisdiction)).size

export default function Regions() {
  const [sel, setSel] = useState<Region | null>(null)

  return (
    <>
      <PageHeader
        title="Regions"
        description="Data residency, sovereignty, and privacy-law compliance by jurisdiction"
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Regions" value={regions.length} icon={Globe} tone="blue" footer="Pinned jurisdictions" />
        <StatCard label="Sovereign clients" value={fleetTotals.sovereign} icon={Shield} tone="purple" footer="Sovereign Cloud + air-gapped" />
        <StatCard label="Air-gapped" value={fleetTotals.airgapped} icon={Lock} tone="red" footer="No external connectivity" />
        <StatCard label="Jurisdictions" value={jurisdictionCount} icon={Landmark} tone="green" footer="Distinct legal regimes" />
      </div>

      {/* Clients per region chart */}
      <Card className="mt-6">
        <CardTitle title="Clients per Region" subtitle="Single-tenant deployments pinned to each region — data never leaves its jurisdiction" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="code" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(v: number) => `${v} client${v === 1 ? '' : 's'}`} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {chartData.map((d) => (
                  <Cell key={d.code} fill="#3366ff" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Region cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {regions.map((r) => {
          const count = clientsIn(r.code).length
          const airgapped = r.sovereignty === 'Air-gapped'
          const iconTone = airgapped ? 'bg-rose-50 text-rose-600' : r.sovereignty === 'Sovereign Cloud' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'
          return (
            <button
              key={r.code}
              aria-label={`View ${r.name}`}
              onClick={() => setSel(r)}
              className="card card-pad text-left transition-shadow hover:shadow-cardhover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconTone}`}>
                    {airgapped ? <Shield className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">{r.name}</p>
                    <p className="font-mono text-xs text-ink-400">{r.code}</p>
                  </div>
                </div>
                <Badge tone={sovTone(r.sovereignty)}>{r.sovereignty}</Badge>
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-500">
                <MapPin className="h-3.5 w-3.5 text-ink-400" />
                {r.jurisdiction}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.laws.map((law) => (
                  <Badge key={law} tone="slate"><span title={lawFull(law)}>{law}</span></Badge>
                ))}
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-500">Compliance posture</span>
                  <span className="font-semibold text-ink-900">{r.compliance}%</span>
                </div>
                <Progress value={r.compliance} tone={complianceTone(r.compliance)} />
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-500">
                <Users className="h-3.5 w-3.5 text-ink-400" />
                {count} client{count === 1 ? '' : 's'} in-region
              </p>
            </button>
          )
        })}
      </div>

      {/* Detail modal */}
      {sel && (
        <Modal
          open
          onClose={() => setSel(null)}
          title={sel.name}
          subtitle={<span className="font-mono">{sel.code}</span>}
          headerRight={<Badge tone={sovTone(sel.sovereignty)}>{sel.sovereignty}</Badge>}
          footer={<button className="btn-secondary" onClick={() => setSel(null)}>Close</button>}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KV icon={Landmark} label="Jurisdiction" value={sel.jurisdiction} />
              <KV icon={MapPin} label="Data residency" value={sel.residency} />
              <KV icon={Lock} label="Key custody" value={sel.keyCustody} />
              <KV icon={Server} label="Control plane" value={sel.controlPlane} />
              <KV icon={Shield} label="Sovereignty tier" value={sel.sovereignty} />
              <KV icon={Users} label="Clients" value={`${clientsIn(sel.code).length} in-region`} />
            </div>

            {/* Privacy laws */}
            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink-900">Applicable privacy laws</h4>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {sel.laws.map((law) => (
                  <li key={law} className="flex items-center gap-3 px-4 py-2.5">
                    <Scale className="h-4 w-4 shrink-0 text-ink-400" />
                    <span className="text-sm font-medium text-ink-800">{law}</span>
                    {lawFull(law) && <span className="text-xs text-ink-500">{lawFull(law)}</span>}
                  </li>
                ))}
              </ul>
            </section>

            {/* Metadata-only info box */}
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-sm text-blue-900">
                The central control plane is <strong>metadata-only</strong>. Client data, prompts, logs and encryption keys never leave <strong>{sel.jurisdiction}</strong> — residency is guaranteed in-region with no cross-border transfer. Only anonymized health and version metadata rolls up to the control plane.
              </p>
            </div>

            {/* Clients in region */}
            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink-900">Clients in this region</h4>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {clientsIn(sel.code).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-sm font-medium text-ink-900">{d.customer}</span>
                    <Badge tone={d.connectivity === 'Air-gapped' ? 'red' : 'blue'}>{d.connectivity}</Badge>
                  </li>
                ))}
                {clientsIn(sel.code).length === 0 && (
                  <li className="px-4 py-3 text-sm text-ink-400">No clients pinned to this region.</li>
                )}
              </ul>
            </section>
          </div>
        </Modal>
      )}
    </>
  )
}

function KV({ icon: Icon, label, value }: { icon: typeof Globe; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        <Icon className="h-3.5 w-3.5 text-ink-400" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  )
}
