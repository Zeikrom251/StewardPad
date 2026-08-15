import { useCallback, useState } from 'react'
import type { Incident } from '@stewardpad/shared'
import { useAppData } from '../context/AppDataContext'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useToast } from '../hooks/useToast'
import { formatElapsed } from '../lib/format'
import { Toast } from './Toast'
import { ShortcutHelpOverlay } from './ShortcutHelpOverlay'
import { JumpToIncidentModal } from './JumpToIncidentModal'
import { QuestionMarkCircleIcon } from './icons'

function mostRecent(incidents: Incident[]): Incident | null {
  return incidents.reduce<Incident | null>(
    (latest, incident) =>
      !latest || incident.sequenceNumber > latest.sequenceNumber ? incident : latest,
    null,
  )
}

/** Mounted once in App: wires Space, 1-9, Esc, E, /, and ? everywhere except text inputs. */
export function GlobalShortcuts() {
  const {
    standings,
    selected,
    toggleSelection,
    clearSelection,
    quickLog,
    stewardName,
    incidents,
    openIncident,
  } = useAppData()
  const { toast, showToast, dismissToast } = useToast()
  const [helpOpen, setHelpOpen] = useState(false)
  const [jumpOpen, setJumpOpen] = useState(false)

  const handleQuickLog = useCallback(async () => {
    const slotIds = selected.length > 0 ? selected : undefined
    clearSelection()
    try {
      const incident = await quickLog({ slotIds, loggedBy: stewardName || undefined })
      showToast(`Incident #${incident.sequenceNumber} logged at`, {
        timestamp: formatElapsed(incident.eventSeconds),
      })
    } catch (error) {
      console.error('Quick-log failed', error)
      showToast('Could not log incident — check the connection')
    }
  }, [selected, stewardName, quickLog, clearSelection, showToast])

  const handleOpenLastIncident = useCallback(() => {
    const last = mostRecent(incidents)
    if (last) openIncident(last.id)
  }, [incidents, openIncident])

  // Escape reaching here means no modal is open (useKeyboardShortcuts skips
  // the whole shortcut set while focus is inside one — see its
  // isWithinOpenModal guard), so this is only ever "clear selection".
  // Closing the help modal itself goes through Modal's own onClose, wired
  // below, independent of this global layer.
  useKeyboardShortcuts({
    standings,
    onSelectPosition: toggleSelection,
    onQuickLog: handleQuickLog,
    onClearSelection: clearSelection,
    onOpenLastIncident: handleOpenLastIncident,
    onToggleHelp: () => setHelpOpen((open) => !open),
    onJumpToIncident: () => setJumpOpen(true),
  })

  return (
    <>
      <Toast toast={toast} onDismiss={dismissToast} />
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="fixed right-4 bottom-4 z-30 flex size-9 items-center justify-center rounded-full border border-border-strong bg-surface-raised text-text-muted hover:text-text"
        aria-label="Show keyboard shortcuts"
      >
        <QuestionMarkCircleIcon className="size-5" />
      </button>
      <ShortcutHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <JumpToIncidentModal
        open={jumpOpen}
        onClose={() => setJumpOpen(false)}
        incidents={incidents}
        onSelect={openIncident}
      />
    </>
  )
}
