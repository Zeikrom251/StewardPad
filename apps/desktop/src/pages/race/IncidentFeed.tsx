import { useState } from 'react'
import type { Incident } from '@stewardpad/shared'
import { Icon } from '../../icons'
import { incidentLap, newestFirst, surname } from '../../lib/cars'
import { formatHms } from '../../lib/format'
import { TYPE_LABEL } from '../../lib/labels'
import { Kbd, MergedTag, Plate, ServedTag, SourceTag, StatusChip, cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { ReviewerStack } from '../../team/ReviewerStack'
import { useWorkspace } from '../../workspace/Workspace'
import { Attribution } from '../../team/Attribution'
import styles from './IncidentFeed.module.scss'

export function FeedItem({
  incident,
  open,
  onOpen,
}: {
  incident: Incident
  open: boolean
  onOpen: () => void
}) {
  return (
    <button type="button" className={styles.item} aria-current={open || undefined} onClick={onOpen}>
      <span className={styles.line}>
        <span className={cx(ui.mono, ui.faint, styles.small)}>#{incident.sequenceNumber}</span>
        <span className={cx(ui.mono, styles.time)}>{formatHms(incident.eventSeconds)}</span>
        <span className={cx(ui.mono, ui.muted, styles.xs)}>L{incidentLap(incident)}</span>
        <span className={ui.grow} />
        <StatusChip status={incident.status} />
      </span>
      <span className={styles.line}>
        <span className={styles.type}>{TYPE_LABEL[incident.type]}</span>
        <SourceTag source={incident.source} />
        <MergedTag incident={incident} />
        <ServedTag incident={incident} />
        <span className={ui.grow} />
        <ReviewerStack names={incident.reviewers} />
      </span>
      {incident.cars.length > 0 && (
        <span className={styles.cars}>
          {incident.cars.map((car) => (
            <span key={`${car.carNumber}|${car.carClass}`} className={styles.car}>
              <Plate number={car.carNumber} carClass={car.carClass} small />
              {surname(car.driverName)}
            </span>
          ))}
        </span>
      )}
      <Attribution incident={incident} />
    </button>
  )
}

function FeedHead({
  total,
  openCount,
  onlyOpen,
  onChange,
}: {
  total: number
  openCount: number
  onlyOpen: boolean
  onChange: (onlyOpen: boolean) => void
}) {
  return (
    <div className={styles.head}>
      <span className={ui.label}>Incidents</span>
      <span className={cx(ui.mono, ui.faint, styles.small)}>{total}</span>
      <span className={ui.grow} />
      <span className={cx(ui.seg, styles.seg)}>
        <button type="button" aria-pressed={onlyOpen} onClick={() => onChange(true)}>
          Open<span className={styles.openCount}>{openCount}</span>
        </button>
        <button type="button" aria-pressed={!onlyOpen} onClick={() => onChange(false)}>
          All<span className={ui.count}>{total}</span>
        </button>
      </span>
    </div>
  )
}

function FeedFoot() {
  const { go } = useWorkspace()
  return (
    <div className={styles.foot}>
      <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={() => go('incidents')}>
        <Icon name="list" size={15} />
        Open incident log
      </button>
      <span className={ui.grow} />
      <span className={cx(ui.faint, styles.xs)}>
        <Kbd>E</Kbd> opens latest
      </span>
    </div>
  )
}

/** Newest-first incident stream under the quick log. Click docks the incident in the inspector. */
export function IncidentFeed({ incidents }: { incidents: Incident[] }) {
  const { openId, openIncident } = useWorkspace()
  const [onlyOpen, setOnlyOpen] = useState(false)
  const openCount = incidents.filter((i) => i.status === 'UNDER_INVESTIGATION').length
  const shown = newestFirst(incidents).filter(
    (i) => !onlyOpen || i.status === 'UNDER_INVESTIGATION',
  )
  return (
    <>
      <FeedHead
        total={incidents.length}
        openCount={openCount}
        onlyOpen={onlyOpen}
        onChange={setOnlyOpen}
      />
      <div className={styles.feed}>
        {shown.map((incident) => (
          <FeedItem
            key={incident.id}
            incident={incident}
            open={incident.id === openId}
            onOpen={() => openIncident(incident.id)}
          />
        ))}
        {shown.length === 0 && (
          <p className={styles.empty}>
            {onlyOpen
              ? 'Nothing under investigation.'
              : 'No incidents yet. Press Space to log one.'}
          </p>
        )}
      </div>
      <FeedFoot />
    </>
  )
}
