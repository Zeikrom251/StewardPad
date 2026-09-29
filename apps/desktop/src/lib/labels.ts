import type { IncidentStatus, IncidentType, InvolvedRole, PenaltyType } from '@stewardpad/shared'
import type { IconName } from '../icons'

// Display names for the wire enums. Colours are CSS (`[data-status]` in global.scss).

// Object.keys widens to string[]; a total Record<K, …> literal has exactly the keys K,
// in declaration order — which is also the order the UI lists them in.
function keysOf<K extends string>(record: Record<K, unknown>): K[] {
  return Object.keys(record) as K[]
}

export const STATUS: Record<IncidentStatus, { label: string; short: string; icon: IconName }> = {
  NOTED: { label: 'Noted', short: 'Noted', icon: 'circle' },
  UNDER_INVESTIGATION: { label: 'Under investigation', short: 'Investigating', icon: 'search' },
  NO_FURTHER_ACTION: { label: 'No further action', short: 'No action', icon: 'check' },
  PENALTY_APPLIED: { label: 'Penalty applied', short: 'Penalty', icon: 'gavel' },
  DISMISSED: { label: 'Dismissed', short: 'Dismissed', icon: 'ban' },
}

export const STATUS_ORDER = keysOf(STATUS)

export const TYPE_LABEL: Record<IncidentType, string> = {
  CONTACT: 'Contact',
  OFF_TRACK: 'Off track',
  TRACK_LIMITS: 'Track limits',
  UNSAFE_REJOIN: 'Unsafe rejoin',
  UNSAFE_PIT_RELEASE: 'Unsafe pit release',
  BLOCKING: 'Blocking',
  DANGEROUS_DRIVING: 'Dangerous driving',
  FALSE_START: 'False start',
  SPEEDING_PIT_LANE: 'Speeding in pit lane',
  FCY_INFRINGEMENT: 'FCY infringement',
  OTHER: 'Other',
}

export const TYPE_ORDER = keysOf(TYPE_LABEL)

export const PENALTY_LABEL: Record<PenaltyType, string> = {
  WARNING: 'Warning',
  REPRIMAND: 'Reprimand',
  TIME_PENALTY: 'Time penalty',
  DRIVE_THROUGH: 'Drive-through',
  STOP_GO: 'Stop & go',
  GRID_PENALTY_NEXT_RACE: 'Grid penalty (next race)',
  DISQUALIFICATION: 'Disqualification',
}

export const PENALTY_ORDER = keysOf(PENALTY_LABEL)

/** Penalty types that carry a duration in seconds. */
export const TIMED_PENALTIES: ReadonlySet<PenaltyType> = new Set(['TIME_PENALTY', 'STOP_GO'])

export const ROLE_LABEL: Record<InvolvedRole, string> = {
  CAUSED: 'Caused it',
  AFFECTED: 'Affected',
  INVOLVED: 'Involved',
  REPORTER: 'Reporter',
  REPORTED: 'Reported',
}

export const ROLE_ORDER = keysOf(ROLE_LABEL)

const CLASS_LABEL: Record<string, string> = { HYPERCAR: 'Hypercar', LMP2: 'LMP2', LMGT3: 'LMGT3' }

/** Known classes get their display name; anything LMU adds later shows as sent. */
export function classLabel(carClass: string): string {
  return CLASS_LABEL[carClass] ?? (carClass || '–')
}
