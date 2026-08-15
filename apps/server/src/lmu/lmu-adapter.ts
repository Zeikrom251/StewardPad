/** Everything LMU-related sits behind this. Prompt §7.1 — the adapter boundary. */

import type { Observable } from 'rxjs'
import type { SessionInfo, StandingEntry } from '@stewardpad/shared'
import type { LmuCollision } from './lmu-incident-resolver.js'

export interface LmuUpdate {
  session: SessionInfo
  standings: StandingEntry[]
  /** Newly-resolved collisions this tick — already mapped, never raw LMU fields. */
  collisions: LmuCollision[]
}

export interface LmuAdapter {
  readonly name: 'mock' | 'rest'
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  /** Emits on every successful poll/push. */
  readonly updates$: Observable<LmuUpdate>
}
