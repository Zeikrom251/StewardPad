import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { StandingEntry } from '@stewardpad/shared'
import type { LmuCollisionCar } from '../lmu/lmu-incident-resolver.js'
import { resolveLmuCars } from './resolve-lmu-cars.js'

function standing(overrides: Partial<StandingEntry> & { slotId: number }): StandingEntry {
  return {
    position: 0,
    positionInClass: 0,
    carNumber: '',
    driverName: '',
    teamName: '',
    carClass: '',
    lapsCompleted: 0,
    gapToLeader: '',
    lastLapSeconds: null,
    bestLapSeconds: null,
    sector1: null,
    sector2: null,
    sector3: null,
    topSpeedKph: null,
    inPit: false,
    pitStops: 0,
    ...overrides,
  }
}

// Regression for data/archive/2026-08-14-paul-ricard-1a-v2.json: Ryan Chikhi
// (Porsche GT3 #77, joined first) and Tristan Vignal (Hypercar #77, joined
// later) shared a car number. Every off-track Vignal actually committed was
// recorded against Chikhi because the old code re-resolved by carNumber
// alone after the resolver had already identified the right slot.
test('two cars sharing a carNumber in different classes resolve by slotID, not first standings match', () => {
  const standings: StandingEntry[] = [
    standing({ slotId: 1, carNumber: '77', driverName: 'Ryan Chikhi', carClass: 'LMGT3' }),
    standing({ slotId: 2, carNumber: '77', driverName: 'Tristan Vignal', carClass: 'HYPERCAR' }),
  ]
  const collisionCars: LmuCollisionCar[] = [
    { slotId: 2, carNumber: '77', driverName: 'Tristan Vignal', carClass: 'HYPERCAR' },
  ]

  const [involved] = resolveLmuCars(collisionCars, standings)

  assert.equal(involved?.driverName, 'Tristan Vignal')
  assert.equal(involved?.carClass, 'HYPERCAR')
  assert.notEqual(involved?.driverName, 'Ryan Chikhi')
})

test('refreshes display fields (lapsCompleted) from current standings by slotID', () => {
  const standings: StandingEntry[] = [
    standing({ slotId: 5, carNumber: '9', driverName: 'M Bravo', lapsCompleted: 14 }),
  ]
  const collisionCars: LmuCollisionCar[] = [
    { slotId: 5, carNumber: '9', driverName: 'M Bravo', carClass: 'LMP2' },
  ]

  const [involved] = resolveLmuCars(collisionCars, standings)

  assert.equal(involved?.lapAtIncident, 14)
})

test('falls back to the resolver-known identity when the slot has since left the grid', () => {
  const collisionCars: LmuCollisionCar[] = [
    { slotId: 99, carNumber: '55', driverName: 'Departed Driver', carClass: 'LMGT3' },
  ]

  const [involved] = resolveLmuCars(collisionCars, [])

  assert.equal(involved?.driverName, 'Departed Driver')
  assert.equal(involved?.carClass, 'LMGT3')
  assert.equal(involved?.lapAtIncident, null)
})
