import { useEffect, useRef, useState } from 'react'
import type { Incident, IncidentEditableFields, UpdateIncidentInput } from '@stewardpad/shared'
import { toEditableFields } from '../lib/incidentEditable'

/**
 * Local editable copy of an incident. Debounced autosave fires 500ms after
 * any draft change via setField — making setField the single write API.
 * No per-field onBlur or immediate updateIncident calls needed anywhere.
 *
 * Only resyncs from the server when the open incident *changes* (not on every
 * incidents:update broadcast) — otherwise a nudge-triggered broadcast while
 * the steward is mid-sentence in stewardNotes would wipe what they just typed.
 *
 * The skip flag prevents the initial load from firing a spurious save.
 */
export function useIncidentDraft(
  incident: Incident | null,
  updateIncident: (id: string, input: UpdateIncidentInput) => Promise<unknown>,
) {
  const [draft, setDraft] = useState<IncidentEditableFields | null>(
    incident ? toEditableFields(incident) : null,
  )
  // True on load; the next draft change is an external reset, not a user edit.
  const skipSaveRef = useRef(true)
  // Stable ref so the timer callback always calls the latest updateIncident.
  const saveRef = useRef(updateIncident)
  saveRef.current = updateIncident
  const pendingRef = useRef<{ id: string; draft: IncidentEditableFields } | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  // Only closes over refs, so the identity it captures never goes stale.
  function flush(): void {
    const pending = pendingRef.current
    pendingRef.current = null
    window.clearTimeout(timerRef.current)
    if (!pending) return
    saveRef
      .current(pending.id, pending.draft)
      .catch((error: unknown) => console.error('Failed to autosave incident', error))
  }

  // Send a pending save before the open incident changes or the editor goes
  // away. Cancelling here instead would drop the last 500ms of typing every
  // time the steward closes the modal straight after a keystroke — the debounce
  // may delay a write, never swallow one. Declared before the resync effect so
  // this cleanup runs while the outgoing incident's draft is still pending.
  useEffect(() => flush, [incident?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resync when the open incident changes — never on a broadcast update.
  useEffect(() => {
    skipSaveRef.current = true
    setDraft(incident ? toEditableFields(incident) : null)
  }, [incident?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced autosave — skips the load that just set the draft. No cleanup:
  // each run clears its predecessor's timer, and teardown flushes instead.
  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false
      return
    }
    if (!incident || !draft) return
    pendingRef.current = { id: incident.id, draft }
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(flush, 500)
  }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps

  function setField<K extends keyof IncidentEditableFields>(
    key: K,
    value: IncidentEditableFields[K],
  ): void {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  return { draft, setField }
}
