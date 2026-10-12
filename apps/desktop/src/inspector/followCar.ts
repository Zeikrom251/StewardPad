import type { InvolvedCar, StandingEntry } from '@stewardpad/shared'

type Car = Pick<InvolvedCar, 'carNumber' | 'carClass' | 'role'>
type Slot = Pick<StandingEntry, 'slotId' | 'carNumber' | 'carClass'>

/**
 * The game's slot of the car Go to points the replay camera at: the one under investigation,
 * else the first listed. Incidents keep a car's number and class, not its slot, so it is looked
 * up in the standings; a number two cars share (an older incident has no class) or a car no
 * longer there gives null, and the camera is left alone rather than on the wrong car.
 */
export function followCar(cars: Car[], standings: Slot[]): number | null {
  const car = cars.find((c) => c.role === 'CAUSED' || c.role === 'REPORTED') ?? cars[0]
  if (!car) return null
  const matches = standings.filter(
    (s) => s.carNumber === car.carNumber && (car.carClass === '' || s.carClass === car.carClass),
  )
  return matches.length === 1 ? (matches[0]?.slotId ?? null) : null
}
