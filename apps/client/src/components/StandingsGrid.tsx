import { useAppData } from '../context/AppDataContext'
import { StandingsRow } from './StandingsRow'

const COLUMNS: Array<{ label: string; align: 'left' | 'right' }> = [
  { label: 'P', align: 'right' },
  { label: 'PIC', align: 'right' },
  { label: '#', align: 'right' },
  { label: 'Driver', align: 'left' },
  { label: 'Team', align: 'left' },
  { label: 'Class', align: 'left' },
  { label: 'Laps', align: 'right' },
  { label: 'Gap', align: 'right' },
  { label: 'Last', align: 'right' },
  { label: 'Best', align: 'right' },
  { label: 'S1', align: 'right' },
  { label: 'S2', align: 'right' },
  { label: 'S3', align: 'right' },
  { label: 'Vmax', align: 'right' },
  { label: 'Pit', align: 'right' },
]

/** Live standings grid (prompt §8 Dashboard) — selection lives in AppData context. */
export function StandingsGrid() {
  const { standings, selected, toggleSelection } = useAppData()

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="sticky top-0 h-9 bg-surface">
          {COLUMNS.map((col) => (
            <th
              key={col.label}
              scope="col"
              className={`px-2 text-xs font-medium tracking-wide text-text-muted uppercase ${col.align === 'right' ? 'text-right' : 'text-left'}`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {standings.map((entry) => {
          // slotID, not carNumber: two cars can share a number, which would
          // both collide the React key and select the wrong row.
          const slotId = String(entry.slotId)
          const index = selected.indexOf(slotId)
          return (
            <StandingsRow
              key={slotId}
              entry={entry}
              selectionOrder={index === -1 ? null : ((index + 1) as 1 | 2)}
              onClick={() => toggleSelection(slotId)}
            />
          )
        })}
      </tbody>
    </table>
  )
}
