import { Activity, Gauge, AlertTriangle, Cpu } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardTitle, StatCard, PageHeader, Table, Tr, Td, StatusBadge } from '@/components/ui'
import { gatewayHours, percentiles } from '@/data/latency'
import { instances, fmtCompact } from '@/data/mock'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

/*
 * 24 hourly points of gateway latency and request volume, reduced from the
 * shared sample generator. The chart and the headline card above it both come
 * from these same samples — the card used to be a hardcoded string, so it could
 * (and did) drift away from the chart it captioned.
 */
const hours = gatewayHours()
const latencySeries = hours.map((h) => ({
  t: h.hour,
  requests: h.requests,
  ...percentiles(h.samples),
}))

/** The whole day's requests, so the headline is a true percentile rather than an average of percentiles. */
const dayLatency = percentiles(hours.flatMap((h) => h.samples))

interface EndpointRow {
  name: string
  provider: string
  requests: number
  latency: number
  errorRate: number
  status: string
}

const endpoints: EndpointRow[] = [
  { name: 'text-embedding-3-large', provider: 'OpenAI', requests: 3_100_000, latency: 41, errorRate: 0.04, status: 'Operational' },
  { name: 'GPT-4 Turbo', provider: 'OpenAI', requests: 1_240_000, latency: 182, errorRate: 0.21, status: 'Operational' },
  { name: 'Claude Opus 4', provider: 'Anthropic', requests: 980_000, latency: 214, errorRate: 0.09, status: 'Operational' },
  { name: 'Llama 3.1 70B', provider: 'Meta', requests: 420_000, latency: 156, errorRate: 0.38, status: 'Degraded' },
  { name: 'Gemini 1.5 Pro', provider: 'Google', requests: 310_000, latency: 198, errorRate: 0.17, status: 'Operational' },
  { name: 'FraudScan-v2', provider: 'In-house', requests: 210_000, latency: 74, errorRate: 1.42, status: 'Degraded' },
  { name: 'Whisper Large v3', provider: 'OpenAI', requests: 88_000, latency: 640, errorRate: 0.11, status: 'Operational' },
  { name: 'MedVision-CT', provider: 'In-house', requests: 54_000, latency: 910, errorRate: 2.05, status: 'Degraded' },
]

function errorTone(rate: number) {
  if (rate >= 1) return 'text-rose-600'
  if (rate >= 0.3) return 'text-orange-600'
  return 'text-emerald-600'
}

export default function Observability() {
  return (
    <>
      <PageHeader
        title="Observability"
        description="Real-time telemetry for governed AI traffic across the PLCY gateway"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="p95 Latency"
          value={`${dayLatency.p95} ms`}
          icon={Gauge}
          tone="blue"
          footer={`p50 ${dayLatency.p50} ms · p99 ${dayLatency.p99} ms · ${fmtCompact(dayLatency.count)} sampled requests`}
        />
        <StatCard label="Throughput" value="4.9k req/s" icon={Activity} tone="purple" footer="24h avg across fleet" />
        <StatCard label="Error Rate" value="0.32%" icon={AlertTriangle} tone="orange" footer="within 0.5% SLO" />
        <StatCard label="Tokens/s" value="1.4M" icon={Cpu} tone="green" footer="prompt + completion" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="Gateway Latency" subtitle="p50 / p95 / p99 over the last 24 hours (ms) · each point is a percentile of that hour's requests" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencySeries} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} ms`} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Line type="monotone" dataKey="p50" name="p50" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="p95" name="p95" stroke="#3366ff" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="p99" name="p99" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle title="Request Volume" subtitle="Requests per hour through the governance layer" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencySeries} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3366ff" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#3366ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtCompact(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${fmtCompact(v)} req`} />
                <Area type="monotone" dataKey="requests" name="Requests" stroke="#3366ff" strokeWidth={2.5} fill="url(#volFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle title="Top Models & Endpoints" subtitle="Ranked by traffic through the governance gateway" />
        <Table columns={['Model / endpoint', 'Requests', 'Avg latency', 'Error rate', 'Status']} noun="endpoints">
          {endpoints.map((e) => (
            <Tr key={e.name}>
              <Td>
                <div className="font-medium text-ink-900">{e.name}</div>
                <div className="text-xs text-ink-500">{e.provider}</div>
              </Td>
              <Td className="tabular-nums">{fmtCompact(e.requests)}</Td>
              <Td className="tabular-nums">{e.latency} ms</Td>
              <Td className={`font-semibold tabular-nums ${errorTone(e.errorRate)}`}>{e.errorRate.toFixed(2)}%</Td>
              <Td>
                <StatusBadge status={e.status} />
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <CardTitle title="Instance Health" subtitle="Live status of every deployed governance instance" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {instances.map((inst) => (
            <div key={inst.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-ink-900">{inst.name}</span>
                <StatusBadge status={inst.status} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                <span>{inst.region}</span>
                <span className="tabular-nums">{inst.uptime > 0 ? `${inst.uptime.toFixed(2)}% uptime` : 'no data'}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
