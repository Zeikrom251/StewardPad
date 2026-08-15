import { useState } from 'react'
import type { CreateIncidentInput, IncidentType, InvolvedCar } from '@stewardpad/shared'
import { useAppData } from '../context/AppDataContext'
import { formatElapsed, parseElapsed } from '../lib/format'
import { INCIDENT_TYPES, INCIDENT_TYPE_LABEL } from '../lib/incidentTypes'
import { CloseIcon } from './icons'
import { Modal } from './Modal'
import { Select } from './Select'
import { IncidentEditorWho } from './editor/IncidentEditorWho'

const FIELD = 'rounded-sm border border-border-strong bg-surface px-1 py-0.5 text-sm text-text'

/**
 * Back-fills an incident LMU never reported. LMU's incidents feed contains
 * *contacts* only — a car running wide with no contact produces no row at all,
 * so a big off-track is invisible to the auto-ingest and has to be entered by
 * hand (detecting it ourselves is a non-goal, prompt §3).
 *
 * Unlike quick-log there is no look-back to subtract: the steward types the
 * time they read off the replay scrubber, so that IS `eventSeconds` and the
 * server derives `lookbackApplied` from the gap to the session clock.
 */
export function LogMissedIncidentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { elapsedSeconds, standings, createIncident, openIncident } = useAppData()
  const [time, setTime] = useState('')
  const [type, setType] = useState<IncidentType>('OFF_TRACK')
  const [cars, setCars] = useState<InvolvedCar[]>([])
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')

  function close(): void {
    setTime('')
    setType('OFF_TRACK')
    setCars([])
    setSummary('')
    setError('')
    onClose()
  }

  function submit(): void {
    const eventSeconds = parseElapsed(time)
    if (eventSeconds === null) {
      setError('Enter the session time as HH:MM:SS')
      return
    }
    const input: CreateIncidentInput = { eventSeconds, type, cars, summary }
    createIncident(input)
      .then((incident) => {
        close()
        openIncident(incident.id)
      })
      .catch((reason: unknown) => {
        setError('Could not save — nothing was logged, try again')
        console.error('Failed to log missed incident', reason)
      })
  }

  return (
    <Modal open={open} onClose={close} labelledBy="log-missed-title">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="log-missed-title" className="text-sm font-medium text-text">
          Log missed incident
        </h2>
        <button
          type="button"
          onClick={close}
          className="text-text-muted hover:text-text"
          aria-label="Close missed incident form"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>
      <section className="border-t border-border py-4">
        <h3 className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">When</h3>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          Session time
          <input
            type="text"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            placeholder={formatElapsed(elapsedSeconds)}
            className={`w-28 font-mono tabular-nums ${FIELD}`}
            aria-label="Session time of the incident"
          />
        </label>
        <p className="mt-1 text-xs text-text-faint">
          The moment on the replay scrubber — now is {formatElapsed(elapsedSeconds)}.
        </p>
      </section>
      <IncidentEditorWho cars={cars} standings={standings} onChangeCars={setCars} />
      <section className="border-t border-border py-4">
        <h3 className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">What</h3>
        <Select
          value={type}
          onChange={(event) => setType(event.target.value as IncidentType)}
          className={`py-0.5 pr-7 pl-1 ${FIELD}`}
          aria-label="Incident type"
        >
          {INCIDENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {INCIDENT_TYPE_LABEL[value]}
            </option>
          ))}
        </Select>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={2}
          placeholder="What happened"
          className={`mt-2 block w-full ${FIELD}`}
          aria-label="Summary"
        />
      </section>
      {error && <p className="text-sm text-status-penalty-applied">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={close}
          className="rounded-sm border border-border-strong px-2 py-0.5 text-sm text-text-muted hover:text-text"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-sm bg-accent px-2 py-0.5 text-sm font-medium text-ground"
        >
          Log incident
        </button>
      </div>
    </Modal>
  )
}
