import { useLocation } from 'react-router-dom'
import { Menu, Search, Bell, Plus } from 'lucide-react'
import { flatNav } from '@/config/navigation'

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const current = flatNav.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
  const title = current?.label ?? 'Dashboard'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <button className="btn-ghost -ml-2 p-2 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <h2 className="text-sm font-semibold text-ink-700">{title}</h2>

      <div className="relative ml-auto hidden max-w-xs flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          className="input pl-9"
          placeholder="Search customers, models, policies…"
          aria-label="Search"
        />
      </div>

      <button className="btn-secondary hidden sm:inline-flex">
        <Plus className="h-4 w-4" />
        New
      </button>

      <button className="relative rounded-lg p-2 text-ink-500 transition-colors hover:bg-slate-100" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
      </button>
    </header>
  )
}
