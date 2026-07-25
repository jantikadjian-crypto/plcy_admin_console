import { useEffect, useState } from 'react'
import {
  Laptop,
  Smartphone,
  Plus,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  ShieldCheck,
  X,
  Terminal,
  Cpu,
  TriangleAlert,
  Network,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, Badge, Modal, useListCap, ShowAllToggle } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import {
  ADMIN_EMAILS,
  DEVICE_PLATFORMS,
  POSTURE_LABELS,
  deviceStatusTone,
  loadDevices,
  saveDevices,
  deviceTotals,
  postureSummary,
  defaultMdm,
  currentOsVersion,
  newDeviceId,
  enrollmentCode,
  enrollCommand,
  hardwareUuid,
  boardSerial,
  deviceFingerprint,
  serialLooksWeak,
} from '@/data/devices'
import type { ManagedDevice, DevicePlatform, PostureChecks } from '@/data/devices'

const platformIcon: Record<DevicePlatform, LucideIcon> = {
  macOS: Laptop,
  Windows: Laptop,
  Linux: Laptop,
  iOS: Smartphone,
  Android: Smartphone,
}
const ALL_PASS: PostureChecks = { encryption: true, osCurrent: true, screenLock: true, notJailbroken: true, mdmManaged: true, vpn: true }
const ALL_FAIL: PostureChecks = { encryption: false, osCurrent: false, screenLock: false, notJailbroken: false, mdmManaged: false, vpn: false }
const today = () => new Date().toISOString().slice(0, 10)

