/**
 * Observable, persisted store for the mutable Customer Success surfaces —
 * support tickets and the renewals pipeline. Mirrors the docsStore/evalsStore
 * pattern. Customer health is a static seed (read directly from success.ts).
 */
import { useSyncExternalStore } from 'react'
import { ticketSeed, renewalSeed, activitySeed, taskSeed, RECOMMENDED_PLAYS } from './success'
import type { Ticket, TicketStatus, Renewal, RenewalStage, Activity, ActivityType, CSTask, ChurnCaseStatus, Play } from './success'

const KEY = 'plcy.success.v4'

/** Per-account churn-case working state, keyed by customer. */
export interface ChurnCase {
  status: ChurnCaseStatus
  owner?: string
  notifiedChannels: string[]
  notes: { at: string; by: string; text: string }[]
  escalatedTo?: string
  escalatedAt?: string
}

interface SuccessState {
  tickets: Ticket[]
  renewals: Renewal[]
  activities: Activity[]
  tasks: CSTask[]
  churn: Record<string, ChurnCase>
  plays: Play[]
}

const seed = (): SuccessState => ({ tickets: ticketSeed, renewals: renewalSeed, activities: activitySeed, tasks: taskSeed, churn: {}, plays: RECOMMENDED_PLAYS })

function mergeSeeds(stored: SuccessState): SuccessState {
  const tIds = new Set(stored.tickets.map((t) => t.id))
  const rKeys = new Set(stored.renewals.map((r) => r.customer))
  const aIds = new Set((stored.activities ?? []).map((a) => a.id))
  const cIds = new Set((stored.tasks ?? []).map((c) => c.id))
  const pIds = new Set((stored.plays ?? []).map((p) => p.id))
  return {
    tickets: [...ticketSeed.filter((t) => !tIds.has(t.id)), ...stored.tickets],
    renewals: [...renewalSeed.filter((r) => !rKeys.has(r.customer)), ...stored.renewals],
    activities: [...activitySeed.filter((a) => !aIds.has(a.id)), ...(stored.activities ?? [])],
    tasks: [...taskSeed.filter((c) => !cIds.has(c.id)), ...(stored.tasks ?? [])],
    churn: stored.churn ?? {},
    plays: [...(stored.plays ?? []), ...RECOMMENDED_PLAYS.filter((p) => !pIds.has(p.id))],
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

let taskSeq = 900
export function addTask(t: Omit<CSTask, 'id'>): string {
  const id = `CST-${++taskSeq}`
  state = { ...state, tasks: [{ id, ...t }, ...state.tasks] }
  emit()
  return id
}
export function toggleTask(id: string) {
  state = { ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, status: t.status === 'done' ? 'open' : 'done' } : t)) }
  emit()
}
export function assignCSTask(id: string, owner: string) {
  state = { ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, owner } : t)) }
  emit()
}
export function updateTask(id: string, patch: Partial<CSTask>) {
  state = { ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }
  emit()
}
export function deleteTask(id: string) {
  state = { ...state, tasks: state.tasks.filter((t) => t.id !== id) }
  emit()
}

/* -------- Playbooks -------- */
let playSeq = 900
export function addPlay(p: Omit<Play, 'id'> & { id?: string }): string {
  const id = p.id ?? `play-${++playSeq}`
  state = { ...state, plays: [...state.plays, { ...p, id }] }
  emit()
  return id
}
export function updatePlay(id: string, patch: Partial<Play>) {
  state = { ...state, plays: state.plays.map((p) => (p.id === id ? { ...p, ...patch } : p)) }
  emit()
}

/* -------- Churn Watch cases -------- */
const DEFAULT_CASE: ChurnCase = { status: 'New', notifiedChannels: [], notes: [] }
export const churnCaseFor = (customer: string, churn: Record<string, ChurnCase>): ChurnCase => churn[customer] ?? DEFAULT_CASE

function patchCase(customer: string, patch: Partial<ChurnCase>) {
  const cur = state.churn[customer] ?? DEFAULT_CASE
  state = { ...state, churn: { ...state.churn, [customer]: { ...cur, ...patch } } }
  emit()
}

export function assignChurnOwner(customer: string, owner: string) {
  const cur = state.churn[customer] ?? DEFAULT_CASE
  // Picking up an unworked case moves it into active investigation.
  const status: ChurnCaseStatus = cur.status === 'New' || cur.status === 'Acknowledged' ? 'Investigating' : cur.status
  patchCase(customer, { owner, status })
}
export function setChurnStatus(customer: string, status: ChurnCaseStatus) {
  patchCase(customer, { status })
}
export function notifyChurnTeam(customer: string, channels: string[]) {
  const cur = state.churn[customer] ?? DEFAULT_CASE
  const merged = Array.from(new Set([...cur.notifiedChannels, ...channels]))
  const status: ChurnCaseStatus = cur.status === 'New' ? 'Acknowledged' : cur.status
  patchCase(customer, { notifiedChannels: merged, status })
}
export function addChurnNote(customer: string, text: string, by = 'You') {
  const cur = state.churn[customer] ?? DEFAULT_CASE
  patchCase(customer, { notes: [{ at: today(), by, text }, ...cur.notes] })
}
export function escalateChurn(customer: string, to: string) {
  patchCase(customer, { escalatedTo: to, escalatedAt: today() })
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useSuccess(): SuccessState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
