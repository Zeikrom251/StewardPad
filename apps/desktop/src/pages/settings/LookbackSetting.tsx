import { backend } from '../../backend/backend'
import { Icon } from '../../icons'
import { formatHms } from '../../lib/format'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import styles from './SettingsPage.module.scss'

const MAX_LOOKBACK = 120
// Timeline geometry: the keypress sits at a fixed x; the stamp moves left with the look-back.
// Clamped so the two labels never collide and a long look-back still fits the row.
const PRESS_X = 400
const PX_PER_SECOND = 12
const MIN_SPAN = 120
const MAX_SPAN = 320

/** The stamp sits `seconds` left of the keypress on a clamped, readable scale. */
function Timeline({ seconds, elapsed }: { seconds: number; elapsed: number }) {
  const width = seconds === 0 ? 0 : Math.min(MAX_SPAN, Math.max(MIN_SPAN, seconds * PX_PER_SECOND))
  return (
    <div className={styles.timeline} aria-hidden="true">
      <div className={styles.line} />
      {seconds > 0 && (
        <>
          <div className={styles.span} style={{ left: PRESS_X - width, width }} />
          <div className={styles.stamp} style={{ left: PRESS_X - width }}>
            <span>stamped {formatHms(elapsed - seconds)}</span>
            <i />
          </div>
        </>
      )}
      <div className={styles.press} style={{ left: PRESS_X }}>
        <span>
          {seconds > 0 ? 'Space' : 'Space = stamp'} at {formatHms(elapsed)}
        </span>
        <i />
      </div>
    </div>
  )
}

/** Whole-second stepper plus a picture of what the look-back does to the stamp. */
export function LookbackSetting({ seconds, elapsed }: { seconds: number; elapsed: number }) {
  const { report } = useWorkspace()
  const set = (next: number) => {
    backend
      .updateConfig({ lookbackSeconds: Math.min(MAX_LOOKBACK, Math.max(0, next)) })
      .catch((error: unknown) => report('Could not change the look-back', error))
  }
  return (
    <>
      <div className={styles.inline}>
        <span className={styles.stepper}>
          <button
            type="button"
            aria-label="One second less"
            disabled={seconds <= 0}
            onClick={() => set(seconds - 1)}
          >
            <Icon name="minus" size={14} />
          </button>
          <span className={styles.stepValue} aria-live="polite">
            {seconds}
            <small>s</small>
          </span>
          <button
            type="button"
            aria-label="One second more"
            disabled={seconds >= MAX_LOOKBACK}
            onClick={() => set(seconds + 1)}
          >
            <Icon name="plus" size={14} />
          </button>
        </span>
        <span className={ui.muted}>Whole seconds · also shown in the status bar</span>
      </div>
      <Timeline seconds={seconds} elapsed={elapsed} />
    </>
  )
}
