/**
 * Verbatim excerpts of real LMU REST responses, captured from a live 20-car
 * ELMS session at Monza (LMU 2026, `LMU_BASE_URL=http://localhost:6397`).
 *
 * These live in source, not in the gitignored `scripts/output/`, on purpose:
 * the original Phase 0 captures were lost, and without them nobody could tell
 * whether the field table was right — which is exactly how a `gamePhase` that
 * had moved endpoints AND changed type went unnoticed while the adapter
 * silently discarded every tick. Committed samples make that regression
 * impossible to reintroduce unseen.
 *
 * Trimmed only by DELETING whole fields the adapter never reads (car physics
 * vectors, upgrade packs, steamID, …). Every field kept is byte-for-byte what
 * the game sent, including the sentinel `-1.0` times and the duplicate car
 * numbers. Do not "tidy" the values.
 */

/** GET /rest/watch/sessionInfo — note `gamePhase` is a NUMBER and lives here. */
export const LIVE_SESSION_INFO = {
  currentEventTime: 2685.2000000000003,
  endEventTime: 3600.0,
  gameMode: 'UNKNOWN',
  gamePhase: 5,
  maxPlayers: 34,
  numberOfVehicles: 18,
  playerName: 'Ryan Chikhi',
  serverName: '',
  session: 'PRACTICE1',
  startEventTime: 30.0,
  trackName: 'Autodromo Nazionale Monza',
  yellowFlagState: 'NONE',
}

/**
 * GET /rest/watch/standings — four representative cars:
 * a GT3 in the pits with no lap time yet, an LMP2 leader, a GT3 mid-lap with
 * only sector 1 set, and the second `#77` on the grid (car numbers are NOT
 * unique — this is why `slotID` is the identity).
 */
export const LIVE_STANDINGS = [
  {
    bestLapTime: 111.25164794921875,
    carClass: 'GT3',
    carNumber: '15',
    driverName: 'Quentin Bertini',
    fullTeamName: 'A que vroom vroom',
    gamePhase: 'GREEN', // a STRING here, unlike sessionInfo's ordinal — unused
    lapsBehindLeader: 0,
    lapsCompleted: 24,
    lastLapTime: -1.0,
    lastSectorTime1: -1.0,
    lastSectorTime2: -1.0,
    pitstops: 0,
    pitting: true,
    position: 12,
    slotID: 0,
    timeBehindLeader: 0.0,
  },
  {
    bestLapTime: 97.7177734375,
    carClass: 'LMP2_ELMS',
    carNumber: '37',
    driverName: 'M Bravo',
    fullTeamName: 'CLX - Pure Rxcing',
    gamePhase: 'GREEN',
    lapsBehindLeader: 0,
    lapsCompleted: 14,
    lastLapTime: -1.0,
    lastSectorTime1: 32.623046875,
    lastSectorTime2: 66.034423828125,
    pitstops: 0,
    pitting: false,
    position: 1,
    slotID: 10,
    timeBehindLeader: 0.0,
  },
  {
    bestLapTime: 112.72265625,
    carClass: 'GT3',
    carNumber: '76',
    driverName: 'Dennis Nowak',
    fullTeamName: 'DN76 HZR TEAM',
    gamePhase: 'GREEN',
    lapsBehindLeader: 0,
    lapsCompleted: 14,
    lastLapTime: -1.0,
    lastSectorTime1: 37.700439453125,
    lastSectorTime2: -1.0,
    pitstops: 0,
    pitting: false,
    position: 15,
    slotID: 12,
    timeBehindLeader: 36.326385498046875,
  },
  {
    bestLapTime: 110.42431640625,
    carClass: 'GT3',
    carNumber: '77',
    driverName: 'Marcus von Winch',
    fullTeamName: 'Gulf Porsche Racing LMGT3',
    gamePhase: 'GREEN',
    lapsBehindLeader: 5,
    lapsCompleted: 9,
    lastLapTime: 110.561279296875,
    lastSectorTime1: 36.625,
    lastSectorTime2: 73.993896484375,
    pitstops: 0,
    pitting: false,
    position: 9,
    slotID: 18,
    timeBehindLeader: 0.0,
  },
]
