import { createContext, useContext, type ReactNode } from 'react'
import { useAnnouncerState, type Announcer } from './useAnnouncerState'

const AnnouncerContext = createContext<Announcer | null>(null)

/** Discord announcements run for the app's life, whatever page the steward is on. */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  return (
    <AnnouncerContext.Provider value={useAnnouncerState()}>{children}</AnnouncerContext.Provider>
  )
}

export function useAnnouncer(): Announcer {
  const announcer = useContext(AnnouncerContext)
  if (!announcer) throw new Error('useAnnouncer must be used inside <AnnouncerProvider>')
  return announcer
}
