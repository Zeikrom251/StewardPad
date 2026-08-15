import { useAppData } from '../context/AppDataContext'
import { StatusBadge } from './StatusBadge'
import { SourceTag } from './SourceTag'
import { formatElapsed } from '../lib/format'

const RAIL_LIMIT = 5

/** Dashboard right rail — last 5 incidents, newest first, click opens the editor. */
export function IncidentRail() {
  const { incidents, openIncident } = useAppData()
  const recent = [...incidents]
    .sort((a, b) => b.sequenceNumber - a.sequenceNumber)
    .slice(0, RAIL_LIMIT)

  return (
    <aside className="w-72 shrink-0 overflow-auto border-l border-border-strong bg-surface p-3">
      <h2 className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">
        Recent incidents
      </h2>
      {recent.length === 0 && <p className="text-sm text-text-muted">No incidents logged.</p>}
      <ul className="space-y-2">
        {recent.map((incident) => (
          <li key={incident.id}>
            <button
              type="button"
              onClick={() => openIncident(incident.id)}
              className="w-full rounded-sm border border-border p-2 text-left hover:bg-surface-raised"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm tabular-nums text-text">
                  {formatElapsed(incident.eventSeconds)}
                </span>
                <StatusBadge status={incident.status} />
              </div>
              <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-text-muted">
                <span className="tabular-nums">#{incident.sequenceNumber}</span> ·{' '}
                {incident.cars.map((c) => c.carNumber).join(', ') || 'No cars'}
                <SourceTag source={incident.source} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
