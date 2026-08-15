import { useAppData } from '../context/AppDataContext'
import { FlagIcon } from './icons'

/** Bottom bar: `Log incident: #7 Hartley vs #51 Pier Guidi` (prompt §8 Dashboard). */
export function SelectionBar() {
  const { selected, standings, clearSelection } = useAppData()
  if (selected.length === 0) return null

  const label = selected
    .map((slotId) => {
      const entry = standings.find((s) => String(s.slotId) === slotId)
      return entry ? `#${entry.carNumber} ${entry.driverName}` : `slot ${slotId}`
    })
    .join(' vs ')

  return (
    <div className="fixed bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-sm border border-border-strong bg-surface-raised px-4 py-2 text-sm text-text shadow-lg">
      <span className="flex items-center gap-1.5">
        <FlagIcon className="size-4" aria-hidden="true" />
        Log incident: {label}
      </span>
      <button
        type="button"
        onClick={clearSelection}
        className="text-xs text-text-muted hover:text-text"
        aria-label="Clear selection"
      >
        Clear
      </button>
    </div>
  )
}
