import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Menu,
  Search,
  Bell,
  Plus,
  Users,
  Bot,
  Package,
  Server,
  LayoutDashboard,
  CornerDownLeft,
  AlertOctagon,
  Receipt,
  CalendarPlus,
  Lock,
  Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { flatNav } from '@/config/navigation'
import { models, instances } from '@/data/mock'
import { packs as policyPacks, controls as policyControls, familyOf } from '@/data/policy'
import { recentAlerts } from '@/data/notifications'
import type { AlertSeverity } from '@/data/notifications'
import { useCustomerScope } from '@/context/CustomerScope'
import { useCustomers } from '@/context/Customers'
import { useSession } from '@/context/Session'
import type { Capability } from '@/data/permissions'

interface Result {
  kind: string
  icon: LucideIcon
  label: string
  sub: string
  to: string
  customer?: string
}

interface CreateItem {
  label: string
  icon: LucideIcon
  to: string
  cap: Capability
}

const CREATE_ITEMS: CreateItem[] = [
  { label: 'New customer', icon: Users, to: '/customers', cap: 'customer.manage' },
  { label: 'New instance', icon: Server, to: '/instances', cap: 'provision.manage' },
  { label: 'Register model', icon: Bot, to: '/models', cap: 'model.register' },
  { label: 'Report incident', icon: AlertOctagon, to: '/incidents', cap: 'incident.manage' },
  { label: 'Issue invoice', icon: Receipt, to: '/billing', cap: 'license.manage' },
  { label: 'Schedule maintenance', icon: CalendarPlus, to: '/sla', cap: 'provision.manage' },
]

const sevDot: Record<AlertSeverity, string> = {
  Critical: 'bg-rose-500',
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-slate-400',
}

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { setScope } = useCustomerScope()
  const { list: customers } = useCustomers()
  const { can } = useSession()
  const current = flatNav.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
  const title = current?.label ?? 'Dashboard'

  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [unread, setUnread] = useState(true)
  const blurTimer = useRef<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl-K focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const index = useMemo<Result[]>(
    () => [
      ...customers.map((c) => ({ kind: 'Customer', icon: Users, label: c.name, sub: c.domain, to: `/customers/${c.id}`, customer: c.name })),
      ...models.map((m) => ({ kind: 'Model', icon: Bot, label: m.name, sub: `${m.provider} · ${m.customer}`, to: '/models' })),
      ...policyPacks.map((p) => ({ kind: 'Policy Pack', icon: Package, label: p.name, sub: p.type === 'primitive' ? 'Primitive' : `Composite · ${p.kind}`, to: '/policy-packs' })),
      ...policyControls.map((c) => ({ kind: 'Control', icon: Package, label: `${c.id} — ${c.name}`, sub: familyOf(c.prefix), to: '/policy-packs' })),
      ...instances.map((i) => ({ kind: 'Instance', icon: Server, label: i.name, sub: i.customer, to: '/instances' })),
      ...flatNav.map((n) => ({ kind: 'Page', icon: LayoutDashboard, label: n.label, sub: 'Go to page', to: n.to })),
    ],
    [customers],
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

  const create = (item: CreateItem) => {
    setNewOpen(false)
    if (!can(item.cap)) return
    navigate(item.to, { state: { create: true } })
  }

  const openBell = () => {
    setBellOpen((o) => !o)
    setUnread(false)
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
          ref={searchRef}
          className="input pl-9 pr-10"
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
            if (e.key === 'Escape') {
              setOpen(false)
              searchRef.current?.blur()
            }
          }}
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-400 lg:block">
          ⌘K
        </kbd>

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

      {/* + New */}
      <div className="relative">
        <button className="btn-secondary hidden sm:inline-flex" onClick={() => setNewOpen((o) => !o)} aria-haspopup="menu" aria-expanded={newOpen}>
          <Plus className="h-4 w-4" />
          New
        </button>
        {newOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setNewOpen(false)} />
            <div className="absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-cardhover">
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Create</p>
              {CREATE_ITEMS.map((item) => {
                const Icon = item.icon
                const allowed = can(item.cap)
                return (
                  <button
                    key={item.label}
                    onClick={() => create(item)}
                    disabled={!allowed}
                    title={allowed ? undefined : 'Your role does not permit this action'}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-ink-500" />
                    <span className="flex-1 text-ink-800">{item.label}</span>
                    {!allowed && <Lock className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          className="relative rounded-lg p-2 text-ink-500 transition-colors hover:bg-slate-100"
          aria-label="Notifications"
          onClick={openBell}
        >
          <Bell className="h-5 w-5" />
          {unread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
        </button>
        {bellOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setBellOpen(false)} />
            <div className="absolute right-0 top-full z-40 mt-1.5 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-cardhover">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-ink-900">Notifications</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <Check className="h-3 w-3" /> Marked read
                </span>
              </div>
              <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {recentAlerts.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => {
                        setBellOpen(false)
                        navigate('/notifications')
                      }}
                      className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sevDot[a.severity]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink-800">{a.event}</span>
                        <span className="block text-xs text-ink-400">{a.category} · {a.time}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setBellOpen(false)
                  navigate('/notifications')
                }}
                className="w-full border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-brand-700 transition-colors hover:bg-slate-50"
              >
                View all notifications
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
