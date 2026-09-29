import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { isBackendError } from '../backend/backend'

export type Page =
  'race' | 'incidents' | 'review' | 'rules' | 'reports' | 'announce' | 'keys' | 'settings'

/** UI state shared across pages: where the steward is and what they're pointing at. */
export interface Workspace {
  page: Page
  go: (page: Page) => void
  /** Selected cars as LMU slotIds, oldest first — "car A vs car B". Max 2. */
  selection: number[]
  toggleCar: (slotId: number) => void
  clearSelection: () => void
  /** The incident docked in the inspector. */
  openId: string | null
  openIncident: (id: string | null) => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  /** Last failed action, shown in the status bar for a few seconds. */
  notice: string | null
  report: (context: string, error: unknown) => void
}

const WorkspaceContext = createContext<Workspace | null>(null)

const NOTICE_MS = 6000

function useNotice() {
  const [notice, setNotice] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const report = useCallback((context: string, error: unknown) => {
    console.error(context, error)
    const detail = isBackendError(error) ? error.message : String(error)
    setNotice(`${context}: ${detail}`)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setNotice(null), NOTICE_MS)
  }, [])
  return { notice, report }
}

/** Selecting a third car drops the oldest, keeping the most recent two. */
function useSelection() {
  const [selection, setSelection] = useState<number[]>([])
  const toggleCar = useCallback((slotId: number) => {
    setSelection((prev) => {
      if (prev.includes(slotId)) return prev.filter((s) => s !== slotId)
      return prev.length < 2 ? [...prev, slotId] : [...prev.slice(1), slotId]
    })
  }, [])
  const clearSelection = useCallback(() => setSelection([]), [])
  return { selection, toggleCar, clearSelection }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [page, go] = useState<Page>('race')
  const [openId, openIncident] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { selection, toggleCar, clearSelection } = useSelection()
  const { notice, report } = useNotice()
  const value = useMemo<Workspace>(
    () => ({
      page,
      go,
      openId,
      openIncident,
      paletteOpen,
      setPaletteOpen,
      selection,
      toggleCar,
      clearSelection,
      notice,
      report,
    }),
    [page, openId, paletteOpen, selection, toggleCar, clearSelection, notice, report],
  )
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext)
  if (!workspace) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return workspace
}
