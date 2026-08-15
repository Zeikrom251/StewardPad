import type { StandingEntry } from '@stewardpad/shared'
import { formatLapTime } from '../lib/format'

/** Fixed 8% wash; unknown classes get a plain row (DESIGN.md "Car class row tint"). */
const CLASS_TINT: Record<string, string> = {
  HYPERCAR: 'bg-class-hypercar/8',
  LMP2: 'bg-class-lmp2/8',
  LMGT3: 'bg-class-lmgt3/8',
}

export function StandingsRow({
  entry,
  selectionOrder,
  onClick,
}: {
  entry: StandingEntry
  selectionOrder: 1 | 2 | null
  onClick: () => void
}) {
  const cell = entry.inPit ? 'text-text-muted' : 'text-text'
  const rowClasses = [
    'h-11 cursor-pointer border-b border-border',
    CLASS_TINT[entry.carClass] ?? '',
    selectionOrder
      ? 'border-l-2 border-accent bg-surface-raised font-semibold'
      : 'border-l-2 border-transparent',
  ].join(' ')

  return (
    <tr
      className={rowClasses}
      onClick={onClick}
      tabIndex={0}
      aria-selected={selectionOrder !== null}
      onKeyDown={(event) => event.key === 'Enter' && onClick()}
    >
      <td className={`px-2 text-right tabular-nums ${cell}`}>{entry.position}</td>
      <td className={`px-2 text-right tabular-nums ${cell}`}>{entry.positionInClass}</td>
      <td className={`px-2 text-right tabular-nums ${cell}`}>
        {selectionOrder && (
          <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-ground">
            {selectionOrder}
          </span>
        )}
        {entry.carNumber}
      </td>
      <td className={`px-2 text-left ${cell}`}>{entry.driverName}</td>
      <td className={`px-2 text-left ${cell}`}>{entry.teamName}</td>
      <td className={`px-2 text-left ${cell}`}>{entry.carClass}</td>
      <td className={`px-2 text-right tabular-nums ${cell}`}>{entry.lapsCompleted}</td>
      <td className={`px-2 text-right tabular-nums ${cell}`}>{entry.gapToLeader}</td>
      <td className={`px-2 text-right tabular-nums ${cell}`}>
        {formatLapTime(entry.lastLapSeconds)}
      </td>
      <td className={`px-2 text-right tabular-nums ${cell}`}>
        {formatLapTime(entry.bestLapSeconds)}
      </td>
      <td className={`px-2 text-right tabular-nums ${cell}`}>{formatLapTime(entry.sector1)}</td>
      <td className={`px-2 text-right tabular-nums ${cell}`}>{formatLapTime(entry.sector2)}</td>
      <td className={`px-2 text-right tabular-nums ${cell}`}>{formatLapTime(entry.sector3)}</td>
      <td className={`px-2 text-right tabular-nums ${cell}`}>{entry.topSpeedKph ?? '–'}</td>
      <td className={`px-2 text-right text-xs ${cell}`}>
        {entry.inPit && <span className="text-text-faint">PIT</span>}
      </td>
    </tr>
  )
}
