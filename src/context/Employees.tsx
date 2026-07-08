import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { employeesSeed } from '@/data/team'
import type { Employee } from '@/data/team'

/**
 * Shared, editable employee store (localStorage-persisted). Single source of
 * truth for the Team directory and per-employee pages, so an edit — access
 * level, on-call, status — shows up everywhere and survives reload.
 */
interface EmployeesValue {
  list: Employee[]
  get: (id: string) => Employee | undefined
  update: (id: string, patch: Partial<Employee>) => void
  add: (e: Employee) => void
}

const Ctx = createContext<EmployeesValue | null>(null)
const STORAGE_KEY = 'plcy.employees.v1'

function load(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return employeesSeed
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? (parsed as Employee[]) : employeesSeed
  } catch {
    return employeesSeed
  }
}
function persist(list: Employee[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function EmployeesProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Employee[]>(load)

  const get = useCallback((id: string) => list.find((e) => e.id === id), [list])
  const update = useCallback((id: string, patch: Partial<Employee>) => {
    setList((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      persist(next)
      return next
    })
  }, [])
  const add = useCallback((e: Employee) => {
    setList((prev) => {
      const next = [e, ...prev]
      persist(next)
      return next
    })
  }, [])

  return <Ctx.Provider value={{ list, get, update, add }}>{children}</Ctx.Provider>
}

export function useEmployees(): EmployeesValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useEmployees must be used within EmployeesProvider')
  return ctx
}
