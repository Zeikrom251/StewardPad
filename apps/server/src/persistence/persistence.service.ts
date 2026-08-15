/**
 * Owns the working store: an in-memory Map<string, Incident> plus config.
 * After every mutation, debounced 500ms, the full state is written
 * atomically to disk. Never writes on an idle timer. Prompt §7.4.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import type { Incident } from '@stewardpad/shared'
import { copyFileEnsuringDir, readJsonIfExists, writeAtomic } from './atomic-file.js'
import {
  ARCHIVE_DIR,
  CURRENT_SESSION_PATH,
  DEBOUNCE_MS,
  DEFAULT_CONFIG,
  type PersistedConfig,
  type PersistedState,
} from './persisted-state.js'
import { slugify } from '../common/slugify.js'

@Injectable()
export class PersistenceService implements OnModuleInit {
  private readonly logger = new Logger(PersistenceService.name)
  private readonly incidents = new Map<string, Incident>()
  private readonly seenLmuCollisionKeys = new Set<string>()
  private nextSequenceNumber = 1
  private config: PersistedConfig = { ...DEFAULT_CONFIG }
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  async onModuleInit(): Promise<void> {
    const restored = await readJsonIfExists<PersistedState>(CURRENT_SESSION_PATH)
    if (!restored) return
    // `source` is missing on files written before auto-create existed, and
    // `cars[].carClass` is missing on files written before the slotID identity
    // fix — default rather than reject, so an old session file still loads
    // intact. This never re-attributes who was involved, only fills the new
    // field with '' (unknown) — historical incidents are not re-resolved.
    for (const incident of restored.incidents) {
      this.incidents.set(incident.id, {
        ...incident,
        source: incident.source ?? 'STEWARD',
        cars: incident.cars.map((car) => ({ ...car, carClass: car.carClass ?? '' })),
        mergedIntoId: incident.mergedIntoId ?? null,
        mergedFromIds: incident.mergedFromIds ?? [],
      })
    }
    for (const key of restored.seenLmuCollisionKeys ?? []) this.seenLmuCollisionKeys.add(key)
    this.nextSequenceNumber = restored.nextSequenceNumber
    this.config = restored.config
    this.logger.log(`Restored ${restored.incidents.length} incidents from previous run`)
  }

  listIncidents(): Incident[] {
    return [...this.incidents.values()]
  }

  getIncident(id: string): Incident | undefined {
    return this.incidents.get(id)
  }

  nextSequence(): number {
    return this.nextSequenceNumber++
  }

  saveIncident(incident: Incident): void {
    this.incidents.set(incident.id, incident)
    this.scheduleSave()
  }

  deleteIncident(id: string): boolean {
    const deleted = this.incidents.delete(id)
    if (deleted) this.scheduleSave()
    return deleted
  }

  hasSeenLmuCollision(key: string): boolean {
    return this.seenLmuCollisionKeys.has(key)
  }

  markLmuCollisionSeen(key: string): void {
    this.seenLmuCollisionKeys.add(key)
    this.scheduleSave()
  }

  getConfig(): PersistedConfig {
    return this.config
  }

  /**
   * Field-by-field, not a blind spread: with the ES2022 class-field emit, an
   * unsent optional DTO field is still an own property set to `undefined`,
   * which would otherwise silently wipe the other config field.
   */
  updateConfig(partial: Partial<PersistedConfig>): PersistedConfig {
    this.config = {
      lookbackSeconds: partial.lookbackSeconds ?? this.config.lookbackSeconds,
      stewardName: partial.stewardName ?? this.config.stewardName,
      archiveDir: partial.archiveDir ?? this.config.archiveDir,
    }
    this.scheduleSave()
    return this.config
  }

  /** Copies the current-session file to the archive, then clears the store. */
  async archive(trackName: string): Promise<void> {
    await this.flush()
    // Minutes, not just the date: practice/qualifying/race at one track on one
    // day would otherwise overwrite each other's archive, and session changes
    // archive automatically now.
    const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '')
    // Falsy (null or '') falls back to the default ARCHIVE_DIR.
    const effectiveArchiveDir = this.config.archiveDir || ARCHIVE_DIR
    const archivePath = `${effectiveArchiveDir}/${stamp}-${slugify(trackName)}.json`
    // Nothing logged this session — no file worth keeping, just reset.
    if (this.incidents.size > 0) await copyFileEnsuringDir(CURRENT_SESSION_PATH, archivePath)
    this.incidents.clear()
    this.nextSequenceNumber = 1
    // seenLmuCollisionKeys is deliberately NOT cleared. LMU's incidents feed is
    // cumulative for the *running* session, so dropping the keys makes the very
    // next poll (≤1s later) re-create every incident just cleared — the store
    // looks like nothing happened. Keys are `slotId|slotId@centisecond`, a few
    // dozen short strings per session; keeping them is the cheap side.
    await this.flush()
  }

  private scheduleSave(): void {
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => void this.flush(), DEBOUNCE_MS)
  }

  private async flush(): Promise<void> {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = null
    await writeAtomic(CURRENT_SESSION_PATH, JSON.stringify(this.snapshot(), null, 2))
  }

  private snapshot(): PersistedState {
    return {
      incidents: this.listIncidents(),
      nextSequenceNumber: this.nextSequenceNumber,
      config: this.config,
      seenLmuCollisionKeys: [...this.seenLmuCollisionKeys],
    }
  }
}
