/**
 * Observable, persisted store for the mutable Enforcement surfaces — operator
 * triage of decisions, per-pack mode overrides, and the global kill switch.
 * Mirrors the successStore/docsStore pattern.
 *
 * The decision log itself is a static seed (read from enforcement.ts); what an
 * operator *does* about it lives here.
 */
import { useSyncExternalStore } from 'react'
import { decisionSeed } from './enforcement'
import type { EnforcementDecision, Triage, Verdict } from './enforcement'

const KEY = 'plcy.enforcement.v1'

/** The three ways a pack can be enforced at the policy enforcement point. */
export type EnforcementMode = 'Monitor' | 'Warn' | 'Block'
export const ENFORCEMENT_MODES: EnforcementMode[] = ['Monitor', 'Warn', 'Block']

export interface ExceptionRule {
  id: string
  controlId: string
  customer: string
  reason: string
  by: string
  at: string
}

interface EnforcementState {
  /** Operator verdicts, keyed by decision id. */
  triage: Record<string, Triage>
  /** Per-pack mode overrides; absent means the catalog default stands. */
  modes: Record<string, EnforcementMode>
  /** Narrow carve-outs raised off a false positive. */
  exceptions: ExceptionRule[]
  /** Global enforcement kill switch. */
  enabled: boolean
}

const seed = (): EnforcementState => ({ triage: {}, modes: {}, exceptions: [], enabled: true })

function read(): EnforcementState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const stored = JSON.parse(raw) as Partial<EnforcementState>
      return {
        triage: stored.triage ?? {},
        modes: stored.modes ?? {},
        exceptions: stored.exceptions ?? [],
        enabled: stored.enabled ?? true,
      }
    }
  } catch {
    /* ignore */
  }
  return seed()
}

let state: EnforcementState = read()
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

const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

/* -------- Triage -------- */
export function setVerdict(id: string, verdict: Verdict, note?: string, by = 'You') {
  state = { ...state, triage: { ...state.triage, [id]: { verdict, by, at: now(), note } } }
  emit()
}
export function clearVerdict(id: string) {
  const { [id]: _dropped, ...rest } = state.triage
  state = { ...state, triage: rest }
  emit()
}

/* -------- Mode overrides -------- */
export function setPackMode(packId: string, mode: EnforcementMode) {
  state = { ...state, modes: { ...state.modes, [packId]: mode } }
  emit()
}

/* -------- Exceptions -------- */
let exSeq = 100
export function addException(controlId: string, customer: string, reason: string, by = 'You'): string {
  const id = `EXC-${++exSeq}`
  state = { ...state, exceptions: [{ id, controlId, customer, reason, by, at: now() }, ...state.exceptions] }
  emit()
  return id
}

/* -------- Global switch -------- */
export function setEnforcementEnabled(enabled: boolean) {
  state = { ...state, enabled }
  emit()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useEnforcement(): EnforcementState & { log: EnforcementDecision[] } {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { ...s, log: decisionSeed }
}
