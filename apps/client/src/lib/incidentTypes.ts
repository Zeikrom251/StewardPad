import type { IncidentType } from '@stewardpad/shared'

export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
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

/** Derived from the label map so a type added to the shared union can't be missed here. */
export const INCIDENT_TYPES = Object.keys(INCIDENT_TYPE_LABEL) as IncidentType[]
