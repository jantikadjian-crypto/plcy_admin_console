/**
 * Observable, persisted store for policy change requests. Mirrors the
 * successStore/evalsStore pattern. Version history is derived (in the page)
 * from the seeded baseline plus applied / rolled-back CRs, so the store only
 * needs to hold the change requests themselves.
 */
import { useSyncExternalStore } from 'react'
import { changeRequestSeed, allApproved } from './policyChanges'
import type { ChangeRequest, CRStatus, Review } from './policyChanges'

const KEY = 'plcy.policychanges.v1'

interface State {
  crs: ChangeRequest[]
}

const seed = (): State => ({ crs: changeRequestSeed })

function mergeSeeds(stored: State): State {
  const ids = new Set(stored.crs.map((c) => c.id))
  return { crs: [...changeRequestSeed.filter((c) => !ids.has(c.id)), ...stored.crs] }
}

function read(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return mergeSeeds(JSON.parse(raw) as State)
  } catch {
    /* ignore */
  }
  return seed()
}

let state: State = read()
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

const today = () => new Date().toISOString().slice(0, 10)

function patch(id: string, fn: (cr: ChangeRequest) => ChangeRequest) {
  state = { ...state, crs: state.crs.map((c) => (c.id === id ? fn(c) : c)) }
  emit()
}
const log = (cr: ChangeRequest, who: string, text: string): ChangeRequest => ({ ...cr, history: [...cr.history, { at: today(), who, text }] })

export function submitForReview(id: string) {
  patch(id, (cr) => log({ ...cr, status: 'In review' }, 'You', 'Submitted for review'))
}

export function recordReview(id: string, approver: string, decision: 'approved' | 'rejected', comment?: string) {
  patch(id, (cr) => {
    const reviews: Review[] = cr.reviews.map((r) => (r.approver === approver ? { ...r, decision, at: today(), comment } : r))
    let next: ChangeRequest = { ...cr, reviews }
    next = log(next, approver, decision === 'approved' ? 'Approved' : `Requested changes${comment ? ` — ${comment}` : ''}`)
    if (decision === 'rejected') next = { ...next, status: 'Rejected' }
    else if (allApproved(next) && next.status === 'In review') next = { ...log(next, 'System', 'All approvals complete → Approved'), status: 'Approved' }
    return next
  })
}

export function scheduleChange(id: string, when: string) {
  patch(id, (cr) => log({ ...cr, status: 'Scheduled', scheduledFor: when }, 'You', `Scheduled for ${when}`))
}

export function applyChange(id: string) {
  patch(id, (cr) => log({ ...cr, status: 'Applied', appliedAt: today() }, 'You', `Applied to production (v${cr.toVersion})`))
}

export function rollbackChange(id: string) {
  patch(id, (cr) => log({ ...cr, status: 'Rolled back', rolledBackAt: today() }, 'You', `Rolled back to v${cr.fromVersion}`))
}

export function runDryRun(id: string) {
  patch(id, (cr) => log({ ...cr, impact: { ...cr.impact, lastRun: today() } }, 'You', 'Ran dry-run impact analysis'))
}

export const canApply = (status: CRStatus) => status === 'Approved' || status === 'Scheduled'

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function usePolicyChanges(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
