import type { CsvDelimiter, Incident, SessionType } from '@stewardpad/shared'
import type { Snapshot } from '../../backend/backend'
import { Plate, cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import styles from './ReportsPage.module.scss'

export const DRIVER_COLUMNS = [
  '#',
  'Time',
  'Lap',
  'Cars',
  'Caused by',
  'Affected',
  'Type',
  'Rules',
  'Investigation',
  'Status',
  'Decision',
  'Penalty',
  '~Steward notes',
  '~Reviewed by',
]
export const DOCUMENT_CONTENTS = [
  'Penalty summary',
  'Decisions in race order',
  'Cars and roles',
  'Rules cited',
  'Investigation',
  'Decision',
  'Penalty, served',
  'Still under review',
  '~Steward notes',
]
export const PENALTY_COLUMNS = [
  '#',
  'Time',
  'Lap',
  'Car',
  'Class',
  'Driver',
  'Penalty',
  'Seconds',
  'Served',
  'Rules',
  'Decision',
]
export const RESULTS_CONTENTS = [
  'Event',
  'Decisions',
  'Cars and roles',
  'Rules',
  'Penalties',
  '~Steward notes',
  '~Steward names',
]
export const FULL_COLUMNS = [
  'Everything in the driver sheet',
  'Reviewed by',
  'Logged at',
  'Look-back',
  'Wall clock',
  'Replay reference',
  'Source',
  '~Steward notes',
]

export const SESSION_LABEL: Record<SessionType, string> = {
  PRACTICE: 'Practice',
  QUALIFYING: 'Qualifying',
  RACE: 'Race',
  UNKNOWN: '',
}

/** "Sebring International Raceway · Race · 13 incidents · 3 penalties" */
export function subtitle({ session, incidents }: Snapshot): string {
  const n = incidents.length
  const penalties = incidents.filter((i) => i.status === 'PENALTY_APPLIED').length
  return [
    session.trackName || 'No session',
    SESSION_LABEL[session.sessionType],
    `${n} incident${n === 1 ? '' : 's'}`,
    `${penalties} ${penalties === 1 ? 'penalty' : 'penalties'}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** What drivers will read: the first published decisions, one line each. */
export function DecisionPreview({ incidents }: { incidents: Incident[] }) {
  const decided = incidents
    .filter((i) => i.decision.trim())
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
    .slice(0, 3)
  if (decided.length === 0)
    return (
      <p className={styles.previewEmpty}>
        No decision written yet. The sheet will list incidents without one.
      </p>
    )
  return (
    <div className={styles.preview}>
      <div className={styles.previewHead}>
        <span>#</span>
        <span>Cars</span>
        <span>Decision</span>
      </div>
      {decided.map((i) => (
        <div key={i.id} className={styles.previewRow}>
          <span className={cx(ui.mono, ui.faint)}>{i.sequenceNumber}</span>
          <span>
            {i.cars[0] && (
              <Plate number={i.cars[0].carNumber} carClass={i.cars[0].carClass} small />
            )}
          </span>
          <span className={ui.trunc}>{i.decision.replace(/[*_]/g, '')}</span>
        </div>
      ))}
    </div>
  )
}

export function DelimiterSwitch({
  value,
  onChange,
}: {
  value: CsvDelimiter
  onChange: (d: CsvDelimiter) => void
}) {
  return (
    <span className={ui.seg}>
      <button
        type="button"
        aria-pressed={value === 'semicolon'}
        onClick={() => onChange('semicolon')}
      >
        <b className={ui.mono}>;</b>Semicolon · Excel EU
      </button>
      <button type="button" aria-pressed={value === 'comma'} onClick={() => onChange('comma')}>
        <b className={ui.mono}>,</b>Comma
      </button>
    </span>
  )
}
