import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserPlus, Fingerprint, Radio, Search, ChevronRight } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Table, Tr, Td, Avatar, Modal, EmptyState } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useEmployees } from '@/context/Employees'
import { DEPARTMENTS, departmentMeta } from '@/data/team'
import type { Employee, Department, EmployeeStatus } from '@/data/team'
import { roleDefs } from '@/data/roles'
import { EAccessRole } from '@/data/access'

const statusTone: Record<EmployeeStatus, 'green' | 'blue' | 'red'> = { Active: 'green', Invited: 'blue', Suspended: 'red' }
const roleName = (id: EAccessRole) => roleDefs.find((r) => r.id === id)?.name ?? id
const roleTone = (id: EAccessRole) => roleDefs.find((r) => r.id === id)?.tone ?? 'slate'

export default function Team() {
  const navigate = useNavigate()
  const { list, add } = useEmployees()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState<'All' | Department>('All')
  const [status, setStatus] = useState<'All' | EmployeeStatus>('All')
  const [adding, setAdding] = useState(false)

  const query = q.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      list.filter((e) => {
        const mq = !query || [e.name, e.email, e.title].some((f) => f.toLowerCase().includes(query))
        const md = dept === 'All' || e.department === dept
        const ms = status === 'All' || e.status === status
        return mq && md && ms
      }),
    [list, query, dept, status],
  )

  const onCallNow = list.filter((e) => e.onCall.enabled && e.status === 'Active').length
  const mfaPct = list.length ? Math.round((list.filter((e) => e.mfa).length / list.length) * 100) : 0
  const invited = list.filter((e) => e.status === 'Invited').length

  return (
    <>
      <PageHeader
        title="Team"
        description="PLCY staff — access levels, on-call, and activity"
        actions={
          <GatedButton cap="access.approve" className="btn-primary" onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" />
            Add employee
          </GatedButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Headcount" value={list.length} icon={Users} tone="blue" footer={`${DEPARTMENTS.length} departments`} />
        <StatCard label="On-call now" value={onCallNow} icon={Radio} tone="orange" footer="Active PagerDuty" />
        <StatCard label="MFA enrolled" value={`${mfaPct}%`} icon={Fingerprint} tone="green" footer={`${list.filter((e) => !e.mfa).length} pending`} />
        <StatCard label="Pending invites" value={invited} icon={UserPlus} tone="purple" footer="Awaiting onboarding" />
      </div>

      {/* Filters */}
      <Card className="mt-6" padded={false}>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9" placeholder="Search by name, email, or title…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input w-auto" value={dept} onChange={(e) => setDept(e.target.value as 'All' | Department)} aria-label="Filter by department">
            <option value="All">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d.key}>{d.key}</option>)}
          </select>
          <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as 'All' | EmployeeStatus)} aria-label="Filter by status">
            <option value="All">All statuses</option>
            {(['Active', 'Invited', 'Suspended'] as EmployeeStatus[]).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      <Card className="mt-6">
        <CardTitle title="Employees" subtitle={`${filtered.length} of ${list.length} · click to open`} />
        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="No matches" description="Try a different search or filter." />
        ) : (
          <Table columns={['Name', 'Department', 'Access level', 'On-call', 'MFA', 'Status', 'Last active', '']} noun="people">
            {filtered.map((e) => {
              const dm = departmentMeta(e.department)
              return (
                <Tr key={e.id} onClick={() => navigate(`/team/${e.id}`)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={e.name} />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900">{e.name}</p>
                        <p className="text-xs text-ink-500">{e.title} · {e.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><Badge tone={dm.tone}>{e.department}</Badge></Td>
                  <Td><Badge tone={roleTone(e.roleId)}>{roleName(e.roleId)}</Badge></Td>
                  <Td>
                    {e.onCall.enabled ? <Badge tone="orange" dot>{e.onCall.tier}</Badge> : <span className="text-xs text-ink-400">—</span>}
                  </Td>
                  <Td>{e.mfa ? <Badge tone="green" dot>On</Badge> : <Badge tone="red" dot>Off</Badge>}</Td>
                  <Td><Badge tone={statusTone[e.status]} dot>{e.status}</Badge></Td>
                  <Td className="whitespace-nowrap text-xs text-ink-500">{e.lastActive}</Td>
                  <Td><ChevronRight className="h-4 w-4 text-ink-300" /></Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </Card>

      <AddEmployeeModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreate={(emp) => {
          add(emp)
          setAdding(false)
          navigate(`/team/${emp.id}`)
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Add employee                                                        */
/* ------------------------------------------------------------------ */
function AddEmployeeModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (e: Employee) => void }) {
  const { logAction } = useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState<Department>('Engineering')
  const [roleId, setRoleId] = useState<EAccessRole>(EAccessRole.Engineer)
  const counter = useRef(0)

  const reset = () => { setName(''); setEmail(''); setTitle(''); setDepartment('Engineering'); setRoleId(EAccessRole.Engineer) }

  const submit = () => {
    if (!name.trim()) return
    counter.current += 1
    const emp: Employee = {
      id: `emp_new_${counter.current}`,
      name: name.trim(),
      email: email.trim() || `${name.trim().toLowerCase().replace(/[^a-z]+/g, '.')}@plcy.app`,
      title: title.trim() || 'Team member',
      department,
      roleId,
      status: 'Invited',
      mfa: false,
      phone: '—',
      location: '—',
      timezone: '—',
      startDate: '2026-07-08',
      manager: 'Jack Antikadjian',
      lastActive: 'Never',
      onCall: { enabled: false, tier: 'None', schedule: '—', pagerDutyService: '—', phone: '—' },
    }
    logAction({ action: 'employee.invite', target: `${emp.name} · ${roleName(roleId)}`, category: 'team' })
    onCreate(emp)
    reset()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add employee"
      subtitle="Invite a team member and set their access level"
      maxWidth="max-w-lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <GatedButton cap="access.approve" className="btn-primary" onClick={submit} disabled={!name.trim()}>
            <UserPlus className="h-4 w-4" />
            Send invite
          </GatedButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" full>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" />
        </Field>
        <Field label="Email">
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@plcy.app" />
        </Field>
        <Field label="Title">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Software Engineer" />
        </Field>
        <Field label="Department">
          <select
            className="input"
            value={department}
            onChange={(e) => {
              const d = e.target.value as Department
              setDepartment(d)
              setRoleId(departmentMeta(d).defaultRole)
            }}
          >
            {DEPARTMENTS.map((d) => <option key={d.key}>{d.key}</option>)}
          </select>
        </Field>
        <Field label="Access level">
          <select className="input" value={roleId} onChange={(e) => setRoleId(e.target.value as EAccessRole)}>
            {roleDefs.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  )
}
