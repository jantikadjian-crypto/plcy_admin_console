import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Server,
  Bot,
  Gauge,
  Receipt,
  ShieldCheck,
  Activity,
  DollarSign,
  Users,
  Cpu,
  Boxes,
  Globe,
  ArrowLeftRight,
  Inbox,
  Fingerprint,
  AlertOctagon,
  Building2,
  CheckCircle2,
  Pencil,
  Save,
  X,
  CreditCard,
  Landmark,
  Banknote,
  FileText,
  Plus,
  Star,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Lock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Card,
  CardTitle,
  StatCard,
  Badge,
  StatusBadge,
  Table,
  Tr,
  Td,
  Progress,
  Avatar,
  EmptyState,
  Modal,
} from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useCustomerScope } from '@/context/CustomerScope'
import { useCustomers } from '@/context/Customers'
import { instances, models, incidents, fmtMoney, fmtCompact, fmtNum, customerChannels } from '@/data/mock'
import type { Customer } from '@/data/mock'
import { ContactChannels } from '@/components/ContactChannels'
import type { ChannelConfig } from '@/data/notifications'
import { billingByCustomer, invoices, paymentByCustomer, billingContactByCustomer } from '@/data/billing'
import type { PaymentMethod, PaymentType, PaymentStatus, BillingContact } from '@/data/billing'

const PLANS: Customer['plan'][] = ['Enterprise', 'Business', 'Growth', 'Trial']
const STATUSES: Customer['status'][] = ['Active', 'Trial', 'Suspended', 'Churned']
const REGIONS = ['US-East', 'US-West', 'EU-Central', 'EU-West', 'APAC']
const CSMS = ['Dana Cole', 'Marcus Ihde', 'Priya Nair']
import { deploymentByCustomer } from '@/data/fleet'
import { slaByCustomer, maintenanceWindows } from '@/data/sla'
import { transfers, dsarRequests, accessRequests } from '@/data/privacy'

const planTone: Record<Customer['plan'], 'purple' | 'blue' | 'green' | 'slate'> = {
  Enterprise: 'purple',
  Business: 'blue',
  Growth: 'green',
  Trial: 'slate',
}

const sevTone: Record<string, 'red' | 'orange' | 'yellow' | 'slate'> = {
  Critical: 'red',
  High: 'orange',
  Medium: 'yellow',
  Low: 'slate',
}

const invoiceTone: Record<string, 'green' | 'blue' | 'red' | 'slate'> = {
  Paid: 'green',
  Open: 'blue',
  'Past due': 'red',
  Draft: 'slate',
}

const slaStatusTone: Record<string, 'green' | 'orange' | 'red'> = {
  Meeting: 'green',
  'At risk': 'orange',
  Breached: 'red',
}

const windowStatusTone: Record<string, 'blue' | 'orange' | 'green' | 'slate'> = {
  Scheduled: 'blue',
  'In progress': 'orange',
  Completed: 'green',
  Cancelled: 'slate',
}

const compTextTone = (n: number) =>
  n >= 90 ? 'text-emerald-600' : n >= 80 ? 'text-blue-600' : n >= 70 ? 'text-orange-600' : 'text-rose-600'
const compBarTone = (n: number): 'green' | 'blue' | 'orange' | 'red' =>
  n >= 90 ? 'green' : n >= 80 ? 'blue' : n >= 70 ? 'orange' : 'red'

