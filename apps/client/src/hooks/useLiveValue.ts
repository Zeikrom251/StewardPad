import { useEffect, useState } from 'react'
import { apiGet } from '../lib/api'

/**
 * Generic "subscribe once, hold the latest value" hook. `subscribe` must be
 * a stable (module-level) function — each concrete resource hook defines
 * its own subscribe function outside the component so identity never
 * changes across renders, which keeps this effect from tearing the
 * subscription down and rebuilding it every render.
 *
 * `bootstrapPath` is read once over REST on mount. The gateway does push
 * current state on connect, but that burst can land before this effect
 * subscribes, and `incidents:update` does not fire again until the next
 * mutation — without the read, a page loaded mid-race can show an empty
 * incident list for the rest of the session.
 */
export function useLiveValue<T>(
  subscribe: (onValue: (value: T) => void) => () => void,
  bootstrapPath: string,
): T | null {
  const [value, setValue] = useState<T | null>(null)

  useEffect(() => subscribe(setValue), [subscribe])

  useEffect(() => {
    let cancelled = false
    apiGet<T>(bootstrapPath)
      .then((initial) => {
        // A socket push that already arrived is newer — never overwrite it.
        if (!cancelled) setValue((current) => current ?? initial)
      })
      .catch((error: unknown) => {
        console.error(`Failed to load initial ${bootstrapPath}`, error)
      })
    return () => {
      cancelled = true
    }
  }, [bootstrapPath])

  return value
}
