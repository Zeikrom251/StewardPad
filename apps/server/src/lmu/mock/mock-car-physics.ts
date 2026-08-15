/** Per-tick state advance for one mock car: lap progress, pit stops, sectors. */

import type { MockCarClass, MockRosterEntry } from './mock-roster.js'

export interface MockCarState {
  slotId: number
  carNumber: string
  driverName: string
  teamName: string
  carClass: MockCarClass
  baseLapSeconds: number
  baseTopSpeedKph: number
  lapsCompleted: number
  lapProgressSeconds: number
  lastLapSeconds: number | null
  bestLapSeconds: number | null
  sector1: number | null
  sector2: number | null
  sector3: number | null
  topSpeedKph: number
  inPit: boolean
  pitStops: number
  pitSecondsRemaining: number
}

const PIT_STOP_CHANCE_PER_TICK = 0.0015
const PIT_DURATION_SECONDS = 28

export function initCarState(
  entry: MockRosterEntry,
  startOffsetSeconds: number,
  slotId: number,
): MockCarState {
  return {
    ...entry,
    slotId,
    lapsCompleted: 0,
    lapProgressSeconds: startOffsetSeconds,
    lastLapSeconds: null,
    bestLapSeconds: null,
    sector1: null,
    sector2: null,
    sector3: null,
    topSpeedKph: entry.baseTopSpeedKph,
    inPit: false,
    pitStops: 0,
    pitSecondsRemaining: 0,
  }
}

export function advanceCarState(car: MockCarState, deltaSeconds: number): void {
  if (car.inPit) {
    advancePit(car, deltaSeconds)
    return
  }
  if (Math.random() < PIT_STOP_CHANCE_PER_TICK) {
    enterPit(car)
    return
  }
  advanceOnTrack(car, deltaSeconds)
}

function enterPit(car: MockCarState): void {
  car.inPit = true
  car.pitStops += 1
  car.pitSecondsRemaining = PIT_DURATION_SECONDS
}

function advancePit(car: MockCarState, deltaSeconds: number): void {
  car.pitSecondsRemaining -= deltaSeconds
  if (car.pitSecondsRemaining > 0) return
  car.inPit = false
  car.pitSecondsRemaining = 0
}

function advanceOnTrack(car: MockCarState, deltaSeconds: number): void {
  car.lapProgressSeconds += deltaSeconds
  car.topSpeedKph = jitter(car.baseTopSpeedKph, 8)
  if (car.lapProgressSeconds < car.baseLapSeconds) return
  completeLap(car)
}

function completeLap(car: MockCarState): void {
  const lapTime = jitter(car.baseLapSeconds, 2.5)
  car.lapProgressSeconds -= car.baseLapSeconds
  car.lapsCompleted += 1
  car.lastLapSeconds = lapTime
  car.bestLapSeconds = car.bestLapSeconds === null ? lapTime : Math.min(car.bestLapSeconds, lapTime)
  const [s1, s2, s3] = splitIntoSectors(lapTime)
  car.sector1 = s1
  car.sector2 = s2
  car.sector3 = s3
}

function splitIntoSectors(lapTime: number): [number, number, number] {
  const s1 = lapTime * 0.33
  const s2 = lapTime * 0.34
  const s3 = lapTime - s1 - s2
  return [round2(s1), round2(s2), round2(s3)]
}

function jitter(base: number, spread: number): number {
  return round2(base + (Math.random() - 0.5) * 2 * spread)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
