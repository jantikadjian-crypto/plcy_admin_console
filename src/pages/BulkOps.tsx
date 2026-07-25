import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Layers,
  Rocket,
  DatabaseBackup,
  RotateCw,
  KeyRound,
  Package,
  Boxes,
  Play,
  Pause,
  Ban,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Undo2,
  Lock,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardTitle, PageHeader, StatCard, Badge, Progress, Modal, useListCap, ShowAllToggle } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useCustomerScope } from '@/context/CustomerScope'
import { deployments, releases, LATEST_STABLE } from '@/data/fleet'
import type { Deployment } from '@/data/fleet'
import type { Capability } from '@/data/permissions'

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */
type Strategy = 'all' | 'rolling' | 'canary'

interface BulkAction {
  id: string
  label: string
  desc: string
  icon: LucideIcon
  cap: Capability
  verb: string
  needsVersion?: boolean
  eligible: (d: Deployment) => boolean
  ineligibleReason: (d: Deployment) => string | null
}

const online = (d: Deployment) => (d.status === 'Offline' ? 'Environment is offline' : null)

const ACTIONS: BulkAction[] = [
  {
    id: 'upgrade',
    label: 'Upgrade version',
    desc: 'Roll a new release to each selected environment',
    icon: Rocket,
    cap: 'release.rollout',
    verb: 'Upgrading',
    needsVersion: true,
    eligible: (d) => d.status !== 'Offline',
    ineligibleReason: online,
  },
  {
    id: 'backup',
    label: 'Trigger backup',
    desc: 'Take an on-demand encrypted snapshot',
    icon: DatabaseBackup,
    cap: 'provision.manage',
    verb: 'Backing up',
    eligible: (d) => d.status !== 'Offline',
    ineligibleReason: online,
  },
  {
    id: 'restart',
    label: 'Rolling restart',
    desc: 'Cycle pods with zero downtime',
    icon: RotateCw,
    cap: 'provision.manage',
    verb: 'Restarting',
    eligible: (d) => d.status !== 'Offline',
    ineligibleReason: online,
  },
  {
    id: 'rotate',
    label: 'Rotate credentials',
    desc: 'Reissue API and signing keys',
    icon: KeyRound,
    cap: 'access.approve',
    verb: 'Rotating keys',
    eligible: (d) => d.status !== 'Offline',
    ineligibleReason: online,
  },
  {
    id: 'policy',
    label: 'Apply policy pack',
    desc: 'Push the latest baseline policy pack',
    icon: Package,
    cap: 'policy.manage',
    verb: 'Applying policy',
    eligible: (d) => d.status !== 'Offline',
    ineligibleReason: online,
  },
  {
    id: 'bundle',
    label: 'Push update bundle',
    desc: 'Deliver a signed offline bundle (air-gapped only)',
    icon: Boxes,
    cap: 'release.rollout',
    verb: 'Delivering bundle',
    eligible: (d) => d.connectivity === 'Air-gapped',
    ineligibleReason: (d) => (d.connectivity === 'Air-gapped' ? null : 'SaaS environment — no bundle needed'),
  },
]

const STRATEGIES: { id: Strategy; label: string; hint: string }[] = [
  { id: 'all', label: 'All at once', hint: 'Every target in parallel' },
  { id: 'rolling', label: 'Rolling (25%)', hint: 'A quarter of the fleet at a time' },
  { id: 'canary', label: 'Canary', hint: 'One first, then the rest' },
]

/* ------------------------------------------------------------------ */
/* Run simulation                                                      */
/* ------------------------------------------------------------------ */
type RunState = 'queued' | 'running' | 'done' | 'failed'
interface RunTarget {
  id: string
  customer: string
  progress: number
  state: RunState
  willFail: boolean
}
interface Run {
  actionId: string
  verb: string
  strategy: Strategy
  guardrail: boolean
  targets: RunTarget[]
  paused: boolean
  done: boolean
}

function concurrency(strategy: Strategy, targets: RunTarget[]): number {
  const n = targets.length
  if (strategy === 'all') return n
  if (strategy === 'rolling') return Math.max(1, Math.ceil(n * 0.25))
  // canary: 1 until the first target settles, then release the rest
  const released = targets.some((t) => t.state === 'done' || t.state === 'failed')
  return released ? n : 1
}

