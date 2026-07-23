/**
 * Observable, persisted store for red-team campaigns and eval runs — mirrors the
 * docsStore / glossaryStore pattern. Seeds from evals.ts, merges any new seeds
 * on load, and lets the Evaluations pages launch campaigns, run evals, and update
 * finding status. Backed by localStorage + useSyncExternalStore so the tabs stay
 * in sync.
 */
import { useSyncExternalStore } from 'react'
import { redTeamSeed, evalRuns as runSeed } from './evals'
import type { RedTeamCampaign, EvalRun, Finding, FindingStatus } from './evals'

const KEY = 'plcy.evals.v1'

interface EvalsState {
  campaigns: RedTeamCampaign[]
  runs: EvalRun[]
}

function seed(): EvalsState {
  return { campaigns: redTeamSeed, runs: runSeed }
}

function mergeSeeds(stored: EvalsState): EvalsState {
  const campIds = new Set(stored.campaigns.map((c) => c.id))
  const runIds = new Set(stored.runs.map((r) => r.id))
  return {
    campaigns: [...redTeamSeed.filter((c) => !campIds.has(c.id)), ...stored.campaigns],
    runs: [...runSeed.filter((r) => !runIds.has(r.id)), ...stored.runs],
  }
}

function read(): EvalsState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return mergeSeeds(JSON.parse(raw) as EvalsState)
  } catch {
    /* ignore malformed / unavailable storage */
  }
  return seed()
}

let state: EvalsState = read()
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

export function upsertCampaign(c: RedTeamCampaign) {
  const i = state.campaigns.findIndex((x) => x.id === c.id)
  const campaigns = i === -1 ? [c, ...state.campaigns] : state.campaigns.map((x) => (x.id === c.id ? c : x))
  state = { ...state, campaigns }
  emit()
}

export function updateFinding(campaignId: string, findingId: string, patch: Partial<Finding>) {
  state = {
    ...state,
    campaigns: state.campaigns.map((c) =>
      c.id !== campaignId ? c : { ...c, findings: c.findings.map((f) => (f.id === findingId ? { ...f, ...patch } : f)) },
    ),
  }
  emit()
}

export function setFindingStatus(campaignId: string, findingId: string, status: FindingStatus) {
  updateFinding(campaignId, findingId, { status })
}

export function upsertRun(r: EvalRun) {
  const i = state.runs.findIndex((x) => x.id === r.id)
  const runs = i === -1 ? [r, ...state.runs] : state.runs.map((x) => (x.id === r.id ? r : x))
  state = { ...state, runs }
  emit()
}

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}`

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useEvals(): EvalsState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
