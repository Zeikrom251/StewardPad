import type { SessionType } from '@stewardpad/shared'
import { formatHms } from '../common/format-time.js'

/** "<SESSION TYPE> <HH:MM:SS> — Lap <n>" — typed into the LMU replay scrubber. */
export function buildReplayReference(
  sessionType: SessionType,
  eventSeconds: number,
  lap: number,
): string {
  return `${sessionType} ${formatHms(eventSeconds)} — Lap ${lap}`
}

/**
 * The lap is historical — "taken from the first involved car at log time"
 * (§7.3). An incident logged with no cars carries its lap only here, so a later
 * edit reads it back rather than restamping from standings that have moved on.
 */
export function lapFromReplayReference(reference: string): number {
  const lap = /Lap (\d+)$/.exec(reference)?.[1]
  return lap === undefined ? 0 : Number(lap)
}
