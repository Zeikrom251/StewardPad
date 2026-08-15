/** Pure helpers for the merge operation. Prompt §7.2 (incident immutability / audit trail). */

import type { Incident, InvolvedCar } from '@stewardpad/shared'

/**
 * Selects the primary from a non-empty candidate list.
 * If primaryId is given it must already be in the list (caller's responsibility).
 * Otherwise picks the incident with the lowest sequenceNumber.
 */
export function selectPrimary(candidates: Incident[], primaryId?: string): Incident {
  if (primaryId) {
    const found = candidates.find((i) => i.id === primaryId)
    if (!found)
      throw new Error(`selectPrimary: primaryId ${primaryId} not in candidates (caller bug)`)
    return found
  }
  return candidates.reduce((min, i) => (i.sequenceNumber < min.sequenceNumber ? i : min))
}

/**
 * Union of all cars across the given incidents, deduped by carNumber+carClass.
 * Primary's cars come first (the order of `incidents` is preserved per-incident).
 */
export function mergeCars(incidents: Incident[]): InvolvedCar[] {
  const seen = new Set<string>()
  const result: InvolvedCar[] = []
  for (const incident of incidents) {
    for (const car of incident.cars) {
      const key = `${car.carNumber}|${car.carClass}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push(car)
      }
    }
  }
  return result
}

/** Incidents with a set mergedIntoId are hidden from the live list and CSV. */
export function isActiveIncident(incident: Incident): boolean {
  return incident.mergedIntoId === null
}
