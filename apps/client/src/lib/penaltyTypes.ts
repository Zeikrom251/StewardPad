import type { PenaltyType } from '@stewardpad/shared'

export const PENALTY_TYPE_LABEL: Record<PenaltyType, string> = {
  WARNING: 'Warning',
  REPRIMAND: 'Reprimand',
  TIME_PENALTY: 'Time penalty',
  DRIVE_THROUGH: 'Drive-through',
  STOP_GO: 'Stop-go',
  GRID_PENALTY_NEXT_RACE: 'Grid penalty (next race)',
  DISQUALIFICATION: 'Disqualification',
}

/** Requires seconds — the only two variants a duration applies to (UpdateIncidentInput's penalty.seconds). */
export const TIMED_PENALTY_TYPES: PenaltyType[] = ['TIME_PENALTY', 'STOP_GO']

/** Derived from the label map so a type added to the shared union can't be missed here. */
export const PENALTY_TYPES = Object.keys(PENALTY_TYPE_LABEL) as PenaltyType[]
