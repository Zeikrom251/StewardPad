import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { StandingEntry } from '@stewardpad/shared'
import { resolveLmuCollisions, type RawLmuContact } from './lmu-incident-resolver.js'
import { LIVE_INCIDENTS } from './lmu-incidents-live-payload.fixture.js'

function standing(
  driverName: string,
  carNumber: string,
  slotId: number,
  carClass = '',
): StandingEntry {
  return {
    slotId,
    position: 0,
    positionInClass: 0,
    carNumber,
    driverName,
    teamName: '',
    carClass,
    lapsCompleted: 3,
    gapToLeader: '',
    lastLapSeconds: null,
    bestLapSeconds: null,
    sector1: null,
    sector2: null,
    sector3: null,
    topSpeedKph: null,
    inPit: false,
    pitStops: 0,
  }
}

const LIVE_STANDINGS: StandingEntry[] = [
  standing('Anton Saxe', '7', 1),
  standing('Charly Charpentier', '23', 2),
  standing('Dan Butler', '55', 3),
]

function noUnresolved(): never {
  throw new Error('no driver in this fixture should be unresolvable')
}

test('collapses the live 46-entry feed to 35 collisions (11 symmetric pairs merged)', () => {
  const collisions = resolveLmuCollisions(LIVE_INCIDENTS, LIVE_STANDINGS, noUnresolved)
  assert.equal(collisions.length, 35)
  assert.equal(collisions.filter((c) => c.type === 'CONTACT').length, 16)
  assert.equal(collisions.filter((c) => c.type === 'OFF_TRACK').length, 19)
})

test('a symmetric pair (player/contactWith swapped, et within 0.07s) becomes one two-car CONTACT', () => {
  const raw: RawLmuContact[] = [
    { player: 'Anton Saxe', contactWith: 'Charly Charpentier', et: 1831.68 },
    { player: 'Charly Charpentier', contactWith: 'Anton Saxe', et: 1831.69 },
  ]
  const collisions = resolveLmuCollisions(raw, LIVE_STANDINGS, noUnresolved)
  assert.equal(collisions.length, 1)
  assert.equal(collisions[0]?.type, 'CONTACT')
  assert.equal(collisions[0]?.et, 1831.68) // the earlier of the two
  assert.deepEqual(collisions[0]?.cars.map((c) => c.carNumber).sort(), ['23', '7'])
})

test('two contacts between the same pair seconds apart stay two collisions, not one', () => {
  const raw: RawLmuContact[] = [
    { player: 'Anton Saxe', contactWith: 'Charly Charpentier', et: 2049.79 },
    { player: 'Charly Charpentier', contactWith: 'Anton Saxe', et: 2049.85 },
    { player: 'Anton Saxe', contactWith: 'Charly Charpentier', et: 2051.28 },
    { player: 'Charly Charpentier', contactWith: 'Anton Saxe', et: 2051.35 },
  ]
  const collisions = resolveLmuCollisions(raw, LIVE_STANDINGS, noUnresolved)
  assert.equal(collisions.length, 2)
})

test('"Immovable" yields a one-car OFF_TRACK, never a phantom second car', () => {
  const raw: RawLmuContact[] = [
    { player: 'Charly Charpentier', contactWith: 'Immovable', et: 1873.29 },
  ]
  const collisions = resolveLmuCollisions(raw, LIVE_STANDINGS, noUnresolved)
  assert.equal(collisions.length, 1)
  assert.equal(collisions[0]?.type, 'OFF_TRACK')
  assert.equal(collisions[0]?.cars.length, 1)
  assert.equal(collisions[0]?.cars[0]?.carNumber, '23')
  assert.equal(collisions[0]?.unresolvedOther, null)
})

test('an unresolvable player is not silently dropped: it is reported, not fabricated as a car', () => {
  const raw: RawLmuContact[] = [
    { player: 'Ghost Driver', contactWith: 'Anton Saxe', et: 100 },
    { player: 'Anton Saxe', contactWith: 'Charly Charpentier', et: 200 },
  ]
  const reported: string[] = []
  const collisions = resolveLmuCollisions(raw, LIVE_STANDINGS, (name) => reported.push(name))
  assert.deepEqual(reported, ['Ghost Driver'])
  assert.equal(collisions.length, 1) // only the resolvable entry becomes an incident
})

