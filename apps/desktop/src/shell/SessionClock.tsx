import type { SessionPhase } from '@stewardpad/shared'
import { useLive } from '../backend/LiveProvider'
import { formatHms } from '../lib/format'
import styles from './SessionClock.module.scss'

const PHASE_LABEL: Record<SessionPhase, string> = {
  GREEN: 'Green flag',
  YELLOW: 'Yellow',
  FCY: 'Full-course yellow',
  SAFETY_CAR: 'Safety car',
  RED: 'Red flag',
  FINISHED: 'Finished',
  UNKNOWN: 'No signal',
}

/** Track and session type, left of the title bar. */
export function SessionLabel() {
  const session = useLive()?.session
  if (!session?.trackName) return <span className={styles.label}>No session</span>
  return (
    <span className={styles.label} data-tauri-drag-region>
      <span className={styles.track}>{session.trackName}</span>
      <span className={styles.type}>{session.sessionType}</span>
    </span>
  )
}

/** Phase flag, race clock and time remaining — the centre of the title bar. */
export function SessionClock() {
  const session = useLive()?.session
  const online = session?.connected ?? false
  const phase: SessionPhase = online && session ? session.sessionPhase : 'UNKNOWN'
  const remaining = online ? session?.remainingSeconds : null
  return (
    <div className={styles.center} data-tauri-drag-region>
      <span className={styles.phase} data-phase={phase}>
        <i />
        {PHASE_LABEL[phase]}
      </span>
      <span className={online ? styles.clock : styles.clockStale} data-tauri-drag-region>
        {session && session.elapsedSeconds > 0 ? formatHms(session.elapsedSeconds) : '--:--:--'}
      </span>
      {remaining != null && (
        <span className={styles.remaining} data-tauri-drag-region>
          <small>Remaining</small>
          {formatHms(remaining)}
        </span>
      )}
    </div>
  )
}
