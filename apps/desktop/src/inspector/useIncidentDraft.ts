import { useCallback, useEffect, useRef, useState } from 'react'
import type { Incident, IncidentEditableFields } from '@stewardpad/shared'
import { backend } from '../backend/backend'
import { useWorkspace } from '../workspace/Workspace'

const SAVE_DELAY_MS = 500

function toEditableFields(incident: Incident): IncidentEditableFields {
  const {
    eventSeconds,
    cars,
    type,
    status,
    summary,
    stewardNotes,
    decision,
    penalty,
    rules,
    loggedBy,
    reviewedBy,
  } = incident
  return {
    eventSeconds,
    cars,
    type,
    status,
    summary,
    stewardNotes,
    decision,
    penalty,
    rules: rules ?? [],
    loggedBy,
    reviewedBy,
  }
}

/**
 * Debounced save of one incident. A pending save is sent, never dropped, when the
 * inspector closes — the debounce may delay a write, never swallow one.
 */
function useAutosave(id: string) {
  const { report } = useWorkspace()
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const pending = useRef<IncidentEditableFields | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const reportRef = useRef(report)
  reportRef.current = report

  const flush = useCallback(() => {
    const next = pending.current
    pending.current = null
    window.clearTimeout(timer.current)
    if (!next) return
    backend
      .updateIncident(id, next)
      .then(() => setSavedAt(Date.now()))
      .catch((error: unknown) => reportRef.current('Autosave of incident failed', error))
  }, [id])
  useEffect(() => flush, [flush])

  const schedule = useCallback(
    (draft: IncidentEditableFields) => {
      pending.current = draft
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, SAVE_DELAY_MS)
    },
    [flush],
  )
  return { schedule, savedAt }
}

/**
 * Local editable copy of the open incident, autosaved 500 ms after the last change
 * (ported from the old web client). The inspector is keyed by incident id, so a different
 * incident remounts this hook; an incidents:update broadcast never resets the draft,
 * which would wipe a sentence mid-typing.
 */
export function useIncidentDraft(incident: Incident) {
  const [draft, setDraft] = useState(() => toEditableFields(incident))
  const { schedule, savedAt } = useAutosave(incident.id)
  // Only real edits are sent. The load itself, and React running this effect twice in
  // dev, would otherwise save an unchanged draft (which the backend ignores anyway).
  const lastSent = useRef(JSON.stringify(draft))

  useEffect(() => {
    const json = JSON.stringify(draft)
    if (json === lastSent.current) return
    lastSent.current = json
    schedule(draft)
  }, [draft, schedule])

  function setField<K extends keyof IncidentEditableFields>(
    key: K,
    value: IncidentEditableFields[K],
  ): void {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return { draft, setField, savedAt }
}
