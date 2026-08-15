import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { StandingEntry } from '@stewardpad/shared'
import { resolveManualCars } from './resolve-manual-cars.js'

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

// Same regression as resolve-lmu-cars.test.ts, on the quick-log path: the
// steward selects a standings row, so the wire carries that row's slotID.
// Selecting the second #77 must not resolve to the first one just because it
// sorts earlier in the grid.
const GRID = [
  standing({ slotId: 1, carNumber: '77', driverName: 'Ryan Chikhi', carClass: 'LMGT3' }),
  standing({
    slotId: 2,
    carNumber: '77',
    driverName: 'Tristan Vignal',
    carClass: 'HYPERCAR',
    lapsCompleted: 12,
  }),
]

test('two cars sharing a carNumber resolve by slotID, not first standings match', () => {
  const [car] = resolveManualCars(['2'], GRID)
  assert.equal(car?.driverName, 'Tristan Vignal')
  assert.equal(car?.carClass, 'HYPERCAR')
  assert.equal(car?.carNumber, '77')
  assert.equal(car?.lapAtIncident, 12)
})

test('selecting the other shared-number slot resolves to the other driver', () => {
  const [car] = resolveManualCars(['1'], GRID)
  assert.equal(car?.driverName, 'Ryan Chikhi')
  assert.equal(car?.carClass, 'LMGT3')
})

test('a slot no longer on the grid degrades to the slotID, never a carNumber guess', () => {
  const [car] = resolveManualCars(['99'], GRID)
  assert.equal(car?.driverName, '99')
  assert.equal(car?.carClass, '')
  assert.equal(car?.lapAtIncident, null)
})
