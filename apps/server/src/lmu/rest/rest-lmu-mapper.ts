/**
 * Raw LMU JSON → domain types. The one place a game patch is allowed to
 * break. Nothing outside this file (and `rest-lmu-types.ts`) ever sees a raw
 * LMU field name — SKILL.md §5.
 */

import type { SessionInfo, SessionType, SessionPhase, StandingEntry } from '@stewardpad/shared'
import type { RawSessionInfo, RawStandingEntry } from './rest-lmu-types.js'

/**
 * LMU's `carClass` is the raw class string off the vehicle files, and it is
 * NOT the WEC name the UI tints and filters on: a live ELMS grid at Monza
 * reported `"GT3"` and `"LMP2_ELMS"`. An unmapped value passes through
 * untouched — a class with no tint is a cosmetic miss, inventing a mapping
 * for a class nobody has observed is a correctness one.
 */
const CAR_CLASS_ALIASES: Record<string, string> = {
  Hyper: 'HYPERCAR',
  GT3: 'LMGT3',
  LMP2_ELMS: 'LMP2',
  LMP2: 'LMP2',
  LMGT3: 'LMGT3',
}

export function normalizeCarClass(raw: string): string {
  return CAR_CLASS_ALIASES[raw] ?? raw
}

export function mapSessionType(raw: string): SessionType {
  const upper = raw.toUpperCase()
  if (upper.startsWith('PRACTICE') || upper.startsWith('WARMUP')) return 'PRACTICE'
  if (upper.startsWith('QUALIFY')) return 'QUALIFYING'
  if (upper.startsWith('RACE')) return 'RACE'
  return 'UNKNOWN'
}

/**
 * LMU sends `gamePhase` as rFactor 2's `mGamePhase` ordinal, documented in the
 * rF2 SDK's `InternalsPlugin.hpp` (ScoringInfoV01) as:
 *
 *   0 Before session has begun      5 Green flag
 *   1 Reconnaissance laps (race)    6 Full course yellow / safety car
 *   2 Grid walk-through (race)      7 Session stopped
 *   3 Formation lap (race)          8 Session over
 *   4 Starting-light countdown      9 Paused (heartbeat update)
 *
 * `5` was confirmed live on a Monza practice session. Phases 0-4 and 9 are
 * real values but map to no steward-facing flag state, so they fall through
 * to the yellowFlagState path in mapSessionPhase rather than being reported
 * as a flag the steward would act on.
 */
const GAME_PHASE: Readonly<Record<number, SessionPhase>> = {
  5: 'GREEN',
  6: 'FCY',
  7: 'RED',
  8: 'FINISHED',
}

function mapGamePhase(gamePhase: number): SessionPhase {
  return GAME_PHASE[gamePhase] ?? 'UNKNOWN'
}

function mapYellowFlagState(state: string): SessionPhase {
  if (state === 'NONE') return 'UNKNOWN'
  if (state.includes('FULL_COURSE') || state.includes('FCY')) return 'FCY'
  if (state.includes('SAFETY')) return 'SAFETY_CAR'
  return 'YELLOW'
}

export function mapSessionPhase(
  gamePhase: number,
  yellowFlagState: string,
  onUnknown: (value: string) => void,
): SessionPhase {
  const fromGamePhase = mapGamePhase(gamePhase)
  if (fromGamePhase !== 'UNKNOWN') return fromGamePhase
  const fromYellow = mapYellowFlagState(yellowFlagState)
  if (fromYellow !== 'UNKNOWN') return fromYellow
  onUnknown(String(gamePhase))
  return 'UNKNOWN'
}

export function mapSessionInfo(
  raw: RawSessionInfo,
  onUnknownPhase: (value: string) => void,
): SessionInfo {
  return {
    connected: true,
    sessionType: mapSessionType(raw.session),
    sessionPhase: mapSessionPhase(raw.gamePhase, raw.yellowFlagState, onUnknownPhase),
    elapsedSeconds: raw.currentEventTime,
    remainingSeconds: remainingOrNull(raw.endEventTime, raw.currentEventTime),
    trackName: raw.trackName,
    serverName: raw.serverName === '' ? null : raw.serverName,
  }
}

// `-1.0` is LMU's "no time yet" sentinel; `0.0` shows up for the same reason
// on cars that haven't started a lap. Neither is a real lap/sector time.
function positiveOrNull(value: number): number | null {
  return value > 0 ? value : null
}

