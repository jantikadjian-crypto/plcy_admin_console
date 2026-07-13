import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateIntent } from '@/hooks/useCreateIntent'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  TriangleAlert,
  OctagonAlert,
  Users,
  Clock,
  Eye,
  X,
  Plus,
  ShieldAlert,
  GitBranch,
  Landmark,
  Gauge,
  CircleAlert,
  FileBarChart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Modal } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { incidents as seedIncidents, regulatoryNotices as regNotices } from '@/data/incidents'
import type { IncidentSeverity as Severity, IncidentStatus as Status, TimelineEvent, Incident } from '@/data/incidents'

/* ------------------------------------------------------------------ */
/* Style maps                                                          */
/* ------------------------------------------------------------------ */
const sevBadge: Record<Severity, { tone: 'red' | 'orange' | 'yellow' | 'slate'; icon: LucideIcon }> = {
  Critical: { tone: 'red', icon: OctagonAlert },
  High: { tone: 'orange', icon: TriangleAlert },
  Medium: { tone: 'yellow', icon: CircleAlert },
  Low: { tone: 'slate', icon: CircleAlert },
}

const statusBadge: Record<Status, 'red' | 'orange' | 'blue' | 'green' | 'purple'> = {
  Open: 'red',
  Triage: 'purple',
  Investigating: 'blue',
  Remediation: 'orange',
  Resolved: 'green',
}

const phaseDot: Record<TimelineEvent['phase'], string> = {
  Detection: 'bg-rose-500',
  Triage: 'bg-orange-500',
  Investigation: 'bg-amber-500',
  Remediation: 'bg-blue-500',
  Resolved: 'bg-emerald-500',
}

const riskColor = (n: number) =>
  n >= 80 ? 'text-rose-600' : n >= 60 ? 'text-orange-600' : n >= 40 ? 'text-amber-600' : 'text-emerald-600'