const money = (n: number) => `$${n.toLocaleString()}`
function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1)}K`
  return `${n}`
}

type Tab = 'overview' | 'deployment' | 'models' | 'sla' | 'billing' | 'compliance' | 'activity'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { audit, can, logAction } = useSession()
  const { setScope } = useCustomerScope()
  const { get, update } = useCustomers()
  const [tab, setTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Customer>>({})
  const [methods, setMethods] = useState<PaymentMethod[]>(() => paymentByCustomer(get(id ?? '')?.name ?? ''))
  const [payOpen, setPayOpen] = useState(false)
  const [contact, setContact] = useState<BillingContact | undefined>(() => billingContactByCustomer(get(id ?? '')?.name ?? ''))
  const [editingContact, setEditingContact] = useState(false)
  const [contactDraft, setContactDraft] = useState<BillingContact | null>(null)
  // Re-seed payment methods and billing contact when the route switches customer.
  useEffect(() => {
    const nm = get(id ?? '')?.name ?? ''
    setMethods(paymentByCustomer(nm))
    setContact(billingContactByCustomer(nm))
    setEditingContact(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const customer = get(id ?? '')

  if (!customer) {
    return (
      <Card>
        <EmptyState
          icon={Building2}
          title="Customer not found"
          description="This organization is not in the PLCY platform."
        />
        <div className="mt-4 flex justify-center">
          <Link to="/customers" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to customers
          </Link>
        </div>
      </Card>
    )
  }

  const c = customer
  const name = c.name
  const dep = deploymentByCustomer(name)
  const custInstances = instances.filter((i) => i.customer === name)
  const custModels = models.filter((m) => m.customer === name)
  const sla = slaByCustomer(name)
  const windows = maintenanceWindows.filter((w) => w.customer === name || w.customer === 'All')
  const billing = billingByCustomer(name)
  const custInvoices = invoices.filter((i) => i.customer === name)
  const custIncidents = incidents.filter((i) => i.customer === name)
  const custTransfers = transfers.filter((t) => t.customer === name)
  const custDsar = dsarRequests.filter((d) => d.customer === name)
  const custAccess = accessRequests.filter((a) => a.customer === name)
  const custAudit = audit.filter((a) => a.target.toLowerCase().includes(name.toLowerCase()))

  const upInstances = custInstances.filter((i) => i.uptime > 0)
  const avgUptime = upInstances.length ? upInstances.reduce((s, i) => s + i.uptime, 0) / upInstances.length : 0
  const openIncidents = custIncidents.filter((i) => i.status !== 'Resolved').length
  const openDsar = custDsar.filter((d) => d.status !== 'Completed').length

  const canEdit = can('customer.manage')
  const setField = (patch: Partial<Customer>) => setDraft((d) => ({ ...d, ...patch }))
  const startEdit = () => {
    setDraft({
      name: c.name,
      domain: c.domain,
      plan: c.plan,
      status: c.status,
      region: c.region,
      csm: c.csm,
      seats: c.seats,
      mrr: c.mrr,
      notes: c.notes ?? '',
    })
    setTab('overview')
    setEditing(true)
  }
  const cancelEdit = () => setEditing(false)
  const saveEdit = () => {
    update(c.id, draft)
    logAction({ action: 'customer.update', target: c.name, category: 'customer' })
    setEditing(false)
  }
  const saveChannel = (updated: ChannelConfig) => {
    const next = customerChannels(c).map((ch) => (ch.id === updated.id ? updated : ch))
    update(c.id, { channels: next })
    logAction({ action: 'customer.channel.update', target: `${c.name} · ${updated.type}`, category: 'customer' })
  }

  const canEditBilling = can('license.manage')
  const setContactField = (patch: Partial<BillingContact>) => setContactDraft((d) => (d ? { ...d, ...patch } : d))
  const startContactEdit = () => {
    if (!contact) return
    setContactDraft({ ...contact, address: [...contact.address] })
    setEditingContact(true)
  }
  const cancelContactEdit = () => setEditingContact(false)
  const saveContact = () => {
    if (contactDraft) {
      setContact({ ...contactDraft, address: contactDraft.address.filter((l) => l.trim() !== '') })
      logAction({ action: 'billing.contact.update', target: name, category: 'billing' })
    }
    setEditingContact(false)
  }
  const addCard = (pm: PaymentMethod) => {
    setMethods((prev) => [...prev.map((m) => (pm.isDefault ? { ...m, isDefault: false } : m)), pm])
    logAction({ action: 'payment.method.add', target: `${pm.brand} •••• ${pm.last4} · ${name}`, category: 'billing' })
    setPayOpen(false)
  }
  const setDefaultMethod = (pmId: string) => {
    const pm = methods.find((m) => m.id === pmId)
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === pmId })))
    if (pm) logAction({ action: 'payment.method.set-default', target: `${pm.brand} •••• ${pm.last4} · ${name}`, category: 'billing' })
  }
  const removeMethod = (pmId: string) => {
    const pm = methods.find((m) => m.id === pmId)
    setMethods((prev) => prev.filter((m) => m.id !== pmId))
    if (pm) logAction({ action: 'payment.method.remove', target: `${pm.brand} •••• ${pm.last4} · ${name}`, category: 'billing' })
  }

  const tabs: { key: Tab; label: string; icon: LucideIcon; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: Gauge },
    { key: 'deployment', label: 'Deployment', icon: Server, count: custInstances.length },
    { key: 'models', label: 'Models', icon: Bot, count: custModels.length },
    { key: 'sla', label: 'SLA & Uptime', icon: ShieldCheck },
    { key: 'billing', label: 'Billing', icon: Receipt, count: custInvoices.length },
    { key: 'compliance', label: 'Compliance', icon: Globe, count: custTransfers.length + custDsar.length },
    { key: 'activity', label: 'Activity', icon: Activity, count: custIncidents.length },
  ]

  return (
    <>
      {/* Breadcrumb + header */}
      <Link to="/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" />
        Customers
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name} className="h-14 w-14 text-base" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink-900">{name}</h1>
              <Badge tone={planTone[c.plan]}>{c.plan}</Badge>
              <StatusBadge status={c.status} />
            </div>
            <p className="mt-1 text-sm text-ink-500">
              {c.domain} · {c.region} · CSM {c.csm} · since {c.since}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          {editing ? (
            <>
              <button className="btn-secondary" onClick={cancelEdit}>
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button className="btn-primary" onClick={saveEdit}>
                <Save className="h-4 w-4" />
                Save changes
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => { setScope(name); navigate('/instances') }}>
                <Building2 className="h-4 w-4" />
                Set as current customer
              </button>
              {canEdit && (
                <button className="btn-primary" onClick={startEdit}>
                  <Pencil className="h-4 w-4" />
                  Edit profile
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stat row */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR" value={fmtMoney(c.mrr)} icon={DollarSign} tone="blue" footer={`${c.plan} plan`} />
        <StatCard label="Seats" value={fmtNum(c.seats)} icon={Users} tone="purple" footer="Licensed" />
        <StatCard label="Compliance" value={`${c.complianceScore}%`} icon={ShieldCheck} tone={compBarTone(c.complianceScore) === 'red' ? 'red' : 'green'} footer="Posture score" />
        <StatCard label="Uptime (MTD)" value={avgUptime ? `${avgUptime.toFixed(2)}%` : '—'} icon={Gauge} tone="orange" footer={sla ? `${sla.tier} SLA` : 'No SLA'} />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                active ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-ink-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        {/* -------------------- Overview -------------------- */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardTitle
                title="Profile"
                subtitle="Account record — editable"
                action={
                  !editing && canEdit ? (
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={startEdit}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  ) : undefined
                }
              />
              {editing ? (
                <ProfileForm draft={draft} setField={setField} />
              ) : (
                <ProfileView c={c} />
              )}
            </Card>

            <Card>
              <CardTitle title="Deployment" subtitle="Single-tenant environment" />
              {dep ? (
                <dl className="grid grid-cols-2 gap-4">
                  <Fact label="Version" value={dep.version === dep.target ? dep.version : `${dep.version} → ${dep.target}`} />
                  <Fact label="Rollout" value={<StatusBadge status={dep.status} />} />
                  <Fact label="Connectivity" value={<Badge tone={dep.connectivity === 'Air-gapped' ? 'purple' : 'blue'}>{dep.connectivity}</Badge>} />
                  <Fact label="Sovereignty" value={dep.sovereignty} />
                  <Fact label="Region" value={dep.regionCode} />
                  <Fact label="Nodes" value={`${dep.nodes} (${dep.gpuNodes} GPU)`} />
                </dl>
              ) : (
                <p className="text-sm text-ink-400">No deployment on record.</p>
              )}
            </Card>

            <Card>
              <CardTitle title="Service level" subtitle="Commitments & health" />
              {sla ? (
                <dl className="grid grid-cols-2 gap-4">
                  <Fact label="Tier" value={sla.tier} />
                  <Fact label="Status" value={<Badge tone={slaStatusTone[sla.status]} dot>{sla.status}</Badge>} />
                  <Fact label="Uptime target" value={`${sla.uptimeTarget}%`} />
                  <Fact label="Uptime MTD" value={<span className={compTextTone(sla.status === 'Breached' ? 60 : 95)}>{sla.uptimeMtd}%</span>} />
                  <Fact label="Breaches (MTD)" value={String(sla.breachesMtd)} />
                  <Fact label="Credits owed" value={sla.creditsOwed > 0 ? money(sla.creditsOwed) : '—'} />
                </dl>
              ) : (
                <p className="text-sm text-ink-400">No SLA on record.</p>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <CardTitle title="At a glance" subtitle="Governed footprint & open items" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MiniStat icon={Server} label="Instances" value={custInstances.length} />
                <MiniStat icon={Bot} label="Models" value={custModels.length} />
                <MiniStat icon={AlertOctagon} label="Open incidents" value={openIncidents} tone={openIncidents ? 'text-rose-600' : undefined} />
                <MiniStat icon={Inbox} label="Open DSARs" value={openDsar} tone={openDsar ? 'text-orange-600' : undefined} />
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardTitle title="Notification Contacts" subtitle="Where alerts about this customer are sent · click a channel to configure it" />
              <ContactChannels channels={customerChannels(c)} canEdit={canEdit} onSave={saveChannel} />
            </Card>
          </div>
        )}

        {/* -------------------- Deployment -------------------- */}
        {tab === 'deployment' && (
          <div className="space-y-6">
            {dep && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Cluster nodes" value={dep.nodes} icon={Cpu} tone="blue" footer={`${dep.gpuNodes} GPU · K8s ${dep.k8sVersion}`} />
                <StatCard label="Pods healthy" value={`${dep.podsHealthy}/${dep.podsTotal}`} icon={Boxes} tone="green" footer="Running" />
                <StatCard label="CPU / Mem" value={`${dep.cpuPct}% / ${dep.memPct}%`} icon={Activity} tone="orange" footer="Utilization" />
                <StatCard label="License" value={dep.license.plan} icon={ShieldCheck} tone="purple" footer={`${dep.license.seatsUsed}/${dep.license.seats} seats · ${dep.license.status}`} />
              </div>
            )}
            <Card>
              <CardTitle title="Instances" subtitle="Deployed environments" />
              {custInstances.length === 0 ? (
                <EmptyState icon={Server} title="No instances" description="This customer has no deployed environments." />
              ) : (
                <Table columns={['Instance', 'Environment', 'Region', 'Version', 'Uptime', 'RPS', 'Status']}>
                  {custInstances.map((i) => (
                    <Tr key={i.id}>
                      <Td className="font-mono text-xs text-ink-900">{i.name}</Td>
                      <Td className="text-ink-700">{i.environment}</Td>
                      <Td className="font-mono text-xs text-ink-600">{i.region}</Td>
                      <Td className="font-mono text-xs text-ink-600">{i.version}</Td>
                      <Td className="text-ink-700">{i.uptime > 0 ? `${i.uptime}%` : '—'}</Td>
                      <Td className="text-ink-700">{fmtNum(i.rps)}</Td>
                      <Td><StatusBadge status={i.status} /></Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* -------------------- Models -------------------- */}
        {tab === 'models' && (
          <Card>
            <CardTitle title="Governed Models" subtitle="AI models under PLCY policy enforcement" />
            {custModels.length === 0 ? (
              <EmptyState icon={Bot} title="No models" description="This customer has no models under governance." />
            ) : (
              <Table columns={['Model', 'Provider', 'Type', 'Requests', 'Risk', 'Status']}>
                {custModels.map((m) => (
                  <Tr key={m.id}>
                    <Td className="font-semibold text-ink-900">{m.name}</Td>
                    <Td className="text-ink-700">{m.provider}</Td>
                    <Td className="text-ink-700">{m.type}</Td>
                    <Td className="text-ink-700">{fmtCompact(m.requests)}</Td>
                    <Td><Badge tone={m.risk === 'High' ? 'red' : m.risk === 'Medium' ? 'orange' : 'green'}>{m.risk}</Badge></Td>
                    <Td><StatusBadge status={m.status} /></Td>
                  </Tr>
                ))}
              </Table>
            )}
          </Card>
        )}

        {/* -------------------- SLA -------------------- */}
        {tab === 'sla' && (
          <div className="space-y-6">
            {sla ? (
              <Card>
                <CardTitle title="SLA Attainment" subtitle={`${sla.tier} tier`} action={<Badge tone={slaStatusTone[sla.status]} dot>{sla.status}</Badge>} />
                <div className="mb-4">
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink-700">Uptime, month-to-date</span>
                    <span className="font-mono">
                      <span className="font-bold text-ink-900">{sla.uptimeMtd}%</span>
                      <span className="mx-1.5 text-ink-400">/ target</span>
                      <span className="text-ink-600">{sla.uptimeTarget}%</span>
                    </span>
                  </div>
                  <Progress value={Math.min(100, Math.max(0, ((sla.uptimeMtd - (sla.uptimeTarget - 0.5)) / 0.5) * 100))} tone={slaStatusTone[sla.status]} />
                </div>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Fact label="Response" value={sla.responseTarget} />
                  <Fact label="Restore" value={sla.restoreTarget} />
                  <Fact label="Breaches (MTD)" value={String(sla.breachesMtd)} />
                  <Fact label="Credits owed" value={sla.creditsOwed > 0 ? <span className="text-rose-600">{money(sla.creditsOwed)}</span> : '—'} />
                </dl>
              </Card>
            ) : (
              <Card><EmptyState icon={ShieldCheck} title="No SLA" description="This customer has no service-level agreement on record." /></Card>
            )}

            <Card>
              <CardTitle title="Maintenance Windows" subtitle="Planned changes affecting this customer" />
              {windows.length === 0 ? (
                <EmptyState icon={Gauge} title="None scheduled" description="No upcoming maintenance." />
              ) : (
                <Table columns={['Window', 'When', 'Type', 'Impact', 'Notified', 'Status']}>
                  {windows.map((w) => (
                    <Tr key={w.id}>
                      <Td>
                        <div className="font-semibold text-ink-900">{w.title}</div>
                        {w.customer === 'All' && <Badge tone="blue">Fleet-wide</Badge>}
                      </Td>
                      <Td className="whitespace-nowrap font-mono text-xs text-ink-600">{w.start}</Td>
                      <Td><Badge tone="slate">{w.type}</Badge></Td>
                      <Td className="text-ink-700">{w.impact}</Td>
                      <Td>{w.notified ? <Badge tone="green" dot>Yes</Badge> : <Badge tone="slate">No</Badge>}</Td>
                      <Td><Badge tone={windowStatusTone[w.status]} dot>{w.status}</Badge></Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* -------------------- Billing -------------------- */}
        {tab === 'billing' && (
          <div className="space-y-6">
            <Card>
              <CardTitle
                title="Payment Methods"
                subtitle="How this customer pays — masked to the last 4"
                action={
                  canEdit ? (
                    <GatedButton cap="license.manage" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => setPayOpen(true)}>
                      <Plus className="h-3.5 w-3.5" />
                      Add card
                    </GatedButton>
                  ) : undefined
                }
              />
              {methods.length === 0 ? (
                <EmptyState icon={CreditCard} title="No payment method" description="No payment method on file for this customer." />
              ) : (
                <div className="space-y-2">
                  {methods.map((m) => (
                    <PaymentRow
                      key={m.id}
                      m={m}
                      canEdit={canEdit}
                      onSetDefault={() => setDefaultMethod(m.id)}
                      onRemove={() => removeMethod(m.id)}
                    />
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-ink-400">
                <Lock className="h-3 w-3" />
                Secured by Stripe{contact ? ` · ${contact.processorId}` : ''}
              </div>
            </Card>

            {contact && (
              <Card>
                <CardTitle
                  title="Billing Contact"
                  subtitle="Accounts-payable contact & remittance address"
                  action={
                    !editingContact && canEditBilling ? (
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={startContactEdit}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    ) : undefined
                  }
                />
                {editingContact && contactDraft ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <EditField label="Contact name">
                        <input className="input" value={contactDraft.name} onChange={(e) => setContactField({ name: e.target.value })} />
                      </EditField>
                      <EditField label="Email">
                        <input className="input" type="email" value={contactDraft.email} onChange={(e) => setContactField({ email: e.target.value })} />
                      </EditField>
                      <EditField label="Phone">
                        <input className="input" value={contactDraft.phone} onChange={(e) => setContactField({ phone: e.target.value })} />
                      </EditField>
                    </div>
                    <EditField label="Remittance address (one line per row)">
                      <textarea
                        className="input min-h-[90px]"
                        value={contactDraft.address.join('\n')}
                        onChange={(e) => setContactField({ address: e.target.value.split('\n') })}
                        placeholder={'400 Park Avenue\nNew York, NY 10022\nUnited States'}
                      />
                    </EditField>
                    <div className="flex justify-end gap-2">
                      <button className="btn-secondary" onClick={cancelContactEdit}>
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                      <button className="btn-primary" onClick={saveContact}>
                        <Save className="h-4 w-4" />
                        Save contact
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-ink-900">{contact.name}</p>
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-brand-700 hover:underline">
                        <Mail className="h-4 w-4 shrink-0 text-ink-400" />
                        {contact.email}
                      </a>
                      <p className="flex items-center gap-2 text-sm text-ink-700">
                        <Phone className="h-4 w-4 shrink-0 text-ink-400" />
                        {contact.phone}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-ink-700">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                      <address className="not-italic leading-relaxed">
                        {contact.address.map((line) => (
                          <span key={line} className="block">{line}</span>
                        ))}
                      </address>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {billing && (
              <Card>
                <CardTitle title="Usage this cycle" subtitle="Metered consumption against plan-included volumes" action={billing.overage > 0 ? <Badge tone="orange">+{money(billing.overage)} overage</Badge> : undefined} />
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  {billing.meters.map((m) => {
                    const pct = (m.used / m.included) * 100
                    return (
                      <div key={m.label}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-ink-700">{m.label}</span>
                          <span className="whitespace-nowrap font-mono text-xs text-ink-500">
                            {m.unit === '' ? compact(m.used) : `${m.used.toLocaleString()} ${m.unit}`}
                            <span className="mx-1 text-ink-400">/</span>
                            {m.unit === '' ? compact(m.included) : `${m.included.toLocaleString()} ${m.unit}`}
                          </span>
                        </div>
                        <Progress value={pct} tone={pct >= 100 ? 'red' : pct >= 85 ? 'orange' : 'blue'} />
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
            <Card>
              <CardTitle title="Invoices" subtitle="Billing history" />
              {custInvoices.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices" description="No billing activity for this customer." />
              ) : (
                <Table columns={['Invoice', 'Period', 'Amount', 'Status', 'Due']}>
                  {custInvoices.map((inv) => (
                    <Tr key={inv.id}>
                      <Td className="font-mono text-xs text-ink-700">{inv.id}</Td>
                      <Td className="text-ink-700">{inv.period}</Td>
                      <Td className="font-medium text-ink-900">{money(inv.amount)}</Td>
                      <Td><Badge tone={invoiceTone[inv.status]} dot>{inv.status}</Badge></Td>
                      <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{inv.due}</Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* -------------------- Compliance -------------------- */}
        {tab === 'compliance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardTitle title="Posture" subtitle="Compliance & data residency" />
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs font-medium text-ink-500">Compliance score</p>
                    <p className={`text-4xl font-bold tabular-nums ${compTextTone(c.complianceScore)}`}>{c.complianceScore}%</p>
                  </div>
                  <div className="flex-1">
                    <Progress value={c.complianceScore} tone={compBarTone(c.complianceScore)} />
                  </div>
                </div>
                {dep && (
                  <dl className="mt-5 grid grid-cols-2 gap-4">
                    <Fact label="Sovereignty" value={dep.sovereignty} />
                    <Fact label="Connectivity" value={<Badge tone={dep.connectivity === 'Air-gapped' ? 'purple' : 'blue'}>{dep.connectivity}</Badge>} />
                    <Fact label="Data residency" value={dep.regionCode} />
                    <Fact label="Region" value={c.region} />
                  </dl>
                )}
              </Card>
              <Card>
                <CardTitle title="Privileged Access" subtitle="Engineer access to this tenant" />
                {custAccess.length === 0 ? (
                  <EmptyState icon={Fingerprint} title="No access requests" description="No privileged access recorded." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {custAccess.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-900">{a.engineer}</p>
                          <p className="truncate text-xs text-ink-500">{a.scope} · {a.reason}</p>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card>
              <CardTitle title="Data Transfers" subtitle="Cross-border transfer register" />
              {custTransfers.length === 0 ? (
                <EmptyState icon={ArrowLeftRight} title="No transfers" description="No cross-border data transfers on record." />
              ) : (
                <Table columns={['ID', 'From', 'To', 'Data', 'Mechanism', 'Status']}>
                  {custTransfers.map((t) => (
                    <Tr key={t.id}>
                      <Td className="font-mono text-xs text-ink-700">{t.id}</Td>
                      <Td className="font-mono text-xs text-ink-600">{t.from}</Td>
                      <Td className="font-mono text-xs text-ink-600">{t.to}</Td>
                      <Td className="text-ink-700">{t.dataCategory}</Td>
                      <Td className="text-ink-700">{t.mechanism}</Td>
                      <Td><StatusBadge status={t.status} /></Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>

            <Card>
              <CardTitle title="Data-Subject Requests" subtitle="DSARs for this customer" />
              {custDsar.length === 0 ? (
                <EmptyState icon={Inbox} title="No DSARs" description="No data-subject requests on record." />
              ) : (
                <Table columns={['ID', 'Type', 'Law', 'Received', 'Due', 'Status']}>
                  {custDsar.map((d) => (
                    <Tr key={d.id}>
                      <Td className="font-mono text-xs text-ink-700">{d.id}</Td>
                      <Td className="text-ink-700">{d.type}</Td>
                      <Td className="text-ink-700">{d.law}</Td>
                      <Td className="font-mono text-xs text-ink-500">{d.received}</Td>
                      <Td className="font-mono text-xs text-ink-500">{d.due}</Td>
                      <Td><StatusBadge status={d.status} /></Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* -------------------- Activity -------------------- */}
        {tab === 'activity' && (
          <div className="space-y-6">
            <Card>
              <CardTitle title="Incidents" subtitle="Governance & reliability events" />
              {custIncidents.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No incidents" description="No incidents recorded for this customer." />
              ) : (
                <Table columns={['ID', 'Title', 'Severity', 'Category', 'Opened', 'Status']}>
                  {custIncidents.map((i) => (
                    <Tr key={i.id}>
                      <Td className="font-mono text-xs text-ink-700">{i.id}</Td>
                      <Td className="font-medium text-ink-900">{i.title}</Td>
                      <Td><Badge tone={sevTone[i.severity]}>{i.severity}</Badge></Td>
                      <Td className="text-ink-700">{i.category}</Td>
                      <Td className="whitespace-nowrap font-mono text-xs text-ink-500">{i.opened}</Td>
                      <Td><StatusBadge status={i.status} /></Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>

            <Card>
              <CardTitle title="Audit Trail" subtitle="Recent actions referencing this customer" />
              {custAudit.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-400">No audit entries reference this customer yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {custAudit.slice(0, 12).map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.result === 'Denied' ? 'bg-rose-500' : 'bg-brand-500'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink-800"><span className="font-medium">{a.action}</span> · {a.target}</p>
                        <p className="text-xs text-ink-400">{a.actor} · {a.time}</p>
                      </div>
                      <Badge tone={a.result === 'Denied' ? 'red' : 'green'}>{a.result}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>

      <AddCardModal open={payOpen} onClose={() => setPayOpen(false)} onAdd={addCard} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Payment methods                                                     */
/* ------------------------------------------------------------------ */
const payIcon: Record<PaymentType, LucideIcon> = {
  Card: CreditCard,
  Bank: Landmark,
  Wire: Banknote,
  Invoice: FileText,
}
const payStatusTone: Record<PaymentStatus, 'green' | 'orange' | 'red'> = {
  Active: 'green',
  Expiring: 'orange',
  Expired: 'red',
}

function PaymentRow({
  m,
  canEdit,
  onSetDefault,
  onRemove,
}: {
  m: PaymentMethod
  canEdit: boolean
  onSetDefault: () => void
  onRemove: () => void
}) {
  const Icon = payIcon[m.type]
  const masked = m.last4 ? `•••• ${m.last4}` : m.type
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-ink-600">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-ink-900">{m.brand}</p>
          {m.last4 && <span className="font-mono text-sm text-ink-600">{masked}</span>}
          {m.isDefault && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
              <Star className="h-3 w-3" /> Default
            </span>
          )}
        </div>
        <p className="text-xs text-ink-500">
          {m.exp ? `Expires ${m.exp}` : m.type}
          {m.detail ? ` · ${m.detail}` : ''}
        </p>
      </div>
      <Badge tone={payStatusTone[m.status]} dot>{m.status}</Badge>
      {canEdit && (
        <div className="flex items-center gap-1">
          {!m.isDefault && (
            <button
              onClick={onSetDefault}
              title="Set as default"
              className="rounded-md px-2 py-1 text-xs font-medium text-ink-500 transition-colors hover:bg-slate-100 hover:text-ink-800"
            >
              Set default
            </button>
          )}
          <button
            onClick={onRemove}
            aria-label="Remove payment method"
            title="Remove"
            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

const CARD_BRANDS = ['Visa', 'Mastercard', 'Amex', 'Discover']

function AddCardModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (pm: PaymentMethod) => void }) {
  const [brand, setBrand] = useState('Visa')
  const [last4, setLast4] = useState('')
  const [exp, setExp] = useState('')
  const [makeDefault, setMakeDefault] = useState(false)
  const counter = useRef(0)

  const valid = /^\d{4}$/.test(last4) && /^\d{2}\/\d{2}$/.test(exp)

  const submit = () => {
    if (!valid) return
    counter.current += 1
    onAdd({
      id: `pm_new_${counter.current}`,
      type: 'Card',
      brand,
      last4,
      exp,
      isDefault: makeDefault,
      status: 'Active',
    })
    setBrand('Visa'); setLast4(''); setExp(''); setMakeDefault(false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add payment card"
      subtitle="Only the last 4 digits are stored"
      maxWidth="max-w-md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!valid}>
            <Plus className="h-4 w-4" />
            Add card
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">Card network</label>
          <select className="input" value={brand} onChange={(e) => setBrand(e.target.value)}>
            {CARD_BRANDS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Last 4 digits</label>
            <input className="input" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4242" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Expiry (MM/YY)</label>
            <input className="input" value={exp} onChange={(e) => setExp(e.target.value)} placeholder="08/27" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          Set as default payment method
        </label>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink-900">{value}</dd>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <Icon className="h-5 w-5 text-ink-400" />
      <p className={`mt-2 text-2xl font-bold ${tone ?? 'text-ink-900'}`}>{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  )
}

function ProfileView({ c }: { c: Customer }) {
  const facts: { label: string; value: React.ReactNode }[] = [
    { label: 'Domain', value: c.domain },
    { label: 'Plan', value: c.plan },
    { label: 'Status', value: c.status },
    { label: 'Region', value: c.region },
    { label: 'Assigned CSM', value: c.csm },
    { label: 'Seats', value: fmtNum(c.seats) },
    { label: 'MRR', value: fmtMoney(c.mrr) },
    { label: 'Customer since', value: c.since },
  ]
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {facts.map((f) => (
          <Fact key={f.label} label={f.label} value={f.value} />
        ))}
      </dl>
      <div>
        <p className="text-xs font-medium text-ink-500">Notes</p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-700">
          {c.notes?.trim() ? c.notes : <span className="text-ink-400">No notes.</span>}
        </p>
      </div>
    </div>
  )
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-600">{label}</label>
      {children}
    </div>
  )
}

function ProfileForm({ draft, setField }: { draft: Partial<Customer>; setField: (p: Partial<Customer>) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <EditField label="Organization name">
        <input className="input" value={draft.name ?? ''} onChange={(e) => setField({ name: e.target.value })} />
      </EditField>
      <EditField label="Domain">
        <input className="input" value={draft.domain ?? ''} onChange={(e) => setField({ domain: e.target.value })} />
      </EditField>
      <EditField label="Plan">
        <select className="input" value={draft.plan} onChange={(e) => setField({ plan: e.target.value as Customer['plan'] })}>
          {PLANS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </EditField>
      <EditField label="Status">
        <select className="input" value={draft.status} onChange={(e) => setField({ status: e.target.value as Customer['status'] })}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </EditField>
      <EditField label="Region">
        <select className="input" value={draft.region} onChange={(e) => setField({ region: e.target.value })}>
          {[...new Set([draft.region ?? '', ...REGIONS])].filter(Boolean).map((r) => <option key={r}>{r}</option>)}
        </select>
      </EditField>
      <EditField label="Assigned CSM">
        <select className="input" value={draft.csm} onChange={(e) => setField({ csm: e.target.value })}>
          {[...new Set([draft.csm ?? '', ...CSMS])].filter(Boolean).map((m) => <option key={m}>{m}</option>)}
        </select>
      </EditField>
      <EditField label="Seats">
        <input type="number" min={0} className="input" value={draft.seats ?? 0} onChange={(e) => setField({ seats: Number(e.target.value) })} />
      </EditField>
      <EditField label="MRR (USD)">
        <input type="number" min={0} step={500} className="input" value={draft.mrr ?? 0} onChange={(e) => setField({ mrr: Number(e.target.value) })} />
      </EditField>
      <div className="sm:col-span-2 lg:col-span-4">
        <EditField label="Notes">
          <textarea
            className="input min-h-[80px]"
            value={draft.notes ?? ''}
            onChange={(e) => setField({ notes: e.target.value })}
            placeholder="Account context, renewal notes, key contacts…"
          />
        </EditField>
      </div>
    </div>
  )
}
