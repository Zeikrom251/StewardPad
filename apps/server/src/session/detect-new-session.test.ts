import assert from 'node:assert/strict'
import test from 'node:test'
import type { SessionInfo } from '@stewardpad/shared'
import { detectNewSession } from './detect-new-session.js'

function session(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    connected: true,
    sessionType: 'RACE',
    sessionPhase: 'GREEN',
    elapsedSeconds: 600,
    remainingSeconds: null,
    trackName: 'Monza',
    serverName: null,
    ...overrides,
  }
}

test('clock ticking forward in the same session is not a new session', () => {
  assert.equal(detectNewSession(session(), session({ elapsedSeconds: 601 })), false)
})

test('a second of backwards jitter is not a new session', () => {
  assert.equal(detectNewSession(session(), session({ elapsedSeconds: 599 })), false)
})

test('session type change is a new session', () => {
  assert.equal(detectNewSession(session({ sessionType: 'QUALIFYING' }), session()), true)
})

test('track change is a new session', () => {
  assert.equal(detectNewSession(session(), session({ trackName: 'Sebring' })), true)
})

test('clock reset is a new session', () => {
  assert.equal(detectNewSession(session(), session({ elapsedSeconds: 3 })), true)
})
