import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { backend, onBackendEvent, type Snapshot } from './backend'

const LiveContext = createContext<Snapshot | null>(null)

/**
 * Loads the snapshot once, then keeps it current from backend events. `null` until the
 * first snapshot arrives (and always in a plain browser, where there is no backend).
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<Snapshot | null>(null)

  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    const patch = (change: Partial<Snapshot>) => setLive((s) => (s ? { ...s, ...change } : s))
    // Listen first, then load: an update landing in between only refreshes a value.
    const unlisteners: Array<Promise<UnlistenFn>> = [
      onBackendEvent('session:update', (session) => patch({ session })),
      onBackendEvent('standings:update', (standings) => patch({ standings })),
      onBackendEvent('incidents:update', (incidents) => patch({ incidents })),
      onBackendEvent('config:update', (config) => patch({ config })),
      onBackendEvent('account:update', (account) => patch({ account })),
      onBackendEvent('team:update', (team) => patch({ team })),
    ]
    backend
      .snapshot()
      .then((snapshot) => {
        if (!cancelled) setLive(snapshot)
      })
      .catch((error: unknown) => console.error('Failed to load the backend snapshot', error))
    return () => {
      cancelled = true
      for (const unlisten of unlisteners) {
        unlisten
          .then((stop) => stop())
          .catch((error: unknown) => console.error('Failed to stop a backend listener', error))
      }
    }
  }, [])

  return <LiveContext.Provider value={live}>{children}</LiveContext.Provider>
}

export function useLive(): Snapshot | null {
  return useContext(LiveContext)
}
