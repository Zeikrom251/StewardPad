import { useState } from 'react'
import type { IncidentStatus } from '@stewardpad/shared'
import { STATUSES, STATUS_LABEL } from './StatusBadge'
import { Select } from './Select'

/** Bulk status change + merge (prompt §8 Incidents). */
export function BulkActionBar({
  count,
  onApplyStatus,
  onMerge,
  onClear,
}: {
  count: number
  onApplyStatus: (status: IncidentStatus) => void
  /** Merge the selected incidents; server defaults primary to lowest seq#. */
  onMerge: () => void
  onClear: () => void
}) {
  const [status, setStatus] = useState<IncidentStatus>('NO_FURTHER_ACTION')
  if (count === 0) return null

  return (
    <div className="flex items-center gap-3 border-b border-border-strong bg-surface-raised px-4 py-2 text-sm">
      <span className="text-text">
        <span className="tabular-nums">{count}</span> selected
      </span>
      <Select
        value={status}
        onChange={(event) => setStatus(event.target.value as IncidentStatus)}
        className="rounded-sm border border-border-strong bg-surface py-0.5 pl-1 pr-5 text-text"
        aria-label="Status to apply"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </Select>
      <button
        type="button"
        onClick={() => onApplyStatus(status)}
        className="rounded-sm bg-accent px-3 py-1 text-xs font-medium text-ground"
      >
        Set status
      </button>
      <button
        type="button"
        onClick={onMerge}
        disabled={count < 2}
        className="rounded-sm border border-border-strong px-3 py-1 text-xs font-medium text-text disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-surface-raised"
      >
        Merge ({count})
      </button>
      <button type="button" onClick={onClear} className="text-xs text-text-muted hover:text-text">
        Clear selection
      </button>
    </div>
  )
}
