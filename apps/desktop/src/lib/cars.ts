import type { Incident, InvolvedCar, StandingEntry } from '@stewardpad/shared'

/**
 * Stored incident cars carry number + class, not a slotId, so that pair is how a car in
 * the standings is matched to its incidents (a number alone isn't unique across classes).
 */
export function carKey(car: { carNumber: string; carClass: string }): string {
  return `${car.carNumber}|${car.carClass}`
}

export function toInvolvedCar(entry: StandingEntry): InvolvedCar {
  return {
    carNumber: entry.carNumber,
    driverName: entry.driverName,
    carClass: entry.carClass,
    lapAtIncident: entry.lapsCompleted,
    role: 'INVOLVED',
  }
}

/** The selected slots as incident cars; a slot that has left the grid is skipped. */
export function carsForSlots(slotIds: number[], standings: StandingEntry[]): InvolvedCar[] {
  return slotIds.flatMap((slotId) => {
    const entry = standings.find((s) => s.slotId === slotId)
    return entry ? [toInvolvedCar(entry)] : []
  })
}

/** Every incident each car is in, keyed by carKey — for the standings "Inc" column. */
export function incidentsByCar(incidents: Incident[]): Map<string, Incident[]> {
  const byCar = new Map<string, Incident[]>()
  for (const incident of incidents) {
    for (const car of incident.cars) {
      const key = carKey(car)
      byCar.set(key, [...(byCar.get(key) ?? []), incident])
    }
  }
  return byCar
}

export function surname(driverName: string): string {
  return driverName.trim().split(/\s+/).at(-1) ?? driverName
}

/** Newest first: the order the feed and the incident log show. */
export function newestFirst(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => b.sequenceNumber - a.sequenceNumber)
}

/** The lap stamped into the replay reference ("RACE 01:23:45 — Lap 42" → "42"). */
export function incidentLap(incident: Incident): string {
  return incident.replayReference.split('Lap ').at(-1) ?? ''
}

/** The grid in position order, one class or all, matching a number ("#38", "3"), driver or team. */
export function searchCars(
  standings: StandingEntry[],
  query: string,
  carClass: string | null,
): StandingEntry[] {
  const q = query.trim().toLowerCase().replace(/^#/, '')
  const matches = (s: StandingEntry) =>
    !q ||
    s.carNumber.toLowerCase().startsWith(q) ||
    s.driverName.toLowerCase().includes(q) ||
    s.teamName.toLowerCase().includes(q)
  return [...standings]
    .sort((a, b) => a.position - b.position)
    .filter((s) => (!carClass || s.carClass === carClass) && matches(s))
}

/** Each class on the grid with its car count, best-placed class first. */
export function gridClasses(standings: StandingEntry[]): Array<[string, number]> {
  const counts = new Map<string, number>()
  for (const s of [...standings].sort((a, b) => a.position - b.position)) {
    counts.set(s.carClass, (counts.get(s.carClass) ?? 0) + 1)
  }
  return [...counts]
}

/**
 * The incident's cars after the car picker (chosen = slotIds as strings). A kept car keeps
 * its role and lap; a new one joins as Involved; a car no longer on the grid stays.
 */
export function withChosenCars(
  current: InvolvedCar[],
  standings: StandingEntry[],
  chosen: string[],
): InvolvedCar[] {
  const picked = standings.filter((s) => chosen.includes(String(s.slotId)))
  const kept = current.filter((c) => {
    const onGrid = standings.some((s) => carKey(s) === carKey(c))
    return !onGrid || picked.some((s) => carKey(s) === carKey(c))
  })
  const added = picked
    .filter((s) => !current.some((c) => carKey(c) === carKey(s)))
    .sort((a, b) => a.position - b.position)
    .map(toInvolvedCar)
  return [...kept, ...added]
}
