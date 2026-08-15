/**
 * MockLmuAdapter — not throwaway. This is how the steward trains and how the
 * UI is demoed with LMU closed. 24 cars, 3 classes, laps ticking, gaps
 * drifting, occasional pit stops, elapsed time counting up in real seconds.
 */

import { Logger } from '@nestjs/common'
import type { Observable } from 'rxjs'
import { Subject } from 'rxjs'
import type { SessionInfo } from '@stewardpad/shared'
import type { LmuAdapter, LmuUpdate } from '../lmu-adapter.js'
import { buildRoster } from './mock-roster.js'
import { advanceCarState, initCarState, type MockCarState } from './mock-car-physics.js'
import { buildStandings } from './mock-standings.js'
import { maybeGenerateContacts } from './mock-incidents.js'
import { resolveLmuCollisions, type RawLmuContact } from '../lmu-incident-resolver.js'

const TICK_MS = 1000
// ponytail: fixed fictional track/RACE session, cycle through PRACTICE/QUALIFYING/phases if demo variety matters later.
const TRACK_NAME = 'Sebring International Raceway'

export class MockLmuAdapter implements LmuAdapter {
  readonly name = 'mock' as const
  readonly updates$: Observable<LmuUpdate>

  private readonly subject = new Subject<LmuUpdate>()
  private readonly logger = new Logger('MockLmuAdapter')
  private readonly cars: MockCarState[]
  /** Cumulative, mirroring how the real endpoint behaves — see mock-incidents.ts. */
  private readonly rawContacts: RawLmuContact[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private connected = false
  private elapsedSeconds = 0

  constructor() {
    this.updates$ = this.subject.asObservable()
    this.cars = buildRoster().map((entry, i) => initCarState(entry, i * 0.4, i + 1))
  }

  async connect(): Promise<void> {
    if (this.connected) return
    this.connected = true
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  async disconnect(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }

  private tick(): void {
    const deltaSeconds = TICK_MS / 1000
    this.elapsedSeconds += deltaSeconds
    for (const car of this.cars) advanceCarState(car, deltaSeconds)
    this.rawContacts.push(...maybeGenerateContacts(this.cars, this.elapsedSeconds))
    const standings = buildStandings(this.cars)
    const collisions = resolveLmuCollisions(this.rawContacts, standings, (name) =>
      this.logger.warn(
        `Mock incident named driver "${name}" — not uniquely resolvable in standings, skipping`,
      ),
    )
    this.subject.next({ session: this.buildSession(), standings, collisions })
  }

  private buildSession(): SessionInfo {
    return {
      connected: true,
      sessionType: 'RACE',
      sessionPhase: 'GREEN',
      elapsedSeconds: Math.round(this.elapsedSeconds * 100) / 100,
      remainingSeconds: null,
      trackName: TRACK_NAME,
      serverName: 'Mock Session',
    }
  }
}
