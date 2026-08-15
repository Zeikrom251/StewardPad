import { createContext, useContext } from 'react'
import type {
  AppConfig,
  CreateIncidentInput,
  Incident,
  QuickLogInput,
  SessionInfo,
  StandingEntry,
  UpdateConfigInput,
  UpdateIncidentInput,
} from '@stewardpad/shared'
import type { ConnectionState } from '../hooks/useSession'

export interface AppData {
  session: SessionInfo | null
  connectionState: ConnectionState
  elapsedSeconds: number
  standings: StandingEntry[]
  incidents: Incident[]
  quickLog: (input: QuickLogInput) => Promise<Incident>
  createIncident: (input: CreateIncidentInput) => Promise<Incident>
  updateIncident: (id: string, input: UpdateIncidentInput) => Promise<Incident>
  deleteIncident: (id: string) => Promise<void>
  config: AppConfig | null
  updateConfig: (input: UpdateConfigInput) => Promise<void>
  stewardName: string
  setStewardName: (name: string) => void
  selected: string[]
  toggleSelection: (carNumber: string) => void
  clearSelection: () => void
  openIncidentId: string | null
  openIncident: (id: string) => void
  closeIncident: () => void
}

export const AppDataContext = createContext<AppData | null>(null)

export function useAppData(): AppData {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData must be used within AppDataProvider')
  return context
}
