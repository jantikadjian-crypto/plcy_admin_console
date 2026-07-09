/**
 * PLCY internal staff directory. Each employee has an access level (an
 * EAccessRole), a department, contact + on-call (PagerDuty) details, and an
 * activity trail. This is the people side of the console — who works here, what
 * they can do, and what they've done.
 */
import { Crown, Wrench, Headset, Calculator, ShieldCheck, Megaphone, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EAccessRole } from './access'
import type { ChannelConfig } from './notifications'

export type Department =
  | 'Executive'
  | 'Engineering'
  | 'Customer Success'
  | 'Finance'
  | 'Security & Compliance'
  | 'Developer Relations'
  | 'Data & Analytics'

export type EmployeeStatus = 'Active' | 'Invited' | 'Suspended'
export type OnCallTier = 'Primary' | 'Secondary' | 'Manager' | 'Backup' | 'None'

export interface OnCall {
  enabled: boolean
  tier: OnCallTier
  schedule: string
  pagerDutyService: string
  phone: string
}

export interface Employee {
  id: string
  name: string
  email: string
  title: string
  department: Department
  roleId: EAccessRole
  status: EmployeeStatus
  mfa: boolean
  phone: string
  location: string
  timezone: string
  startDate: string
  manager: string
  lastActive: string
  onCall: OnCall
  /** How this person is reached for alerts & paging. Defaults derived if unset. */
  channels?: ChannelConfig[]
}

/** Per-employee contact channels — stored edits if present, else derived from their record. */
export function employeeChannels(emp: Employee): ChannelConfig[] {
  if (emp.channels && emp.channels.length) return emp.channels
  const handle = '@' + emp.email.split('@')[0].replace(/\./g, '')
  return [
    { id: `${emp.id}_email`, type: 'Email', target: emp.email, endpoint: '', desc: 'Primary email', connected: true },
    { id: `${emp.id}_slack`, type: 'Slack', target: handle, endpoint: '', desc: 'Slack direct message', connected: true },
    { id: `${emp.id}_pd`, type: 'PagerDuty', target: emp.onCall.enabled ? emp.onCall.pagerDutyService : '—', endpoint: '', desc: 'PagerDuty responder', connected: emp.onCall.enabled },
  ]
}

export interface DepartmentMeta {
  key: Department
  icon: LucideIcon
  tone: 'purple' | 'red' | 'green' | 'orange' | 'blue' | 'slate' | 'yellow'
  defaultRole: EAccessRole
}

export const DEPARTMENTS: DepartmentMeta[] = [
  { key: 'Executive', icon: Crown, tone: 'purple', defaultRole: EAccessRole.Superuser },
  { key: 'Engineering', icon: Wrench, tone: 'red', defaultRole: EAccessRole.Engineer },
  { key: 'Customer Success', icon: Headset, tone: 'green', defaultRole: EAccessRole.CSUser },
  { key: 'Finance', icon: Calculator, tone: 'orange', defaultRole: EAccessRole.Billing },
  { key: 'Security & Compliance', icon: ShieldCheck, tone: 'blue', defaultRole: EAccessRole.Analyst },
  { key: 'Developer Relations', icon: Megaphone, tone: 'slate', defaultRole: EAccessRole.DevAdvocate },
  { key: 'Data & Analytics', icon: BarChart3, tone: 'yellow', defaultRole: EAccessRole.Analyst },
]
export const departmentMeta = (d: Department) => DEPARTMENTS.find((x) => x.key === d) ?? DEPARTMENTS[0]

const noOnCall: OnCall = { enabled: false, tier: 'None', schedule: '—', pagerDutyService: '—', phone: '—' }

