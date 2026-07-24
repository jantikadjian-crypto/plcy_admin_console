import { useState } from 'react'
import { Inbox, CheckCircle2, ShieldAlert, ShieldX } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader, StatCard, Card, CardTitle, Badge } from '@/components/ui'
import { GatedButton } from '@/components/GatedButton'
import { useSession } from '@/context/Session'
import { useEvals, labelReview } from '@/data/evalsStore'
import { reviewLabelTone, familyOf } from '@/data/evals'
import type { ReviewItem, ReviewLabel } from '@/data/evals'

const FILTERS: { key: string; label: string }[] = [
  { key: 'unreviewed', label: 'Unreviewed' },
  { key: 'all', label: 'All' },
  { key: 'correct', label: 'Correct' },
  { key: 'false-positive', label: 'False positives' },
  { key: 'false-negative', label: 'False negatives' },
]

export function ReviewQueue() {
  const { reviews } = useEvals()
  const { logAction, can } = useSession()
  const [filter, setFilter] = useState('unreviewed')

  const unreviewed = reviews.filter((r) => r.label === 'unreviewed').length
  const labeled = reviews.length - unreviewed
  const fp = reviews.filter((r) => r.label === 'false-positive').length
  const fn = reviews.filter((r) => r.label === 'false-negative').length
  const rows = reviews.filter((r) => (filter === 'all' ? true : r.label === filter))

  const setLabel = (item: ReviewItem, label: ReviewLabel) => {
    labelReview(item.id, label)
    logAction({ action: 'evals.review.label', target: `${item.id} · ${item.controlPrefix} → ${label}`, category: 'governance' })
  }

  return (
    <div>
      <PageHeader
        title="QA Review Queue"
        description="PLCY's internal sampling of live allow/block decisions. Labelling these is the ground truth behind the precision & recall on the Efficacy tab."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unreviewed" value={unreviewed} icon={Inbox} tone={unreviewed ? 'orange' : 'green'} footer="Awaiting a label" />
        <StatCard label="Labelled" value={labeled} icon={CheckCircle2} tone="blue" footer={`${reviews.length} sampled total`} />
        <StatCard label="False positives" value={fp} icon={ShieldAlert} tone={fp ? 'orange' : 'green'} footer="Over-blocks confirmed" />
        <StatCard label="False negatives" value={fn} icon={ShieldX} tone={fn ? 'red' : 'green'} footer="Missed violations" />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <CardTitle title="Sampled decisions" subtitle="Label each as correct, a false positive (over-block) or a false negative (miss)" />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={clsx('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors', filter === f.key ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-slate-100 text-ink-700 ring-slate-500/10 hover:bg-slate-200/70')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {rows.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-ink-400">Nothing here — queue is clear for this filter.</p>}
          {rows.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.decision === 'Block' ? 'red' : 'green'}>{item.decision}</Badge>
                <span className="font-mono text-xs font-semibold text-ink-700" title={familyOf(item.controlPrefix)}>{item.controlPrefix}</span>
                <span className="text-xs text-ink-500">{familyOf(item.controlPrefix)}</span>
                <span className="text-xs text-ink-400">· {item.customer} · {item.detector}</span>
                <span className="ml-auto text-[11px] text-ink-400">{item.at}</span>
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <p className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-ink-700"><span className="font-semibold text-ink-500">Prompt · </span>{item.prompt}</p>
                <p className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-ink-700"><span className="font-semibold text-ink-500">Outcome · </span>{item.response}</p>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {item.label !== 'unreviewed' && (
                  <Badge tone={reviewLabelTone[item.label]}>{item.label.replace('-', ' ')}{item.reviewer ? ` · ${item.reviewer}` : ''}</Badge>
                )}
                <div className="ml-auto flex flex-wrap gap-2">
                  <LabelBtn active={item.label === 'correct'} tone="green" disabled={!can('evals.review')} onClick={() => setLabel(item, 'correct')}>Correct</LabelBtn>
                  {item.decision === 'Block'
                    ? <LabelBtn active={item.label === 'false-positive'} tone="orange" disabled={!can('evals.review')} onClick={() => setLabel(item, 'false-positive')}>False positive</LabelBtn>
                    : <LabelBtn active={item.label === 'false-negative'} tone="red" disabled={!can('evals.review')} onClick={() => setLabel(item, 'false-negative')}>False negative</LabelBtn>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function LabelBtn({ children, active, tone, disabled, onClick }: { children: React.ReactNode; active: boolean; tone: 'green' | 'orange' | 'red'; disabled?: boolean; onClick: () => void }) {
  const on = {
    green: 'bg-emerald-600 text-white ring-emerald-600',
    orange: 'bg-orange-500 text-white ring-orange-500',
    red: 'bg-rose-600 text-white ring-rose-600',
  }[tone]
  return (
    <GatedButton
      cap="evals.review" showLock={false} disabled={disabled} onClick={onClick}
      className={clsx('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors', active ? on : 'bg-white text-ink-600 ring-slate-300 hover:bg-slate-50')}
    >
      {children}
    </GatedButton>
  )
}
