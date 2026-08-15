import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { Subject } from 'rxjs'
import type { SessionInfo, StandingEntry } from '@stewardpad/shared'
import type { LmuAdapter, LmuUpdate } from '../lmu/lmu-adapter.js'
import { LMU_ADAPTER } from '../lmu/lmu.constants.js'

/** Session/standings only — collisions are consumed directly off the adapter by IncidentsService. */
export interface SessionUpdate {
  session: SessionInfo
  standings: StandingEntry[]
}

function defaultSession(): SessionInfo {
  return {
    connected: false,
    sessionType: 'UNKNOWN',
    sessionPhase: 'UNKNOWN',
    elapsedSeconds: 0,
    remainingSeconds: null,
    trackName: '',
    serverName: null,
  }
}

@Injectable()
export class SessionService implements OnModuleInit {
  private session = defaultSession()
  private standings: StandingEntry[] = []
  private readonly updates = new Subject<SessionUpdate>()
  /** Same rate as the adapter poll; the gateway throttles standings itself. */
  readonly updates$ = this.updates.asObservable()

  constructor(@Inject(LMU_ADAPTER) private readonly adapter: LmuAdapter) {}

  onModuleInit(): void {
    this.adapter.updates$.subscribe((update) => this.applyUpdate(update))
  }

  getSession(): SessionInfo {
    return this.session
  }

  getStandings(): StandingEntry[] {
    return this.standings
  }

  private applyUpdate(update: LmuUpdate): void {
    this.session = { ...update.session, connected: this.adapter.isConnected() }
    this.standings = update.standings
    this.updates.next({ session: this.session, standings: this.standings })
  }
}
