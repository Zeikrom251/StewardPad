import { useState, type MouseEvent } from 'react'
import type { Incident } from '@stewardpad/shared'
import { StatusBadge } from './StatusBadge'
import { SourceTag } from './SourceTag'
import { INCIDENT_TYPE_LABEL } from '../lib/incidentTypes'
import { PENALTY_TYPE_LABEL } from '../lib/penaltyTypes'
import { formatElapsed } from '../lib/format'
import { CheckIcon, ClipboardIcon } from './icons'

const COPIED_FLASH_MS = 1500

function penaltyLabel(incident: Incident): string {
  if (!incident.penalty) return '–'
  const base = PENALTY_TYPE_LABEL[incident.penalty.type]
  return incident.penalty.seconds !== null ? `${base} (${incident.penalty.seconds}s)` : base
}

export function IncidentRow({
  incident,
  selected,
  onToggleSelect,
  onOpen,
  onDelete,
}: {
  incident: Incident
  selected: boolean
  onToggleSelect: () => void
  onOpen: () => void
  onDelete: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copyReplayReference = async (event: MouseEvent): Promise<void> => {
    event.stopPropagation()
    await navigator.clipboard.writeText(incident.replayReference)
    setCopied(true)
    window.setTimeout(() => setCopied(false), COPIED_FLASH_MS)
  }

  const firstLap = incident.cars[0]?.lapAtIncident
  const carNumbers = incident.cars.map((c) => c.carNumber).join(', ') || '–'
  const driverNames = incident.cars.map((c) => c.driverName).join(', ') || '–'

  return (
    <tr className="cursor-pointer border-b border-border hover:bg-surface-raised" onClick={onOpen}>
      <td className="px-2 py-2">
        <input
          type="checkbox"
          checked={selected}
          onClick={(event) => event.stopPropagation()}
          onChange={onToggleSelect}
          aria-label={`Select incident #${incident.sequenceNumber}`}
        />
      </td>
      <td className="px-2 py-2 tabular-nums text-text-muted">
        <div className="flex items-center gap-1.5">
          #{incident.sequenceNumber}
          <SourceTag source={incident.source} />
          {incident.mergedFromIds.length > 0 && (
            <span
              className="rounded-sm bg-surface-raised px-1 py-0.5 text-xs text-text-muted"
              title={`Merged from ${incident.mergedFromIds.length} incident(s)`}
            >
              Merged ×{incident.mergedFromIds.length}
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-medium tabular-nums text-text">
            {formatElapsed(incident.eventSeconds)}
          </span>
          <button
            type="button"
            onClick={copyReplayReference}
            className="text-text-muted hover:text-text"
            aria-label={copied ? 'Copied replay reference' : 'Copy replay reference'}
          >
            {copied ? <CheckIcon className="size-4" /> : <ClipboardIcon className="size-4" />}
          </button>
        </div>
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-text">{firstLap ?? '–'}</td>
      <td className="px-2 py-2 text-text">{carNumbers}</td>
      <td className="px-2 py-2 text-text">{driverNames}</td>
      <td className="px-2 py-2 text-text">{INCIDENT_TYPE_LABEL[incident.type]}</td>
      <td className="px-2 py-2">
        <StatusBadge status={incident.status} />
      </td>
      <td className="px-2 py-2 tabular-nums text-text">{penaltyLabel(incident)}</td>
      <td className="max-w-xs truncate px-2 py-2 text-text-muted">{incident.summary || '–'}</td>
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          className="text-xs text-text-muted hover:text-status-penalty-applied"
        >
          Delete
        </button>
      </td>
    </tr>
  )
}
