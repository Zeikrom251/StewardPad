import type { Incident } from '@stewardpad/shared'
import { IncidentRow } from './IncidentRow'

const HEADERS = [
  '',
  '#',
  'Session Time',
  'Lap',
  'Cars',
  'Drivers',
  'Type',
  'Status',
  'Penalty',
  'Summary',
  'Actions',
]

export function IncidentsGrid({
  incidents,
  selectedIds,
  onToggleSelect,
  onOpen,
  onDelete,
}: {
  incidents: Incident[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (incidents.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-text-muted">
        No incidents logged. Press Space on the Dashboard during a session.
      </p>
    )
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="sticky top-0 h-9 bg-surface">
          {HEADERS.map((header) => (
            <th
              key={header}
              scope="col"
              className="px-2 text-left text-xs font-medium tracking-wide text-text-muted uppercase"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {incidents.map((incident) => (
          <IncidentRow
            key={incident.id}
            incident={incident}
            selected={selectedIds.has(incident.id)}
            onToggleSelect={() => onToggleSelect(incident.id)}
            onOpen={() => onOpen(incident.id)}
            onDelete={() => onDelete(incident.id)}
          />
        ))}
      </tbody>
    </table>
  )
}
