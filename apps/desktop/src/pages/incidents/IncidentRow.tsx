import type { Incident } from '@stewardpad/shared'
import { Icon } from '../../icons'
import { incidentLap, surname } from '../../lib/cars'
import { formatHms } from '../../lib/format'
import { TYPE_LABEL } from '../../lib/labels'
import { MergedTag, Plate, ServedTag, SourceTag, StatusChip, cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { ReviewerStack } from '../../team/ReviewerStack'
import styles from './IncidentsPage.module.scss'

export const HEADERS = ['', '#', 'Time', 'Incident', 'Status', 'Claimed', 'Source']

/** Two-line review row. The box ticks it for bulk actions; the rest opens the inspector. */
export function IncidentRow({
  incident,
  open,
  checked,
  onOpen,
  onCheck,
}: {
  incident: Incident
  open: boolean
  checked: boolean
  onOpen: () => void
  onCheck: () => void
}) {
  return (
    <div
      className={styles.row}
      data-state={open ? 'open' : checked ? 'checked' : undefined}
      onClick={onOpen}
    >
      <span className={styles.center}>
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`Select #${incident.sequenceNumber}`}
          className={ui.check}
          onClick={(e) => {
            e.stopPropagation()
            onCheck()
          }}
        >
          {checked && <Icon name="check" size={11} strokeWidth={3} />}
        </button>
      </span>
      <span className={cx(ui.mono, ui.faint)}>#{incident.sequenceNumber}</span>
      <span className={styles.time}>
        <span className={ui.mono}>{formatHms(incident.eventSeconds)}</span>
        <span className={cx(ui.mono, ui.faint, styles.xs)}>Lap {incidentLap(incident)}</span>
      </span>
      {/* The row handles the click; this button makes it reachable by keyboard. */}
      <button type="button" className={styles.what}>
        <span className={styles.whatLine}>
          <b>{TYPE_LABEL[incident.type]}</b>
          <MergedTag incident={incident} />
          <span className={cx(ui.trunc, styles.summary)}>{incident.summary}</span>
        </span>
        <span className={styles.cars}>
          {incident.cars.map((car) => (
            <span key={`${car.carNumber}|${car.carClass}`}>
              <Plate number={car.carNumber} carClass={car.carClass} small />
              {surname(car.driverName)}
            </span>
          ))}
        </span>
      </button>
      <span className={styles.status}>
        <StatusChip status={incident.status} />
        <ServedTag incident={incident} />
      </span>
      <span>
        <ReviewerStack names={incident.reviewers} />
      </span>
      <span>
        <SourceTag source={incident.source} />
      </span>
    </div>
  )
}
