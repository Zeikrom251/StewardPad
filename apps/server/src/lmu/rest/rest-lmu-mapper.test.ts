import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  deriveSectors,
  computePositionInClass,
  formatGapToLeader,
  remainingOrNull,
  mapSessionInfo,
  mapSessionPhase,
  mapStandings,
  normalizeCarClass,
} from './rest-lmu-mapper.js'
import { parseStandingsList, type RawSessionInfo } from './rest-lmu-types.js'
import { LIVE_STANDINGS } from './live-payload.fixture.js'

// Real values from a live lap (car #8, Monza): lastLapTime 89.956,
// lastSectorTime1 22.828, lastSectorTime2 56.996 (cumulative-from-start).
test('deriveSectors converts cumulative sector times to per-sector', () => {
  const [s1, s2, s3] = deriveSectors(89.956, 22.828, 56.996)
  assert.equal(s1, 22.828)
  assert.ok(s2 !== null && Math.abs(s2 - 34.168) < 0.001)
  assert.ok(s3 !== null && Math.abs(s3 - 32.96) < 0.001)
})

test('deriveSectors nulls everything when sector1 is unknown', () => {
  assert.deepEqual(deriveSectors(89.956, null, 56.996), [null, null, null])
})

test('deriveSectors nulls sector2 and sector3 when sector2 cumulative is unknown', () => {
  assert.deepEqual(deriveSectors(89.956, 22.828, null), [22.828, null, null])
})

test('deriveSectors nulls only sector3 when lastLapTime is unknown', () => {
  const [s1, s2, s3] = deriveSectors(null, 22.828, 56.996)
  assert.equal(s1, 22.828)
  assert.ok(s2 !== null)
  assert.equal(s3, null)
})

test('deriveSectors nulls sector2 if the cumulative time goes backwards', () => {
  const [, s2] = deriveSectors(50, 30, 20)
  assert.equal(s2, null)
})

test('deriveSectors nulls sector3 if it would be negative', () => {
  const [, , s3] = deriveSectors(40, 10, 45) // lastLapTime less than sector2's cumulative time
  assert.equal(s3, null)
})

test('computePositionInClass ranks within each carClass by overall position', () => {
  const result = computePositionInClass([
    { slotId: 1, carClass: 'Hyper', position: 3 },
    { slotId: 2, carClass: 'LMP2', position: 1 },
    { slotId: 3, carClass: 'Hyper', position: 2 },
  ])
  assert.equal(result.get(3), 1) // Hyper, overall P2 -> class P1
  assert.equal(result.get(1), 2) // Hyper, overall P3 -> class P2
  assert.equal(result.get(2), 1) // LMP2, only car -> class P1
})

test('formatGapToLeader marks the leader', () => {
  assert.equal(formatGapToLeader(1, 0, 0), 'Leader')
})

test('formatGapToLeader formats whole laps behind, singular and plural', () => {
  assert.equal(formatGapToLeader(2, 1, 40), '+1 lap')
  assert.equal(formatGapToLeader(5, 3, 40), '+3 laps')
})

test('formatGapToLeader formats seconds behind when on the lead lap', () => {
  assert.equal(formatGapToLeader(2, 0, 1.234), '+1.234')
})

test('never renders a doubled sign for a negative gap', () => {
  assert.equal(formatGapToLeader(5, 0, -34.584), '-34.584')
  assert.equal(formatGapToLeader(4, 0, 52.606), '+52.606')
})

test('reports no countdown once a session runs past its end time', () => {
  assert.equal(remainingOrNull(1800, 2306.8), null)
  const remaining = remainingOrNull(1800, 1712.4)
  assert.ok(remaining !== null && Math.abs(remaining - 87.6) < 1e-6)
  assert.equal(remainingOrNull(0, 500), null)
})

