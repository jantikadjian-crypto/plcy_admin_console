import { clsx } from 'clsx'
import { Children, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */
export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return <div className={clsx('card', padded && 'card-pad', className)}>{children}</div>
}

export function CardTitle({
  title,
  subtitle,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */
const tones = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-violet-50 text-violet-600',
  red: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
} as const

export type Tone = keyof typeof tones

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  footer,
}: {
  label: string
  value: ReactNode
  icon: LucideIcon
  tone?: Tone
  footer?: ReactNode
}) {
  return (
    <Card className="transition-shadow hover:shadow-cardhover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink-900">{value}</p>
        </div>
        <div className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {footer && <div className="mt-3 text-xs font-medium text-ink-500">{footer}</div>}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */
const badgeTones: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  purple: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-600/20',
}

export function Badge({
  children,
  tone = 'slate',
  dot = false,
}: {
  children: ReactNode
  tone?: keyof typeof badgeTones
  dot?: boolean
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        badgeTones[tone],
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Map common status strings to badge tones. */
export function statusTone(status: string): keyof typeof badgeTones {
  const s = status.toLowerCase()
  if (s === 'n/a' || s === 'na') return 'slate'
  if (['active', 'healthy', 'passed', 'pass', 'resolved', 'approved', 'enabled', 'compliant', 'live', 'online', 'operational', 'success', 'delivered', 'connected', 'mitigated', 'low'].some((k) => s.includes(k)))
    return 'green'
  if (['pending', 'review', 'draft', 'medium', 'warning', 'degraded', 'in progress', 'investigating', 'mitigating', 'staging', 'gap'].some((k) => s.includes(k)))
    return 'orange'
  if (['failed', 'fail', 'critical', 'high', 'blocked', 'denied', 'error', 'suspended', 'offline', 'expired', 'breach', 'open', 'churned'].some((k) => s.includes(k)))
    return 'red'
  if (['deprecated', 'archived', 'inactive', 'disabled'].some((k) => s.includes(k))) return 'slate'
  if (['beta', 'trial', 'canary', 'provisioning'].some((k) => s.includes(k))) return 'purple'
  return 'blue'
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTone(status)} dot>
      {status}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/* List cap — long lists show the leading slice, rest one click away    */
/* ------------------------------------------------------------------ */

/** Rows shown before a list collapses behind "Show all". */
export const LIST_CAP = 25

/**
 * Caps a list at `LIST_CAP` and hands back the slice plus the toggle state.
 *
 * `resetOn` is the filter state that decides *which* rows lead the list —
 * change any of it and the cap re-applies, so an expansion never carries over
 * into a set the operator didn't ask to see.
 */
export function useListCap<T>(items: T[], resetOn: unknown[] = [], cap = LIST_CAP) {
  const [showAll, setShowAll] = useState(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setShowAll(false), resetOn)

  const visible = showAll ? items : items.slice(0, cap)
  return {
    visible,
    showAll,
    capped: items.length > cap,
    hidden: items.length - visible.length,
    toggle: () => setShowAll((v) => !v),
  }
}

/**
 * The "Show all / Show first N" control that pairs with {@link useListCap}.
 * Renders nothing when the list is short enough to not need capping.
 */
export function ShowAllToggle({
  total,
  showAll,
  hidden,
  onToggle,
  noun = 'rows',
  recent = false,
  cap = LIST_CAP,
}: {
  total: number
  showAll: boolean
  hidden: number
  onToggle: () => void
  /** Plural noun for the expand label — "decisions", "customers", "events". */
  noun?: string
  /** Newest-first lists collapse to the *most recent* N, not the first N. */
  recent?: boolean
  cap?: number
}) {
  if (total <= cap) return null
  return (
    <div className="mt-3 flex justify-center">
      <button
        onClick={onToggle}
        className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
      >
        {showAll ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            Show {recent ? 'most recent' : 'first'} {cap}
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            Show all {total} {noun}
            <span className="text-ink-400">({hidden} more)</span>
          </>
        )}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */
/**
 * Every table caps itself at {@link LIST_CAP} rows and puts the rest behind a
 * "Show all" toggle — the rule holds for tables that are short today but grow
 * with real data, without each page having to remember it.
 *
 * Pass `cap={false}` when the page drives the cap itself (because it also
 * reports counts elsewhere), or a number to override the limit.
 */
export function Table({
  columns,
  children,
  cap = LIST_CAP,
  noun = 'rows',
  recent = false,
}: {
  columns: string[]
  children: ReactNode
  cap?: number | false
  /** Plural noun for the expand label — "customers", "alerts", "images". */
  noun?: string
  /** Newest-first tables collapse to the *most recent* N, not the first N. */
  recent?: boolean
}) {
  const [showAll, setShowAll] = useState(false)

  // Children.toArray flattens row arrays and drops the false/null of a
  // conditionally rendered row, so this counts real rows.
  const rows = Children.toArray(children)
  const total = rows.length
  const limit = cap === false ? Infinity : cap

  // A filter change swaps the row set out from under an expansion.
  useEffect(() => setShowAll(false), [total])

  const visible = showAll ? rows : rows.slice(0, limit)

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((c) => (
              <th key={c} className="table-th">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{visible}</tbody>
      </table>
      {cap !== false && (
        <ShowAllToggle
          total={total}
          showAll={showAll}
          hidden={total - visible.length}
          onToggle={() => setShowAll((v) => !v)}
          noun={noun}
          recent={recent}
          cap={cap}
        />
      )}
    </div>
  )
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <tr
      onClick={onClick}
      className={clsx('transition-colors hover:bg-slate-50/70', onClick && 'cursor-pointer', className)}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className, colSpan }: { children: ReactNode; className?: string; colSpan?: number }) {
  return <td className={clsx('table-td', className)} colSpan={colSpan}>{children}</td>
}

/* ------------------------------------------------------------------ */
/* Progress bar                                                        */
/* ------------------------------------------------------------------ */
export function Progress({
  value,
  tone = 'green',
}: {
  value: number
  tone?: 'green' | 'blue' | 'orange' | 'red' | 'purple'
}) {
  const colors = {
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    red: 'bg-rose-500',
    purple: 'bg-violet-500',
  }
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={clsx('h-full rounded-full transition-all', colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Avatar / initials                                                   */
/* ------------------------------------------------------------------ */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const palette = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-orange-100 text-orange-700', 'bg-rose-100 text-rose-700']
  const idx = name.charCodeAt(0) % palette.length
  return (
    <span
      className={clsx(
        'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
        palette[idx],
        className,
      )}
    >
      {initials}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold text-ink-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  headerRight,
  footer,
  children,
  maxWidth = 'max-w-2xl',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  headerRight?: ReactNode
  footer?: ReactNode
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className={clsx('my-4 w-full rounded-2xl bg-white shadow-xl ring-1 ring-slate-200', maxWidth)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink-900">{title}</h2>
              {headerRight}
            </div>
            {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 p-4">{footer}</div>}
      </div>
    </div>
  )
}
