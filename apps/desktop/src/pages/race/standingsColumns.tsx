import type { ReactNode } from 'react'
import type { Incident, StandingEntry } from '@stewardpad/shared'
import { formatLapTime, formatSector } from '../../lib/format'
import { ClassTag, Plate } from '../../ui/primitives'
import { IncidentCount } from './StandingsRow'
import styles from './Standings.module.scss'

export interface RowContext {
  /** 1 or 2 when selected for quick log, else 0. */
  order: number
  incidents: Incident[]
}

/** One timing-tower column: the header, its grid width and the cell. */
export interface Column {
  id: string
  label: string
  /** Settings → Display name; absent = always shown (position, number, driver). */
  name?: string
  width: string
  align?: 'left' | 'center'
  cell: (entry: StandingEntry, row: RowContext) => ReactNode
}

const muted = (text: ReactNode) => <span className={styles.muted}>{text}</span>

export const COLUMNS: Column[] = [
  { id: 'bar', label: '', width: '4px', cell: () => <span className={styles.bar} /> },
  {
    id: 'pos',
    label: 'P',
    width: '34px',
    cell: (e) => <span className={styles.pos}>{e.position}</span>,
  },
  {
    id: 'pic',
    label: 'PIC',
    name: 'Position in class',
    width: '36px',
    cell: (e) => muted(e.positionInClass),
  },
  {
    id: 'car',
    label: '#',
    width: '62px',
    cell: (e, row) => (
      <span className={styles.plateCell}>
        {row.order > 0 && <span className={styles.order}>{row.order}</span>}
        <Plate number={e.carNumber} carClass={e.carClass} />
      </span>
    ),
  },
  {
    id: 'driver',
    label: 'Driver / Team',
    width: 'minmax(0, 1fr)',
    align: 'left',
    cell: (e) => (
      <span className={styles.driver}>
        <b>{e.driverName}</b>
        <span>{e.teamName}</span>
      </span>
    ),
  },
  {
    id: 'class',
    label: 'Class',
    name: 'Class',
    width: '80px',
    align: 'left',
    cell: (e) => <ClassTag carClass={e.carClass} />,
  },
  { id: 'laps', label: 'Laps', name: 'Laps', width: '42px', cell: (e) => e.lapsCompleted },
  { id: 'gap', label: 'Gap', name: 'Gap to leader', width: '82px', cell: (e) => e.gapToLeader },
  {
    id: 'last',
    label: 'Last',
    name: 'Last lap',
    width: '76px',
    cell: (e) => formatLapTime(e.lastLapSeconds),
  },
  {
    id: 'best',
    label: 'Best',
    name: 'Best lap',
    width: '76px',
    cell: (e) => formatLapTime(e.bestLapSeconds),
  },
  {
    id: 's1',
    label: 'S1',
    name: 'Sector 1',
    width: '54px',
    cell: (e) => muted(formatSector(e.sector1)),
  },
  {
    id: 's2',
    label: 'S2',
    name: 'Sector 2',
    width: '54px',
    cell: (e) => muted(formatSector(e.sector2)),
  },
  {
    id: 's3',
    label: 'S3',
    name: 'Sector 3',
    width: '54px',
    cell: (e) => muted(formatSector(e.sector3)),
  },
  {
    id: 'vmax',
    label: 'Vmax',
    name: 'Top speed',
    width: '46px',
    cell: (e) => muted(e.topSpeedKph ?? '–'),
  },
  {
    id: 'pit',
    label: 'Pit',
    name: 'Pit stops',
    width: '42px',
    align: 'center',
    cell: (e) => (e.inPit ? <span className={styles.pitTag}>Pit</span> : muted(e.pitStops)),
  },
  {
    id: 'inc',
    label: 'Inc',
    name: 'Incidents',
    width: '44px',
    align: 'center',
    cell: (_, row) => <IncidentCount incidents={row.incidents} />,
  },
]

/** The columns to draw, and the one grid template the header and rows share. */
export function visibleColumns(hidden: string[]): { columns: Column[]; template: string } {
  const columns = COLUMNS.filter((c) => !c.name || !hidden.includes(c.id))
  return { columns, template: columns.map((c) => c.width).join(' ') }
}
