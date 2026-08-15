import type { InvolvedCar, StandingEntry } from '@stewardpad/shared'
import type { LmuCollisionCar } from '../lmu/lmu-incident-resolver.js'

/**
 * Turns a resolver-identified LmuCollisionCar into the InvolvedCar an
 * incident stores — joined on slotID, never re-derived from carNumber.
 *
 * This is the fix for the real bug: an earlier version discarded the
 * resolver's already-correct identity and re-matched each car by carNumber
 * alone, which silently attributed incidents to the wrong driver whenever
 * two cars shared a number in different classes (`.find()` took whichever
 * standings row happened to come first). Re-matching by slotID here only
 * refreshes display fields (lapsCompleted may have moved since the collision
 * was resolved) — if the slot has since left the grid, the resolver's own
 * snapshot from `collisionCar` is the fallback, never a carNumber lookup.
 */
export function resolveLmuCars(
  collisionCars: LmuCollisionCar[],
  standings: StandingEntry[],
): InvolvedCar[] {
  return collisionCars.map((car) => toInvolvedCar(car, standings))
}

function toInvolvedCar(collisionCar: LmuCollisionCar, standings: StandingEntry[]): InvolvedCar {
  const match = standings.find((s) => s.slotId === collisionCar.slotId)
  return {
    carNumber: match?.carNumber ?? collisionCar.carNumber,
    driverName: match?.driverName ?? collisionCar.driverName,
    carClass: match?.carClass ?? collisionCar.carClass,
    lapAtIncident: match?.lapsCompleted ?? null,
    role: 'INVOLVED',
  }
}