// Verbatim from a live LMU practice session (the payload that exposed the
// gamePhase bug): numeric gamePhase, empty serverName, session 'PRACTICE1'.
const LIVE_MONZA: RawSessionInfo = {
  currentEventTime: 2685.2000000000003,
  endEventTime: 3600.0,
  trackName: 'Autodromo Nazionale Monza',
  serverName: '',
  session: 'PRACTICE1',
  yellowFlagState: 'NONE',
  gamePhase: 5,
}

// LMU reports ELMS class strings, not the WEC names the UI tints on. Getting
// this wrong is silent: rows render, they just lose their class colour.
test('normalizes the class strings a live ELMS grid actually sends', () => {
  assert.equal(normalizeCarClass('GT3'), 'LMGT3')
  assert.equal(normalizeCarClass('LMP2_ELMS'), 'LMP2')
  assert.equal(normalizeCarClass('Hyper'), 'HYPERCAR')
  // Unobserved classes pass through rather than being guessed into a bucket.
  assert.equal(normalizeCarClass('LMGT3_2027'), 'LMGT3_2027')
})

test('maps a real live standings payload', () => {
  const parsed = parseStandingsList(LIVE_STANDINGS)
  assert.ok(parsed !== null && parsed.skipped === 0)
  const entries = mapStandings(parsed.entries)
  assert.deepEqual(
    entries.map((e) => e.carClass),
    ['LMGT3', 'LMP2', 'LMGT3', 'LMGT3'],
  )
  // Class rank is derived from overall position within each class.
  const byNumber = new Map(entries.map((e) => [e.carNumber, e]))
  assert.equal(byNumber.get('37')?.gapToLeader, 'Leader')
  assert.equal(byNumber.get('77')?.gapToLeader, '+5 laps')
  assert.equal(byNumber.get('76')?.gapToLeader, '+36.326')
  // A car with no completed lap must show no lap time, not LMU's -1 sentinel.
  assert.equal(byNumber.get('15')?.lastLapSeconds, null)
  assert.equal(byNumber.get('15')?.sector1, null)
  assert.equal(byNumber.get('15')?.inPit, true)
})

function throwOnUnknown(value: string): never {
  throw new Error(`should not report an unknown phase, got ${value}`)
}

test('maps a real live sessionInfo payload', () => {
  const info = mapSessionInfo(LIVE_MONZA, throwOnUnknown)
  assert.equal(info.connected, true)
  assert.equal(info.sessionType, 'PRACTICE')
  assert.equal(info.sessionPhase, 'GREEN') // gamePhase 5, not the string 'GPHASE_GREEN'
  assert.equal(info.trackName, 'Autodromo Nazionale Monza')
  assert.equal(info.serverName, null) // '' is offline/solo, not a server name
  assert.ok(info.remainingSeconds !== null && Math.abs(info.remainingSeconds - 914.8) < 1e-6)
})

test('maps the rFactor 2 gamePhase ordinals a steward acts on', () => {
  const phaseOf = (gamePhase: number) =>
    mapSessionPhase(gamePhase, 'NONE', () => {
      /* unmapped ordinals are expected here */
    })
  assert.equal(phaseOf(5), 'GREEN')
  assert.equal(phaseOf(6), 'FCY')
  assert.equal(phaseOf(7), 'RED')
  assert.equal(phaseOf(8), 'FINISHED')
  // 0-4 are pre-session/formation, 9 is a paused heartbeat: no flag to show.
  for (const ordinal of [0, 1, 2, 3, 4, 9]) assert.equal(phaseOf(ordinal), 'UNKNOWN')
})

// A phase with no flag meaning must still let yellowFlagState speak, so a
// local yellow during a formation lap is not silently reported as UNKNOWN.
test('falls back to yellowFlagState when gamePhase carries no flag', () => {
  const raw: RawSessionInfo = { ...LIVE_MONZA, gamePhase: 3, yellowFlagState: 'PENDING' }
  assert.equal(mapSessionInfo(raw, throwOnUnknown).sessionPhase, 'YELLOW')
})
