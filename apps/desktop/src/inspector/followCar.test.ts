import { test } from 'node:test'
import assert from 'node:assert/strict'
import { followCar } from './followCar'

const grid = [
  { slotId: 3, carNumber: '15', carClass: 'HYPERCAR' },
  { slotId: 8, carNumber: '15', carClass: 'LMGT3' },
  { slotId: 11, carNumber: '50', carClass: 'HYPERCAR' },
]

test('follows the car under investigation, not just the first one listed', () => {
  const cars = [
    { carNumber: '50', carClass: 'HYPERCAR', role: 'AFFECTED' as const },
    { carNumber: '15', carClass: 'LMGT3', role: 'CAUSED' as const },
  ]
  assert.equal(followCar(cars, grid), 8)
})

test('follows the first car when none is marked', () => {
  const cars = [
    { carNumber: '50', carClass: 'HYPERCAR', role: 'INVOLVED' as const },
    { carNumber: '15', carClass: 'HYPERCAR', role: 'INVOLVED' as const },
  ]
  assert.equal(followCar(cars, grid), 11)
})

test('tells two cars with the same number apart by class', () => {
  const cars = [{ carNumber: '15', carClass: 'HYPERCAR', role: 'REPORTED' as const }]
  assert.equal(followCar(cars, grid), 3)
})

test('leaves the camera alone rather than guess', () => {
  const noClass = [{ carNumber: '15', carClass: '', role: 'INVOLVED' as const }]
  assert.equal(followCar(noClass, grid), null, 'an older incident: #15 is two cars')
  const gone = [{ carNumber: '99', carClass: 'LMGT3', role: 'INVOLVED' as const }]
  assert.equal(followCar(gone, grid), null, 'no longer in the standings')
  assert.equal(followCar([], grid), null)
})
