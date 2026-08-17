import { Fragment, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarClock, AlertTriangle, TrendingUp, ShieldAlert, ListTodo, PlayCircle, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader, StatCard, Card, CardTitle, Table, Tr, Td, Badge } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useSuccess, setRenewalStage, addTask, addActivity } from '@/data/successStore'
import { RENEWAL_STAGES, stageTone, healthTone, renewalSignal, suggestedPlayFor, isRenewalOpen, isRenewalAtRisk } from '@/data/success'
import type { RenewalStage, RenewalSignal } from '@/data/success'

const AS_OF = '2026-07-24'
const NOW = Date.parse(AS_OF)
const daysTo = (d: string) => Math.round((Date.parse(d) - NOW) / 86400000)
const dueInDays = (n: number) => new Date(NOW + n * 86400000).toISOString().slice(0, 10)
const k = (n: number) => `$${(n / 1000).toFixed(0)}k`

export function Renewals() {
  const { renewals, tasks, churn, plays } = useSuccess()
  const { logAction, can } = useSession()
  const manage = can('customer.manage')
  // Churn Watch links here pointed at one account — land with its evidence open.
  const [params] = useSearchParams()
  const [open, setOpen] = useState<string | null>(params.get('customer'))

  // Every renewal, scored against health, its churn case, and the task queue.
  const rows = [...renewals]
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))
    .map((r) => ({ r, s: renewalSignal(r, tasks, churn[r.customer]?.status, AS_OF) }))

  const live = rows.filter(({ r }) => isRenewalOpen(r.stage))
  const in90 = live.filter(({ r }) => daysTo(r.renewalDate) <= 90).length
  const atRiskArr = live.filter(({ r }) => isRenewalAtRisk(r.stage)).reduce((a, { r }) => a + r.arr, 0)
  const unworkedArr = live.filter(({ s }) => s.unworked).reduce((a, { r }) => a + r.arr, 0)
  const unworkedCount = live.filter(({ s }) => s.unworked).length
  const weighted = live.reduce((a, { r, s }) => a + (r.arr * s.adjusted) / 100, 0)
  const mismatches = live.filter(({ s }) => s.mismatch).length

  const change = (customer: string, stage: RenewalStage) => {
    setRenewalStage(customer, stage)
    logAction({ action: 'renewal.stage', target: `${customer} → ${stage}`, category: 'customer' })
  }

  /** Accept the evidence: move the recorded stage to what the signals imply. */
  const accept = (customer: string, stage: RenewalStage) => {
    setRenewalStage(customer, stage)
    addActivity(customer, 'renewal', `Renewal stage moved to ${stage} from health & churn signals`)
    logAction({ action: 'renewal.stage.accept', target: `${customer} → ${stage}`, category: 'customer' })
  }

  /**
   * Put work against a renewal — the loop's other half. The task lands in the
   * same queue as everything else, so the row flips to covered on the next render.
   */
  const startPlay = (customer: string, s: RenewalSignal) => {
    const playId = suggestedPlayFor(s)
    const play = plays.find((p) => p.id === playId)
    const title = `${play?.title ?? 'Renewal play'} — ${customer}`
    addTask({
      customer,
      title,
      play: playId,
      priority: s.suggested === 'Churning' ? 'Urgent' : 'High',
      due: dueInDays(s.suggested === 'Churning' ? 5 : 10),
      status: 'open',
      owner: renewals.find((r) => r.customer === customer)?.owner,
    })
    addActivity(customer, 'renewal', `Started ${play?.title ?? 'a renewal play'} off the renewal pipeline`)
    logAction({ action: 'renewal.play.start', target: `${customer} · ${play?.title ?? playId}`, category: 'customer' })
  }

  return (
    <div>
      <PageHeader
        title="Renewals"
        description="The renewal pipeline, scored against what the rest of Customer Success knows. Each row pairs the stage a rep recorded with the evidence — health, the churn case, and the open task queue — so an optimistic call and an unworked at-risk account both surface here rather than at the renewal date."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Renewals ≤ 90 days" value={in90} icon={CalendarClock} tone="blue" footer="Approaching" />
        <StatCard label="ARR at risk" value={k(atRiskArr)} icon={AlertTriangle} tone={atRiskArr ? 'red' : 'green'} footer="At-risk + churning" />
        <StatCard
          label="Unworked at-risk ARR"
          value={k(unworkedArr)}
          icon={ShieldAlert}
          tone={unworkedArr ? 'red' : 'green'}
          footer={unworkedCount ? `${unworkedCount} account${unworkedCount > 1 ? 's' : ''} with no open save work` : 'Every at-risk renewal is covered'}
        />
        <StatCard label="Weighted pipeline" value={k(weighted)} icon={TrendingUp} tone="purple" footer="ARR × adjusted probability" />
      </div>

      {mismatches > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">{mismatches} renewal{mismatches > 1 ? 's are' : ' is'} staged more optimistically than the evidence supports.</span>{' '}
            Expand a flagged row to see why, then accept the suggested stage or put work against it.
          </p>
        </div>
      )}

      <Card>
        <CardTitle title="Pipeline" subtitle="Sorted by renewal date · expand a row for the evidence behind its score" />
        <Table columns={['', 'Customer', 'ARR', 'Renewal', 'Health', 'Open work', 'Probability', 'Stage', 'Owner']} noun="renewals">
          {rows.map(({ r, s }) => {
            const d = daysTo(r.renewalDate)
            const expanded = open === r.customer
            const flagged = s.mismatch || s.unworked
            // One Fragment per record so the table's row cap counts customers,
            // not customers-plus-open-evidence-panels.
            return (
              <Fragment key={r.customer}>
              <Tr>
                <Td className="w-8">
                  <button onClick={() => setOpen(expanded ? null : r.customer)} aria-label={expanded ? 'Hide evidence' : 'Show evidence'} className="text-ink-400 hover:text-ink-700">
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </Td>
                <Td className="font-medium text-ink-900">
                  <span className="flex items-center gap-2">
                    {r.customer}
                    {flagged && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title={s.mismatch ? 'Stage is rosier than the evidence' : 'At risk with no open work'} />}
                  </span>
                  <span className="block text-xs font-normal text-ink-500">{r.plan}</span>
                </Td>
                <Td className="tabular-nums text-ink-700">{k(r.arr)}</Td>
                <Td className="whitespace-nowrap text-xs text-ink-500">
                  {r.renewalDate}
                  <span className={clsx('ml-1.5 tabular-nums', d <= 30 ? 'font-semibold text-rose-600' : d <= 90 ? 'text-amber-600' : 'text-ink-400')}>{d < 0 ? 'past' : `${d}d`}</span>
                </Td>
                <Td>
                  {s.health != null ? (
                    <span className="flex items-center gap-1.5">
                      <Badge tone={healthTone(s.health)}>{s.health}</Badge>
                      {s.caseStatus && <span className="text-[11px] text-ink-500">case {s.caseStatus.toLowerCase()}</span>}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-300">—</span>
                  )}
                </Td>
                <Td>
                  {s.openTasks > 0 ? (
                    <Link to={`/success?tab=tasks&customer=${encodeURIComponent(r.customer)}`} className="inline-flex items-center gap-1 text-xs text-ink-600 hover:text-brand-700 hover:underline">
                      <ListTodo className="h-3.5 w-3.5" />
                      {s.openTasks} open
                      {s.overdueTasks > 0 && <span className="font-semibold text-rose-600">· {s.overdueTasks} overdue</span>}
                    </Link>
                  ) : isRenewalOpen(r.stage) ? (
                    <span className={clsx('text-xs', s.unworked ? 'font-medium text-rose-600' : 'text-ink-400')}>{s.unworked ? 'Nobody working it' : 'None'}</span>
                  ) : (
                    <span className="text-xs text-ink-300">—</span>
                  )}
                </Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                      <span className={clsx('block h-full', s.delta < 0 ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${s.adjusted}%` }} />
                    </span>
                    <span className="text-xs tabular-nums text-ink-500">{s.adjusted}%</span>
                    {s.delta !== 0 && (
                      <span className={clsx('text-[11px] font-medium tabular-nums', s.delta < 0 ? 'text-rose-600' : 'text-emerald-600')} title={`Recorded ${r.probability}% · adjusted for health & execution`}>
                        {s.delta > 0 ? '+' : ''}{s.delta}
                      </span>
                    )}
                  </span>
                </Td>
                <Td>
                  <span className="flex flex-col items-start gap-1">
                    {manage ? (
                      <select
                        value={r.stage}
                        onChange={(e) => change(r.customer, e.target.value as RenewalStage)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-ink-700"
                      >
                        {RENEWAL_STAGES.map((st) => <option key={st}>{st}</option>)}
                      </select>
                    ) : (
                      <Badge tone={stageTone[r.stage]} dot>{r.stage}</Badge>
                    )}
                    {s.mismatch && <span className="text-[11px] font-medium text-amber-700">signals say {s.suggested}</span>}
                  </span>
                </Td>
                <Td className="text-xs text-ink-500">{r.owner}</Td>
              </Tr>
              {expanded && (
                <Tr>
                  <Td className="bg-slate-50/70" colSpan={9}>
                    <Evidence
                      signal={s}
                      recorded={r.probability}
                      canManage={manage}
                      onAccept={() => accept(r.customer, s.suggested)}
                      onStartPlay={() => startPlay(r.customer, s)}
                      playTitle={plays.find((p) => p.id === suggestedPlayFor(s))?.title}
                      customer={r.customer}
                      stageIsOpen={isRenewalOpen(r.stage)}
                    />
                  </Td>
                </Tr>
              )}
              </Fragment>
            )
          })}
        </Table>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The evidence behind one renewal's score                             */
/* ------------------------------------------------------------------ */
function Evidence({
  signal,
  recorded,
  canManage,
  onAccept,
  onStartPlay,
  playTitle,
  customer,
  stageIsOpen,
}: {
  signal: RenewalSignal
  recorded: number
  canManage: boolean
  onAccept: () => void
  onStartPlay: () => void
  playTitle?: string
  customer: string
  stageIsOpen: boolean
}) {
  return (
    <div className="grid gap-6 py-2 md:grid-cols-3">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">What the signals say</h4>
        {signal.reasons.length ? (
          <ul className="space-y-1 text-sm text-ink-700">
            {signal.reasons.map((r) => (
              <li key={r} className="flex items-start gap-1.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-400" />
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-500">No risk signals — health, usage, and adoption are all in range.</p>
        )}
        <p className="mt-2 text-xs text-ink-500">
          Evidence suggests <Badge tone={stageTone[signal.suggested]}>{signal.suggested}</Badge>
        </p>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">How the probability was scored</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between text-ink-600">
            <span>Recorded</span>
            <span className="tabular-nums">{recorded}%</span>
          </div>
          {signal.adjustments.map((a) => (
            <div key={a.label} className="flex items-center justify-between">
              <span className="text-ink-600">{a.label}</span>
              <span className={clsx('tabular-nums font-medium', a.delta < 0 ? 'text-rose-600' : 'text-emerald-600')}>
                {a.delta > 0 ? '+' : ''}{a.delta}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-200 pt-1 font-semibold text-ink-900">
            <span>Adjusted</span>
            <span className="tabular-nums">{signal.adjusted}%</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Close the loop</h4>
        <div className="flex flex-col items-start gap-2">
          {signal.mismatch && (
            <GatedButton
              cap="customer.manage"
              showLock={false}
              disabled={!canManage}
              onClick={onAccept}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              <Check className="h-3.5 w-3.5" />
              Move stage to {signal.suggested}
            </GatedButton>
          )}
          {stageIsOpen && (
            <GatedButton
              cap="customer.manage"
              showLock={false}
              disabled={!canManage}
              onClick={onStartPlay}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Start {playTitle ?? 'a play'}
            </GatedButton>
          )}
          <Link to={`/success?tab=tasks&customer=${encodeURIComponent(customer)}`} className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-brand-700 hover:underline">
            <ListTodo className="h-3.5 w-3.5" />
            {signal.openTasks > 0 ? `View ${signal.openTasks} open task${signal.openTasks > 1 ? 's' : ''}` : 'Open the task queue'}
          </Link>
          {signal.unworked && <p className="text-xs text-rose-600">This renewal is at risk with nobody working it.</p>}
        </div>
      </div>
    </div>
  )
}
