/**
 * Connection state + log de-duplication for RestLmuAdapter, split out purely
 * to keep the adapter file under the 200-line limit — no domain logic here,
 * just "am I connected" and "have I already warned about this".
 */

import { Logger } from '@nestjs/common'

export type ConnectionState = 'unknown' | 'connected' | 'disconnected'

export class RestLmuConnectionLog {
  private readonly logger = new Logger('RestLmuAdapter')
  private readonly seenUnknownPhases = new Set<string>()
  private readonly seenProblems = new Set<string>()
  private readonly seenUnresolvedDrivers = new Set<string>()
  private state: ConnectionState = 'unknown'
  private lastSkippedStandings = 0

  constructor(
    private readonly baseUrl: string,
    private readonly retryMs: number,
  ) {}

  isConnected(): boolean {
    return this.state === 'connected'
  }

  reset(): void {
    this.state = 'unknown'
  }

  noteConnected(): void {
    if (this.state === 'connected') return
    const reconnecting = this.state === 'disconnected'
    this.state = 'connected'
    this.logger.log(
      reconnecting
        ? `Reconnected to LMU at ${this.baseUrl}`
        : `Connected to LMU at ${this.baseUrl}`,
    )
  }

  noteDisconnected(): void {
    if (this.state === 'disconnected') return // already known-down — stay silent, not once per attempt
    this.state = 'disconnected'
    this.logger.warn(`Cannot reach LMU at ${this.baseUrl} — retrying every ${this.retryMs}ms`)
  }

  // One line per distinct problem (endpoint + cause), not one per poll —
  // fetch failures and shape mismatches are tracked as separate causes so a
  // fixed fetch that still mismatches shape logs again.
  noteProblem(endpoint: string, detail: string): void {
    const key = `${endpoint}|${detail}`
    if (this.seenProblems.has(key)) return
    this.seenProblems.add(key)
    this.logger.warn(`LMU ${endpoint} ${detail}`)
  }

  noteSkippedStandings(count: number): void {
    if (count === this.lastSkippedStandings) return
    this.lastSkippedStandings = count
    if (count > 0) {
      this.logger.warn(
        `Skipped ${count} unparseable standings entr${count === 1 ? 'y' : 'ies'} this tick`,
      )
    }
  }

  logUnknownPhase(value: string): void {
    if (this.seenUnknownPhases.has(value)) return
    this.seenUnknownPhases.add(value)
    this.logger.warn(`Unrecognized LMU gamePhase "${value}" — mapping to UNKNOWN`)
  }

  // One line per distinct driver name, not per poll — the cumulative
  // incidents feed would otherwise repeat the same unresolvable name forever.
  // Covers both "no standings slot has this name" and "more than one slot
  // does" (e.g. two same-named drivers) — either way the collision is
  // dropped rather than guessed at.
  logUnresolvedDriver(name: string): void {
    if (this.seenUnresolvedDrivers.has(name)) return
    this.seenUnresolvedDrivers.add(name)
    this.logger.warn(
      `LMU incidents feed named driver "${name}" — not uniquely resolvable in standings, skipping`,
    )
  }
}
