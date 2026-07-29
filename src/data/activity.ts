/**
 * Last-active tracking.
 *
 * "Last active" used to be a hardcoded display string on each employee record
 * (`lastActive: '2 min ago'`), which meant it was frozen: it read the same on
 * day one and a year later, and nothing in the app ever wrote it. Two copies of
 * the same strings also lived in `./team` and `./roles`, free to disagree.
 *
 * Now there is one shape — an ISO timestamp — and two sources for it:
 *  - the seeded baseline on each employee record (`Employee.lastActiveAt`), and
 *  - this store, which records real activity as it happens and wins over the
 *    seed.
 *
 * The write comes from `logAction` in the Session context, which already fires
 * on every gated action in the console. In a real deployment this would be fed
 * by the auth/session layer instead; the read side wouldn't change.
 */
import { useEffect, useState, useSyncExternalStore } from 'react'

const KEY = 'plcy.activity.v1'

/** email → ISO timestamp of the last observed action. */
export type ActivityMap = Record<string, string>

function read(): ActivityMap {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as ActivityMap
  } catch {
    /* ignore malformed / unavailable storage */
  }
  return {}
}

let state: ActivityMap = read()
const listeners = new Set<() => void>()
const getSnapshot = () => state

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

/**
 * Record that someone did something. Called on every audited action, so it runs
 * often — writes are skipped unless the stored value is more than a minute old,
 * which keeps a burst of clicks from re-rendering every table that reads this.
 */
export function touchActivity(email: string, at: Date = new Date()) {
  const prev = state[email]
  if (prev && at.getTime() - Date.parse(prev) < 60_000) return
  state = { ...state, [email]: at.toISOString() }
  emit()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useActivity(): ActivityMap {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * A clock that ticks, so relative times count up on screen instead of freezing
 * at whatever they said when the page rendered. 30s is below the resolution of
 * the labels themselves, so no row is ever visibly stale.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/**
 * Resolve someone's last-active instant: live activity recorded this session
 * beats the seeded baseline on their employee record.
 */
export function lastActiveOf(email: string, activity: ActivityMap, seeded: string | null | undefined): string | null {
  return activity[email] ?? seeded ?? null
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/**
 * A timestamp as "3 min ago". Deliberately coarse above the hour mark — nobody
 * reads "1 hour 41 min ago", and the extra precision would only make the column
 * churn. `null` means the account has never signed in.
 */
export function relativeTime(iso: string | null, now: number = Date.now()): string {
  if (!iso) return 'Never'
  const ms = now - Date.parse(iso)
  if (Number.isNaN(ms)) return '—'
  if (ms < 0) return 'just now'

  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`

  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  return `${Math.floor(months / 12)} year${months < 24 ? '' : 's'} ago`
}

/** Anything inside this window counts as "on now" — drives the live dot. */
export const ACTIVE_NOW_MINUTES = 5

export function isActiveNow(iso: string | null, now: number = Date.now()): boolean {
  return !!iso && now - Date.parse(iso) < ACTIVE_NOW_MINUTES * 60_000
}

/** Full timestamp for the tooltip, so the exact value is never more than a hover away. */
export function exactTime(iso: string | null): string {
  if (!iso) return 'No sign-in recorded'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}