function SeverityBadge({ severity }: { severity: Severity }) {
  const { tone, icon: Icon } = sevBadge[severity]
  return (
    <Badge tone={tone}>
      <Icon className="h-3 w-3" />
      {severity.toUpperCase()}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/* Trend data                                                          */
/* ------------------------------------------------------------------ */
const trend = [
  { day: 'Jul 1', Critical: 0, High: 0, Medium: 0 },
  { day: 'Jul 2', Critical: 0, High: 1, Medium: 0 },
  { day: 'Jul 3', Critical: 0, High: 1, Medium: 0 },
  { day: 'Jul 4', Critical: 0, High: 0, Medium: 1 },
  { day: 'Jul 5', Critical: 1, High: 1, Medium: 0 },
  { day: 'Jul 6', Critical: 0, High: 0, Medium: 1 },
  { day: 'Jul 7', Critical: 0, High: 1, Medium: 1 },
]

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px -2px rgba(15,23,42,0.1)',
  fontSize: 12,
}

const TABS = ['Incidents', 'Policy Violations', 'Risk Scores', 'Governance Workflows', 'Regulatory Notifications'] as const
type Tab = (typeof TABS)[number]

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function Incidents() {
  const { logAction } = useSession()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('Incidents')
  const [sevFilter, setSevFilter] = useState<'All' | Severity>('All')
  const [selected, setSelected] = useState<Incident | null>(null)
  const [reporting, setReporting] = useState(false)
  useCreateIntent(() => setReporting(true))
  const [items, setItems] = useState<Incident[]>(seedIncidents)

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const addIncident = (inc: Incident) => setItems((prev) => [inc, ...prev])

  const open = items.filter((i) => i.status !== 'Resolved')
  const critical = items.filter((i) => i.severity === 'Critical' && i.status !== 'Resolved')
  const usersAffected = open.reduce((s, i) => s + i.usersAffected, 0)
  const visible = sevFilter === 'All' ? items : items.filter((i) => i.severity === sevFilter)

  return (
    <>
      <PageHeader
        title="Incident Management"
        description="AI incident logging, risk scoring, and governance workflows"
        actions={
          <>
            <select
              className="input w-auto"
              value={sevFilter}
              onChange={(e) => setSevFilter(e.target.value as 'All' | Severity)}
              aria-label="Filter by severity"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <button className="btn-secondary" onClick={() => navigate('/reports/incidents')}>
              <FileBarChart className="h-4 w-4" />
              Generate report
            </button>
            <GatedButton cap="incident.manage" className="btn-primary" onClick={() => setReporting(true)}>
              <Plus className="h-4 w-4" />
              Report Incident
            </GatedButton>
          </>
        }
      />

      {/* Tabs */}
      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Incidents' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Open Incidents" value={open.length} icon={TriangleAlert} tone="red" footer="Requiring attention" />
            <StatCard label="Critical Severity" value={critical.length} icon={OctagonAlert} tone="orange" footer="Highest priority" />
            <StatCard label="Users Affected" value={usersAffected} icon={Users} tone="purple" footer="Across open incidents" />
            <StatCard label="Avg Resolution" value="2.5h" icon={Clock} tone="blue" footer="Trailing 30 days" />
          </div>

          {/* Trend */}
          <Card className="mt-6">
            <CardTitle title="Incident Trend (Last 7 Days)" subtitle="New incidents by severity" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  <Bar dataKey="Critical" stackId="s" fill="#ef4444" maxBarSize={44} />
                  <Bar dataKey="High" stackId="s" fill="#f97316" maxBarSize={44} />
                  <Bar dataKey="Medium" stackId="s" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Active incidents table */}
          <Card className="mt-6">
            <CardTitle
              title="Active Incidents"
              subtitle={`${visible.length} incident${visible.length === 1 ? '' : 's'}${sevFilter === 'All' ? '' : ` · ${sevFilter}`}`}
            />
            <Table columns={['Incident ID', 'Title', 'Severity', 'Status', 'App / Model', 'Risk Score', 'Assigned To', 'Reported', '']}>
              {visible.map((i) => (
                <Tr key={i.id}>
                  <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{i.id}</Td>
                  <Td>
                    <p className="font-semibold text-ink-900">{i.title}</p>
                    <p className="max-w-md truncate text-xs text-ink-500">{i.desc}</p>
                  </Td>
                  <Td><SeverityBadge severity={i.severity} /></Td>
                  <Td><Badge tone={statusBadge[i.status]}>{i.status}</Badge></Td>
                  <Td>
                    <p className="font-medium text-ink-900">{i.app}</p>
                    <p className="text-xs text-ink-500">{i.model}</p>
                  </Td>
                  <Td><span className={`text-base font-bold tabular-nums ${riskColor(i.riskScore)}`}>{i.riskScore}</span></Td>
                  <Td className="whitespace-nowrap text-ink-700">{i.assignedTo}</Td>
                  <Td className="whitespace-nowrap text-xs text-ink-500">{i.reported}</Td>
                  <Td>
                    <button
                      onClick={() => setSelected(i)}
                      className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-slate-100 hover:text-brand-600"
                      aria-label={`View ${i.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </Td>
                </Tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {tab === 'Policy Violations' && <PolicyViolations />}
      {tab === 'Risk Scores' && <RiskScores />}
      {tab === 'Governance Workflows' && <GovernanceWorkflows />}
      {tab === 'Regulatory Notifications' && <RegulatoryNotifications />}

      {/* Detail modal */}
      {selected && <IncidentModal incident={selected} onClose={() => setSelected(null)} />}

      {/* Report incident form */}
      <ReportIncidentModal
        open={reporting}
        onClose={() => setReporting(false)}
        nextId={`INC-2026-${String(items.length + 1).padStart(3, '0')}`}
        onCreate={(inc) => {
          logAction({ action: 'incident.report', target: inc.id, category: 'incident' })
          addIncident(inc)
          setReporting(false)
          setTab('Incidents')
          setSelected(inc)
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Report incident form modal                                          */
/* ------------------------------------------------------------------ */
const CUSTOMERS = ['Meridian Bank', 'Helix Health', 'Northwind Retail', 'Vertex Capital', 'Pinecrest Insurance', 'Atlas Logistics', 'Lumen Media']
const ASSIGNEES = ['dana.cole@plcy.app', 'marcus.ihde@plcy.app', 'priya.nair@plcy.app', 'jack@plcy.app']

function ReportIncidentModal({
  open,
  onClose,
  nextId,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  nextId: string
  onCreate: (inc: Incident) => void
}) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [severity, setSeverity] = useState<Severity>('High')
  const [customer, setCustomer] = useState(CUSTOMERS[0])
  const [app, setApp] = useState('')
  const [model, setModel] = useState('GPT-4 Turbo')
  const [assignedTo, setAssignedTo] = useState(ASSIGNEES[0])
  const [riskScore, setRiskScore] = useState(70)
  const [usersAffected, setUsersAffected] = useState(0)

  const reset = () => {
    setTitle(''); setDesc(''); setSeverity('High'); setCustomer(CUSTOMERS[0])
    setApp(''); setModel('GPT-4 Turbo'); setAssignedTo(ASSIGNEES[0]); setRiskScore(70); setUsersAffected(0)
  }

  const submit = () => {
    if (!title.trim()) return
    const now = new Date()
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    onCreate({
      id: nextId,
      title: title.trim(),
      desc: desc.trim() || 'No description provided.',
      severity,
      status: 'Open',
      app: app.trim() || 'Unassigned app',
      model,
      customer,
      riskScore,
      assignedTo,
      reported: stamp,
      usersAffected,
      requestsImpacted: 0,
      dataExposure: severity === 'Critical',
      timeline: [{ phase: 'Detection', time: stamp, text: 'Incident reported manually.', by: assignedTo }],
      rootCause: 'Under investigation.',
      remediation: ['Pending triage'],
    })
    reset()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report Incident"
      subtitle="Log a new AI governance incident"
      headerRight={<span className="font-mono text-sm text-ink-500">{nextId}</span>}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>Create incident</button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary of what happened" />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea className="input min-h-[72px]" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What was detected and where" />
        </Field>
        <Field label="Severity">
          <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
            {(['Critical', 'High', 'Medium', 'Low'] as Severity[]).map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Customer">
          <select className="input" value={customer} onChange={(e) => setCustomer(e.target.value)}>
            {CUSTOMERS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Application">
          <input className="input" value={app} onChange={(e) => setApp(e.target.value)} placeholder="e.g. Customer Support" />
        </Field>
        <Field label="Model">
          <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. GPT-4 Turbo" />
        </Field>
        <Field label="Assigned to">
          <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            {ASSIGNEES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <Field label={`Risk score · ${riskScore}`}>
          <input type="range" min={0} max={100} value={riskScore} onChange={(e) => setRiskScore(Number(e.target.value))} className="w-full accent-brand-600" />
        </Field>
        <Field label="Users affected">
          <input type="number" min={0} className="input" value={usersAffected} onChange={(e) => setUsersAffected(Number(e.target.value))} />
        </Field>
      </div>
    </Modal>
  )
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Incident detail modal                                               */
/* ------------------------------------------------------------------ */
function IncidentModal({ incident: i, onClose }: { incident: Incident; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="my-4 w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink-900">Incident Details</h2>
              <span className="font-mono text-sm text-ink-500">{i.id}</span>
            </div>
            <p className="mt-0.5 text-sm text-ink-500">Full incident timeline and root cause analysis</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Title + risk */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-ink-900">{i.title}</h3>
              <p className="mt-1 text-sm text-ink-600">{i.desc}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium text-ink-500">Risk Score</p>
              <p className={`text-3xl font-bold tabular-nums ${riskColor(i.riskScore)}`}>{i.riskScore}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={i.severity} />
            <Badge tone={statusBadge[i.status]}>{i.status}</Badge>
            <Badge tone="slate">{i.app}</Badge>
            <Badge tone="blue">{i.model}</Badge>
            <Badge tone="purple">{i.customer}</Badge>
          </div>

          {/* Impact */}
          <section>
            <h4 className="mb-2 text-sm font-semibold text-ink-900">Impact Assessment</h4>
            <div className="grid grid-cols-3 gap-3">
              <ImpactCard label="Users Affected" value={i.usersAffected} tone="rose" />
              <ImpactCard label="Requests Impacted" value={i.requestsImpacted} tone="amber" />
              <ImpactCard label="Data Exposure" value={i.dataExposure ? 'YES' : 'NO'} tone={i.dataExposure ? 'rose' : 'emerald'} />
            </div>
          </section>

          {/* Timeline */}
          <section>
            <h4 className="mb-3 text-sm font-semibold text-ink-900">Incident Timeline</h4>
            <ol className="relative space-y-5 border-l border-slate-200 pl-5">
              {i.timeline.map((e, idx) => (
                <li key={idx} className="relative">
                  <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${phaseDot[e.phase]}`} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="slate">{e.phase}</Badge>
                    <span className="text-xs text-ink-500">{e.time}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-ink-900">{e.text}</p>
                  <p className="text-xs text-ink-500">by {e.by}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Root cause */}
          <section>
            <h4 className="mb-2 text-sm font-semibold text-ink-900">Root Cause Analysis</h4>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{i.rootCause}</div>
          </section>

          {/* Remediation */}
          <section>
            <h4 className="mb-2 text-sm font-semibold text-ink-900">Remediation Actions</h4>
            <ol className="list-inside list-decimal space-y-1 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-mono text-[13px] text-emerald-900">
              {i.remediation.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}

function ImpactCard({ label, value, tone }: { label: string; value: string | number; tone: 'rose' | 'amber' | 'emerald' }) {
  const map = {
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
  return (
    <div className={`rounded-xl border p-3 ${map[tone]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Other tabs                                                          */
/* ------------------------------------------------------------------ */
const violations = [
  { time: '2026-07-06 10:42', pack: 'PII Redaction Standard', rule: 'redact-email', model: 'GPT-4 Turbo', customer: 'Meridian Bank', action: 'Redacted', severity: 'High' as Severity },
  { time: '2026-07-06 09:18', pack: 'Prompt Injection Defense', rule: 'block-exfiltration', model: 'Llama 3.1 70B', customer: 'Northwind Retail', action: 'Blocked', severity: 'High' as Severity },
  { time: '2026-07-05 22:03', pack: 'Content Safety Filter', rule: 'harm-threshold', model: 'Claude Opus 4', customer: 'Helix Health', action: 'Blocked', severity: 'Critical' as Severity },
  { time: '2026-07-05 17:55', pack: 'Financial Services Guardrails', rule: 'advice-disclaimer', model: 'GPT-4 Turbo', customer: 'Vertex Capital', action: 'Flagged', severity: 'Medium' as Severity },
  { time: '2026-07-05 14:22', pack: 'HIPAA PHI Protection', rule: 'phi-deidentify', model: 'MedVision-CT', customer: 'Helix Health', action: 'Redacted', severity: 'High' as Severity },
  { time: '2026-07-05 08:40', pack: 'Bias & Fairness Monitor', rule: 'parity-threshold', model: 'FraudScan-v2', customer: 'Pinecrest Insurance', action: 'Flagged', severity: 'Medium' as Severity },
]

const actionTone: Record<string, 'red' | 'orange' | 'yellow'> = { Blocked: 'red', Redacted: 'orange', Flagged: 'yellow' }
type Violation = (typeof violations)[number]

function PolicyViolations() {
  const [sel, setSel] = useState<Violation | null>(null)
  return (
    <Card>
      <CardTitle title="Policy Violations" subtitle="Enforcement events across all customers in the last 24 hours" />
      <Table columns={['Time', 'Policy Pack', 'Rule', 'Model', 'Customer', 'Action', 'Severity', '']}>
        {violations.map((v, idx) => (
          <Tr key={idx}>
            <Td className="whitespace-nowrap text-xs text-ink-500">{v.time}</Td>
            <Td className="font-medium text-ink-900">{v.pack}</Td>
            <Td><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-ink-600">{v.rule}</span></Td>
            <Td className="text-ink-700">{v.model}</Td>
            <Td className="text-ink-700">{v.customer}</Td>
            <Td><Badge tone={actionTone[v.action]}>{v.action}</Badge></Td>
            <Td><SeverityBadge severity={v.severity} /></Td>
            <Td>
              <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label="View violation" onClick={() => setSel(v)}>
                <Eye className="h-4 w-4" />
              </button>
            </Td>
          </Tr>
        ))}
      </Table>

      {sel && (
        <Modal open onClose={() => setSel(null)} title="Policy Violation" subtitle={`${sel.pack} · ${sel.time}`} headerRight={<Badge tone={actionTone[sel.action]}>{sel.action}</Badge>}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <SeverityBadge severity={sel.severity} />
              <Badge tone="slate">{sel.model}</Badge>
              <Badge tone="purple">{sel.customer}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KV label="Policy pack" value={sel.pack} />
              <KV label="Rule" value={sel.rule} mono />
              <KV label="Model" value={sel.model} />
              <KV label="Enforcement action" value={sel.action} />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink-900">Matched content</p>
              <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-[12px] text-slate-100">{`{
  "rule": "${sel.rule}",
  "match": "${sel.pack.toLowerCase().includes('pii') ? 'jane.doe@meridian.com' : sel.pack.toLowerCase().includes('injection') ? 'ignore previous instructions and…' : 'flagged content span'}",
  "action": "${sel.action.toLowerCase()}",
  "confidence": 0.94
}`}</pre>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 font-semibold text-ink-900 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  )
}

const riskRows = [
  { model: 'FraudScan-v2', customer: 'Vertex Capital', score: 92, trend: '+6', band: 'Critical' },
  { model: 'MedVision-CT', customer: 'Helix Health', score: 81, trend: '+3', band: 'High' },
  { model: 'GPT-4 Turbo', customer: 'Meridian Bank', score: 64, trend: '−2', band: 'Medium' },
  { model: 'Claude Opus 4', customer: 'Helix Health', score: 38, trend: '−1', band: 'Low' },
  { model: 'Llama 3.1 70B', customer: 'Northwind Retail', score: 52, trend: '+1', band: 'Medium' },
]

type RiskRow = (typeof riskRows)[number]
const bandTone = (band: string) => (band === 'Critical' ? 'red' : band === 'High' ? 'orange' : band === 'Medium' ? 'yellow' : 'green') as 'red' | 'orange' | 'yellow' | 'green'
const riskFactors = [
  { factor: 'Policy violations (30d)', weight: 'High' },
  { factor: 'Fairness / bias drift', weight: 'Medium' },
  { factor: 'Open incidents', weight: 'High' },
  { factor: 'Data sensitivity', weight: 'Medium' },
  { factor: 'Model transparency', weight: 'Low' },
]

function RiskScores() {
  const [sel, setSel] = useState<RiskRow | null>(null)
  return (
    <Card>
      <CardTitle
        title="Model Risk Scores"
        subtitle="Composite risk across policy, drift, and incident signals"
        action={<Badge tone="slate"><Gauge className="h-3 w-3" /> 0–100 scale</Badge>}
      />
      <Table columns={['Model', 'Customer', 'Risk Score', 'Band', '7-day Δ', '']}>
        {riskRows.map((r) => (
          <Tr key={r.model}>
            <Td className="font-semibold text-ink-900">{r.model}</Td>
            <Td className="text-ink-700">{r.customer}</Td>
            <Td>
              <div className="flex items-center gap-3">
                <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${r.score >= 80 ? 'bg-rose-500' : r.score >= 60 ? 'bg-orange-500' : r.score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${r.score}%` }}
                  />
                </div>
                <span className={`text-sm font-bold tabular-nums ${riskColor(r.score)}`}>{r.score}</span>
              </div>
            </Td>
            <Td><Badge tone={bandTone(r.band)}>{r.band}</Badge></Td>
            <Td className={r.trend.startsWith('+') ? 'text-rose-600' : 'text-emerald-600'}>{r.trend}</Td>
            <Td>
              <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label="View risk breakdown" onClick={() => setSel(r)}>
                <Eye className="h-4 w-4" />
              </button>
            </Td>
          </Tr>
        ))}
      </Table>

      {sel && (
        <Modal open onClose={() => setSel(null)} title={sel.model} subtitle={`Risk breakdown · ${sel.customer}`} headerRight={<Badge tone={bandTone(sel.band)}>{sel.band}</Badge>}>
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-xs font-medium text-ink-500">Composite risk score</p>
                <p className={`text-3xl font-bold tabular-nums ${riskColor(sel.score)}`}>{sel.score}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs font-medium text-ink-500">7-day change</p>
                <p className={`text-lg font-semibold ${sel.trend.startsWith('+') ? 'text-rose-600' : 'text-emerald-600'}`}>{sel.trend}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-900">Contributing factors</p>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {riskFactors.map((f) => (
                  <div key={f.factor} className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-ink-700">{f.factor}</span>
                    <Badge tone={f.weight === 'High' ? 'red' : f.weight === 'Medium' ? 'orange' : 'slate'}>{f.weight}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  )
}

const workflows = [
  { name: 'Critical Incident Response', icon: ShieldAlert, stage: 'Remediation', owner: 'dana.cole@plcy.app', progress: 75, tone: 'orange' as const },
  { name: 'Model Deployment Approval', icon: GitBranch, stage: 'Security Review', owner: 'marcus.ihde@plcy.app', progress: 40, tone: 'blue' as const },
  { name: 'Quarterly Risk Review', icon: Gauge, stage: 'Evidence Collection', owner: 'priya.nair@plcy.app', progress: 20, tone: 'purple' as const },
  { name: 'Postmortem — INC-2026-003', icon: TriangleAlert, stage: 'Complete', owner: 'priya.nair@plcy.app', progress: 100, tone: 'green' as const },
]

type Workflow = (typeof workflows)[number]
const workflowSteps = ['Detection & intake', 'Triage & severity', 'Investigation', 'Remediation', 'Review & sign-off']

function GovernanceWorkflows() {
  const [sel, setSel] = useState<Workflow | null>(null)
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {workflows.map((w) => {
        const Icon = w.icon
        return (
          <button key={w.name} className="text-left" onClick={() => setSel(w)}>
            <Card className="transition-shadow hover:shadow-cardhover">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-ink-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink-900">{w.name}</p>
                    <p className="text-xs text-ink-500">Owner · {w.owner}</p>
                  </div>
                </div>
                <Badge tone={w.tone} dot>{w.stage}</Badge>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-ink-500">
                  <span>Progress</span>
                  <span className="font-medium text-ink-700">{w.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${w.progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${w.progress}%` }} />
                </div>
              </div>
            </Card>
          </button>
        )
      })}

      {sel && (
        <Modal open onClose={() => setSel(null)} title={sel.name} subtitle={`Owner · ${sel.owner}`} headerRight={<Badge tone={sel.tone} dot>{sel.stage}</Badge>}>
          <div className="space-y-5">
            <div>
              <div className="mb-1 flex justify-between text-xs text-ink-500">
                <span>Overall progress</span>
                <span className="font-medium text-ink-700">{sel.progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${sel.progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${sel.progress}%` }} />
              </div>
            </div>
            <ol className="space-y-3">
              {workflowSteps.map((step, idx) => {
                const done = (idx + 1) / workflowSteps.length <= sel.progress / 100
                const current = !done && idx / workflowSteps.length < sel.progress / 100
                return (
                  <li key={step} className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${done ? 'bg-emerald-500 text-white' : current ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500' : 'bg-slate-100 text-slate-400'}`}>
                      {done ? '✓' : idx + 1}
                    </span>
                    <span className={`text-sm ${done || current ? 'text-ink-900' : 'text-ink-400'}`}>{step}</span>
                    {current && <Badge tone="blue">In progress</Badge>}
                  </li>
                )
              })}
            </ol>
          </div>
        </Modal>
      )}
    </div>
  )
}

const noticeTone: Record<string, 'green' | 'orange' | 'red' | 'slate'> = {
  Filed: 'green',
  Pending: 'orange',
  Overdue: 'red',
  'Not required': 'slate',
}

type RegNotice = (typeof regNotices)[number]

function RegulatoryNotifications() {
  const [sel, setSel] = useState<RegNotice | null>(null)
  return (
    <Card>
      <CardTitle
        title="Regulatory Notifications"
        subtitle="Reporting obligations triggered by incidents"
        action={<Badge tone="slate"><Landmark className="h-3 w-3" /> Compliance</Badge>}
      />
      <Table columns={['Regulator', 'Incident', 'Requirement', 'Deadline', 'Status', '']}>
        {regNotices.map((n, idx) => (
          <Tr key={idx}>
            <Td className="font-semibold text-ink-900">{n.regulator}</Td>
            <Td className="font-mono text-xs text-ink-500">{n.incident}</Td>
            <Td className="text-ink-700">{n.requirement}</Td>
            <Td className="whitespace-nowrap text-xs text-ink-500">{n.deadline}</Td>
            <Td><Badge tone={noticeTone[n.status]} dot>{n.status}</Badge></Td>
            <Td>
              <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" aria-label="View notification" onClick={() => setSel(n)}>
                <Eye className="h-4 w-4" />
              </button>
            </Td>
          </Tr>
        ))}
      </Table>

      {sel && (
        <Modal
          open
          onClose={() => setSel(null)}
          title={sel.regulator}
          subtitle={`Obligation for ${sel.incident}`}
          headerRight={<Badge tone={noticeTone[sel.status]} dot>{sel.status}</Badge>}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setSel(null)}>Close</button>
              <button className="btn-primary" disabled={sel.status === 'Filed' || sel.status === 'Not required'}>
                {sel.status === 'Filed' ? 'Filed' : 'Mark as filed'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <KV label="Regulator" value={sel.regulator} />
              <KV label="Linked incident" value={sel.incident} mono />
              <KV label="Requirement" value={sel.requirement} />
              <KV label="Deadline" value={sel.deadline} />
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              {sel.status === 'Filed'
                ? 'This notification has been filed with the regulator. Evidence is attached to the incident record.'
                : sel.status === 'Not required'
                ? 'Assessment concluded this obligation does not apply to the linked incident.'
                : `This obligation is pending. Prepare and file the "${sel.requirement}" before the deadline.`}
            </div>
          </div>
        </Modal>
      )}
    </Card>
  )
}
