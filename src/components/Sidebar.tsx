import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { ChevronsUpDown, Building2, X } from 'lucide-react'
import { navGroups, ShieldCheck } from '@/config/navigation'

export default function Sidebar({
  open,
  onClose,
  currentCustomer,
}: {
  open: boolean
  onClose: () => void
  currentCustomer: string
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
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold leading-tight tracking-tight text-ink-900">
                PLCY
              </p>
              <p className="text-[11px] font-medium leading-tight text-ink-400">Admin Console</p>
            </div>
          </div>
          <button className="btn-ghost -mr-2 p-1.5 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current customer switcher */}
        <div className="px-3">
          <button className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-slate-200">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
                Current Customer
              </p>
              <p className="truncate text-sm font-semibold text-ink-900">{currentCustomer}</p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-400" />
          </button>
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
              JC
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">Jack Chen</p>
              <p className="truncate text-xs text-ink-400">Platform Admin</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
