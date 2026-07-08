import { useState } from 'react'
import type { ReactNode } from 'react'
import { Bot, CheckCircle2, AlertTriangle, Activity, ShieldAlert, Eye } from 'lucide-react'
import { useCreateIntent } from '@/hooks/useCreateIntent'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Card,
  CardTitle,
  PageHeader,
  StatCard,
  Badge,
  StatusBadge,
  Table,
  Tr,
  Td,
  Modal,
} from '@/components/ui'
import { models, policyPacks, customers, fmtCompact, fmtNum } from '@/data/mock'
import type { AIModel } from '@/data/mock'
import { useCustomerScope } from '@/context/CustomerScope'
import { useSession } from '@/context/Session'
import { GatedButton } from '@/components/GatedButton'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const typeTone: Record<AIModel['type'], 'blue' | 'purple' | 'green' | 'orange' | 'slate'> = {
  LLM: 'blue',
  Vision: 'purple',
  Embedding: 'green',
  Classifier: 'orange',
  Speech: 'slate',
}

const riskTone: Record<AIModel['risk'], 'green' | 'orange' | 'red'> = {
  Low: 'green',
  Medium: 'orange',
  High: 'red',
}

const riskColors: Record<AIModel['risk'], string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
}

const providers = Array.from(new Set(models.map((m) => m.provider)))
const types = Array.from(new Set(models.map((m) => m.type)))