const connTone: Record<Deployment['connectivity'], 'blue' | 'purple'> = {
  SaaS: 'blue',
  'Air-gapped': 'purple',
}

const runStateTone: Record<RunState, 'slate' | 'blue' | 'green' | 'red'> = {
  queued: 'slate',
  running: 'blue',
  done: 'green',
  failed: 'red',
}

type NodeState = 'done' | 'running' | 'failed' | 'queued'
const nodeDot: Record<NodeState, string> = {
  done: 'bg-emerald-500',
  running: 'bg-blue-500 animate-pulse',
  failed: 'bg-rose-500',
  queued: 'bg-slate-300',
}

/** Derive per-node status from a target's overall state + progress. */
function nodeStates(t: RunTarget, count: number): NodeState[] {
  const done = t.state === 'done' || t.state === 'failed' ? count : t.state === 'queued' ? 0 : Math.floor((t.progress / 100) * count)
  return Array.from({ length: count }, (_, i): NodeState => {
    if (t.state === 'failed' && i === count - 1) return 'failed'
    if (i < done) return 'done'
    if (t.state === 'running' && i === done) return 'running'
    return 'queued'
  })
}

/** Synthesized execution log for a target. */
function logLines(t: RunTarget, verb: string): string[] {
  const base = [`Connecting to ${t.customer} control plane…`, `${verb} started`]
  if (t.state === 'queued') return ['Queued — awaiting a rollout slot']
  if (t.state === 'running') return [...base, `Draining node ${Math.max(1, Math.floor(t.progress / 20))}…`]
  if (t.state === 'done') return [...base, 'All nodes healthy', `${verb} complete`]
  return [...base, 'Node health check failed — bundle signature unverified', 'Rollout halted on this target']
}

