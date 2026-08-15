import { useEffect } from 'react'
import type { StandingEntry } from '@stewardpad/shared'

export interface ShortcutHandlers {
  standings: StandingEntry[]
  onSelectPosition: (carNumber: string) => void
  onQuickLog: () => void
  onClearSelection: () => void
  onOpenLastIncident: () => void
  onToggleHelp: () => void
  onJumpToIncident: () => void
}

function isTextInput(element: Element | null): boolean {
  if (!element) return false
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')
    return true
  return element instanceof HTMLElement && element.isContentEditable
}

/**
 * True while focus sits inside an open `<dialog>` (the shared Modal
 * primitive). Escape in that state is the dialog's own close request, not
 * "clear selection" — and Space/1-9/E must stay silent too, same as typing
 * in a text input.
 */
function isWithinOpenModal(element: Element | null): boolean {
  return element !== null && element.closest('dialog[open]') !== null
}

/**
 * Global shortcut layer (prompt §8) — active on every page except while a
 * text input has focus or a modal is open, so it never fights typing in the
 * editor, a filter box, or the dialog's own Escape/close handling.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (isTextInput(document.activeElement) || isWithinOpenModal(document.activeElement)) return
      // Leave the browser's own chords alone, and never let a held key
      // auto-repeat into a run of duplicate incidents.
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return

      if (event.key === ' ') {
        event.preventDefault()
        handlers.onQuickLog()
      } else if (event.key >= '1' && event.key <= '9') {
        const entry = handlers.standings.find((s) => s.position === Number(event.key))
        if (entry) handlers.onSelectPosition(entry.carNumber)
      } else if (event.key === 'Escape') {
        handlers.onClearSelection()
      } else if (event.key === 'e' || event.key === 'E') {
        handlers.onOpenLastIncident()
      } else if (event.key === '?') {
        handlers.onToggleHelp()
      } else if (event.key === '/') {
        event.preventDefault()
        handlers.onJumpToIncident()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
