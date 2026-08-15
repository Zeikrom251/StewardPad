import { useEffect, useState } from 'react'
import type { Incident, InvolvedCar } from '@stewardpad/shared'
import { useAppData } from '../context/AppDataContext'
import { useIncidentDraft } from '../hooks/useIncidentDraft'
import { apiGet } from '../lib/api'
import { INCIDENT_TYPE_LABEL } from '../lib/incidentTypes'
import { CloseIcon } from './icons'
import { Modal } from './Modal'
import { SourceTag } from './SourceTag'
import { IncidentEditorWhen } from './editor/IncidentEditorWhen'
import { IncidentEditorWho } from './editor/IncidentEditorWho'
import { IncidentEditorWhat } from './editor/IncidentEditorWhat'
import { IncidentEditorInvestigation } from './editor/IncidentEditorInvestigation'
import { IncidentEditorDecision } from './editor/IncidentEditorDecision'

/**
 * Centred modal (user override of prompt §8's side-panel spec) — mounted
 * once in App so `E` can open it from any page. Autosave is debounced 500ms
 * inside useIncidentDraft; setField is the single write API everywhere.
 */
export function IncidentEditor() {
  const { incidents, openIncidentId, closeIncident, updateIncident, standings, openIncident } =
    useAppData()
  const incident = incidents.find((i) => i.id === openIncidentId) ?? null
  const { draft, setField } = useIncidentDraft(incident, updateIncident)
  const open = incident !== null && draft !== null

  // Fetch absorbed incidents (merged children) lazily when the editor opens for
  // a merged primary. Keyed on mergedFromIds so re-fetches if a new merge happens
  // while the editor is open. Absorbed incidents are not in the live list.
  const mergedFromKey = incident?.mergedFromIds.join(',') ?? ''
  const [absorbed, setAbsorbed] = useState<Incident[]>([])
  useEffect(() => {
    if (!incident?.mergedFromIds.length) {
      setAbsorbed([])
      return
    }
    let cancelled = false
    Promise.all(incident.mergedFromIds.map((id) => apiGet<Incident>('/incidents/' + id)))
      .then((results) => {
        if (!cancelled) setAbsorbed(results)
      })
      .catch((error) => console.error('Failed to fetch absorbed incidents', error))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedFromKey])

  function nudge(delta: number): void {
    if (!draft) return
    setField('eventSeconds', Math.max(0, draft.eventSeconds + delta))
  }

  function changeCars(cars: InvolvedCar[]): void {
    setField('cars', cars)
  }

  return (
    <Modal open={open} onClose={closeIncident} labelledBy="incident-editor-title">
      {incident && draft && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <h2
              id="incident-editor-title"
              className="flex items-center gap-1.5 text-sm font-medium text-text"
            >
              Incident #<span className="tabular-nums">{incident.sequenceNumber}</span>
              <SourceTag source={incident.source} />
            </h2>
            <button
              type="button"
              onClick={closeIncident}
              className="text-text-muted hover:text-text"
              aria-label="Close incident editor"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6 border-t border-border py-4">
            <IncidentEditorWhen incident={incident} draft={draft} onNudge={nudge} />
            <IncidentEditorWhat draft={draft} setField={setField} />
          </div>
          <IncidentEditorWho
            cars={draft.cars}
            standings={standings}
            onChangeCars={changeCars}
            incidents={incidents}
            currentIncidentId={incident.id}
            onOpenIncident={openIncident}
          />
          <IncidentEditorInvestigation draft={draft} setField={setField} />
          <IncidentEditorDecision draft={draft} setField={setField} />
          {absorbed.length > 0 && (
            <section
              aria-label="Absorbed incidents"
              className="mt-3 rounded-sm border border-border-strong bg-surface-raised p-3"
            >
              <p className="mb-1.5 text-xs font-medium text-text-muted">
                Absorbed ({absorbed.length})
              </p>
              <ul className="space-y-1">
                {absorbed.map((a) => (
                  <li key={a.id} className="flex items-baseline gap-2 text-xs text-text-muted">
                    <span className="tabular-nums">#{a.sequenceNumber}</span>
                    <span>{INCIDENT_TYPE_LABEL[a.type]}</span>
                    {a.summary && (
                      <span className="truncate text-text-muted/70">— {a.summary}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Modal>
  )
}
