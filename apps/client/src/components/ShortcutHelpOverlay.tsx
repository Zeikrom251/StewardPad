import { CloseIcon } from './icons'
import { Modal } from './Modal'

const SHORTCUTS: Array<[string, string]> = [
  ['Space', 'Quick-log an incident for the selected car(s), or none'],
  ['1–9', 'Select the car in that standings position'],
  ['Esc', 'Clear selection'],
  ['E', 'Open the most recently logged incident'],
  ['/', 'Jump to an incident by number, car, or driver'],
  ['?', 'Show this help (Esc closes it)'],
]

export function ShortcutHelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="shortcut-help-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="shortcut-help-title" className="text-sm font-medium text-text">
          Keyboard shortcuts
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-text"
          aria-label="Close shortcut help"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>
      <dl className="space-y-2 text-sm">
        {SHORTCUTS.map(([key, description]) => (
          <div key={key} className="flex items-baseline justify-between gap-4">
            <dt className="font-mono text-text">{key}</dt>
            <dd className="text-right text-text-muted">{description}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}
