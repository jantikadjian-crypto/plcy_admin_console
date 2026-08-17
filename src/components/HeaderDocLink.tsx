import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { docForRoute } from '@/data/docs'

/**
 * Contextual documentation link in the top bar. When the current page has a
 * matching help article it shows a "Docs" pill that deep-links straight to it;
 * otherwise a quiet book icon that opens the documentation home. Hidden while
 * already in the docs section.
 */
export function HeaderDocLink() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()

  if (pathname.startsWith('/docs')) return null

  const tab = params.get('tab')
  const key = tab ? `${pathname}?tab=${tab}` : pathname
  const doc = docForRoute(key)

  if (doc) {
    return (
      <Link
        to={`/docs/${doc.slug}`}
        title={`Documentation: ${doc.title}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
      >
        <BookOpen className="h-4 w-4" />
        <span className="hidden sm:inline">Docs</span>
      </Link>
    )
  }

  return (
    <Link
      to="/docs"
      title="Documentation"
      aria-label="Documentation"
      className="inline-flex shrink-0 items-center rounded-lg p-2 text-ink-500 transition-colors hover:bg-slate-100 hover:text-ink-800"
    >
      <BookOpen className="h-5 w-5" />
    </Link>
  )
}
