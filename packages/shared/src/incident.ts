/** The steward's record of a race incident. Prompt §7.2. */

export type IncidentType =
  | 'CONTACT'
  | 'OFF_TRACK'
  | 'TRACK_LIMITS'
  | 'UNSAFE_REJOIN'
  | 'UNSAFE_PIT_RELEASE'
  | 'BLOCKING'
  | 'DANGEROUS_DRIVING'
  | 'FALSE_START'
  | 'SPEEDING_PIT_LANE'
  | 'FCY_INFRINGEMENT'
  | 'OTHER'

/** Mirrors real race control flow — the steward will recognise these. */
export type IncidentStatus =
  'NOTED' | 'UNDER_INVESTIGATION' | 'NO_FURTHER_ACTION' | 'PENALTY_APPLIED' | 'DISMISSED'

export type PenaltyType =
  | 'WARNING'
  | 'REPRIMAND'
  | 'TIME_PENALTY'
  | 'DRIVE_THROUGH'
  | 'STOP_GO'
  | 'GRID_PENALTY_NEXT_RACE'
  | 'DISQUALIFICATION'

export type InvolvedRole = 'REPORTED' | 'REPORTER' | 'INVOLVED'

export interface InvolvedCar {
  carNumber: string
  driverName: string
  /**
   * e.g. HYPERCAR | LMGT3 — required because carNumber alone is not unique
   * (two cars can share a number in different classes); this is what lets a
   * steward tell "#77 GT3" and "#77 HYPERCAR" apart in incident output.
   * '' for incidents persisted before this field existed.
   */
  carClass: string
  lapAtIncident: number | null
  role: InvolvedRole
}

export interface Penalty {
  type: PenaltyType
  /** Required for TIME_PENALTY and STOP_GO. */
  seconds: number | null
  appliedTo: string
  served: boolean
  notes: string
}

/** 'LMU' incidents are auto-created from LMU's incidents feed; never client-writable. */
export type IncidentSource = 'STEWARD' | 'LMU'

export interface Incident {
  id: string
  /** Human-facing: #1, #2, #3 — never reused. */
  sequenceNumber: number
  source: IncidentSource
  /**
   * Set on a child incident merged into a primary. While set, the incident is
   * hidden from the live list and CSV export — it becomes audit trail only.
   */
  mergedIntoId: string | null
  /** Set on the primary: the ids of incidents folded into it (append-only). */
  mergedFromIds: string[]
  /** When it HAPPENED, after the look-back offset. */
  eventSeconds: number
  /** When the steward pressed the key. */
  loggedAtSeconds: number
  /** eventSeconds = loggedAtSeconds - this. */
  lookbackApplied: number
  wallClock: string
  /** e.g. "RACE 01:23:45 — Lap 42" — typed into the LMU replay scrubber. */
  replayReference: string
  cars: InvolvedCar[]
  type: IncidentType
  status: IncidentStatus
  summary: string
  /** Internal findings — never leaves the tool in the drivers CSV. */
  stewardNotes: string
  /** Published wording, goes to drivers. */
  decision: string
  penalty: Penalty | null
  loggedBy: string
  reviewedBy: string | null
  createdAt: string
  updatedAt: string
}
