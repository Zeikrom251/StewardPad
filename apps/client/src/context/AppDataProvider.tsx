import { useState, type ReactNode } from 'react'
import { AppDataContext, type AppData } from './AppDataContext'
import { useSession } from '../hooks/useSession'
import { useElapsedClock } from '../hooks/useElapsedClock'
import { useStandings } from '../hooks/useStandings'
import { useIncidents } from '../hooks/useIncidents'
import { useConfig } from '../hooks/useConfig'
import { useStewardName } from '../hooks/useStewardName'
import { useSelection } from '../hooks/useSelection'

/**
 * One subscription per live resource, shared by every page and the global
 * keyboard-shortcut layer — components below just read context, they never
 * subscribe or fetch themselves ("components render, hooks decide").
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const { session, connectionState } = useSession()
  const elapsedSeconds = useElapsedClock(session)
  const standings = useStandings()
  const { incidents, quickLog, createIncident, updateIncident, deleteIncident } = useIncidents()
  const { config, updateConfig } = useConfig()
  const [stewardName, setStewardName] = useStewardName()
  const { selected, toggle: toggleSelection, clear: clearSelection } = useSelection()
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null)

  const value: AppData = {
    session,
    connectionState,
    elapsedSeconds,
    standings,
    incidents,
    quickLog,
    createIncident,
    updateIncident,
    deleteIncident,
    config,
    updateConfig,
    stewardName,
    setStewardName,
    selected,
    toggleSelection,
    clearSelection,
    openIncidentId,
    openIncident: setOpenIncidentId,
    closeIncident: () => setOpenIncidentId(null),
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
