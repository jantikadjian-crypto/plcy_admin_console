/**
 * Observable, persisted store for the mutable Customer Success surfaces —
 * support tickets and the renewals pipeline. Mirrors the docsStore/evalsStore
 * pattern. Customer health is a static seed (read directly from success.ts).
 */
import { useSyncExternalStore } from 'react'
import { ticketSeed, renewalSeed } from './success'
import type { Ticket, TicketStatus, Renewal, RenewalStage } from './success'

const KEY = 'plcy.success.v1'

interface SuccessState {
  tickets: Ticket[]
  renewals: Renewal[]
}

const seed = (): SuccessState => ({ tickets: ticketSeed, renewals: renewalSeed })

function mergeSeeds(stored: SuccessState): SuccessState {
  const tIds = new Set(stored.tickets.map((t) => t.id))
  const rKeys = new Set(stored.renewals.map((r) => r.customer))
  return {
    tickets: [...ticketSeed.filter((t) => !tIds.has(t.id)), ...stored.tickets],
    renewals: [...renewalSeed.filter((r) => !rKeys.has(r.customer)), ...stored.renewals],
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

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useSuccess(): SuccessState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
