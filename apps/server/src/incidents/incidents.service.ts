import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common'
import { Subject } from 'rxjs'
import type {
  CreateIncidentInput,
  Incident,
  InvolvedCar,
  MergeIncidentsInput,
  QuickLogInput,
  SessionInfo,
  UpdateIncidentInput,
} from '@stewardpad/shared'
import { PersistenceService } from '../persistence/persistence.service.js'
import { SessionService } from '../session/session.service.js'
import { detectNewSession } from '../session/detect-new-session.js'
import type { LmuAdapter, LmuUpdate } from '../lmu/lmu-adapter.js'
import { LMU_ADAPTER } from '../lmu/lmu.constants.js'
import type { LmuCollision } from '../lmu/lmu-incident-resolver.js'
import { computeEventSeconds } from './lookback.js'
import { buildReplayReference, lapFromReplayReference } from './replay-reference.js'
import { createIncidentRecord } from './incident-factory.js'
import { isActiveIncident, mergeCars, selectPrimary } from './merge-incidents.js'
import { resolveLmuCars } from './resolve-lmu-cars.js'
import { resolveManualCars } from './resolve-manual-cars.js'

@Injectable()
export class IncidentsService implements OnModuleInit {
  private readonly logger = new Logger(IncidentsService.name)
  private readonly changes = new Subject<void>()
  readonly changes$ = this.changes.asObservable()
  /**
   * In-memory only, and seeded by the first update after boot: a restart
   * mid-session must keep the incidents it just restored from disk. A session
   * that started while the tool was off is still archived by hand.
   */
  private lastSession: SessionInfo | null = null

  constructor(
    private readonly persistenceService: PersistenceService,
    private readonly sessionService: SessionService,
    @Inject(LMU_ADAPTER) private readonly lmuAdapter: LmuAdapter,
  ) {}

  /** Auto-creates incidents from LMU's incidents feed as it arrives — prompt addendum. */
  onModuleInit(): void {
    this.lmuAdapter.updates$.subscribe((update) => void this.handleUpdate(update))
  }

  /**
   * Archive-then-ingest, in that order: the archive resets the sequence and
   * the LMU dedupe keys, so this tick's collisions belong to the new session
   * and start at #1. Incidents are never dropped — they land in the archive dir.
   */
  private async handleUpdate(update: LmuUpdate): Promise<void> {
    const previous = this.lastSession
    this.lastSession = update.session
    if (previous && detectNewSession(previous, update.session)) {
      this.logger.log(
        `New LMU session (${update.session.trackName} ${update.session.sessionType}) — ` +
          `archiving ${previous.trackName} ${previous.sessionType}`,
      )
      await this.archive(previous.trackName)
    }
    this.ingestLmuCollisions(update.collisions)
  }

  list(): Incident[] {
    return this.persistenceService.listIncidents().filter(isActiveIncident)
  }

  get(id: string): Incident {
    const incident = this.persistenceService.getIncident(id)
    if (!incident) throw new NotFoundException(`Incident ${id} not found`)
    return incident
  }

  /** Cars only; look-back and every other field are server-side defaults. */
  quickLog(input: QuickLogInput): Incident {
    const session = this.sessionService.getSession()
    const config = this.persistenceService.getConfig()
    const loggedAtSeconds = session.elapsedSeconds
    const eventSeconds = computeEventSeconds(loggedAtSeconds, config.lookbackSeconds)
    const cars = this.resolveCars(input.slotIds ?? [])
    const incident = createIncidentRecord({
      sequenceNumber: this.persistenceService.nextSequence(),
      eventSeconds,
      loggedAtSeconds,
      lookbackApplied: loggedAtSeconds - eventSeconds,
      cars,
      type: 'OTHER',
      loggedBy: input.loggedBy ?? config.stewardName,
      replayReference: buildReplayReference(session.sessionType, eventSeconds, this.lapFor(cars)),
    })
    return this.persist(incident)
  }

  create(input: CreateIncidentInput): Incident {
    const session = this.sessionService.getSession()
    const loggedAtSeconds = session.elapsedSeconds
    const eventSeconds = input.eventSeconds ?? loggedAtSeconds
    const cars = input.cars ?? []
    const incident = createIncidentRecord({
      sequenceNumber: this.persistenceService.nextSequence(),
      eventSeconds,
      loggedAtSeconds,
      lookbackApplied: Math.max(0, loggedAtSeconds - eventSeconds),
      cars,
      type: input.type ?? 'OTHER',
      loggedBy: input.loggedBy ?? this.persistenceService.getConfig().stewardName,
      replayReference: buildReplayReference(session.sessionType, eventSeconds, this.lapFor(cars)),
      overrides: input,
    })
    return this.persist(incident)
  }

  /** Recomputes replayReference so a timestamp nudge keeps it in sync. */
  update(id: string, input: UpdateIncidentInput): Incident {
    const existing = this.get(id)
    const merged = this.applyEditableFields(existing, input)
    // lookbackApplied records what happened when the key was pressed. A manual
    // nudge moves eventSeconds only — it never rewrites that history (§7.3).
    merged.replayReference = buildReplayReference(
      this.sessionService.getSession().sessionType,
      merged.eventSeconds,
      merged.cars[0]?.lapAtIncident ?? lapFromReplayReference(existing.replayReference),
    )
    return this.persist(merged)
  }

