/**
 * Managed-device (device-trust) registry behind Settings → Security → "Require
 * managed devices". A device becomes Trusted by enrolling — the console issues a
 * one-time code, the device installs a certificate / registers with MDM, checks
 * in, and continuously passes a posture check. When enforcement is on, only
 * Trusted devices can reach the console. Persisted to localStorage so enroll /
 * revoke survive a reload.
 */
export type DevicePlatform = 'macOS' | 'Windows' | 'iOS' | 'Android' | 'Linux'
export type DeviceStatus = 'Trusted' | 'Pending' | 'At risk' | 'Blocked'
export type MdmProvider = 'Jamf' | 'Intune' | 'Kandji' | 'None'

export interface PostureChecks {
  encryption: boolean
  osCurrent: boolean
  screenLock: boolean
  notJailbroken: boolean
  mdmManaged: boolean
}

export interface ManagedDevice {
  id: string
  name: string
  owner: string
  platform: DevicePlatform
  osVersion: string
  mdm: MdmProvider
  status: DeviceStatus
  lastSeen: string
  enrolledAt: string
  checks: PostureChecks
}

export const ADMIN_EMAILS = ['dana.cole@plcy.app', 'marcus.ihde@plcy.app', 'priya.nair@plcy.app', 'jack@plcy.app']
export const DEVICE_PLATFORMS: DevicePlatform[] = ['macOS', 'Windows', 'iOS', 'Android', 'Linux']

export const POSTURE_LABELS: { key: keyof PostureChecks; label: string }[] = [
  { key: 'encryption', label: 'Disk encryption on' },
  { key: 'osCurrent', label: 'OS up to date' },
  { key: 'screenLock', label: 'Screen lock / passcode set' },
  { key: 'notJailbroken', label: 'Not jailbroken / rooted' },
  { key: 'mdmManaged', label: 'MDM-enrolled' },
]

export const deviceStatusTone: Record<DeviceStatus, 'green' | 'orange' | 'slate' | 'red'> = {
  Trusted: 'green',
  'At risk': 'orange',
  Pending: 'slate',
  Blocked: 'red',
}

const allPass: PostureChecks = { encryption: true, osCurrent: true, screenLock: true, notJailbroken: true, mdmManaged: true }

const seedDevices: ManagedDevice[] = [
  { id: 'dev_mac01', name: "Dana's MacBook Pro", owner: 'dana.cole@plcy.app', platform: 'macOS', osVersion: '15.5', mdm: 'Jamf', status: 'Trusted', lastSeen: '2m ago', enrolledAt: '2026-03-11', checks: { ...allPass } },
  { id: 'dev_win01', name: "Priya's ThinkPad X1", owner: 'priya.nair@plcy.app', platform: 'Windows', osVersion: '11 23H2', mdm: 'Intune', status: 'Trusted', lastSeen: '18m ago', enrolledAt: '2026-02-02', checks: { ...allPass } },
  { id: 'dev_mac02', name: "Jack's MacBook Air", owner: 'jack@plcy.app', platform: 'macOS', osVersion: '15.5', mdm: 'Kandji', status: 'Trusted', lastSeen: '5m ago', enrolledAt: '2026-01-20', checks: { ...allPass } },
  { id: 'dev_ios01', name: "Marcus's iPhone 15", owner: 'marcus.ihde@plcy.app', platform: 'iOS', osVersion: '18.1', mdm: 'Intune', status: 'At risk', lastSeen: '1h ago', enrolledAt: '2026-04-08', checks: { encryption: true, osCurrent: false, screenLock: true, notJailbroken: true, mdmManaged: true } },
  { id: 'dev_lnx01', name: 'Unmanaged Linux host', owner: 'priya.nair@plcy.app', platform: 'Linux', osVersion: 'Ubuntu 22.04', mdm: 'None', status: 'Blocked', lastSeen: '3d ago', enrolledAt: '—', checks: { encryption: false, osCurrent: true, screenLock: false, notJailbroken: true, mdmManaged: false } },
]

const STORAGE_KEY = 'plcy_managed_devices'

export function loadDevices(): ManagedDevice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedDevices.map((d) => ({ ...d, checks: { ...d.checks } }))
    return JSON.parse(raw) as ManagedDevice[]
  } catch {
    return seedDevices.map((d) => ({ ...d, checks: { ...d.checks } }))
  }
}

export function saveDevices(list: ManagedDevice[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export interface DeviceTotals {
  trusted: number
  pending: number
  atRisk: number
  blocked: number
}
export function deviceTotals(list: ManagedDevice[]): DeviceTotals {
  return {
    trusted: list.filter((d) => d.status === 'Trusted').length,
    pending: list.filter((d) => d.status === 'Pending').length,
    atRisk: list.filter((d) => d.status === 'At risk').length,
    blocked: list.filter((d) => d.status === 'Blocked').length,
  }
}

export function postureSummary(d: ManagedDevice): { passed: number; total: number; failing: string[] } {
  const entries = POSTURE_LABELS.map((l) => ({ label: l.label, ok: d.checks[l.key] }))
  return { passed: entries.filter((e) => e.ok).length, total: entries.length, failing: entries.filter((e) => !e.ok).map((e) => e.label) }
}

/** Default MDM per platform for a freshly enrolled device. */
export function defaultMdm(platform: DevicePlatform): MdmProvider {
  if (platform === 'macOS') return 'Kandji'
  if (platform === 'Windows') return 'Intune'
  if (platform === 'iOS' || platform === 'Android') return 'Intune'
  return 'None'
}

export function currentOsVersion(platform: DevicePlatform): string {
  return { macOS: '15.5', Windows: '11 23H2', iOS: '18.2', Android: '15', Linux: 'Ubuntu 24.04' }[platform]
}

export function newDeviceId(): string {
  return 'dev_' + Math.random().toString(36).slice(2, 8)
}

/** Readable one-time enrollment code, e.g. K7QP-3MRT-9XZ2. */
export function enrollmentCode(): string {
  const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const grp = () => Array.from({ length: 4 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('')
  return `${grp()}-${grp()}-${grp()}`
}

export function enrollCommand(platform: DevicePlatform, code: string): string {
  switch (platform) {
    case 'macOS':
      return `curl -sSL https://enroll.plcy.app/mac | sudo bash -s ${code}`
    case 'Windows':
      return `irm https://enroll.plcy.app/win | iex; plcy-enroll ${code}`
    case 'Linux':
      return `curl -sSL https://enroll.plcy.app/linux | sudo bash -s ${code}`
    default:
      return `Open the PLCY Admin mobile app → Enroll device → enter ${code}`
  }
}
