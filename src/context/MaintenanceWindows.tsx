import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { maintenanceWindows } from '@/data/sla'
import type { MaintenanceWindow } from '@/data/sla'

/**
 * Shared, persisted registry of scheduled maintenance windows. Both the SLA &
 * Maintenance page and the per-customer configuration change-request flow read
 * and write here, so a windowed config change (region / connectivity move)
 * schedules a real window that shows up on the SLA page and the customer's SLA
 * tab — not a throwaway local list.
 */
interface MaintValue {
  windows: MaintenanceWindow[]
  forCustomer: (name: string) => MaintenanceWindow[]
  schedule: (w: Omit<MaintenanceWindow, 'id' | 'status' | 'notified'> & Partial<Pick<MaintenanceWindow, 'notified'>>) => MaintenanceWindow
  toggleNotified: (id: string) => void
  complete: (id: string) => void
  cancel: (id: string) => void
}

const Ctx = createContext<MaintValue | null>(null)
const KEY = 'plcy.maintwindows.v1'

function load(): MaintenanceWindow[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MaintenanceWindow[]
      if (Array.isArray(parsed)) {
        // union any newly-shipped seed windows not already stored (by id)
        const ids = new Set(parsed.map((w) => w.id))
        return [...parsed, ...maintenanceWindows.filter((w) => !ids.has(w.id))]
      }
    }
  } catch {
    /* ignore */
  }
  return maintenanceWindows
}

function persist(w: MaintenanceWindow[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(w))
  } catch {
    /* ignore */
  }
}

let counter = 0

export function MaintenanceWindowsProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<MaintenanceWindow[]>(load)

  const commit = useCallback((next: MaintenanceWindow[]) => {
    setWindows(next)
    persist(next)
  }, [])

  const forCustomer = useCallback(
    (name: string) => windows.filter((w) => w.customer === name || w.customer === 'All'),
    [windows],
  )

  const schedule = useCallback<MaintValue['schedule']>(
    (w) => {
      counter += 1
      const created: MaintenanceWindow = { id: `mw_new_${Date.now()}_${counter}`, status: 'Scheduled', notified: false, ...w }
      commit([created, ...windows])
      return created
    },
    [windows, commit],
  )

  const toggleNotified = useCallback(
    (id: string) => commit(windows.map((w) => (w.id === id ? { ...w, notified: !w.notified } : w))),
    [windows, commit],
  )
  const complete = useCallback(
    (id: string) => commit(windows.map((w) => (w.id === id ? { ...w, status: 'Completed' } : w))),
    [windows, commit],
  )
  const cancel = useCallback(
    (id: string) => commit(windows.map((w) => (w.id === id ? { ...w, status: 'Cancelled' } : w))),
    [windows, commit],
  )

  return (
    <Ctx.Provider value={{ windows, forCustomer, schedule, toggleNotified, complete, cancel }}>
      {children}
    </Ctx.Provider>
  )
}

export function useMaintenanceWindows(): MaintValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMaintenanceWindows must be used within MaintenanceWindowsProvider')
  return ctx
}
