/** Derives ordered StandingEntry[] from the internal mock car states. */

import type { StandingEntry } from '@stewardpad/shared'
import type { MockCarState } from './mock-car-physics.js'

export function buildStandings(cars: MockCarState[]): StandingEntry[] {
  const ranked = [...cars].sort((a, b) => raceProgress(b) - raceProgress(a))
  const leader = ranked[0]
  if (!leader) return []
  const leaderProgress = raceProgress(leader)
  const classPositions = new Map<string, number>()

  return ranked.map((car, index) => {
    const positionInClass = (classPositions.get(car.carClass) ?? 0) + 1
    classPositions.set(car.carClass, positionInClass)
    return toStandingEntry(car, index + 1, positionInClass, leader, leaderProgress)
  })
}

function toStandingEntry(
  car: MockCarState,
  position: number,
  positionInClass: number,
  leader: MockCarState,
  leaderProgress: number,
): StandingEntry {
  return {
    slotId: car.slotId,
    position,
    positionInClass,
    carNumber: car.carNumber,
    driverName: car.driverName,
    teamName: car.teamName,
    carClass: car.carClass,
    lapsCompleted: car.lapsCompleted,
    gapToLeader: formatGap(car, leader, leaderProgress),
    lastLapSeconds: car.lastLapSeconds,
    bestLapSeconds: car.bestLapSeconds,
    sector1: car.sector1,
    sector2: car.sector2,
    sector3: car.sector3,
    topSpeedKph: round1(car.topSpeedKph),
    inPit: car.inPit,
    pitStops: car.pitStops,
  }
}

function raceProgress(car: MockCarState): number {
  return car.lapsCompleted + car.lapProgressSeconds / car.baseLapSeconds
}

function formatGap(car: MockCarState, leader: MockCarState, leaderProgress: number): string {
  if (car === leader) return 'Leader'
  const lapDiff = leader.lapsCompleted - car.lapsCompleted
  if (lapDiff >= 1) return `+${lapDiff} LAP${lapDiff > 1 ? 'S' : ''}`
  const avgLapTime = (leader.baseLapSeconds + car.baseLapSeconds) / 2
  const seconds = (leaderProgress - raceProgress(car)) * avgLapTime
  return `+${seconds.toFixed(3)}`
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
