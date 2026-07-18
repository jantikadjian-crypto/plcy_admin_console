import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Home, ChevronRight } from 'lucide-react'
import { navGroups, flatNav, hubSubPages } from '@/config/navigation'
import { useCustomers } from '@/context/Customers'
import { useEmployees } from '@/context/Employees'
import { useDocs } from '@/data/docsStore'
import { glossaryById } from '@/data/glossary'

/**
 * The single, system-wide breadcrumb trail. Rendered in the sticky top bar so
 * it stays visible while scrolling. Driven by the navigation config:
 * Home › Group › Page › (tab / detail). Documentation and the Dashboard are
 * handled explicitly so every route — including those — shares one trail.
 */
interface Crumb {
  label: string
  to?: string
}

function Trail({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        return (
          <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-ink-300" />}
            {i === 0 ? (
              <Link to="/" aria-label="Home" className="flex shrink-0 items-center text-ink-400 transition-colors hover:text-brand-600">
                <Home className="h-3.5 w-3.5" />
              </Link>
            ) : c.to && !last ? (
              <Link to={c.to} className="shrink-0 font-medium text-ink-500 transition-colors hover:text-brand-600">{c.label}</Link>
            ) : (
              <span className={`truncate ${last ? 'font-semibold text-ink-800' : 'font-medium text-ink-500'}`}>{c.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const { list: customers } = useCustomers()
  const { get: getEmployee } = useEmployees()
  const docs = useDocs()

  // Dashboard
  if (pathname === '/') return <Trail crumbs={[{ label: 'Home', to: '/' }, { label: 'Dashboard' }]} />

  // Documentation — its own structure, unified into the same trail
  if (pathname.startsWith('/docs')) {
    const crumbs: Crumb[] = [{ label: 'Home', to: '/' }, { label: 'Documentation', to: '/docs' }]
    if (pathname.startsWith('/docs/glossary')) {
      crumbs.push({ label: 'Glossary', to: '/docs/glossary' })
      const term = params.get('term')
      const t = term ? glossaryById(term) : undefined
      if (t) crumbs.push({ label: t.term })
    } else if (pathname.startsWith('/docs/')) {
      const slug = pathname.slice('/docs/'.length).split('/')[0]
      const d = docs.find((x) => x.slug === slug)
      crumbs.push({ label: d?.title ?? 'Article' })
    }
    return <Trail crumbs={crumbs} />
  }

  const item = flatNav.find((n) => n.to !== '/' && (pathname === n.to || pathname.startsWith(`${n.to}/`)))
  if (!item) return <Trail crumbs={[{ label: 'Home', to: '/' }]} />

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

  return <Trail crumbs={crumbs} />
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
