import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Home, ChevronRight } from 'lucide-react'
import { navGroups, flatNav, hubSubPages } from '@/config/navigation'
import { useCustomers } from '@/context/Customers'
import { useEmployees } from '@/context/Employees'

/**
 * System-wide breadcrumb trail, rendered once in the Layout above every page.
 * Driven by the navigation config: Home › Group › Page › (tab / detail).
 * - Hub and Settings tabs (?tab=) resolve to a friendly sub-page name.
 * - Detail routes (/customers/:id, /team/:id, /clusters/:id) resolve to the
 *   entity name where available.
 * The Dashboard (home) and the Documentation section render their own, so this
 * stays out of their way.
 */
interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const { list: customers } = useCustomers()
  const { get: getEmployee } = useEmployees()

  // Home has no trail; Docs owns its own contextual breadcrumbs.
  if (pathname === '/' || pathname.startsWith('/docs')) return null

  const item = flatNav.find((n) => n.to !== '/' && (pathname === n.to || pathname.startsWith(`${n.to}/`)))
  if (!item) return null // unknown route (e.g. 404)

  const group = navGroups.find((g) => g.items.includes(item))
  const crumbs: Crumb[] = [{ label: 'Home', to: '/' }]
  if (group) crumbs.push({ label: group.title })
  crumbs.push({ label: item.label, to: item.to })

  // Third level — a detail entity, or a hub / settings tab.
  if (pathname !== item.to && pathname.startsWith(`${item.to}/`)) {
    const id = pathname.slice(item.to.length + 1).split('/')[0]
    const name = detailName(item.to, id, customers, getEmployee)
    if (name) crumbs.push({ label: name })
  } else {
    const tab = params.get('tab')
    if (tab) {
      const sub = hubSubPages.find((p) => p.to === `${pathname}?tab=${tab}`)
      crumbs.push({ label: sub?.label ?? tab })
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 text-ink-300" />}
            {i === 0 ? (
              <Link to="/" aria-label="Home" className="flex items-center text-ink-400 transition-colors hover:text-brand-600">
                <Home className="h-3.5 w-3.5" />
              </Link>
            ) : c.to && !last ? (
              <Link to={c.to} className="font-medium text-ink-500 transition-colors hover:text-brand-600">{c.label}</Link>
            ) : (
              <span className={last ? 'font-semibold text-ink-800' : 'font-medium text-ink-500'}>{c.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

function detailName(
  base: string,
  id: string,
  customers: { id: string; name: string }[],
  getEmployee: (id: string) => { name: string } | undefined,
): string | null {
  if (base === '/customers') return customers.find((c) => c.id === id)?.name ?? 'Customer'
  if (base === '/team') return getEmployee(id)?.name ?? 'Team member'
  if (base === '/clusters') return 'Cluster'
  return null
}
