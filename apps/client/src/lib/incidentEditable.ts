import type { Incident, IncidentEditableFields } from '@stewardpad/shared'

/** The editable subset of an incident — used both to seed the editor draft
 * and to snapshot an incident for undo (recreate strips server-owned fields
 * like id/sequenceNumber/source that CreateIncidentDto rejects as unknown). */
export function toEditableFields(incident: Incident): IncidentEditableFields {
  return {
    eventSeconds: incident.eventSeconds,
    cars: incident.cars,
    type: incident.type,
    status: incident.status,
    summary: incident.summary,
    stewardNotes: incident.stewardNotes,
    decision: incident.decision,
    penalty: incident.penalty,
    loggedBy: incident.loggedBy,
    reviewedBy: incident.reviewedBy,
  }
}
