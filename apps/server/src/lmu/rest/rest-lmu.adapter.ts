/**
 * Polls a live LMU instance over REST. Phase 0 confirmed field names
 * (`scripts/output/*.json`, a real Monza session) — see `rest-lmu-mapper.ts`
 * for the session/standings mapping, `lmu-incident-resolver.ts` for incidents.
 */

import type { Observable } from 'rxjs'
import { Subject } from 'rxjs'
import type { StandingEntry } from '@stewardpad/shared'
import type { LmuAdapter, LmuUpdate } from '../lmu-adapter.js'
import { parseSessionInfo, parseStandingsList, describeShape } from './rest-lmu-types.js'
import { parseIncidentsList } from './rest-lmu-incidents-types.js'
import { mapSessionInfo, mapStandings } from './rest-lmu-mapper.js'
import { resolveLmuCollisions, type LmuCollision } from '../lmu-incident-resolver.js'
import { RestLmuConnectionLog } from './rest-lmu-connection-log.js'

const POLL_MS = 1000
const RETRY_MS = 5000
const FETCH_TIMEOUT_MS = 3000
// 0 = unfiltered: LMU would otherwise coalesce repeat contacts between the
// same pair within this many seconds, which we don't want — our own
// symmetric-pair dedupe already handles the "both cars report it" case, and
// LMU's coalescing would also hide genuinely separate contacts in a battle.
const MIN_TIME_BETWEEN_CONTACTS = 0

// Either the fetch succeeded (raw JSON, shape unverified) or it didn't — kept
// distinct from a shape mismatch so log lines can say which one happened.
type EndpointResult = { ok: true; value: unknown } | { ok: false; error: string }

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class RestLmuAdapter implements LmuAdapter {
  readonly name = 'rest' as const
  readonly updates$: Observable<LmuUpdate>

  private readonly subject = new Subject<LmuUpdate>()
  private readonly baseUrl = process.env.LMU_BASE_URL ?? 'http://localhost:6397'
  private readonly log = new RestLmuConnectionLog(this.baseUrl, RETRY_MS)
  private running = false
  private lastStandings: StandingEntry[] = []

  constructor() {
    this.updates$ = this.subject.asObservable()
  }

  async connect(): Promise<void> {
    if (this.running) return
    this.running = true
    void this.pollLoop() // never awaited: Nest startup must not block on LMU being reachable
  }

  async disconnect(): Promise<void> {
    this.running = false
    this.log.reset()
  }

  // "Connected" means LMU is answering sessionInfo — the tick's spine — not
  // that all three endpoints are perfect on every poll.
  isConnected(): boolean {
    return this.log.isConnected()
  }

  private async pollLoop(): Promise<void> {
    while (this.running) {
      const update = await this.pollOnce()
      if (update) this.subject.next(update)
      await sleep(this.isConnected() ? POLL_MS : RETRY_MS)
    }
  }

  private async pollOnce(): Promise<LmuUpdate | null> {
    const [sessionRes, standingsRes, incidentsRes] = await Promise.all([
      this.fetchResult('/rest/watch/sessionInfo'),
      this.fetchResult('/rest/watch/standings'),
      this.fetchResult(`/rest/watch/getIncidentsList/${MIN_TIME_BETWEEN_CONTACTS}`),
    ])
    return this.mapTick(sessionRes, standingsRes, incidentsRes)
  }

  // sessionInfo is the tick's spine: only it can cancel a tick outright.
  // Standings and incidents degrade independently — see their resolve* methods.
  private mapTick(
    sessionRes: EndpointResult,
    standingsRes: EndpointResult,
    incidentsRes: EndpointResult,
  ): LmuUpdate | null {
    const session = sessionRes.ok ? parseSessionInfo(sessionRes.value) : null
    if (!session) {
      this.noteProblem('sessionInfo', sessionRes)
      this.log.noteDisconnected()
      return null
    }
    this.log.noteConnected()
    const standings = this.resolveStandings(standingsRes)
    return {
      session: mapSessionInfo(session, (v) => this.log.logUnknownPhase(v)),
      standings,
      collisions: this.resolveCollisions(incidentsRes, standings),
    }
  }

  // A failed standings poll degrades to the last known grid, not a wiped one.
  private resolveStandings(res: EndpointResult): StandingEntry[] {
    const parsed = res.ok ? parseStandingsList(res.value) : null
    if (!parsed) {
      this.noteProblem('standings', res)
      return this.lastStandings
    }
    this.log.noteSkippedStandings(parsed.skipped)
    this.lastStandings = mapStandings(parsed.entries)
    return this.lastStandings
  }

  // The endpoint is cumulative, so resolving from scratch every tick is safe
  // and idempotent — see lmu-incident-resolver.ts. A failed poll just yields
  // no new collisions this tick; nothing is lost, the next success re-sends
  // the whole list.
  private resolveCollisions(res: EndpointResult, standings: StandingEntry[]): LmuCollision[] {
    const parsed = res.ok ? parseIncidentsList(res.value) : null
    if (!parsed) {
      this.noteProblem('incidents', res)
      return []
    }
    return resolveLmuCollisions(parsed.entries, standings, (name) =>
      this.log.logUnresolvedDriver(name),
    )
  }

  private async fetchResult(path: string): Promise<EndpointResult> {
    try {
      return { ok: true, value: await this.fetchJson(path) }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async fetchJson(path: string): Promise<unknown> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(`${this.baseUrl}${path}`, { signal: controller.signal })
      if (!res.ok) throw new Error(`${path} responded ${res.status}`)
      return await res.json()
    } finally {
      clearTimeout(timeout)
    }
  }

  private noteProblem(endpoint: string, res: EndpointResult): void {
    const detail = res.ok
      ? `unexpected shape: ${describeShape(res.value)}`
      : `fetch failed: ${res.error}`
    this.log.noteProblem(endpoint, detail)
  }
}
