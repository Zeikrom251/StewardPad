/**
 * LMU exposes no session id, so a new session is inferred: the track or
 * session type changed, or the clock jumped backwards (same session type
 * restarted). Small backwards jitter is tolerated — a real restart drops the
 * clock to ~0, not by a second.
 */

import type { SessionInfo } from '@stewardpad/shared'

const CLOCK_REWIND_TOLERANCE_SECONDS = 5

export function detectNewSession(previous: SessionInfo, current: SessionInfo): boolean {
  return (
    previous.trackName !== current.trackName ||
    previous.sessionType !== current.sessionType ||
    current.elapsedSeconds < previous.elapsedSeconds - CLOCK_REWIND_TOLERANCE_SECONDS
  )
}
