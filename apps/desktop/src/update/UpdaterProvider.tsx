import { createContext, useContext, type ReactNode } from 'react'
import { useUpdaterState, type Updater } from './useUpdaterState'

const UpdaterContext = createContext<Updater | null>(null)

/** One update check per launch, shared by the status bar and Settings → Updates. */
export function UpdaterProvider({ children }: { children: ReactNode }) {
  return <UpdaterContext.Provider value={useUpdaterState()}>{children}</UpdaterContext.Provider>
}

export function useUpdater(): Updater {
  const updater = useContext(UpdaterContext)
  if (!updater) throw new Error('useUpdater must be used inside <UpdaterProvider>')
  return updater
}
