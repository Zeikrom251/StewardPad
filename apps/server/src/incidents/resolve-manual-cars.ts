import type { InvolvedCar, StandingEntry } from '@stewardpad/shared'

/**
 * Quick-log selection → the cars an incident stores. Joined on slotID, the
 * same identity the LMU auto-create path uses (resolve-lmu-cars.ts).
 *
 * The steward selects a row in the standings grid, not a bare number, so the
 * client sends that row's slotID. This is deliberate: two cars can share a
 * carNumber in different classes, and an earlier version matched on the
 * number alone — `.find()` took whichever standings row came first, silently
 * attributing the incident to the wrong driver.
 */
export function resolveManualCars(slotIds: string[], standings: StandingEntry[]): InvolvedCar[] {
  return slotIds.map((slotId) => toInvolvedCar(slotId, standings))
}

// A slot that is not on the current grid (the car left since it was selected)
// still yields a car, with the slotID standing in for the number we no longer
// know — never a carNumber lookup, which is what the bug above was.
function toInvolvedCar(slotId: string, standings: StandingEntry[]): InvolvedCar {
  const match = standings.find((s) => String(s.slotId) === slotId)
  return {
    carNumber: match?.carNumber ?? slotId,
    driverName: match?.driverName ?? slotId,
    carClass: match?.carClass ?? '',
    lapAtIncident: match?.lapsCompleted ?? null,
    role: 'INVOLVED',
  }
}
