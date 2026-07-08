import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Opens a page's create modal when it is navigated to with
 * `{ state: { create: true } }` — used by the top-bar "+ New" menu.
 * Fires once per navigation (location.key changes on each navigate).
 */
export function useCreateIntent(open: () => void) {
  const loc = useLocation()
  useEffect(() => {
    if ((loc.state as { create?: boolean } | null)?.create) open()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.key])
}
