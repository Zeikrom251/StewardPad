/**
 * Narrows raw `/rest/*` JSON to the exact fields the mapper needs. This and
 * `rest-lmu-mapper.ts` are the only two files allowed to know an LMU field
 * name — a game patch breaks parsing here, nothing downstream.
 *
 * Field names are copied from `scripts/output/*.json` (a live Monza capture),
 * never guessed.
 */

export interface RawSessionInfo {
  currentEventTime: number
  endEventTime: number
  trackName: string
  serverName: string
  session: string
  yellowFlagState: string
  /**
   * A NUMBER, and it lives here on sessionInfo — not a string on a separate
   * `/rest/sessions/GetGameState`, which is what this adapter used to assume
   * and why every tick was discarded. Confirmed against a live Monza practice
   * payload: `"gamePhase":5` alongside `"yellowFlagState":"NONE"`. LMU
   * serializes yellowFlagState as an enum NAME but gamePhase as its raw
   * ordinal — inconsistent, but that is what the game sends.
   */
  gamePhase: number
}

export interface RawStandingEntry {
  slotID: number
  position: number
  carNumber: string
  driverName: string
  fullTeamName: string
  carClass: string
  lapsCompleted: number
  lastLapTime: number
  bestLapTime: number
  lastSectorTime1: number
  lastSectorTime2: number
  pitting: boolean
  pitstops: number
  timeBehindLeader: number
  lapsBehindLeader: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Describes an unparseable payload for a log line — keys/length/typeof only, never values. */
export function describeShape(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `Array(${value.length})`
  if (isRecord(value)) return `{${Object.keys(value).join(', ')}}`
  return typeof value
}

function num(rec: Record<string, unknown>, key: string): number | undefined {
  const value = rec[key]
  return typeof value === 'number' ? value : undefined
}

function str(rec: Record<string, unknown>, key: string): string | undefined {
  const value = rec[key]
  return typeof value === 'string' ? value : undefined
}

function bool(rec: Record<string, unknown>, key: string): boolean | undefined {
  const value = rec[key]
  return typeof value === 'boolean' ? value : undefined
}

export function parseSessionInfo(payload: unknown): RawSessionInfo | null {
  if (!isRecord(payload)) return null
  const currentEventTime = num(payload, 'currentEventTime')
  const endEventTime = num(payload, 'endEventTime')
  const trackName = str(payload, 'trackName')
  const serverName = str(payload, 'serverName')
  const session = str(payload, 'session')
  const yellowFlagState = str(payload, 'yellowFlagState')
  const gamePhase = num(payload, 'gamePhase')
  if (
    currentEventTime === undefined ||
    endEventTime === undefined ||
    trackName === undefined ||
    serverName === undefined ||
    session === undefined ||
    yellowFlagState === undefined ||
    gamePhase === undefined
  )
    return null
  return {
    currentEventTime,
    endEventTime,
    trackName,
    serverName,
    session,
    yellowFlagState,
    gamePhase,
  }
}

export interface StandingsParseResult {
  entries: RawStandingEntry[]
  skipped: number
}

// One bad car must not cost the whole grid: unparseable entries are skipped,
// not fatal. `null` here means the payload itself wasn't an array at all.
export function parseStandingsList(payload: unknown): StandingsParseResult | null {
  if (!Array.isArray(payload)) return null
  const entries: RawStandingEntry[] = []
  let skipped = 0
  for (const item of payload) {
    const entry = parseStandingEntry(item)
    if (entry === null) {
      skipped++
      continue
    }
    entries.push(entry)
  }
  return { entries, skipped }
}

// Field table is exhaustive by design (code-quality SKILL.md §10) — one long
// guard, not nested, keeps a bad LMU payload from ever reaching the mapper.
function parseStandingEntry(payload: unknown): RawStandingEntry | null {
  if (!isRecord(payload)) return null
  const slotID = num(payload, 'slotID')
  const position = num(payload, 'position')
  const carNumber = str(payload, 'carNumber')
  const driverName = str(payload, 'driverName')
  const fullTeamName = str(payload, 'fullTeamName')
  const carClass = str(payload, 'carClass')
  const lapsCompleted = num(payload, 'lapsCompleted')
  const lastLapTime = num(payload, 'lastLapTime')
  const bestLapTime = num(payload, 'bestLapTime')
  const lastSectorTime1 = num(payload, 'lastSectorTime1')
  const lastSectorTime2 = num(payload, 'lastSectorTime2')
  const pitting = bool(payload, 'pitting')
  const pitstops = num(payload, 'pitstops')
  const timeBehindLeader = num(payload, 'timeBehindLeader')
  const lapsBehindLeader = num(payload, 'lapsBehindLeader')
  if (
    slotID === undefined ||
    position === undefined ||
    carNumber === undefined ||
    driverName === undefined ||
    fullTeamName === undefined ||
    carClass === undefined ||
    lapsCompleted === undefined ||
    lastLapTime === undefined ||
    bestLapTime === undefined ||
    lastSectorTime1 === undefined ||
    lastSectorTime2 === undefined ||
    pitting === undefined ||
    pitstops === undefined ||
    timeBehindLeader === undefined ||
    lapsBehindLeader === undefined
  )
    return null
  return {
    slotID,
    position,
    carNumber,
    driverName,
    fullTeamName,
    carClass,
    lapsCompleted,
    lastLapTime,
    bestLapTime,
    lastSectorTime1,
    lastSectorTime2,
    pitting,
    pitstops,
    timeBehindLeader,
    lapsBehindLeader,
  }
}
