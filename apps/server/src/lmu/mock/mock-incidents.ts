/**
 * Occasionally synthesizes a contact in the same raw shape LMU's incidents
 * feed uses, so MockLmuAdapter exercises the exact same resolver as
 * RestLmuAdapter (`lmu-incident-resolver.ts`) — not a second implementation.
 */

import type { MockCarState } from './mock-car-physics.js'
import type { RawLmuContact } from '../lmu-incident-resolver.js'

// Tuned for demo/training purposes only (prompt §3 excludes real collision
// detection) — roughly one car-to-car contact every ~4 minutes of race time
// and one off-track every ~5, so a steward watching the mock sees incidents
// without the grid becoming a demolition derby.
const CONTACT_CHANCE_PER_TICK = 0.004
const OFF_TRACK_CHANCE_PER_TICK = 0.0033

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function pickTwoDistinct(cars: MockCarState[]): [MockCarState, MockCarState] | null {
  if (cars.length < 2) return null
  const i = Math.floor(Math.random() * cars.length)
  let j = Math.floor(Math.random() * cars.length)
  while (j === i) j = Math.floor(Math.random() * cars.length)
  const a = cars[i]
  const b = cars[j]
  return a && b ? [a, b] : null
}

export function maybeGenerateContacts(
  cars: MockCarState[],
  elapsedSeconds: number,
): RawLmuContact[] {
  const events: RawLmuContact[] = []
  const et = round2(elapsedSeconds)
  if (Math.random() < CONTACT_CHANCE_PER_TICK) {
    const pair = pickTwoDistinct(cars)
    if (pair) events.push({ player: pair[0].driverName, contactWith: pair[1].driverName, et })
  }
  if (Math.random() < OFF_TRACK_CHANCE_PER_TICK && cars.length > 0) {
    const car = cars[Math.floor(Math.random() * cars.length)]
    if (car) events.push({ player: car.driverName, contactWith: 'Immovable', et })
  }
  return events
}
