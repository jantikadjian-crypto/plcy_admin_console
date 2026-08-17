import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { customers as seedCustomers } from '@/data/mock'
import type { Customer } from '@/data/mock'

/**
 * Shared, editable customer store. Seeds from the mock data, persists edits to
 * localStorage, and is the single source of truth for the Customers list, the
 * company page, and top-bar search — so an edit made on one surface shows up
 * everywhere.
 */
interface CustomersValue {
  list: Customer[]
  get: (id: string) => Customer | undefined
  update: (id: string, patch: Partial<Customer>) => void
  add: (c: Customer) => void
}

const Ctx = createContext<CustomersValue | null>(null)
const STORAGE_KEY = 'plcy.customers.v1'

function load(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedCustomers
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? (parsed as Customer[]) : seedCustomers
  } catch {
    return seedCustomers
  }
}

function persist(list: Customer[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore (sandboxed storage) */
  }
}

export function CustomersProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Customer[]>(load)

  const get = useCallback((id: string) => list.find((c) => c.id === id), [list])

  const update = useCallback(
    (id: string, patch: Partial<Customer>) => {
      setList((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
        persist(next)
        return next
      })
    },
    [],
  )

  const add = useCallback((c: Customer) => {
    setList((prev) => {
      const next = [c, ...prev]
      persist(next)
      return next
    })
  }, [])

  return <Ctx.Provider value={{ list, get, update, add }}>{children}</Ctx.Provider>
}

export function useCustomers(): CustomersValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCustomers must be used within CustomersProvider')
  return ctx
}
