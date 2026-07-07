import { clsx } from 'clsx'
import { Lock } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useSession } from '@/context/Session'
import type { Capability } from '@/data/permissions'

/**
 * A button that is disabled (with a lock affordance + tooltip) when the current
 * acting role lacks the required capability. Otherwise behaves like a normal button.
 */
export function GatedButton({
  cap,
  children,
  className,
  disabled,
  showLock = true,
  ...rest
}: {
  cap: Capability
  children: ReactNode
  showLock?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { can } = useSession()
  const allowed = can(cap)
  return (
    <button
      {...rest}
      disabled={disabled || !allowed}
      aria-disabled={disabled || !allowed}
      title={allowed ? rest.title : 'Your role does not permit this action'}
      className={clsx(className, !allowed && 'cursor-not-allowed opacity-50')}
    >
      {!allowed && showLock && <Lock className="h-3.5 w-3.5" />}
      {children}
    </button>
  )
}
