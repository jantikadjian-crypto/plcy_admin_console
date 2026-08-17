import { useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * A section hub: a compact tab bar over a set of existing pages, addressed by
 * `?tab=`. Each tab renders a full page (which brings its own header), so the
 * hub adds section context without duplicating page chrome. Old standalone
 * routes redirect into the matching tab, so deep links keep working.
 */
export interface HubTab {
  key: string
  label: string
  icon?: LucideIcon
  element: ReactNode
}

export function Hub({ tabs, defaultKey }: { tabs: HubTab[]; defaultKey: string }) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const activeKey = tabs.some((t) => t.key === requested) ? (requested as string) : defaultKey
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0]

  const select = (key: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', key)
        return next
      },
      { replace: false },
    )

  return (
    <>
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map((t) => {
          const Icon = t.icon
          const on = t.key === active.key
          return (
            <button
              key={t.key}
              onClick={() => select(t.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                on ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-500 hover:bg-slate-100 hover:text-ink-800'
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {t.label}
            </button>
          )
        })}
      </div>
      {active.element}
    </>
  )
}
