import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Clock,
  UserCircle,
  Radio,
  ScrollText,
  Pencil,
  Save,
  X,
  Ban,
  RotateCw,
  KeyRound,
  CheckCircle2,
  XCircle,
  Lock,
} from 'lucide-react'
import { Card, CardTitle, PageHeader, Badge, Avatar, EmptyState } from '@/components/ui'
import { ContactChannels } from '@/components/ContactChannels'
import { useSession } from '@/context/Session'
import { useEmployees } from '@/context/Employees'
import { departmentMeta, DEPARTMENTS, activityFor, employeeChannels } from '@/data/team'
import type { Employee, Department, EmployeeStatus, OnCallTier } from '@/data/team'
import type { ChannelConfig } from '@/data/notifications'
import { roleDefs, roleIconTone, iconFor, currentUser } from '@/data/roles'
import { EAccessRole } from '@/data/access'
import { CAPABILITIES, roleCapabilities } from '@/data/permissions'

const statusTone: Record<EmployeeStatus, 'green' | 'blue' | 'red'> = { Active: 'green', Invited: 'blue', Suspended: 'red' }
const TIERS: OnCallTier[] = ['Primary', 'Secondary', 'Manager', 'Backup', 'None']
const roleOf = (id: EAccessRole) => roleDefs.find((r) => r.id === id)

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can, logAction, audit } = useSession()
  const { get, update } = useEmployees()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Employee | null>(null)

  const emp = get(id ?? '')
  if (!emp) {
    return (
      <Card>
        <EmptyState icon={UserCircle} title="Employee not found" description="This person is not in the directory." />
        <div className="mt-4 flex justify-center"><Link to="/team" className="btn-secondary"><ArrowLeft className="h-4 w-4" />Back to Team</Link></div>
      </Card>
    )
  }

  const canManage = can('access.approve')
  const view = editing && draft ? draft : emp
  const setField = (patch: Partial<Employee>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const setOnCall = (patch: Partial<Employee['onCall']>) => setDraft((d) => (d ? { ...d, onCall: { ...d.onCall, ...patch } } : d))

  const startEdit = () => { setDraft(JSON.parse(JSON.stringify(emp)) as Employee); setEditing(true) }
  const cancel = () => setEditing(false)
  const save = () => {
    if (draft) {
      const accessChanged = draft.roleId !== emp.roleId
      update(emp.id, draft)
      logAction({ action: accessChanged ? 'employee.access.update' : 'employee.update', target: `${emp.name}${accessChanged ? ` → ${roleOf(draft.roleId)?.name}` : ''}`, category: 'team' })
    }
    setEditing(false)
  }
  const setStatus = (status: EmployeeStatus) => {
    update(emp.id, { status })
    logAction({ action: `employee.${status === 'Suspended' ? 'suspend' : 'reactivate'}`, target: emp.name, category: 'team' })
  }
  const resetMfa = () => {
    update(emp.id, { mfa: false })
    logAction({ action: 'employee.mfa.reset', target: emp.name, category: 'team' })
  }
  const saveChannel = (updated: ChannelConfig) => {
    const next = employeeChannels(emp).map((c) => (c.id === updated.id ? updated : c))
    update(emp.id, { channels: next })
    logAction({ action: 'employee.channel.update', target: `${emp.name} · ${updated.type}`, category: 'team' })
  }

  const dm = departmentMeta(view.department)
  const role = roleOf(view.roleId)
  const RoleIcon = iconFor(role?.iconKey ?? 'key')
  const isYou = emp.email === currentUser.email
  const caps = roleCapabilities(view.roleId)
  const liveActivity = audit.filter((a) => a.actor === emp.email).map((a) => ({ action: a.action, target: a.target, category: a.category, result: a.result, time: a.time }))
  const activity = [...liveActivity, ...activityFor(emp.email)]

  return (
    <>
      <Link to="/team" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" />Team
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {emp.name}
            {isYou && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">You</span>}
            <Badge tone={statusTone[view.status]} dot>{view.status}</Badge>
          </span>
        }
        description={`${emp.title} · ${emp.department}`}
        actions={
          editing ? (
            <div className="flex items-center gap-2">
              <button className="btn-secondary" onClick={cancel}><X className="h-4 w-4" />Cancel</button>
              <button className="btn-primary" onClick={save}><Save className="h-4 w-4" />Save changes</button>
            </div>
          ) : (
            canManage && (
              <div className="flex flex-wrap items-center gap-2">
                {emp.mfa && <button className="btn-ghost text-ink-500" onClick={resetMfa}><KeyRound className="h-4 w-4" />Reset MFA</button>}
                {emp.status === 'Suspended' ? (
                  <button className="btn-secondary" onClick={() => setStatus('Active')}><RotateCw className="h-4 w-4" />Reactivate</button>
                ) : (
                  <button className="btn-secondary text-rose-600" onClick={() => setStatus('Suspended')}><Ban className="h-4 w-4" />Suspend</button>
                )}
                <button className="btn-primary" onClick={startEdit}><Pencil className="h-4 w-4" />Edit</button>
              </div>
            )
          )
        }
      />

      {/* Identity band */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <Avatar name={emp.name} className="h-16 w-16 text-lg" />
        <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2">
          <Contact icon={Mail} value={emp.email} href={`mailto:${emp.email}`} />
          <Contact icon={Phone} value={view.phone} />
          <Contact icon={MapPin} value={view.location} />
          <Contact icon={Clock} value={view.timezone} />
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={dm.tone}>{view.department}</Badge>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${roleIconTone[role?.tone ?? 'slate']}`}>
            <RoleIcon className="h-3.5 w-3.5" />
            {role?.name}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardTitle title="Profile & Access" subtitle="Role, department, and account controls" />
          {editing ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <F label="Title"><input className="input" value={draft!.title} onChange={(e) => setField({ title: e.target.value })} /></F>
              <F label="Department">
                <select className="input" value={draft!.department} onChange={(e) => setField({ department: e.target.value as Department })}>
                  {DEPARTMENTS.map((d) => <option key={d.key}>{d.key}</option>)}
                </select>
              </F>
              <F label="Access level">
                <select className="input" value={draft!.roleId} onChange={(e) => setField({ roleId: e.target.value as EAccessRole })}>
                  {roleDefs.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </F>
              <F label="Status">
                <select className="input" value={draft!.status} onChange={(e) => setField({ status: e.target.value as EmployeeStatus })}>
                  {(['Active', 'Invited', 'Suspended'] as EmployeeStatus[]).map((s) => <option key={s}>{s}</option>)}
                </select>
              </F>
              <F label="Phone"><input className="input" value={draft!.phone} onChange={(e) => setField({ phone: e.target.value })} /></F>
              <F label="Location"><input className="input" value={draft!.location} onChange={(e) => setField({ location: e.target.value })} /></F>
              <F label="Timezone"><input className="input" value={draft!.timezone} onChange={(e) => setField({ timezone: e.target.value })} /></F>
              <F label="Manager"><input className="input" value={draft!.manager} onChange={(e) => setField({ manager: e.target.value })} /></F>
              <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div><p className="text-sm font-semibold text-ink-900">MFA enrolled</p><p className="text-xs text-ink-500">Require a second factor</p></div>
                <button onClick={() => setField({ mfa: !draft!.mfa })} aria-pressed={draft!.mfa} className={`inline-flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${draft!.mfa ? 'justify-end bg-brand-600' : 'justify-start bg-slate-300'}`}><span className="h-5 w-5 rounded-full bg-white shadow-sm" /></button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <KV label="Access level" value={role?.name ?? view.roleId} />
              <KV label="Department" value={view.department} />
              <KV label="Manager" value={view.manager} />
              <KV label="Status" value={view.status} />
              <KV label="MFA" value={view.mfa ? 'Enabled' : 'Not enrolled'} />
              <KV label="Started" value={view.startDate} />
            </dl>
          )}
        </Card>

        {/* On-call / PagerDuty */}
        <Card>
          <CardTitle
            title="On-Call · PagerDuty"
            subtitle="Paging schedule & escalation"
            action={<Radio className={`h-5 w-5 ${view.onCall.enabled ? 'text-orange-500' : 'text-ink-300'}`} />}
          />
          {editing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div><p className="text-sm font-semibold text-ink-900">On-call enabled</p><p className="text-xs text-ink-500">Include in PagerDuty rotation</p></div>
                <button onClick={() => setOnCall({ enabled: !draft!.onCall.enabled })} aria-pressed={draft!.onCall.enabled} className={`inline-flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${draft!.onCall.enabled ? 'justify-end bg-brand-600' : 'justify-start bg-slate-300'}`}><span className="h-5 w-5 rounded-full bg-white shadow-sm" /></button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <F label="Tier">
                  <select className="input" value={draft!.onCall.tier} onChange={(e) => setOnCall({ tier: e.target.value as OnCallTier })} disabled={!draft!.onCall.enabled}>
                    {TIERS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </F>
                <F label="PagerDuty service"><input className="input" value={draft!.onCall.pagerDutyService} onChange={(e) => setOnCall({ pagerDutyService: e.target.value })} disabled={!draft!.onCall.enabled} /></F>
                <F label="Schedule"><input className="input" value={draft!.onCall.schedule} onChange={(e) => setOnCall({ schedule: e.target.value })} disabled={!draft!.onCall.enabled} /></F>
                <F label="Paging number"><input className="input" value={draft!.onCall.phone} onChange={(e) => setOnCall({ phone: e.target.value })} disabled={!draft!.onCall.enabled} /></F>
              </div>
            </div>
          ) : view.onCall.enabled ? (
            <dl className="grid grid-cols-2 gap-4">
              <KV label="Tier" value={view.onCall.tier} />
              <KV label="Service" value={view.onCall.pagerDutyService} />
              <KV label="Schedule" value={view.onCall.schedule} />
              <KV label="Paging number" value={view.onCall.phone} />
            </dl>
          ) : (
            <EmptyState icon={Radio} title="Not on-call" description="This employee is not in a PagerDuty rotation." />
          )}
        </Card>
      </div>

      {/* Contact channels */}
      <Card className="mt-6">
        <CardTitle title="Contact Channels" subtitle="How this person is reached for alerts & paging · click a channel to configure it" />
        <ContactChannels channels={employeeChannels(emp)} canEdit={canManage} onSave={saveChannel} columns={3} />
      </Card>

      {/* Permissions */}
      <Card className="mt-6">
        <CardTitle title="Effective Permissions" subtitle={`What the ${role?.name} access level grants in this console`} />
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => {
            const granted = caps.includes(c.key)
            return (
              <div key={c.key} className="flex items-center gap-2">
                {granted ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="h-4 w-4 shrink-0 text-slate-300" />}
                <span className={`text-sm ${granted ? 'text-ink-700' : 'text-slate-400'}`}>{c.label}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-400">
          <Lock className="h-3 w-3" /> Permissions come from the access level. Change it in Profile & Access, or in Settings → Roles.
        </p>
      </Card>

      {/* Activity */}
      <Card className="mt-6">
        <CardTitle title="Activity" subtitle="What this employee has done · from the audit trail" action={<ScrollText className="h-5 w-5 text-ink-300" />} />
        {activity.length === 0 ? (
          <EmptyState icon={ScrollText} title="No recorded activity" description="Nothing attributed to this employee yet." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.map((a, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.result === 'Denied' ? 'bg-rose-500' : 'bg-brand-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-800"><span className="font-medium">{a.action}</span> · {a.target}</p>
                  <p className="text-xs text-ink-400">{a.category} · {a.time}</p>
                </div>
                <Badge tone={a.result === 'Denied' ? 'red' : 'green'}>{a.result}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

function Contact({ icon: Icon, value, href }: { icon: typeof Mail; value: string; href?: string }) {
  const body = (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink-700">
      <Icon className="h-4 w-4 shrink-0 text-ink-400" />
      {value}
    </span>
  )
  return href ? <a href={href} className="hover:text-brand-700 hover:underline">{body}</a> : body
}
function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink-900">{value}</dd>
    </div>
  )
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  )
}
