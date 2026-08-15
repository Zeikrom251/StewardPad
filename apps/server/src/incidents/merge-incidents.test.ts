import assert from 'node:assert/strict'
import { test } from 'node:test'
import { selectPrimary, mergeCars, isActiveIncident } from './merge-incidents.js'
import type { Incident, InvolvedCar } from '@stewardpad/shared'

function stub(id: string, seq: number, cars: InvolvedCar[] = []): Incident {
  return {
    id,
    sequenceNumber: seq,
    cars,
    mergedIntoId: null,
    mergedFromIds: [],
  } as unknown as Incident
}

function car(num: string, cls: string): InvolvedCar {
  return { carNumber: num, carClass: cls, driverName: '', lapAtIncident: null, role: 'INVOLVED' }
}

test('selectPrimary picks lowest sequenceNumber when no primaryId', () => {
  const a = stub('a', 5)
  const b = stub('b', 2)
  assert.equal(selectPrimary([a, b]).id, 'b')
})

test('selectPrimary honours explicit primaryId', () => {
  const a = stub('a', 5)
  const b = stub('b', 2)
  assert.equal(selectPrimary([a, b], 'a').id, 'a')
})

test('mergeCars dedupes by carNumber+carClass', () => {
  const i1 = stub('i1', 1, [car('77', 'GT3'), car('88', 'GT3')])
  const i2 = stub('i2', 2, [car('77', 'GT3'), car('99', 'HYPER')])
  const result = mergeCars([i1, i2])
  assert.equal(result.length, 3)
  assert.ok(result.some((c) => c.carNumber === '99'))
})

test('mergeCars treats same number in different class as distinct', () => {
  const i1 = stub('i1', 1, [car('77', 'GT3')])
  const i2 = stub('i2', 2, [car('77', 'HYPER')])
  assert.equal(mergeCars([i1, i2]).length, 2)
})

test('isActiveIncident is true when mergedIntoId is null', () => {
  assert.ok(isActiveIncident(stub('a', 1)))
})

test('isActiveIncident is false when mergedIntoId is set', () => {
  const child = { ...stub('a', 1), mergedIntoId: 'b' }
  assert.ok(!isActiveIncident(child as unknown as Incident))
})
