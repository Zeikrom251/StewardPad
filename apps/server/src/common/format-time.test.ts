import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatHms } from './format-time.js'

test('formats whole hours, minutes, seconds with zero padding', () => {
  assert.equal(formatHms(3725), '01:02:05')
})

test('floors fractional seconds', () => {
  assert.equal(formatHms(59.9), '00:00:59')
})

test('clamps negative input to 00:00:00', () => {
  assert.equal(formatHms(-5), '00:00:00')
})

test('formats zero', () => {
  assert.equal(formatHms(0), '00:00:00')
})
