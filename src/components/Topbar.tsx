import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, Plus, Users, Bot, Package, Server, LayoutDashboard, CornerDownLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { flatNav } from '@/config/navigation'
import { customers, models, policyPacks, instances } from '@/data/mock'
import { useCustomerScope } from '@/context/CustomerScope'

interface Result {
  kind: string
  icon: LucideIcon
  label: string
  sub: string
  to: string
  customer?: string
}

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { setScope } = useCustomerScope()
  const current = flatNav.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
  const title = current?.label ?? 'Dashboard'

  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const blurTimer = useRef<number | null>(null)

  const index = useMemo<Result[]>(
    () => [
      ...customers.map((c) => ({ kind: 'Customer', icon: Users, label: c.name, sub: c.domain, to: '/customers', customer: c.name })),
      ...models.map((m) => ({ kind: 'Model', icon: Bot, label: m.name, sub: `${m.provider} · ${m.customer}`, to: '/models' })),
      ...policyPacks.map((p) => ({ kind: 'Policy Pack', icon: Package, label: p.name, sub: p.category, to: '/policy-packs' })),
      ...instances.map((i) => ({ kind: 'Instance', icon: Server, label: i.name, sub: i.customer, to: '/instances' })),
      ...flatNav.map((n) => ({ kind: 'Page', icon: LayoutDashboard, label: n.label, sub: 'Go to page', to: n.to })),
    ],
    [],
  )

  const query = q.trim().toLowerCase()
  const results = query
    ? index.filter((r) => r.label.toLowerCase().includes(query) || r.sub.toLowerCase().includes(query)).slice(0, 8)
    : []

  const go = (r: Result) => {
    if (r.customer) setScope(r.customer)
    navigate(r.to)
    setQ('')
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <button className="btn-ghost -ml-2 p-2 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <h2 className="text-sm font-semibold text-ink-700">{title}</h2>

      <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          className="input pl-9"
          placeholder="Search customers, models, policies…"
          aria-label="Search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 120)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) go(results[0])
            if (e.key === 'Escape') setOpen(false)
          }}
        />

        {open && query && (
          <div
            className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-cardhover"
            onMouseDown={() => blurTimer.current && window.clearTimeout(blurTimer.current)}
          >
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-400">No matches for “{q}”.</p>
            ) : (
              <ul className="max-h-96 overflow-y-auto p-1.5">
                {results.map((r, i) => {
                  const Icon = r.icon
                  return (
                    <li key={`${r.kind}-${r.label}-${i}`}>
                      <button
                        onClick={() => go(r)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-100"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink-500">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink-900">{r.label}</span>
                          <span className="block truncate text-xs text-ink-500">{r.sub}</span>
                        </span>
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-500">
                          {r.kind}
                        </span>
                      </button>
                    </li>
                  )
                })}
                <li className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-ink-400">
                  <CornerDownLeft className="h-3 w-3" /> Enter to open the first result
                </li>
              </ul>
            )}
          </div>
        )}
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