export const employeesSeed: Employee[] = [
  {
    id: 'emp_jack', name: 'Jack Antikadjian', email: 'jack@plcy.app', title: 'Founder & CEO', department: 'Executive', roleId: EAccessRole.Superuser,
    status: 'Active', mfa: true, phone: '+1 415 555 0100', location: 'San Francisco, CA', timezone: 'PT', startDate: '2022-01-04', manager: '—', lastActive: '2 min ago',
    onCall: { enabled: true, tier: 'Manager', schedule: 'Escalation owner', pagerDutyService: 'PLCY · Executive', phone: '+1 415 555 0100' },
  },
  {
    id: 'emp_dana', name: 'Dana Cole', email: 'dana.cole@plcy.app', title: 'Head of Customer Success', department: 'Customer Success', roleId: EAccessRole.CSAdmin,
    status: 'Active', mfa: true, phone: '+1 512 555 0142', location: 'Austin, TX', timezone: 'CT', startDate: '2022-06-13', manager: 'Jack Antikadjian', lastActive: '18 min ago',
    onCall: { enabled: true, tier: 'Primary', schedule: 'Jul 7 – Jul 14', pagerDutyService: 'PLCY On-Call · P1', phone: '+1 512 555 0142' },
  },
  {
    id: 'emp_marcus', name: 'Marcus Ihde', email: 'marcus.ihde@plcy.app', title: 'Staff Platform Engineer', department: 'Engineering', roleId: EAccessRole.Engineer,
    status: 'Active', mfa: true, phone: '+1 206 555 0188', location: 'Seattle, WA', timezone: 'PT', startDate: '2022-03-21', manager: 'Jack Antikadjian', lastActive: '1 hour ago',
    onCall: { enabled: true, tier: 'Secondary', schedule: 'Jul 7 – Jul 14', pagerDutyService: 'PLCY On-Call · P1', phone: '+1 206 555 0188' },
  },
  {
    id: 'emp_priya', name: 'Priya Nair', email: 'priya.nair@plcy.app', title: 'Compliance & CS Lead', department: 'Security & Compliance', roleId: EAccessRole.CSUser,
    status: 'Active', mfa: true, phone: '+1 917 555 0164', location: 'New York, NY', timezone: 'ET', startDate: '2023-02-01', manager: 'Jack Antikadjian', lastActive: '3 hours ago',
    onCall: { enabled: true, tier: 'Manager', schedule: 'Escalation owner', pagerDutyService: 'PLCY Compliance', phone: '+1 917 555 0164' },
  },
  {
    id: 'emp_nora', name: 'Nora Fields', email: 'nora.fields@plcy.app', title: 'Controller', department: 'Finance', roleId: EAccessRole.Billing,
    status: 'Active', mfa: true, phone: '+1 646 555 0121', location: 'New York, NY', timezone: 'ET', startDate: '2023-05-15', manager: 'Jack Antikadjian', lastActive: '40 min ago',
    onCall: noOnCall,
  },
  {
    id: 'emp_sofia', name: 'Sofia Alvarez', email: 'sofia.alvarez@plcy.app', title: 'Data & Model Analyst', department: 'Data & Analytics', roleId: EAccessRole.Analyst,
    status: 'Active', mfa: false, phone: '+1 305 555 0199', location: 'Miami, FL', timezone: 'ET', startDate: '2023-09-05', manager: 'Marcus Ihde', lastActive: '2 days ago',
    onCall: noOnCall,
  },
  {
    id: 'emp_liang', name: 'Liang Wei', email: 'liang.wei@plcy.app', title: 'Senior Backend Engineer', department: 'Engineering', roleId: EAccessRole.Engineer,
    status: 'Active', mfa: true, phone: '+65 8555 0177', location: 'Singapore', timezone: 'SGT', startDate: '2023-11-20', manager: 'Marcus Ihde', lastActive: '25 min ago',
    onCall: { enabled: true, tier: 'Backup', schedule: 'APAC follow-the-sun', pagerDutyService: 'PLCY On-Call · APAC', phone: '+65 8555 0177' },
  },
  {
    id: 'emp_tom', name: 'Tom Becker', email: 'tom.becker@plcy.app', title: 'Developer Advocate', department: 'Developer Relations', roleId: EAccessRole.DevAdvocate,
    status: 'Suspended', mfa: false, phone: '+1 503 555 0133', location: 'Portland, OR', timezone: 'PT', startDate: '2024-01-08', manager: 'Dana Cole', lastActive: '11 days ago',
    onCall: noOnCall,
  },
  {
    id: 'emp_ana', name: 'Ana Duarte', email: 'ana.duarte@plcy.app', title: 'CS Agent', department: 'Customer Success', roleId: EAccessRole.CSUser,
    status: 'Invited', mfa: false, phone: '—', location: 'Lisbon, PT', timezone: 'WET', startDate: '2026-07-08', manager: 'Dana Cole', lastActive: 'Never',
    onCall: noOnCall,
  },
]

/** Seeded activity per employee (merged with the live audit trail by email). */
export interface EmpAction {
  action: string
  target: string
  category: string
  result: 'Success' | 'Denied'
  time: string
}
export const employeeActivity: Record<string, EmpAction[]> = {
  'jack@plcy.app': [
    { action: 'access.breakglass.approve', target: 'Helix Health · helix-prod', category: 'access', result: 'Success', time: '2026-07-08 07:12:40' },
    { action: 'release.ship-bundle', target: 'v4.8.2 → de-sov-1', category: 'fleet', result: 'Success', time: '2026-07-07 21:03:11' },
    { action: 'cluster.config.update', target: 'Meridian Bank cluster', category: 'operations', result: 'Success', time: '2026-07-07 18:44:02' },
  ],
  'dana.cole@plcy.app': [
    { action: 'customer.create', target: 'Aurora Systems', category: 'customer', result: 'Success', time: '2026-07-07 07:40:10' },
    { action: 'invoice.mark-paid', target: 'INV-2026-0706', category: 'billing', result: 'Success', time: '2026-07-06 15:22:41' },
    { action: 'transfer.approve', target: 'TR-2019', category: 'sovereignty', result: 'Success', time: '2026-07-06 11:05:08' },
  ],
  'marcus.ihde@plcy.app': [
    { action: 'bulkop.upgrade.start', target: '9 environments → v4.8.2', category: 'fleet', result: 'Success', time: '2026-07-07 09:15:33' },
    { action: 'residency.policy.update', target: 'region residency policies', category: 'sovereignty', result: 'Denied', time: '2026-07-05 14:02:19' },
  ],
  'priya.nair@plcy.app': [
    { action: 'dsar.advance', target: 'DSAR-4821', category: 'privacy', result: 'Success', time: '2026-07-07 10:31:52' },
    { action: 'maintenance.schedule', target: 'Quarterly DR failover test', category: 'operations', result: 'Success', time: '2026-07-06 09:12:00' },
  ],
  'nora.fields@plcy.app': [
    { action: 'invoice.issue', target: 'INV-2026-0712 · Meridian Bank', category: 'billing', result: 'Success', time: '2026-07-07 08:02:30' },
    { action: 'payment.method.add', target: 'Visa •••• 4242 · Meridian Bank', category: 'billing', result: 'Success', time: '2026-07-06 16:40:11' },
  ],
  'sofia.alvarez@plcy.app': [
    { action: 'model.register', target: 'FraudScan-v3', category: 'action', result: 'Denied', time: '2026-07-05 12:18:44' },
  ],
}
export const activityFor = (email: string): EmpAction[] => employeeActivity[email] ?? []