export default function Models() {
  const { scope, isAll } = useCustomerScope()
  const { logAction } = useSession()
  const [rows, setRows] = useState<AIModel[]>(models)
  const [sel, setSel] = useState<AIModel | null>(null)
  const [registering, setRegistering] = useState(false)
  useCreateIntent(() => setRegistering(true))

  const scoped = isAll ? rows : rows.filter((m) => m.customer === scope)

  const totalModels = scoped.length
  const activeModels = scoped.filter((m) => m.status === 'Active').length
  const highRisk = scoped.filter((m) => m.risk === 'High').length
  const totalRequests = scoped.reduce((s, m) => s + m.requests, 0)
  const blocked = scoped.filter((m) => m.status === 'Blocked')
  const riskCounts = (['Low', 'Medium', 'High'] as const).map((r) => ({
    name: `${r} Risk`,
    value: scoped.filter((m) => m.risk === r).length,
    color: riskColors[r],
  }))

  return (
    <>
      <PageHeader
        title="AI Models"
        description={isAll ? 'Every model under PLCY governance across the customer fleet' : `Models under governance for ${scope}`}
        actions={
          <GatedButton cap="model.register" className="btn-primary" onClick={() => setRegistering(true)}>
            <Bot className="h-4 w-4" />
            Register model
          </GatedButton>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total models" value={totalModels} icon={Bot} tone="blue" footer={isAll ? 'Under governance' : scope} />
        <StatCard label="Active" value={activeModels} icon={CheckCircle2} tone="green" footer={`${totalModels - activeModels} not serving`} />
        <StatCard label="High risk" value={highRisk} icon={AlertTriangle} tone="red" footer="Require review" />
        <StatCard label="Total requests" value={fmtCompact(totalRequests)} icon={Activity} tone="purple" footer="Lifetime volume" />
      </div>

      {/* Shadow AI banner */}
      {blocked.length > 0 && (
        <Card className="mt-6 border-rose-200 bg-rose-50/60" padded={false}>
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-800">
                {blocked.length} unapproved model{blocked.length > 1 ? 's' : ''} blocked
              </p>
              <p className="mt-0.5 text-sm text-rose-700">
                Shadow AI detected: {blocked.map((m) => m.name).join(', ')} — flagged by enforcement and denied at the gateway.
              </p>
            </div>
            <button className="btn-secondary shrink-0">Review</button>
          </div>
        </Card>
      )}

      {/* Filters + donut */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle title="Model Inventory" subtitle="Filter and inspect governed models" />
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <select className="input sm:max-w-xs">
              <option>All providers</option>
              {providers.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select className="input sm:max-w-xs">
              <option>All types</option>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <Table columns={['Model', 'Provider', 'Type', 'Customer', 'Risk', 'Status', 'Requests', '']}>
            {scoped.map((m) => (
              <Tr key={m.id}>
                <Td>
                  <button className="text-left" onClick={() => setSel(m)}>
                    <p className="font-semibold text-ink-900 hover:text-brand-600">{m.name}</p>
                    <p className="text-xs text-ink-400">v{m.version}</p>
                  </button>
                </Td>
                <Td>{m.provider}</Td>
                <Td>
                  <Badge tone={typeTone[m.type]}>{m.type}</Badge>
                </Td>
                <Td>{m.customer}</Td>
                <Td>
                  <Badge tone={riskTone[m.risk]} dot>
                    {m.risk}
                  </Badge>
                </Td>
                <Td>
                  <StatusBadge status={m.status} />
                </Td>
                <Td className="font-medium text-ink-900">{fmtCompact(m.requests)}</Td>
                <Td>
                  <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${m.name}`} onClick={() => setSel(m)}>
                    <Eye className="h-4 w-4" />
                  </button>
                </Td>
              </Tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardTitle title="Risk Breakdown" subtitle="Governed models by risk tier" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={88} paddingAngle={2} stroke="none">
                  {riskCounts.map((r) => (
                    <Cell key={r.name} fill={r.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} models`} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-xs text-ink-400">
            {highRisk} of {totalModels} models flagged high risk
          </p>
        </Card>
      </div>

      {sel && <ModelModal model={sel} onClose={() => setSel(null)} />}

      <RegisterModelModal
        open={registering}
        onClose={() => setRegistering(false)}
        defaultCustomer={isAll ? customers[0].name : scope}
        onCreate={(m) => {
          logAction({ action: 'model.register', target: m.name, category: 'model' })
          setRows((prev) => [m, ...prev])
          setRegistering(false)
          setSel(m)
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Register model form                                                 */
/* ------------------------------------------------------------------ */
function RegisterModelModal({
  open,
  onClose,
  defaultCustomer,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  defaultCustomer: string
  onCreate: (m: AIModel) => void
}) {
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('OpenAI')
  const [type, setType] = useState<AIModel['type']>('LLM')
  const [customer, setCustomer] = useState(defaultCustomer)
  const [risk, setRisk] = useState<AIModel['risk']>('Low')

  const submit = () => {
    if (!name.trim()) return
    onCreate({
      id: `mdl_${Date.now().toString(36)}`,
      name: name.trim(),
      provider: provider.trim() || 'Unknown',
      type,
      customer,
      status: 'Review',
      risk,
      requests: 0,
      version: '1.0',
    })
    setName(''); setProvider('OpenAI'); setType('LLM'); setCustomer(defaultCustomer); setRisk('Low')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Register model"
      subtitle="Add a model to PLCY governance (starts in review)"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!name.trim()}>Register</button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ModelField label="Model name" className="sm:col-span-2">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GPT-4o mini" />
        </ModelField>
        <ModelField label="Provider">
          <input className="input" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="OpenAI, Anthropic, In-house…" />
        </ModelField>
        <ModelField label="Type">
          <select className="input" value={type} onChange={(e) => setType(e.target.value as AIModel['type'])}>
            {(['LLM', 'Vision', 'Embedding', 'Classifier', 'Speech'] as AIModel['type'][]).map((t) => <option key={t}>{t}</option>)}
          </select>
        </ModelField>
        <ModelField label="Customer">
          <select className="input" value={customer} onChange={(e) => setCustomer(e.target.value)}>
            {customers.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
        </ModelField>
        <ModelField label="Initial risk tier">
          <select className="input" value={risk} onChange={(e) => setRisk(e.target.value as AIModel['risk'])}>
            {(['Low', 'Medium', 'High'] as AIModel['risk'][]).map((r) => <option key={r}>{r}</option>)}
          </select>
        </ModelField>
      </div>
    </Modal>
  )
}

function ModelField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Model detail drawer                                                 */
/* ------------------------------------------------------------------ */
function ModelModal({ model: m, onClose }: { model: AIModel; onClose: () => void }) {
  const isBlocked = m.status === 'Blocked'
  const guardrails = isBlocked ? [] : policyPacks.filter((p) => p.status === 'Published').slice(0, m.risk === 'High' ? 5 : m.risk === 'Medium' ? 3 : 2)

  const facts: { label: string; value: string }[] = [
    { label: 'Provider', value: m.provider },
    { label: 'Type', value: m.type },
    { label: 'Version', value: m.version },
    { label: 'Requests (lifetime)', value: fmtNum(m.requests) },
    { label: 'Customer', value: m.customer },
    { label: 'Risk tier', value: m.risk },
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title={m.name}
      subtitle={`${m.provider} · governed for ${m.customer}`}
      headerRight={<StatusBadge status={m.status} />}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          {isBlocked ? (
            <button className="btn-primary">Review request</button>
          ) : (
            <button className="btn-primary">Run evaluation</button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge tone={typeTone[m.type]}>{m.type}</Badge>
          <Badge tone={riskTone[m.risk]} dot>{m.risk} risk</Badge>
          <Badge tone="purple">{m.customer}</Badge>
        </div>

        {isBlocked && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p className="text-sm text-rose-800">
              This is an <strong>unapproved (shadow AI)</strong> model. It is denied at the gateway and cannot serve traffic until reviewed and registered.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-medium text-ink-500">{f.label}</p>
              <p className="mt-0.5 font-semibold text-ink-900">{f.value}</p>
            </div>
          ))}
        </div>

        <section>
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-ink-400" />
            <h4 className="text-sm font-semibold text-ink-900">Applied guardrails ({guardrails.length})</h4>
          </div>
          {guardrails.length === 0 ? (
            <p className="text-sm text-ink-400">No guardrails applied — model is blocked at the gateway.</p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {guardrails.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">{p.name}</p>
                    <p className="text-xs text-ink-500">{p.category} · {p.rules} rules</p>
                  </div>
                  <Badge tone="green" dot>Enforced</Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}