export default function BulkOps() {
  const { can, logAction } = useSession()
  const { scope, isAll } = useCustomerScope()

  const scoped = useMemo(
    () => (isAll ? deployments : deployments.filter((d) => d.customer === scope)),
    [isAll, scope],
  )

  const scopedCap = useListCap(scoped, [scope, isAll])

  const [actionId, setActionId] = useState<string>('upgrade')
  const action = ACTIONS.find((a) => a.id === actionId)!
  const [targetVersion, setTargetVersion] = useState<string>(LATEST_STABLE)
  const [strategy, setStrategy] = useState<Strategy>('rolling')
  const [guardrail, setGuardrail] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [run, setRun] = useState<Run | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const eligible = useMemo(() => scoped.filter((d) => action.eligible(d)), [scoped, action])

  // Prune selection to what the current action + scope allow.
  useEffect(() => {
    const ok = new Set(eligible.map((d) => d.id))
    setSelected((prev) => new Set([...prev].filter((id) => ok.has(id))))
  }, [eligible])

  const running = !!run && !run.done
  const selCount = selected.size

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const allEligibleSelected = eligible.length > 0 && eligible.every((d) => selected.has(d.id))
  const toggleAll = () =>
    setSelected(allEligibleSelected ? new Set() : new Set(eligible.map((d) => d.id)))

  /* --- run controls --- */
  const start = () => {
    const targets: RunTarget[] = eligible
      .filter((d) => selected.has(d.id))
      .map((d) => ({
        id: d.id,
        customer: d.customer,
        progress: 0,
        state: 'queued',
        // Air-gapped envs with an unverified bundle trip during a bulk change.
        willFail: d.bundleState === 'Pending',
      }))
    if (!targets.length) return
    setRun({ actionId: action.id, verb: action.verb, strategy, guardrail, targets, paused: false, done: false })
    logAction({
      action: `bulkop.${action.id}.start`,
      target: `${targets.length} environment${targets.length === 1 ? '' : 's'}${action.needsVersion ? ` → ${targetVersion}` : ''}`,
      category: 'fleet',
    })
  }

  const tick = () =>
    setRun((prev) => {
      if (!prev || prev.done || prev.paused) return prev
      const targets = prev.targets.map((t) => ({ ...t }))
      const slots = concurrency(prev.strategy, targets) - targets.filter((t) => t.state === 'running').length
      let free = slots
      for (const t of targets) {
        if (free <= 0) break
        if (t.state === 'queued') {
          t.state = 'running'
          free--
        }
      }
      let failedNow = false
      for (const t of targets) {
        if (t.state === 'running') {
          t.progress = Math.min(100, t.progress + 8 + Math.random() * 16)
          if (t.progress >= 100) {
            if (t.willFail) {
              t.state = 'failed'
              failedNow = true
            } else {
              t.state = 'done'
            }
          }
        }
      }
      const paused = prev.guardrail && failedNow
      const done = targets.every((t) => t.state === 'done' || t.state === 'failed')
      return { ...prev, targets, paused, done }
    })

  // Drive the simulation while a run is active, not paused, not finished.
  useEffect(() => {
    if (!run || run.done || run.paused) return
    const timer = window.setInterval(tick, 320)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!run, run?.done, run?.paused])

  // Log completion once.
  const loggedDone = useRef<string | null>(null)
  useEffect(() => {
    if (run?.done && loggedDone.current !== 'done') {
      loggedDone.current = 'done'
      const ok = run.targets.filter((t) => t.state === 'done').length
      const failed = run.targets.filter((t) => t.state === 'failed').length
      logAction({
        action: `bulkop.${run.actionId}.complete`,
        target: `${ok} succeeded · ${failed} failed`,
        category: 'fleet',
        result: failed && !ok ? 'Denied' : 'Success',
      })
    }
    if (!run) loggedDone.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.done, run])

  const resume = () =>
    // Continue past the failure; don't re-pause on the same one.
    setRun((prev) => (prev ? { ...prev, paused: false, guardrail: false } : prev))
  const rollback = () => {
    if (run) logAction({ action: `bulkop.${run.actionId}.rollback`, target: `${run.targets.length} environments`, category: 'fleet', result: 'Denied' })
    setRun(null)
  }
  const close = () => setRun(null)

  /* --- derived counts --- */
  const doneCount = run ? run.targets.filter((t) => t.state === 'done').length : 0
  const failCount = run ? run.targets.filter((t) => t.state === 'failed').length : 0
  const overall = run ? Math.round(run.targets.reduce((s, t) => s + t.progress, 0) / run.targets.length) : 0

  const canRun = can(action.cap)

  return (
    <>
      <PageHeader
        title="Bulk Operations"
        description="Run one action across many single-tenant environments — with batching, guardrails, and a full audit trail. Instead of repeating the same task (upgrade, restart, apply a policy) on each customer one by one, do it once across a whole group — rolled out in safe batches you can pause, with every action recorded."
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Selected" value={selCount} icon={Layers} tone="blue" footer={`of ${eligible.length} eligible`} />
        <StatCard label="Update available" value={scoped.filter((d) => d.status === 'Update available').length} icon={Rocket} tone="orange" footer="Behind current release" />
        <StatCard label="Air-gapped" value={scoped.filter((d) => d.connectivity === 'Air-gapped').length} icon={ShieldCheck} tone="purple" footer="Require signed bundles" />
        <StatCard label="On current" value={scoped.filter((d) => d.status === 'Up to date').length} icon={CheckCircle2} tone="green" footer="Up to date" />
      </div>

      {/* Execution panel (only while/after a run) */}
      {run && (
        <Card className="mt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle
              title={run.done ? 'Execution complete' : run.paused ? 'Execution paused' : 'Executing…'}
              subtitle={`${run.verb} · ${STRATEGIES.find((s) => s.id === run.strategy)?.label} · ${run.targets.length} targets`}
            />
            <div className="flex items-center gap-2">
              {run.paused && (
                <>
                  <button className="btn-secondary" onClick={resume}>
                    <Play className="h-4 w-4" />
                    Resume
                  </button>
                  <button className="btn-ghost text-rose-600" onClick={rollback}>
                    <Undo2 className="h-4 w-4" />
                    Roll back
                  </button>
                </>
              )}
              {run.done ? (
                <button className="btn-secondary" onClick={close}>
                  Close
                </button>
              ) : (
                !run.paused && (
                  <button className="btn-ghost text-ink-500" onClick={rollback}>
                    <Ban className="h-4 w-4" />
                    Abort
                  </button>
                )
              )}
            </div>
          </div>

          {run.paused && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Guardrail tripped — {failCount} target{failCount === 1 ? '' : 's'} failed. Rollout is held. Resume to
                continue with the remaining environments, or roll back.
              </span>
            </div>
          )}

          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-ink-700">
                {doneCount} done{failCount ? ` · ${failCount} failed` : ''} · {run.targets.length} total
              </span>
              <span className="font-semibold text-ink-900">{overall}%</span>
            </div>
            <Progress value={overall} tone={failCount ? 'orange' : run.done ? 'green' : 'blue'} />
          </div>

          <div className="space-y-2">
            {run.targets.map((t) => (
              <div
                key={t.id}
                onClick={() => setDetailId(t.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setDetailId(t.id)}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-brand-300 hover:bg-slate-50/60"
              >
                <div className="w-40 shrink-0 truncate text-sm font-medium text-ink-900">{t.customer}</div>
                <div className="flex-1">
                  <Progress
                    value={t.progress}
                    tone={t.state === 'failed' ? 'red' : t.state === 'done' ? 'green' : 'blue'}
                  />
                </div>
                <div className="flex w-24 shrink-0 items-center justify-end gap-1.5">
                  {t.state === 'done' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                    </span>
                  ) : t.state === 'failed' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                      <XCircle className="h-3.5 w-3.5" /> Failed
                    </span>
                  ) : (
                    <Badge tone={runStateTone[t.state]}>{t.state === 'running' ? `${Math.round(t.progress)}%` : 'Queued'}</Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-ink-300 transition-colors group-hover:text-brand-500" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Per-target drill-down */}
      {run && detailId && (() => {
        const t = run.targets.find((x) => x.id === detailId)
        if (!t) return null
        const dep = deployments.find((d) => d.id === t.id)
        const nodeCount = dep?.nodes || 4
        const nodes = nodeStates(t, nodeCount)
        const doneNodes = nodes.filter((n) => n === 'done').length
        return (
          <Modal
            open
            onClose={() => setDetailId(null)}
            title={t.customer}
            subtitle={`${run.verb} · ${dep?.regionCode ?? '—'}`}
            headerRight={
              <Badge tone={runStateTone[t.state]} dot>
                {t.state === 'running' ? `${Math.round(t.progress)}%` : t.state[0].toUpperCase() + t.state.slice(1)}
              </Badge>
            }
            footer={<button className="btn-secondary" onClick={() => setDetailId(null)}>Close</button>}
          >
            <div className="space-y-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-700">Overall</span>
                  <span className="font-semibold text-ink-900">{Math.round(t.progress)}%</span>
                </div>
                <Progress value={t.progress} tone={t.state === 'failed' ? 'red' : t.state === 'done' ? 'green' : 'blue'} />
              </div>

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-ink-900">Nodes</p>
                  <span className="text-xs text-ink-500">{doneNodes}/{nodeCount} updated</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {nodes.map((n, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <span className="font-mono text-xs text-ink-700">{dep?.regionCode ?? 'node'}-{String(i + 1).padStart(2, '0')}</span>
                      <span className="flex items-center gap-1.5 text-xs capitalize text-ink-600">
                        <span className={`h-2 w-2 rounded-full ${nodeDot[n]}`} />
                        {n}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-ink-900">Log</p>
                <div className="space-y-1 rounded-xl bg-ink-900/95 p-3 font-mono text-xs text-slate-200">
                  {logLines(t, run.verb).map((l, i) => (
                    <div key={i} className={l.includes('failed') || l.includes('halted') ? 'text-rose-300' : ''}>
                      <span className="text-slate-500">$ </span>{l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )
      })()}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Targets */}
        <Card className="lg:col-span-2">
          <CardTitle title="Targets" subtitle={isAll ? 'All environments' : `Scoped to ${scope}`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={allEligibleSelected}
                      onChange={toggleAll}
                      disabled={running || eligible.length === 0}
                      aria-label="Select all eligible"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Region</th>
                  <th className="py-2 pr-3">Version</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {scopedCap.visible.map((d) => {
                  const reason = action.ineligibleReason(d)
                  const isEligible = !reason
                  const checked = selected.has(d.id)
                  return (
                    <tr
                      key={d.id}
                      className={`border-b border-slate-100 last:border-0 ${isEligible ? 'hover:bg-slate-50/60' : 'opacity-50'}`}
                    >
                      <td className="py-2.5 pr-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(d.id)}
                          disabled={!isEligible || running}
                          aria-label={`Select ${d.customer}`}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-ink-900">{d.customer}</div>
                        {reason && (
                          <div className="flex items-center gap-1 text-xs text-ink-400">
                            <Lock className="h-3 w-3" /> {reason}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="font-mono text-xs text-ink-600">{d.regionCode}</div>
                        <Badge tone={connTone[d.connectivity]}>{d.connectivity}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        {action.needsVersion && isEligible && d.version !== targetVersion ? (
                          <span className="whitespace-nowrap font-mono text-xs">
                            <span className="text-ink-500">{d.version}</span>
                            <span className="mx-1 text-ink-400">→</span>
                            <span className="font-semibold text-brand-700">{targetVersion}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-ink-600">{d.version}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={d.status === 'Offline' ? 'red' : d.status === 'Update available' ? 'orange' : d.status === 'Rolling out' ? 'blue' : 'green'} dot>
                          {d.status}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <ShowAllToggle total={scoped.length} showAll={scopedCap.showAll} hidden={scopedCap.hidden} onToggle={scopedCap.toggle} noun="targets" />
        </Card>

        {/* Action builder */}
        <Card>
          <CardTitle title="Action" subtitle="Choose what to run" />
          <div className="space-y-2">
            {ACTIONS.map((a) => {
              const Icon = a.icon
              const allowed = can(a.cap)
              const activeSel = a.id === actionId
              return (
                <button
                  key={a.id}
                  onClick={() => setActionId(a.id)}
                  disabled={running}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    activeSel ? 'border-brand-400 bg-brand-50/60 ring-1 ring-brand-400' : 'border-slate-200 hover:bg-slate-50'
                  } ${running ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activeSel ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-ink-500'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-ink-900">{a.label}</p>
                      {!allowed && <Lock className="h-3 w-3 text-ink-400" />}
                    </div>
                    <p className="text-xs leading-snug text-ink-500">{a.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {action.needsVersion && (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Target release</label>
              <select
                className="input"
                value={targetVersion}
                onChange={(e) => setTargetVersion(e.target.value)}
                disabled={running}
              >
                {releases.map((r) => (
                  <option key={r.version} value={r.version}>
                    {r.version} · {r.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Rollout strategy</label>
            <div className="grid grid-cols-1 gap-2">
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStrategy(s.id)}
                  disabled={running}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    strategy === s.id ? 'border-brand-400 bg-brand-50/60' : 'border-slate-200 hover:bg-slate-50'
                  } ${running ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span className="font-medium text-ink-800">{s.label}</span>
                  <span className="text-xs text-ink-400">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <div>
              <p className="text-sm font-semibold text-ink-900">Pause on failure</p>
              <p className="text-xs text-ink-500">Hold the rollout if any target fails</p>
            </div>
            <button
              onClick={() => setGuardrail((g) => !g)}
              disabled={running}
              aria-pressed={guardrail}
              className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${guardrail ? 'justify-end bg-brand-600' : 'justify-start bg-slate-200'} ${running ? 'opacity-60' : ''}`}
            >
              <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-500">Will run on</span>
              <span className="font-semibold text-ink-900">{selCount} environment{selCount === 1 ? '' : 's'}</span>
            </div>
          </div>

          <GatedButton
            cap={action.cap}
            onClick={start}
            disabled={running || selCount === 0}
            className="btn-primary mt-4 w-full justify-center"
          >
            <Play className="h-4 w-4" />
            {running ? 'Running…' : `Run ${action.label.toLowerCase()}`}
          </GatedButton>
          {!canRun && (
            <p className="mt-2 text-center text-xs text-ink-400">Your role can’t run this action.</p>
          )}
        </Card>
      </div>
    </>
  )
}
