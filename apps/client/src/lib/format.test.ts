import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatElapsed, formatLapTime, parseElapsed } from './format.js'

test('formatElapsed pads hours, minutes, seconds and floors fractional input', () => {
  assert.equal(formatElapsed(3725.9), '01:02:05')
  assert.equal(formatElapsed(0), '00:00:00')
})

test('formatElapsed clamps negative input to zero instead of going negative', () => {
  assert.equal(formatElapsed(-5), '00:00:00')
})

test('formatLapTime renders minutes:seconds.millis and a dash for null', () => {
  assert.equal(formatLapTime(83.456), '1:23.456')
  assert.equal(formatLapTime(null), '–')
})

test('parseElapsed reads HH:MM:SS, MM:SS and bare seconds', () => {
  assert.equal(parseElapsed('01:02:05'), 3725)
  assert.equal(parseElapsed(' 2:05 '), 125)
  assert.equal(parseElapsed('45'), 45)
})

test('parseElapsed round-trips formatElapsed past 24 hours', () => {
  assert.equal(parseElapsed(formatElapsed(24 * 3600 + 61)), 24 * 3600 + 61)
})

test('parseElapsed returns null rather than a wrong number for junk input', () => {
  for (const junk of ['', '  ', 'abc', '1:2:3:4', '1:-2', '1.5', '1:xx']) {
    assert.equal(parseElapsed(junk), null, `expected null for ${JSON.stringify(junk)}`)
  }
})