test('an unresolvable contactWith (not "Immovable") is treated with the same suspicion: one car, raw text kept', () => {
  const raw: RawLmuContact[] = [{ player: 'Anton Saxe', contactWith: 'Some New Sentinel', et: 300 }]
  const collisions = resolveLmuCollisions(raw, LIVE_STANDINGS, noUnresolved)
  assert.equal(collisions.length, 1)
  assert.equal(collisions[0]?.type, 'OFF_TRACK')
  assert.equal(collisions[0]?.cars.length, 1)
  assert.equal(collisions[0]?.unresolvedOther, 'Some New Sentinel')
})

test('idempotent: re-resolving the same cumulative list every "poll" yields identical keys', () => {
  const first = resolveLmuCollisions(LIVE_INCIDENTS, LIVE_STANDINGS, noUnresolved)
  const second = resolveLmuCollisions(LIVE_INCIDENTS, LIVE_STANDINGS, noUnresolved)
  assert.deepEqual(
    first.map((c) => c.key),
    second.map((c) => c.key),
  )
})

test('cross-poll: a cumulative list that grew by one entry adds exactly one new key', () => {
  const firstPollKeys = new Set(
    resolveLmuCollisions(LIVE_INCIDENTS, LIVE_STANDINGS, noUnresolved).map((c) => c.key),
  )
  const grown: RawLmuContact[] = [
    ...LIVE_INCIDENTS,
    { player: 'Anton Saxe', contactWith: 'Immovable', et: 2500 },
  ]
  const secondPoll = resolveLmuCollisions(grown, LIVE_STANDINGS, noUnresolved)
  const newKeys = secondPoll.filter((c) => !firstPollKeys.has(c.key))
  assert.equal(newKeys.length, 1)
  assert.equal(newKeys[0]?.et, 2500)
})

// Regression for data/archive/2026-08-14-paul-ricard-1a-v2.json: two cars
// sharing carNumber '77' in different classes (a Porsche GT3 that joined
// first, a Hypercar that joined later). A contact from the second car must
// resolve to its own driver and slot, never fall back to whichever standings
// row happens to come first for that number.
test('two cars sharing a carNumber in different classes resolve to the right slot, not the first-joined one', () => {
  const standings: StandingEntry[] = [
    ...LIVE_STANDINGS,
    standing('Ryan Chikhi', '77', 4, 'LMGT3'),
    standing('Tristan Vignal', '77', 5, 'HYPERCAR'),
  ]
  const raw: RawLmuContact[] = [{ player: 'Tristan Vignal', contactWith: 'Immovable', et: 500 }]

  const collisions = resolveLmuCollisions(raw, standings, noUnresolved)

  assert.equal(collisions.length, 1)
  assert.equal(collisions[0]?.cars.length, 1)
  assert.equal(collisions[0]?.cars[0]?.slotId, 5)
  assert.equal(collisions[0]?.cars[0]?.driverName, 'Tristan Vignal')
  assert.equal(collisions[0]?.cars[0]?.carClass, 'HYPERCAR')
})

test('a driver name matching two standings slots is treated as unresolved, never silently matched to the first', () => {
  const standings: StandingEntry[] = [
    ...LIVE_STANDINGS,
    standing('Sam Ito', '81', 6, 'LMP2'),
    standing('Sam Ito', '82', 7, 'LMP2'), // same name, two distinct slots
  ]
  const raw: RawLmuContact[] = [
    { player: 'Sam Ito', contactWith: 'Immovable', et: 700 },
    { player: 'Anton Saxe', contactWith: 'Charly Charpentier', et: 800 },
  ]
  const reported: string[] = []

  const collisions = resolveLmuCollisions(raw, standings, (name) => reported.push(name))

  assert.deepEqual(reported, ['Sam Ito'])
  assert.equal(collisions.length, 1) // only the unambiguous Anton/Charly contact becomes an incident
})
