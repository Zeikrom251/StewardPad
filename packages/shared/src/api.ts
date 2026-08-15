/**
 * The wire contract between the two apps. Request shapes are derived from
 * `Incident` so they cannot drift when the domain type changes.
 */

import type { Incident } from './incident.js'
import type { SessionInfo, StandingEntry } from './lmu.js'

export type AdapterName = 'mock' | 'rest'

export interface AppConfig {
  lookbackSeconds: number
  stewardName: string
  adapter: AdapterName
  /** Resolved effective path — never null (falls back to default when unconfigured). */
  archiveDir: string
}

/** Every field the steward may edit. The server owns the rest. */
export type IncidentEditableFields = Pick<
  Incident,
  | 'eventSeconds'
  | 'cars'
  | 'type'
  | 'status'
  | 'summary'
  | 'stewardNotes'
  | 'decision'
  | 'penalty'
  | 'loggedBy'
  | 'reviewedBy'
>

export type CreateIncidentInput = Partial<IncidentEditableFields>
export type UpdateIncidentInput = Partial<IncidentEditableFields>

/** POST /api/incidents/quick — cars only; look-back and defaults are server-side. */
export interface QuickLogInput {
  /**
   * LMU `slotID`s (as strings), not car numbers — two cars can share a number
   * in different classes, so a number cannot identify who was selected.
   */
  slotIds?: string[]
  loggedBy?: string
}

export type UpdateConfigInput = Partial<
  Pick<AppConfig, 'lookbackSeconds' | 'stewardName' | 'archiveDir'>
>

/** POST /api/incidents/merge */
export interface MergeIncidentsInput {
  /** At least 2 UUIDs — all must exist and none may already be a merged child. */
  incidentIds: string[]
  /** The incident to treat as primary; defaults to the one with the lowest sequenceNumber. */
  primaryId?: string
}

export type CsvVariant = 'full' | 'drivers'
export type CsvDelimiter = 'semicolon' | 'comma'

/** Server → client only. All mutations go through REST (prompt §7.6). */
export interface ServerEvents {
  'session:update': SessionInfo
  'standings:update': StandingEntry[]
  'incidents:update': Incident[]
  'config:update': AppConfig
}
