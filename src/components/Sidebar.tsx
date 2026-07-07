import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { ChevronsUpDown, Building2, X, Check } from 'lucide-react'
import { navGroups } from '@/config/navigation'
import { currentUser, effectiveRoleById } from '@/data/roles'
import { customers } from '@/data/mock'
import { useCustomerScope, ALL } from '@/context/CustomerScope'

/**
 * PLCY brand mark. Uses the logo asset at /plcy-logo.svg (or .png) when it is
 * present in `public/`, and falls back to the styled wordmark otherwise so the
 * header never looks broken.
 */
const LOGO_CANDIDATES = ['/plcy-logo.svg', '/plcy-logo.png']

function BrandMark() {
  const [idx, setIdx] = useState(0)
  if (idx < LOGO_CANDIDATES.length) {
    return (
      <img
        src={LOGO_CANDIDATES[idx]}
        alt="PLCY"
        className="h-9 w-auto max-w-[172px] object-contain object-left"
        onError={() => setIdx((i) => i + 1)}
      />
    )
  }
  return (
    <div className="text-[28px] font-extrabold leading-none tracking-tight text-[#1668c4]" aria-label="PLCY">
      PLCY
    </div>
  )
}

function CustomerSwitcher() {
  const { scope, setScope } = useCustomerScope()
  const [open, setOpen] = useState(false)
  const options = [ALL, ...customers.map((c) => c.name)]
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-slate-200">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Current Customer</p>
          <p className="truncate text-sm font-semibold text-ink-900">{scope}</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-cardhover">
            {options.map((name) => (
              <button
                key={name}
                onClick={() => { setScope(name); setOpen(false) }}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100',
                  name === scope ? 'font-semibold text-brand-700' : 'text-ink-700',
                )}
              >
                <span className="flex-1 truncate">{name}</span>
                {name === scope && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-900/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-start justify-between gap-2 px-5 py-5">
          <div>
            <BrandMark />
            <p className="mt-1.5 text-[10px] font-semibold uppercase leading-tight tracking-[0.16em] text-ink-400">
              Admin Console
            </p>
          </div>
          <button className="btn-ghost -mr-2 p-1.5 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current customer switcher */}
        <div className="px-3">
          <CustomerSwitcher />
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx('nav-link', isActive && 'nav-link-active')
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-semibold text-white">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{currentUser.name}</p>
              <p className="truncate text-xs text-ink-400">
                {effectiveRoleById(currentUser.roleId)?.name ?? 'Member'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
