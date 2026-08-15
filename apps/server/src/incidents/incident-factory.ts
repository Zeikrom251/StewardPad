import type {
  CreateIncidentInput,
  Incident,
  IncidentSource,
  IncidentType,
  InvolvedCar,
} from '@stewardpad/shared'

export interface IncidentDraft {
  sequenceNumber: number
  eventSeconds: number
  loggedAtSeconds: number
  lookbackApplied: number
  cars: InvolvedCar[]
  type: IncidentType
  loggedBy: string
  replayReference: string
  /** Everything created by a steward action; only the LMU auto-create path sends 'LMU'. */
  source?: IncidentSource
  /** Editable fields not already covered above — status, notes, decision, penalty, reviewedBy. */
  overrides?: CreateIncidentInput
}

export function createIncidentRecord(draft: IncidentDraft): Incident {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    sequenceNumber: draft.sequenceNumber,
    source: draft.source ?? 'STEWARD',
    mergedIntoId: null,
    mergedFromIds: [],
    eventSeconds: draft.eventSeconds,
    loggedAtSeconds: draft.loggedAtSeconds,
    lookbackApplied: draft.lookbackApplied,
    wallClock: now,
    replayReference: draft.replayReference,
    cars: draft.cars,
    type: draft.type,
    status: draft.overrides?.status ?? 'NOTED',
    summary: draft.overrides?.summary ?? '',
    stewardNotes: draft.overrides?.stewardNotes ?? '',
    decision: draft.overrides?.decision ?? '',
    penalty: draft.overrides?.penalty ?? null,
    loggedBy: draft.loggedBy,
    reviewedBy: draft.overrides?.reviewedBy ?? null,
    createdAt: now,
    updatedAt: now,
  }
}
