import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Mark } from '../brand/Mark'
import { Wordmark } from '../brand/Wordmark'
import { Icon, type IconName } from '../icons'
import { useLive } from '../backend/LiveProvider'
import { useWorkspace } from '../workspace/Workspace'
import { SessionClock, SessionLabel } from './SessionClock'
import styles from './TitleBar.module.scss'

// Window controls only exist inside Tauri; in a plain browser (vite dev) they're hidden.
const inTauri = isTauri()

function WindowButton({
  icon,
  label,
  action,
  danger,
}: {
  icon: IconName
  label: string
  action: () => Promise<void>
  danger?: boolean
}) {
  const run = (): void => {
    action().catch((error: unknown) => console.error(`Window ${label.toLowerCase()} failed`, error))
  }
  return (
    <button
      type="button"
      className={danger ? styles.close : styles.windowButton}
      aria-label={label}
      onClick={run}
    >
      <Icon name={icon} strokeWidth={1.5} />
    </button>
  )
}

/**
 * Custom title bar (decorations are off in tauri.conf.json). Empty areas carry
 * data-tauri-drag-region so the window drags and double-click maximises; the
 * attribute applies to the element itself only, so each passive container has it.
 */
export function TitleBar() {
  const appWindow = inTauri ? getCurrentWindow() : null
  const simulated = useLive()?.config.adapter === 'mock'
  const { go } = useWorkspace()
  return (
    <header className={styles.bar} data-tauri-drag-region>
      <div className={styles.side} data-tauri-drag-region>
        <Mark size={20} />
        <Wordmark size={14} />
        <span className={styles.divider} />
        <SessionLabel />
      </div>
      <SessionClock />
      <div className={styles.sideEnd} data-tauri-drag-region>
        {simulated && (
          <button
            type="button"
            className={styles.simulator}
            title="Simulated data, not your live session. Switch to Le Mans Ultimate in Settings."
            onClick={() => go('settings')}
          >
            <Icon name="radio" size={13} strokeWidth={2} />
            Simulator
          </button>
        )}
        {appWindow && (
          <>
            <WindowButton icon="minimize" label="Minimize" action={() => appWindow.minimize()} />
            <WindowButton
              icon="maximize"
              label="Maximize"
              action={() => appWindow.toggleMaximize()}
            />
            <WindowButton icon="close" label="Close" action={() => appWindow.close()} danger />
          </>
        )}
      </div>
    </header>
  )
}
