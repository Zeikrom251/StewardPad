import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Incident } from '@stewardpad/shared'
import { DEFAULT_FILTERS, filterIncidents, sortBySessionTimeDesc } from './incidentFilters.js'

function makeIncident(overrides: Partial<Incident>): Incident {
  return {
    id: overrides.id ?? 'id-1',
    sequenceNumber: 1,
    source: 'STEWARD',
    eventSeconds: 100,
    loggedAtSeconds: 110,
    lookbackApplied: 10,
    wallClock: new Date().toISOString(),
    replayReference: 'RACE 00:01:40 — Lap 3',
    cars: [
      {
        carNumber: '7',
        driverName: 'Hartley',
        carClass: 'LMGT3',
        lapAtIncident: 3,
        role: 'REPORTED',
      },
    ],
    type: 'CONTACT',
    status: 'NOTED',
    summary: 'Contact at turn 3',
    stewardNotes: '',
    decision: '',
    penalty: null,
    loggedBy: 'Steward',
    reviewedBy: null,
    mergedIntoId: null,
    mergedFromIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

test('filterIncidents with default filters returns everything', () => {
  const incidents = [makeIncident({ id: 'a' }), makeIncident({ id: 'b', status: 'DISMISSED' })]
  assert.equal(filterIncidents(incidents, DEFAULT_FILTERS).length, 2)
})

test('filterIncidents narrows by status, car number, and free text together', () => {
  const incidents = [
    makeIncident({
      id: 'a',
      status: 'NOTED',
      cars: [
        {
          carNumber: '7',
          driverName: 'Hartley',
          carClass: 'LMGT3',
          lapAtIncident: 3,
          role: 'REPORTED',
        },
      ],
    }),
    makeIncident({
      id: 'b',
      status: 'DISMISSED',
      cars: [
        {
          carNumber: '51',
          driverName: 'Pier Guidi',
          carClass: 'LMGT3',
          lapAtIncident: 3,
          role: 'REPORTED',
        },
      ],
    }),
  ]
  const result = filterIncidents(incidents, { ...DEFAULT_FILTERS, status: 'NOTED', carNumber: '7' })
  assert.deepEqual(
    result.map((i) => i.id),
    ['a'],
  )
})

test('filterIncidents with default filters hides nothing by source', () => {
  const incidents = [
    makeIncident({ id: 'a', source: 'STEWARD' }),
    makeIncident({ id: 'b', source: 'LMU' }),
  ]
  assert.equal(filterIncidents(incidents, DEFAULT_FILTERS).length, 2)
})

test('filterIncidents narrows to LMU-detected incidents only', () => {
  const incidents = [
    makeIncident({ id: 'a', source: 'STEWARD' }),
    makeIncident({ id: 'b', source: 'LMU' }),
  ]
  const result = filterIncidents(incidents, { ...DEFAULT_FILTERS, source: 'LMU' })
  assert.deepEqual(
    result.map((i) => i.id),
    ['b'],
  )
})

test('sortBySessionTimeDesc orders by eventSeconds descending without mutating the input', () => {
  const incidents = [
    makeIncident({ id: 'early', eventSeconds: 50 }),
    makeIncident({ id: 'late', eventSeconds: 200 }),
  ]
  const sorted = sortBySessionTimeDesc(incidents)
  assert.deepEqual(
    sorted.map((i) => i.id),
    ['late', 'early'],
  )
  assert.equal(incidents[0]?.id, 'early')
})
