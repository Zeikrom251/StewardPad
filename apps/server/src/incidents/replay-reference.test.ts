import assert from 'node:assert/strict'
import test from 'node:test'
import { buildReplayReference, lapFromReplayReference } from './replay-reference.js'

test('formats the string the steward types into the replay scrubber', () => {
  assert.equal(buildReplayReference('RACE', 3725, 42), 'RACE 01:02:05 — Lap 42')
})

test('reads its own lap back so an edit does not restamp it', () => {
  assert.equal(lapFromReplayReference(buildReplayReference('RACE', 3725, 42)), 42)
})

test('falls back to lap 0 when the reference is not one we wrote', () => {
  assert.equal(lapFromReplayReference('unparseable'), 0)
})
