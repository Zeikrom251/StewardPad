import type { Incident, StandingEntry } from '@stewardpad/shared'
import { Icon } from '../../icons'
import type { Column } from './standingsColumns'
import styles from './Standings.module.scss'

export function IncidentCount({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) return <span className={styles.faint}>–</span>
  const open = incidents.some((i) => i.status === 'UNDER_INVESTIGATION')
  return (
    <span
      className={open ? styles.incOpen : styles.inc}
      title={open ? 'Under investigation' : undefined}
    >
      <Icon name="flag" size={11} strokeWidth={2} />
      {incidents.length}
    </span>
  )
}

const ALIGN = { left: styles.left, center: styles.center }

/** Header cells, aligned the same way as their column's cells. */
export function StandingsHead({ columns, template }: { columns: Column[]; template: string }) {
  return (
    <div className={styles.head} style={{ gridTemplateColumns: template }}>
      {columns.map((c) => (
        <span key={c.id} className={c.align && ALIGN[c.align]} data-col={c.id}>
          {c.label}
        </span>
      ))}
    </div>
  )
}

/** One timing-tower row. Click toggles the car into the quick-log selection. */
export function StandingsRow({
  entry,
  columns,
  template,
  order,
  marked,
  incidents,
  onToggle,
}: {
  entry: StandingEntry
  columns: Column[]
  template: string
  /** 1 or 2 when selected for quick log, else 0. */
  order: number
  /** Involved in the incident open in the inspector. */
  marked: boolean
  incidents: Incident[]
  onToggle: (slotId: number) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={order > 0}
      className={styles.row}
      style={{ gridTemplateColumns: template }}
      data-state={order > 0 ? 'selected' : marked ? 'marked' : undefined}
      data-pit={entry.inPit || undefined}
      onClick={() => onToggle(entry.slotId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onToggle(entry.slotId)
      }}
    >
      {columns.map((c) => (
        <span key={c.id} className={c.align && ALIGN[c.align]} data-col={c.id}>
          {c.cell(entry, { order, incidents })}
        </span>
      ))}
    </div>
  )
}
