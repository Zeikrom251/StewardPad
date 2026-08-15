import { useEffect, useMemo, useRef, useState } from 'react'
import type { Incident } from '@stewardpad/shared'
import { Modal } from './Modal'
import { INCIDENT_TYPE_LABEL } from '../lib/incidentTypes'
import { formatElapsed } from '../lib/format'
import { MagnifyingGlassIcon } from './icons'

const MAX_RESULTS = 8

function matches(incident: Incident, query: string): boolean {
  if (!query) return true
  if (String(incident.sequenceNumber).includes(query)) return true
  if (incident.summary.toLowerCase().includes(query)) return true
  return incident.cars.some(
    (c) => c.carNumber.toLowerCase().includes(query) || c.driverName.toLowerCase().includes(query),
  )
}

/** Ctrl/Cmd-free `/` shortcut (prompt §8 style) — jump straight to an
 * incident by number, car, or driver without scrolling the Incidents grid. */
export function JumpToIncidentModal({
  open,
  onClose,
  incidents,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  incidents: Incident[]
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    // Modal focuses the dialog container itself on open (see its own
    // comment) — steal focus back to the input right after so typing can
    // start immediately, the whole point of a jump-to search.
    inputRef.current?.focus()
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...incidents]
      .sort((a, b) => b.sequenceNumber - a.sequenceNumber)
      .filter((incident) => matches(incident, q))
      .slice(0, MAX_RESULTS)
  }, [incidents, query])

  function select(id: string): void {
    onSelect(id)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="jump-to-incident-title" size="md">
      <h2 id="jump-to-incident-title" className="sr-only">
        Jump to incident
      </h2>
      <div className="flex items-center gap-2 rounded-sm border border-border-strong bg-surface px-2 py-1.5">
        <MagnifyingGlassIcon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Incident #, car #, or driver name"
          className="w-full bg-transparent text-sm text-text outline-none"
          aria-label="Search incidents"
        />
      </div>
      <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto">
        {results.length === 0 && (
          <li className="px-2 py-3 text-sm text-text-muted">No matching incidents</li>
        )}
        {results.map((incident) => (
          <li key={incident.id}>
            <button
              type="button"
              onClick={() => select(incident.id)}
              className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-sm text-text hover:bg-surface-raised"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 tabular-nums text-text-muted">
                  #{incident.sequenceNumber}
                </span>
                <span className="truncate">
                  {incident.summary || INCIDENT_TYPE_LABEL[incident.type]}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-text-faint">
                {formatElapsed(incident.eventSeconds)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