/* Decorative QR — deterministic from the enrollment code, with corner finders. */
function QrBlock({ value, size = 132 }: { value: string; size?: number }) {
  const n = 15
  const cell = size / n
  const base = [...value].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  const rects: JSX.Element[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const inFinder = (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
      let fill: boolean
      if (inFinder) {
        const rr = r < 7 ? r : r - (n - 7)
        const cc = c < 7 ? c : c - (n - 7)
        fill = rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4)
      } else {
        fill = (((base ^ ((r * n + c) * 0x9e3779b1)) >>> 0) % 7) < 3
      }
      if (fill) rects.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} />)
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg bg-white p-1.5 ring-1 ring-slate-200" aria-hidden>
      <g fill="#0f172a">{rects}</g>
    </svg>
  )
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="btn-secondary shrink-0 px-2.5 py-1.5 text-xs"
      onClick={() => {
        try {
          navigator.clipboard?.writeText(text)
        } catch {
          /* ignore */
        }
        setDone(true)
        window.setTimeout(() => setDone(false), 1500)
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}

interface EnrollState {
  step: 'form' | 'code'
  platform: DevicePlatform
  owner: string
  code: string
  deviceId: string
}

export default function ManagedDevices({ enforcing, requireVpn }: { enforcing: boolean; requireVpn: boolean }) {
  const { can, logAction } = useSession()
  const canManage = can('settings.modify')
  const [devices, setDevices] = useState<ManagedDevice[]>(loadDevices)
  const [enroll, setEnroll] = useState<EnrollState | null>(null)
  const [detail, setDetail] = useState<ManagedDevice | null>(null)

  useEffect(() => {
    saveDevices(devices)
  }, [devices])

  const totals = deviceTotals(devices)
  const devicesCap = useListCap(devices, [devices.length])

  const startEnroll = () => setEnroll({ step: 'form', platform: 'macOS', owner: ADMIN_EMAILS[0], code: '', deviceId: '' })

  const generate = () => {
    if (!enroll) return
    const id = newDeviceId()
    const code = enrollmentCode()
    const pending: ManagedDevice = {
      id,
      name: `New ${enroll.platform} device`,
      owner: enroll.owner,
      platform: enroll.platform,
      osVersion: '—',
      mdm: 'None',
      status: 'Pending',
      lastSeen: 'never',
      enrolledAt: '—',
      checks: { ...ALL_FAIL },
      hardwareUuid: '',
      boardSerial: '',
    }
    setDevices((prev) => [pending, ...prev])
    setEnroll({ ...enroll, step: 'code', code, deviceId: id })
    logAction({ action: 'device.enroll.start', target: `${enroll.platform} · ${enroll.owner}`, category: 'settings' })
  }

  const checkIn = (id: string, platform: DevicePlatform) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d
        // The enrollment client reports its firmware Hardware UUID + board serial;
        // combined they form the stable, hardware-bound device identity.
        const uuid = d.hardwareUuid || hardwareUuid(platform)
        const serial = d.boardSerial || boardSerial(platform)
        return { ...d, status: 'Trusted', checks: { ...ALL_PASS }, mdm: defaultMdm(platform), osVersion: currentOsVersion(platform), lastSeen: 'just now', enrolledAt: today(), name: d.name.startsWith('New ') ? `${platform} device` : d.name, hardwareUuid: uuid, boardSerial: serial }
      }),
    )
    logAction({ action: 'device.enroll.complete', target: id, category: 'settings' })
  }

  const completeFromModal = () => {
    if (!enroll) return
    checkIn(enroll.deviceId, enroll.platform)
    setEnroll(null)
  }

  const revoke = (d: ManagedDevice) => {
    setDevices((prev) => prev.filter((x) => x.id !== d.id))
    logAction({ action: 'device.revoke', target: `${d.name} · ${d.owner}`, category: 'settings' })
    setDetail(null)
  }

  const recheck = (d: ManagedDevice) => {
    const pass = POSTURE_LABELS.every((l) => d.checks[l.key])
    setDevices((prev) =>
      prev.map((x) => (x.id === d.id ? { ...x, lastSeen: 'just now', status: x.status === 'Blocked' ? 'Blocked' : pass ? 'Trusted' : 'At risk' } : x)),
    )
    logAction({ action: 'device.recheck', target: d.name, category: 'settings' })
  }

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Managed devices</p>
          <p className="text-xs text-ink-500">
            {enforcing
              ? `Enforcement on — only Trusted devices${requireVpn ? ' on the company VPN' : ''} can reach the console.`
              : `Enforcement off — devices are tracked but not yet required${requireVpn ? ' (company VPN is enforced)' : ''}.`}
          </p>
        </div>
        <GatedButton cap="settings.modify" className="btn-primary px-3 py-1.5 text-sm" onClick={startEnroll}>
          <Plus className="h-4 w-4" />
          Enroll device
        </GatedButton>
      </div>

      {/* Summary chips */}
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 font-medium text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{totals.trusted} trusted</span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-medium text-ink-600"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />{totals.pending} pending</span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 font-medium text-orange-700"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" />{totals.atRisk} at risk</span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 font-medium text-rose-700"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />{totals.blocked} blocked</span>
      </div>

      {/* Inventory */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-ink-400">
              <th className="px-3 py-2 font-medium">Device</th>
              <th className="px-3 py-2 font-medium">Platform</th>
              <th className="px-3 py-2 font-medium">MDM</th>
              <th className="px-3 py-2 font-medium">Posture</th>
              <th className="px-3 py-2 font-medium">Last seen</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devicesCap.visible.map((d) => {
              const Icon = platformIcon[d.platform]
              const ps = postureSummary(d)
              return (
                <tr key={d.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5">
                    <button className="group flex items-center gap-2.5 text-left" onClick={() => setDetail(d)}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink-500">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink-900 group-hover:text-brand-700">{d.name}</span>
                        <span className="block truncate text-xs text-ink-400">{d.owner}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-ink-600">{d.platform}<span className="text-ink-400"> {d.osVersion !== '—' ? d.osVersion : ''}</span></td>
                  <td className="px-3 py-2.5">{d.mdm === 'None' ? <span className="text-ink-400">—</span> : <Badge tone="slate">{d.mdm}</Badge>}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Badge tone={deviceStatusTone[d.status]} dot>{d.status}</Badge>
                      {d.status !== 'Pending' && <span className="text-[11px] text-ink-400">{ps.passed}/{ps.total}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-ink-500">{d.lastSeen}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {d.status === 'Pending' && canManage && (
                        <button className="rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50" onClick={() => checkIn(d.id, d.platform)} title="Simulate device check-in">
                          Complete
                        </button>
                      )}
                      {d.status === 'At risk' && canManage && (
                        <button className="rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-brand-600" onClick={() => recheck(d)} aria-label="Re-check posture" title="Re-check posture">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      {canManage && (
                        <button className="rounded-md p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => revoke(d)} aria-label="Revoke device" title={d.status === 'Pending' ? 'Cancel enrollment' : 'Revoke device'}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {devices.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-ink-400">No devices enrolled yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ShowAllToggle total={devices.length} showAll={devicesCap.showAll} hidden={devicesCap.hidden} onToggle={devicesCap.toggle} noun="devices" />

      {/* Enroll modal */}
      {enroll && (
        <Modal
          open
          onClose={() => setEnroll(null)}
          title="Enroll a device"
          subtitle={enroll.step === 'form' ? 'Issue a one-time enrollment code' : 'Run the code on the device to finish'}
          maxWidth="max-w-lg"
          footer={
            enroll.step === 'form' ? (
              <>
                <button className="btn-ghost" onClick={() => setEnroll(null)}>Cancel</button>
                <button className="btn-primary" onClick={generate}>Generate enrollment code</button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => setEnroll(null)}>Close · finish later</button>
                <button className="btn-primary" onClick={completeFromModal}>
                  <ShieldCheck className="h-4 w-4" />
                  Simulate check-in
                </button>
              </>
            )
          }
        >
          {enroll.step === 'form' ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Platform</label>
                <select className="input" value={enroll.platform} onChange={(e) => setEnroll({ ...enroll, platform: e.target.value as DevicePlatform })}>
                  {DEVICE_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Assign to admin</label>
                <select className="input" value={enroll.owner} onChange={(e) => setEnroll({ ...enroll, owner: e.target.value })}>
                  {ADMIN_EMAILS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-ink-500">
                Generating adds a <strong>Pending</strong> device. It becomes <strong>Trusted</strong> once it checks in and passes the posture
                check (disk encryption, current OS, screen lock, MDM enrolment).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <QrBlock value={enroll.code} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">One-time code</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-sm tracking-widest text-slate-100">{enroll.code}</code>
                    <CopyButton text={enroll.code} />
                  </div>
                  <p className="mt-2 text-xs text-ink-500">Scan the QR from the PLCY mobile app, or run the command below on the device. The code expires in 15 minutes.</p>
                </div>
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400"><Terminal className="h-3.5 w-3.5" />Install command · {enroll.platform}</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-ink-700">{enrollCommand(enroll.platform, enroll.code)}</code>
                  <CopyButton text={enrollCommand(enroll.platform, enroll.code)} />
                </div>
              </div>
              <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-ink-500">
                <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                <span>On check-in the client reports the device's <strong>Hardware UUID</strong> and <strong>motherboard serial</strong>, combined into one stable Device ID (<code className="rounded bg-white px-1 font-mono text-[11px]">UUID_Serial</code>). It survives reboots, updates, and reformats — so the device keeps its identity for life.</span>
              </p>
              {requireVpn && (
                <p className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs text-brand-700">
                  <Network className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Company VPN is required — enrollment must originate from the corporate network, and the device stays Trusted only while it holds the VPN posture.</span>
                </p>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Device detail modal */}
      {detail && (
        <Modal
          open
          onClose={() => setDetail(null)}
          title={detail.name}
          subtitle={`${detail.owner} · ${detail.platform} ${detail.osVersion !== '—' ? detail.osVersion : ''}`}
          headerRight={<Badge tone={deviceStatusTone[detail.status]} dot>{detail.status}</Badge>}
          maxWidth="max-w-lg"
          footer={
            <>
              <button className="btn-ghost" onClick={() => setDetail(null)}>Close</button>
              {canManage && (
                <GatedButton cap="settings.modify" className="btn-secondary text-rose-600 hover:bg-rose-50" onClick={() => revoke(detail)}>
                  <X className="h-4 w-4" />
                  Revoke access
                </GatedButton>
              )}
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KV label="Owner" value={detail.owner} />
              <KV label="Platform" value={`${detail.platform} ${detail.osVersion !== '—' ? detail.osVersion : ''}`} />
              <KV label="MDM" value={detail.mdm} />
              <KV label="Enrolled" value={detail.enrolledAt} />
              <KV label="Last seen" value={detail.lastSeen} />
              <KV label="Record ID" value={detail.id} mono />
            </div>

            {/* Hardware identity — the stable, hardware-bound Device ID */}
            {detail.hardwareUuid && detail.boardSerial ? (
              <section>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-900"><Cpu className="h-4 w-4 text-ink-400" />Hardware identity</h4>
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Hardware UUID</p>
                      <p className="break-all font-mono text-xs text-ink-700">{detail.hardwareUuid}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Motherboard serial</p>
                      <p className="break-all font-mono text-xs text-ink-700">{detail.boardSerial}</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Device ID · UUID_Serial (stable across reformats)</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-slate-100">{deviceFingerprint(detail.hardwareUuid, detail.boardSerial)}</code>
                      <CopyButton text={deviceFingerprint(detail.hardwareUuid, detail.boardSerial)} />
                    </div>
                  </div>
                  {serialLooksWeak(detail.boardSerial) && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Motherboard serial is generic (<code className="font-mono">{detail.boardSerial}</code>) — common on VMs and some consumer boards, so the hardware binding is weak. Rely on the certificate / MDM attestation, not the serial alone, to trust this device.</span>
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-ink-400">
                Hardware identity is captured on first check-in (Hardware UUID + motherboard serial).
              </p>
            )}

            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink-900">Posture checks</h4>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {POSTURE_LABELS.map((l) => {
                  const ok = detail.checks[l.key]
                  return (
                    <div key={l.key} className="flex items-center justify-between px-3 py-2.5 text-sm">
                      <span className="text-ink-700">{l.label}</span>
                      {ok ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><Check className="h-3.5 w-3.5" />Pass</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600"><X className="h-3.5 w-3.5" />Fail</span>
                      )}
                    </div>
                  )
                })}
              </div>
              {detail.status === 'At risk' && canManage && (
                <button className="btn-secondary mt-3 w-full" onClick={() => { recheck(detail); setDetail(null) }}>
                  <RefreshCw className="h-4 w-4" />
                  Re-check posture
                </button>
              )}
            </section>
          </div>
        </Modal>
      )}
    </div>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 font-semibold text-ink-900 ${mono ? 'font-mono text-xs' : 'text-sm'}`}>{value}</p>
    </div>
  )
}
