import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computeEventSeconds } from './lookback.js'

test('subtracts lookback from elapsed time', () => {
  assert.equal(computeEventSeconds(120, 10), 110)
})

test('clamps eventSeconds to zero when lookback exceeds elapsed time', () => {
  assert.equal(computeEventSeconds(5, 10), 0)
})

test('zero lookback returns elapsed time unchanged', () => {
  assert.equal(computeEventSeconds(42, 0), 42)
})
