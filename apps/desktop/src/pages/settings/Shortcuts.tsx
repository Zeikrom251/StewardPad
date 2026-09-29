import { Kbd, cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import styles from './SettingsPage.module.scss'

// The one list of what the keyboard layer (workspace/useShortcuts.ts) does.
export const SHORTCUTS: Array<[string, string]> = [
  ['Space', 'Quick-log for the selected car(s), or none'],
  ['1–9', 'Select the car in that standings position'],
  ['Esc', 'Leave a field / close the inspector / clear the selection'],
  ['E', 'Open the most recently logged incident'],
  ['Ctrl K', 'Command palette: cars, incidents, actions'],
  ['Ctrl F', 'Find a car in the standings'],
  ['Alt ↑ ↓', 'Review page: previous / next incident, even while typing'],
  ['?', 'Show all shortcuts'],
]

export function Shortcuts() {
  return (
    <div className={cx(ui.card, styles.shortcuts)}>
      {SHORTCUTS.map(([key, what]) => (
        <div key={key}>
          <Kbd>{key}</Kbd>
          <span>{what}</span>
        </div>
      ))}
    </div>
  )
}

/** The rail's "Keys" page: the same reference, on its own. */
export function KeysPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.title}>
          <h1>Keyboard shortcuts</h1>
          <span className={ui.muted}>
            Single keys are ignored while you type in a field. Ctrl K, Alt ↑ ↓ and Esc always work.
          </span>
        </div>
        <Shortcuts />
      </div>
    </div>
  )
}
