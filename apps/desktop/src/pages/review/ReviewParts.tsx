import { useEffect, useRef, type ReactNode } from 'react'
import type { Incident } from '@stewardpad/shared'
import { Icon } from '../../icons'
import { formatHms } from '../../lib/format'
import { TYPE_LABEL } from '../../lib/labels'
import { Kbd, SourceTag, cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { FeedItem } from '../race/IncidentFeed'
import type { QueueMode } from './useReviewQueue'
import styles from './ReviewPage.module.scss'

export function ReviewToolbar({
  mode,
  onMode,
  undecided,
  total,
  position,
  step,
}: {
  mode: QueueMode
  onMode: (mode: QueueMode) => void
  undecided: number
  total: number
  /** "3 of 12", or null when the queue is empty. */
  position: string | null
  step: (by: number) => void
}) {
  return (
    <div className={ui.toolbar}>
      <h1>Review</h1>
      <span className={ui.seg}>
        <button type="button" aria-pressed={mode === 'todo'} onClick={() => onMode('todo')}>
          To review<span className={ui.count}>{undecided}</span>
        </button>
        <button type="button" aria-pressed={mode === 'all'} onClick={() => onMode('all')}>
          All<span className={ui.count}>{total}</span>
        </button>
      </span>
      <span className={ui.grow} />
      {position && <span className={cx(ui.mono, ui.muted, styles.small)}>{position}</span>}
      <button type="button" className={cx(ui.btn, ui.sm)} onClick={() => step(-1)}>
        <Icon name="up" size={14} />
        Previous
      </button>
      <button type="button" className={cx(ui.btn, ui.primary, ui.sm)} onClick={() => step(1)}>
        Next
        <Icon name="down" size={14} />
      </button>
    </div>
  )
}

/** The queue in race order; the current incident scrolls into view as the steward steps. */
export function QueueList({ queue, currentId }: { queue: Incident[]; currentId: string | null }) {
  const { openIncident } = useWorkspace()
  const list = useRef<HTMLElement>(null)
  useEffect(() => {
    list.current?.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest' })
  }, [currentId])
  return (
    <nav ref={list} className={styles.queue} aria-label="Review queue">
      {queue.map((incident) => (
        <FeedItem
          key={incident.id}
          incident={incident}
          open={incident.id === currentId}
          onOpen={() => openIncident(incident.id)}
        />
      ))}
    </nav>
  )
}

export function ReviewHead({ incident, children }: { incident: Incident; children: ReactNode }) {
  return (
    <div className={styles.head}>
      <h2>
        Incident #{incident.sequenceNumber} · {TYPE_LABEL[incident.type]}
      </h2>
      <SourceTag source={incident.source} />
      <span className={cx(ui.grow, ui.faint, styles.small)}>
        Logged by {incident.loggedBy || 'LMU'} · {formatHms(incident.eventSeconds)}
      </span>
      {children}
    </div>
  )
}

export function StepHint() {
  return (
    <>
      <Kbd>Alt</Kbd> <Kbd>↑</Kbd> <Kbd>↓</Kbd> previous / next
    </>
  )
}

export function EmptyQueue({ total, onShowAll }: { total: number; onShowAll: () => void }) {
  return (
    <div className={styles.empty}>
      <Icon name="check" size={28} />
      <b>{total ? 'Every incident has a decision' : 'No incidents logged yet'}</b>
      {total > 0 && (
        <button type="button" className={cx(ui.btn, ui.sm)} onClick={onShowAll}>
          Show all {total}
        </button>
      )}
    </div>
  )
}
