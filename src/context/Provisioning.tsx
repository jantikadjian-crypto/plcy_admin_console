import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { provisions as seedProvisions } from '@/data/ops'
import type { Provision } from '@/data/ops'

/**
 * Shared, persisted store for onboarding provisions. Kept in one place so the
 * Provisioning queue and the destination pages (Licensing, Residency, …) see
 * the same records — completing a gate on its own page marks it done here.
 */
interface ProvisioningValue {
  list: Provision[]
  get: (id: string) => Provision | undefined
  add: (p: Provision) => void
  update: (id: string, patch: Partial<Provision>) => void
  setGate: (id: string, key: string, value: boolean) => void
}

const Ctx = createContext<ProvisioningValue | null>(null)
const KEY = 'plcy.provisions.v1'

function load(): Provision[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed as Provision[]
    }
  } catch {
    /* ignore */
  }
  return seedProvisions
}

function persist(list: Provision[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function ProvisioningProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Provision[]>(load)

  const commit = useCallback((next: Provision[]) => {
    setList(next)
    persist(next)
  }, [])

  const get = useCallback((id: string) => list.find((p) => p.id === id), [list])
  const add = useCallback((p: Provision) => commit([p, ...load()]), [commit])
  const update = useCallback(
    (id: string, patch: Partial<Provision>) => commit(load().map((p) => (p.id === id ? { ...p, ...patch } : p))),
    [commit],
  )
  const setGate = useCallback(
    (id: string, key: string, value: boolean) =>
      commit(load().map((p) => (p.id === id ? { ...p, gates: { ...p.gates, [key]: value } } : p))),
    [commit],
  )

  return <Ctx.Provider value={{ list, get, add, update, setGate }}>{children}</Ctx.Provider>
}

export function useProvisioning(): ProvisioningValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useProvisioning must be used within ProvisioningProvider')
  return ctx
}
