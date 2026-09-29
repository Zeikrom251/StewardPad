import type { Incident, InvolvedCar, InvolvedRole, Penalty } from '@stewardpad/shared'
import { incidentLap } from './cars'
import { PENALTY_LABEL, TIMED_PENALTIES } from './labels'

// How an incident reads outside the app: the decisions document and the Discord embeds.

/** "5-second time penalty", "10-second stop & go", "Drive-through". */
export function penaltyText(penalty: Penalty): string {
  const label = PENALTY_LABEL[penalty.type]
  if (!TIMED_PENALTIES.has(penalty.type) || penalty.seconds === null) return label
  return `${penalty.seconds}-second ${label.toLowerCase()}`
}

/** How a car's part reads in a formal decision. */
export const ROLE_TEXT: Record<InvolvedRole, string> = {
  CAUSED: 'Caused the incident',
  AFFECTED: 'Affected',
  INVOLVED: 'Involved',
  REPORTER: 'Reporting car',
  REPORTED: 'Reported car',
}

/** The car the penalty names; the penalty stores only its number. */
export function penalisedCar(incident: Incident): InvolvedCar | undefined {
  return incident.cars.find((c) => c.carNumber === incident.penalty?.appliedTo)
}

export function lapOf(incident: Incident): string {
  const lap = incident.cars.find((c) => c.lapAtIncident !== null)?.lapAtIncident ?? null
  return lap === null ? incidentLap(incident) : String(lap)
}
