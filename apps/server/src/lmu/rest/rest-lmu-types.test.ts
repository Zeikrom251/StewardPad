import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseSessionInfo, parseStandingsList, describeShape } from './rest-lmu-types.js'
import { LIVE_SESSION_INFO, LIVE_STANDINGS } from './live-payload.fixture.js'

const GOOD_ENTRY = {
  slotID: 1,
  position: 1,
  carNumber: '8',
  driverName: 'Driver One',
  fullTeamName: 'Team One',
  carClass: 'Hyper',
  lapsCompleted: 3,
  lastLapTime: 89.956,
  bestLapTime: 88.1,
  lastSectorTime1: 22.828,
  lastSectorTime2: 56.996,
  pitting: false,
  pitstops: 0,
  timeBehindLeader: 0,
  lapsBehindLeader: 0,
}

test('parseStandingsList skips a malformed entry and keeps the rest', () => {
  const malformed = { ...GOOD_ENTRY, slotID: 'not-a-number' }
  const result = parseStandingsList([GOOD_ENTRY, malformed, { ...GOOD_ENTRY, slotID: 2 }])
  assert.ok(result !== null)
  assert.equal(result.entries.length, 2)
  assert.equal(result.skipped, 1)
  assert.deepEqual(
    result.entries.map((e) => e.slotID),
    [1, 2],
  )
})

test('parseStandingsList returns null only when the payload itself is not an array', () => {
  assert.equal(parseStandingsList({ not: 'an array' }), null)
  assert.equal(parseStandingsList(null), null)
})

// The regression that cost a whole session of live data: these two must parse
// straight off a real payload, with no field renamed or retyped.
test('parses a real live sessionInfo payload', () => {
  const parsed = parseSessionInfo(LIVE_SESSION_INFO)
  assert.ok(parsed !== null, 'live sessionInfo must parse')
  assert.equal(parsed.gamePhase, 5)
  assert.equal(parsed.session, 'PRACTICE1')
  assert.equal(parsed.trackName, 'Autodromo Nazionale Monza')
})

test('parses a real live standings payload with nothing skipped', () => {
  const result = parseStandingsList(LIVE_STANDINGS)
  assert.ok(result !== null, 'live standings must parse')
  assert.equal(result.skipped, 0, 'no real car may be dropped')
  assert.equal(result.entries.length, LIVE_STANDINGS.length)
})

test('describeShape names keys, length, or typeof without leaking values', () => {
  assert.equal(describeShape([1, 2, 3]), 'Array(3)')
  assert.equal(describeShape({ foo: 'secret', bar: 1 }), '{foo, bar}')
  assert.equal(describeShape('oops'), 'string')
  assert.equal(describeShape(null), 'null')
})
