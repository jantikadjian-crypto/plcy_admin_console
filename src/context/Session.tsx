import { createContext, useContext, useState, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { currentUser } from '@/data/roles'
import { auditLog } from '@/data/mock'
import { roleCan } from '@/data/permissions'
import type { Capability } from '@/data/permissions'

export interface AuditItem {
  id: string
  actor: string
  action: string
  target: string
  category: string
  result: 'Success' | 'Denied'
  time: string
}

interface LogInput {
  action: string
  target: string
  category?: string
  result?: 'Success' | 'Denied'
}

interface SessionValue {
  /** The role the console is currently acting as (defaults to the signed-in user's role). */
  actingRole: string
  setActingRole: (roleId: string) => void
  can: (cap: Capability) => boolean
  audit: AuditItem[]
  logAction: (input: LogInput) => void
}

const Ctx = createContext<SessionValue | null>(null)

// Seed the audit trail from the existing mock entries.
const seedAudit: AuditItem[] = auditLog.map((e) => ({
  id: e.id,
  actor: e.actor,
  action: e.action,
  target: e.target,
  category: 'system',
  result: e.result,
  time: e.time,
}))

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [actingRole, setActingRole] = useState<string>(currentUser.roleId)
  const [audit, setAudit] = useState<AuditItem[]>(seedAudit)
  const counter = useRef(0)

  const can = useCallback((cap: Capability) => roleCan(actingRole, cap), [actingRole])

  const logAction = useCallback((input: LogInput) => {
    counter.current += 1
    const item: AuditItem = {
      id: `evt_${counter.current}`,
      actor: currentUser.email,
      action: input.action,
      target: input.target,
      category: input.category ?? 'action',
      result: input.result ?? 'Success',
      time: nowStamp(),
    }
    setAudit((prev) => [item, ...prev])
  }, [])

  return <Ctx.Provider value={{ actingRole, setActingRole, can, audit, logAction }}>{children}</Ctx.Provider>
}

export function useSession(): SessionValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
