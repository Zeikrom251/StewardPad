/** Live state read from LMU (or the mock adapter). Prompt §7.2. */

export type SessionType = 'PRACTICE' | 'QUALIFYING' | 'RACE' | 'UNKNOWN'

export type SessionPhase =
  'GREEN' | 'YELLOW' | 'FCY' | 'SAFETY_CAR' | 'RED' | 'FINISHED' | 'UNKNOWN'

export interface SessionInfo {
  connected: boolean
  sessionType: SessionType
  sessionPhase: SessionPhase
  /** Canonical timestamp source for every incident, float seconds. */
  elapsedSeconds: number
  remainingSeconds: number | null
  trackName: string
  serverName: string | null
}

export interface StandingEntry {
  /**
   * Unique per car for the life of a session (LMU `slotID`). Car numbers are
   * NOT unique — a real hosted grid was observed with two #15 and two #007 —
   * so this, never carNumber, is the identity for keys and lookups.
   */
  slotId: number
  position: number
  positionInClass: number
  carNumber: string
  driverName: string
  teamName: string
  /** HYPERCAR | LMP2 | LMGT3 | ... */
  carClass: string
  lapsCompleted: number
  gapToLeader: string
  lastLapSeconds: number | null
  bestLapSeconds: number | null
  sector1: number | null
  sector2: number | null
  sector3: number | null
  topSpeedKph: number | null
  inPit: boolean
  pitStops: number
}
