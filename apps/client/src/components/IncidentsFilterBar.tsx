import type { IncidentSource } from '@stewardpad/shared'
import { SOURCE_LABEL, type IncidentFilters } from '../lib/incidentFilters'
import { STATUSES, STATUS_LABEL } from './StatusBadge'
import { INCIDENT_TYPES, INCIDENT_TYPE_LABEL } from '../lib/incidentTypes'
import { Select } from './Select'

const SOURCES: IncidentSource[] = ['STEWARD', 'LMU']

const FIELD_CLASSES = 'rounded-sm border border-border-strong bg-surface px-1 py-0.5 text-text'
const SELECT_CLASSES =
  'rounded-sm border border-border-strong bg-surface py-0.5 pl-1 pr-5 text-text'

export function IncidentsFilterBar({
  filters,
  onChange,
  onLogMissed,
  onClearAll,
}: {
  filters: IncidentFilters
  onChange: (filters: IncidentFilters) => void
  onLogMissed: () => void
  onClearAll: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-2 text-sm">
      <label className="flex items-center gap-1 text-text-muted">
        Status
        <Select
          value={filters.status}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as IncidentFilters['status'] })
          }
          className={SELECT_CLASSES}
        >
          <option value="ALL">All</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex items-center gap-1 text-text-muted">
        Type
        <Select
          value={filters.type}
          onChange={(event) =>
            onChange({ ...filters, type: event.target.value as IncidentFilters['type'] })
          }
          className={SELECT_CLASSES}
        >
          <option value="ALL">All</option>
          {INCIDENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {INCIDENT_TYPE_LABEL[type]}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex items-center gap-1 text-text-muted">
        Source
        <Select
          value={filters.source}
          onChange={(event) =>
            onChange({ ...filters, source: event.target.value as IncidentFilters['source'] })
          }
          className={SELECT_CLASSES}
        >
          <option value="ALL">All</option>
          {SOURCES.map((source) => (
            <option key={source} value={source}>
              {SOURCE_LABEL[source]}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex items-center gap-1 text-text-muted">
        Car #
        <input
          type="text"
          value={filters.carNumber}
          onChange={(event) => onChange({ ...filters, carNumber: event.target.value })}
          className={`w-16 ${FIELD_CLASSES}`}
        />
      </label>
      <label className="flex flex-1 items-center gap-1 text-text-muted">
        Search
        <input
          type="text"
          value={filters.freeText}
          onChange={(event) => onChange({ ...filters, freeText: event.target.value })}
          placeholder="Summary, decision, driver…"
          className={`w-full ${FIELD_CLASSES}`}
        />
      </label>
      <button
        type="button"
        onClick={onLogMissed}
        title="Log an incident LMU never reported — e.g. an off-track with no contact"
        className="rounded-sm bg-accent px-2 py-0.5 font-medium text-ground"
      >
        Log missed
      </button>
      <button
        type="button"
        onClick={onClearAll}
        title="Archives a copy to the archive folder, then empties the list"
        className="rounded-sm border border-status-penalty-applied/50 px-2 py-0.5 text-text-muted hover:bg-status-penalty-applied/12 hover:text-text"
      >
        Clear all
      </button>
    </div>
  )
}
