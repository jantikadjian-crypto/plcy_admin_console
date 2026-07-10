import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { packs as seedPacks, controls as seedControls } from '@/data/policy'
import type { PolicyPack, Control } from '@/data/policy'

/**
 * Editable, persisted catalog of policy packs and controls. Seeded from the
 * static catalog; all create/edit/delete flows on the Policy Packs page write
 * here so changes survive navigation and reloads.
 */
interface PolicyValue {
  packs: PolicyPack[]
  controls: Control[]
  addPack: (p: PolicyPack) => void
  updatePack: (id: string, patch: Partial<PolicyPack>) => void
  deletePack: (id: string) => void
  addControl: (c: Control) => void
  updateControl: (id: string, patch: Partial<Control>) => void
  deleteControl: (id: string) => void
}

const Ctx = createContext<PolicyValue | null>(null)
const KEY = 'plcy.policy.v1'

interface Store { packs: PolicyPack[]; controls: Control[] }

/**
 * Union any newly-shipped seed packs/controls into a stored catalog. Users with
 * an existing `plcy.policy.v1` keep all their edits, but items added to the seed
 * after they first loaded (e.g. new composite packs) still show up. Matching is
 * by id, so a user's own edit to a seeded item is preserved (not overwritten).
 */
function mergeSeed(stored: Store): Store {
  const packIds = new Set(stored.packs.map((p) => p.id))
  const controlIds = new Set(stored.controls.map((c) => c.id))
  const newPacks = seedPacks.filter((p) => !packIds.has(p.id))
  const newControls = seedControls.filter((c) => !controlIds.has(c.id))
  if (newPacks.length === 0 && newControls.length === 0) return stored
  return {
    packs: [...stored.packs, ...newPacks],
    controls: [...stored.controls, ...newControls],
  }
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Store
      if (Array.isArray(parsed?.packs) && Array.isArray(parsed?.controls)) return mergeSeed(parsed)
    }
  } catch {
    /* ignore */
  }
  return { packs: seedPacks, controls: seedControls }
}

function persist(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function PolicyProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(load)

  const commit = useCallback((next: Store) => {
    setStore(next)
    persist(next)
  }, [])

  const addPack = useCallback((p: PolicyPack) => { const s = load(); commit({ ...s, packs: [...s.packs, p] }) }, [commit])
  const updatePack = useCallback((id: string, patch: Partial<PolicyPack>) => { const s = load(); commit({ ...s, packs: s.packs.map((p) => (p.id === id ? { ...p, ...patch } : p)) }) }, [commit])
  const deletePack = useCallback((id: string) => {
    const s = load()
    commit({
      // drop the pack, its own controls, and references to it in other packs' dependencies
      packs: s.packs.filter((p) => p.id !== id).map((p) => ({ ...p, dependencies: p.dependencies.filter((d) => d !== id) })),
      controls: s.controls.filter((c) => c.packId !== id),
    })
  }, [commit])

  const addControl = useCallback((c: Control) => { const s = load(); commit({ ...s, controls: [...s.controls, c] }) }, [commit])
  const updateControl = useCallback((id: string, patch: Partial<Control>) => { const s = load(); commit({ ...s, controls: s.controls.map((c) => (c.id === id ? { ...c, ...patch } : c)) }) }, [commit])
  const deleteControl = useCallback((id: string) => { const s = load(); commit({ ...s, controls: s.controls.filter((c) => c.id !== id) }) }, [commit])

  return (
    <Ctx.Provider value={{ packs: store.packs, controls: store.controls, addPack, updatePack, deletePack, addControl, updateControl, deleteControl }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePolicy(): PolicyValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePolicy must be used within PolicyProvider')
  return ctx
}
