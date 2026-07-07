import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export const ALL = 'All Customers'

interface ScopeValue {
  scope: string
  setScope: (s: string) => void
  isAll: boolean
}

const Ctx = createContext<ScopeValue | null>(null)

export function CustomerScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<string>(ALL)
  return <Ctx.Provider value={{ scope, setScope, isAll: scope === ALL }}>{children}</Ctx.Provider>
}

export function useCustomerScope(): ScopeValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCustomerScope must be used within CustomerScopeProvider')
  return ctx
}