  /**
   * Field-by-field merge, not a blind spread: with the ES2022 class-field
   * emit, every declared-but-unsent optional DTO field is an own property
   * set to `undefined`, so `{ ...existing, ...input }` would silently wipe
   * every field a PATCH body doesn't mention. `??` skips those; `!==
   * undefined` is used for penalty/reviewedBy so an explicit `null` (the
   * steward clearing the field) still takes effect.
   */
  private applyEditableFields(existing: Incident, input: UpdateIncidentInput): Incident {
    return {
      ...existing,
      eventSeconds: input.eventSeconds ?? existing.eventSeconds,
      cars: input.cars ?? existing.cars,
      type: input.type ?? existing.type,
      status: input.status ?? existing.status,
      summary: input.summary ?? existing.summary,
      stewardNotes: input.stewardNotes ?? existing.stewardNotes,
      decision: input.decision ?? existing.decision,
      penalty: input.penalty !== undefined ? input.penalty : existing.penalty,
      loggedBy: input.loggedBy ?? existing.loggedBy,
      reviewedBy: input.reviewedBy !== undefined ? input.reviewedBy : existing.reviewedBy,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Merges ≥2 incidents into one primary. Children are retained in the store
   * (audit trail) but excluded from list/CSV. The primary accumulates cars
   * from all selected incidents; its status/type/decision are untouched.
   *
   * Errors:
   *  404 if any id doesn't exist
   *  400 if <2 ids, if primaryId not in incidentIds, or if any incident is
   *      already a child (mergedIntoId !== null)
   */
  merge(input: MergeIncidentsInput): Incident {
    if (input.incidentIds.length < 2) {
      throw new BadRequestException('merge requires at least 2 incidentIds')
    }
    if (input.primaryId && !input.incidentIds.includes(input.primaryId)) {
      throw new BadRequestException('primaryId must be one of incidentIds')
    }
    const incidents = input.incidentIds.map((id) => this.get(id))
    const alreadyChild = incidents.find((i) => i.mergedIntoId !== null)
    if (alreadyChild) {
      throw new BadRequestException(
        `Incident #${alreadyChild.sequenceNumber} is already merged into another incident — ` +
          'to expand a merge group, include the primary incident and the new incidents together',
      )
    }
    const primary = selectPrimary(incidents, input.primaryId)
    const children = incidents.filter((i) => i.id !== primary.id)
    const now = new Date().toISOString()
    const updatedPrimary: Incident = {
      ...primary,
      cars: mergeCars([primary, ...children]),
      mergedFromIds: [...primary.mergedFromIds, ...children.map((c) => c.id)],
      updatedAt: now,
    }
    this.persistenceService.saveIncident(updatedPrimary)
    for (const child of children) {
      this.persistenceService.saveIncident({ ...child, mergedIntoId: primary.id, updatedAt: now })
    }
    this.changes.next()
    return updatedPrimary
  }

  remove(id: string): void {
    const deleted = this.persistenceService.deleteIncident(id)
    if (!deleted) throw new NotFoundException(`Incident ${id} not found`)
    this.changes.next()
  }

  /** Defaults to the live track; the auto-archive passes the *previous* session's. */
  async archive(trackName = this.sessionService.getSession().trackName): Promise<void> {
    await this.persistenceService.archive(trackName)
    this.changes.next()
  }

  /** The feed is cumulative — skip anything already turned into an incident. */
  private ingestLmuCollisions(collisions: LmuCollision[]): void {
    for (const collision of collisions) {
      if (this.persistenceService.hasSeenLmuCollision(collision.key)) continue
      this.createFromLmuCollision(collision)
    }
  }

  /**
   * `et` is the actual moment of contact LMU measured — there is no human
   * reaction delay to subtract, so unlike quickLog this does NOT go through
   * computeEventSeconds: eventSeconds/loggedAtSeconds are both `et`, and
   * lookbackApplied is 0. Applying look-back here would move the timestamp
   * away from the contact and break replay scrubbing.
   */
  private createFromLmuCollision(collision: LmuCollision): void {
    const session = this.sessionService.getSession()
    // Joined by slotID (resolve-lmu-cars.ts), never by carNumber — a bare
    // carNumber lookup is ambiguous whenever two cars share a number.
    const cars = resolveLmuCars(collision.cars, this.sessionService.getStandings())
    const incident = createIncidentRecord({
      sequenceNumber: this.persistenceService.nextSequence(),
      eventSeconds: collision.et,
      loggedAtSeconds: collision.et,
      lookbackApplied: 0,
      cars,
      type: collision.type,
      loggedBy: 'LMU',
      replayReference: buildReplayReference(session.sessionType, collision.et, this.lapFor(cars)),
      source: 'LMU',
      overrides: collision.unresolvedOther
        ? {
            stewardNotes: `LMU reported contact with unresolved driver "${collision.unresolvedOther}"`,
          }
        : undefined,
    })
    this.persistenceService.markLmuCollisionSeen(collision.key)
    this.persist(incident)
  }

  private persist(incident: Incident): Incident {
    this.persistenceService.saveIncident(incident)
    this.changes.next()
    return incident
  }

  private resolveCars(slotIds: string[]): InvolvedCar[] {
    return resolveManualCars(slotIds, this.sessionService.getStandings())
  }

  /** Falls back to the race leader's lap when no involved car is known. */
  private lapFor(cars: InvolvedCar[]): number {
    return cars[0]?.lapAtIncident ?? this.sessionService.getStandings()[0]?.lapsCompleted ?? 0
  }
}
