import { useState } from 'react'
import {
  Terminal,
  KeyRound,
  Webhook,
  Gauge,
  Copy,
  Code2,
  Rocket,
} from 'lucide-react'
import {
  Card,
  CardTitle,
  PageHeader,
  StatCard,
  StatusBadge,
  Table,
  Tr,
  Td,
} from '@/components/ui'
import { fmtCompact } from '@/data/mock'

const tabs = ['REST', 'Webhooks', 'SDKs'] as const
type Tab = (typeof tabs)[number]

const curlSample = `curl https://api.plcy.app/v1/evaluate \\
  -H "Authorization: Bearer plcy_live_…a1b2" \\
  -H "Content-Type: application/json" \\
  -d '{
    "policy_pack": "pp_pii",
    "model": "gpt-4-turbo",
    "input": "Email me at jane.doe@example.com",
    "context": { "customer": "cus_meridian" }
  }'`

interface WebhookRow {
  event: string
  endpoint: string
  status: string
  lastDelivery: string
  successRate: string
}

const webhooks: WebhookRow[] = [
  { event: 'policy.violation', endpoint: 'https://hooks.meridian.com/plcy', status: 'Active', lastDelivery: '20s ago', successRate: '99.8%' },
  { event: 'model.blocked', endpoint: 'https://ops.helixhealth.io/ingest', status: 'Active', lastDelivery: '4 min ago', successRate: '100%' },
  { event: 'incident.opened', endpoint: 'https://pd.northwind.co/webhook', status: 'Active', lastDelivery: '12 min ago', successRate: '98.1%' },
  { event: 'evaluation.completed', endpoint: 'https://data.vertexcap.com/sink', status: 'Degraded', lastDelivery: '1 hour ago', successRate: '87.4%' },
  { event: 'key.rotated', endpoint: 'https://sec.atlaslogistics.com/hook', status: 'Offline', lastDelivery: '3 days ago', successRate: '0%' },
]

interface Sdk {
  name: string
  lang: string
  install: string
  version: string
}

const sdks: Sdk[] = [
  { name: 'Python', lang: 'python', install: 'pip install plcy', version: 'v2.4.1' },
  { name: 'Node.js', lang: 'node', install: 'npm i @plcy/sdk', version: 'v2.4.0' },
  { name: 'Go', lang: 'go', install: 'go get github.com/plcy/plcy-go', version: 'v1.9.2' },
  { name: 'Java', lang: 'java', install: 'implementation "app.plcy:sdk:1.7.0"', version: 'v1.7.0' },
]

export default function DeveloperTools() {
  const [tab, setTab] = useState<Tab>('REST')
  return (
    <>
      <PageHeader
        title="Developer Tools"
        description="APIs, webhooks, and SDKs for building on the PLCY platform"
        actions={
          <button className="btn-primary">
            <Code2 className="h-4 w-4" />
            API reference
          </button>
        }
      />

      {/* Orientation — what this page is and how to use it */}
      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Rocket className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink-900">Build on the PLCY API</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              This is the developer portal for integrating with the platform. PLCY governs every AI request in
              real time — send requests to the API and it evaluates them against your policy packs before they
              reach a model. Use the tabs below to get set up:
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <li className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <span><span className="font-semibold text-ink-900">REST</span> — call <code className="rounded bg-slate-100 px-1 font-mono text-xs">POST /v1/evaluate</code> with an API key. Copy the sample to try it.</span>
              </li>
              <li className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <Webhook className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <span><span className="font-semibold text-ink-900">Webhooks</span> — subscribe an endpoint to events (violations, blocks, incidents) and watch delivery health.</span>
              </li>
              <li className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <span><span className="font-semibold text-ink-900">SDKs</span> — install an official client (Python, Node, Go, Java) instead of calling the API by hand.</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-ink-500">
              Need a key first? Generate and scope API keys under <span className="font-medium text-ink-700">Administration → Security → Admin Security</span>.
              Full endpoint docs are behind <span className="font-medium text-ink-700">API reference</span> (top right).
            </p>
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="API calls today" value={fmtCompact(842013)} icon={Terminal} tone="blue" footer="+8.2% vs yesterday" />
        <StatCard label="Active keys" value={3} icon={KeyRound} tone="purple" footer="1 expired" />
        <StatCard label="Webhooks" value={webhooks.length} icon={Webhook} tone="orange" footer="2 endpoints unhealthy" />
        <StatCard label="Avg latency" value="42 ms" icon={Gauge} tone="green" footer="p95 · evaluate endpoint" />
      </div>

      {/* Segmented tabs */}
      <div className="mt-6 inline-flex rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={
              tab === t
                ? 'rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-ink-900 shadow-sm'
                : 'rounded-lg px-4 py-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-700'
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* REST — code sample */}
      {tab === 'REST' && (
        <Card className="mt-6 bg-slate-900" padded={false}>
          <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Terminal className="h-4 w-4" />
              <span className="font-mono text-xs">POST /v1/evaluate</span>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-slate-100">
            {curlSample}
          </pre>
        </Card>
      )}

      {/* Webhooks table */}
      {tab === 'Webhooks' && (
        <Card className="mt-6">
          <CardTitle title="Webhooks" subtitle="Configured event subscriptions and delivery health" />
          <Table columns={['Event', 'Endpoint', 'Status', 'Last delivery', 'Success rate']}>
            {webhooks.map((w) => (
              <Tr key={w.endpoint}>
                <Td>
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-ink-700">
                    {w.event}
                  </span>
                </Td>
                <Td className="font-mono text-xs text-ink-500">{w.endpoint}</Td>
                <Td>
                  <StatusBadge status={w.status} />
                </Td>
                <Td className="text-ink-700">{w.lastDelivery}</Td>
                <Td className="font-medium text-ink-900">{w.successRate}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}

      {/* SDK cards */}
      {tab === 'SDKs' && (
        <Card className="mt-6">
          <CardTitle title="SDKs & Libraries" subtitle="Official client libraries for the PLCY API" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {sdks.map((s) => (
              <div key={s.name} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Code2 className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-ink-900">{s.name}</p>
                  </div>
                  <span className="text-xs text-ink-400">{s.version}</span>
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2">
                  <code className="whitespace-nowrap font-mono text-xs text-slate-100">$ {s.install}</code>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
