/**
 * Observable, persisted store for the mutable Customer Success surfaces —
 * support tickets and the renewals pipeline. Mirrors the docsStore/evalsStore
 * pattern. Customer health is a static seed (read directly from success.ts).
 */
import { useSyncExternalStore } from 'react'
import { ticketSeed, renewalSeed, activitySeed, taskSeed } from './success'
import type { Ticket, TicketStatus, Renewal, RenewalStage, Activity, ActivityType, CSTask } from './success'

const KEY = 'plcy.success.v2'

interface SuccessState {
  tickets: Ticket[]
  renewals: Renewal[]
  activities: Activity[]
  tasks: CSTask[]
}

const seed = (): SuccessState => ({ tickets: ticketSeed, renewals: renewalSeed, activities: activitySeed, tasks: taskSeed })

function mergeSeeds(stored: SuccessState): SuccessState {
  const tIds = new Set(stored.tickets.map((t) => t.id))
  const rKeys = new Set(stored.renewals.map((r) => r.customer))
  const aIds = new Set((stored.activities ?? []).map((a) => a.id))
  const cIds = new Set((stored.tasks ?? []).map((c) => c.id))
  return {
    tickets: [...ticketSeed.filter((t) => !tIds.has(t.id)), ...stored.tickets],
    renewals: [...renewalSeed.filter((r) => !rKeys.has(r.customer)), ...stored.renewals],
    activities: [...activitySeed.filter((a) => !aIds.has(a.id)), ...(stored.activities ?? [])],
    tasks: [...taskSeed.filter((c) => !cIds.has(c.id)), ...(stored.tasks ?? [])],
  }
}

function read(): SuccessState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return mergeSeeds(JSON.parse(raw) as SuccessState)
  } catch {
    /* ignore */
  }
  return seed()
}

let state: SuccessState = read()
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

export function updateTicket(id: string, patch: Partial<Ticket>) {
  state = { ...state, tickets: state.tickets.map((t) => (t.id === id ? { ...t, ...patch, updated: today() } : t)) }
  emit()
}
export const setTicketStatus = (id: string, status: TicketStatus) => updateTicket(id, status === 'Resolved' ? { status, sla: 'On track' } : { status })
export const assignTicket = (id: string, assignee: string) => updateTicket(id, { assignee })

export function setRenewalStage(customer: string, stage: RenewalStage) {
  state = { ...state, renewals: state.renewals.map((r) => (r.customer === customer ? { ...r, stage } : r)) }
  emit()
}

let actSeq = 900
export function addActivity(customer: string, type: ActivityType, summary: string, by = 'You') {
  const entry: Activity = { id: `ACT-${++actSeq}`, customer, type, summary, at: today(), by }
  state = { ...state, activities: [entry, ...state.activities] }
  emit()
}

export function toggleTask(id: string) {
  state = { ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, status: t.status === 'done' ? 'open' : 'done' } : t)) }
  emit()
}
export function assignCSTask(id: string, owner: string) {
  state = { ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, owner } : t)) }
  emit()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useSuccess(): SuccessState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