function nonNegative(value: number): number | null {
  return value < 0 ? null : value
}

/**
 * LMU's sector fields are cumulative-from-lap-start, not per-sector, and
 * there is no sector-3 field at all — verified against a live lap (car #8:
 * lastLapTime 89.956, lastSectorTime1 22.828, lastSectorTime2 56.996).
 * A missing (null) input cascades: sector2 needs sector1's cumulative value,
 * sector3 needs sector2's, so an unknown earlier sector makes the later ones
 * unknown too, and a negative result (never observed, but not provably
 * impossible) is nulled rather than shown.
 */
export function deriveSectors(
  lastLapSeconds: number | null,
  sector1Raw: number | null,
  sector2CumulativeRaw: number | null,
): [number | null, number | null, number | null] {
  if (sector1Raw === null) return [null, null, null]
  if (sector2CumulativeRaw === null) return [sector1Raw, null, null]
  const sector2 = nonNegative(sector2CumulativeRaw - sector1Raw)
  if (lastLapSeconds === null) return [sector1Raw, sector2, null]
  const sector3 = nonNegative(lastLapSeconds - sector2CumulativeRaw)
  return [sector1Raw, sector2, sector3]
}

/**
 * A session can run past its nominal end (observed: -506.8s in practice).
 * `null` means "no meaningful countdown" — the header has no concept of
 * overtime, and a negative clock reads as a bug to the steward.
 */
export function remainingOrNull(endEventTime: number, currentEventTime: number): number | null {
  if (endEventTime <= 0) return null
  const remaining = endEventTime - currentEventTime
  return remaining < 0 ? null : remaining
}

export function formatGapToLeader(
  position: number,
  lapsBehindLeader: number,
  timeBehindLeader: number,
): string {
  if (position === 1) return 'Leader'
  if (lapsBehindLeader >= 1) return `+${lapsBehindLeader} lap${lapsBehindLeader > 1 ? 's' : ''}`
  // LMU reports a negative delta for cars ahead on a rolling comparison, which
  // must not render as "+-34.584" — the sign carries the meaning on its own.
  if (timeBehindLeader < 0) return timeBehindLeader.toFixed(3)
  return `+${timeBehindLeader.toFixed(3)}`
}

interface ClassRankable {
  slotId: number
  carClass: string
  position: number
}

/** `positionInClass` has no source field — ranked here by overall `position` within `carClass`. */
export function computePositionInClass(entries: readonly ClassRankable[]): Map<number, number> {
  const byPosition = [...entries].sort((a, b) => a.position - b.position)
  const counters = new Map<string, number>()
  const result = new Map<number, number>()
  for (const entry of byPosition) {
    const next = (counters.get(entry.carClass) ?? 0) + 1
    counters.set(entry.carClass, next)
    result.set(entry.slotId, next)
  }
  return result
}

function mapStandingEntry(raw: RawStandingEntry, positionInClass: number): StandingEntry {
  const lastLapSeconds = positiveOrNull(raw.lastLapTime)
  const sector1Raw = positiveOrNull(raw.lastSectorTime1)
  const sector2CumRaw = positiveOrNull(raw.lastSectorTime2)
  const [sector1, sector2, sector3] = deriveSectors(lastLapSeconds, sector1Raw, sector2CumRaw)
  return {
    slotId: raw.slotID,
    position: raw.position,
    positionInClass,
    carNumber: raw.carNumber,
    driverName: raw.driverName,
    teamName: raw.fullTeamName,
    carClass: normalizeCarClass(raw.carClass),
    lapsCompleted: raw.lapsCompleted,
    gapToLeader: formatGapToLeader(raw.position, raw.lapsBehindLeader, raw.timeBehindLeader),
    lastLapSeconds,
    bestLapSeconds: positiveOrNull(raw.bestLapTime),
    sector1,
    sector2,
    sector3,
    // No top-speed field exists on this endpoint — only an instantaneous
    // velocity vector, not a session max. Prompt §4.1's assumption was wrong.
    topSpeedKph: null,
    inPit: raw.pitting,
    pitStops: raw.pitstops,
  }
}

export function mapStandings(rawList: RawStandingEntry[]): StandingEntry[] {
  const positionInClass = computePositionInClass(
    rawList.map((r) => ({ slotId: r.slotID, carClass: r.carClass, position: r.position })),
  )
  return rawList.map((raw) => mapStandingEntry(raw, positionInClass.get(raw.slotID) ?? 0))
}
