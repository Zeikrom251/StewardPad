/**
 * The wire contract between the two apps. Request shapes are derived from
 * `Incident` so they cannot drift when the domain type changes.
 */

import type { Incident, IncidentStatus, RuleRef } from './incident.js'
import type { SessionInfo, StandingEntry } from './lmu.js'
import type { AccountView, TeamView } from './team.js'

export type AdapterName = 'mock' | 'rest'

/** A league's rule book, imported in the desktop app's Settings. */
export interface Rulebook {
  name: string
  rules: RuleRef[]
  /** The whole file as Markdown. Absent in books imported before the Rules page could edit. */
  text?: string
}

/** A line of an edited rule book that breaks the structure (`line` empty: the whole book). */
export interface RuleProblem {
  line: string
  message: string
}

export interface RulebookCheck {
  rules: RuleRef[]
  problems: RuleProblem[]
  /** Only lines whose number is bold are rules (every numbered-outline import). */
  explicit: boolean
  /** A pasted Google Docs / Word list whose levels each restart at 1: not numbered yet. */
  outline: boolean
}

/** The statuses the desktop app can announce on Discord (everything but NOTED). */
export type AnnouncedStatus = Exclude<IncidentStatus, 'NOTED'>

/** Desktop app, Announce page: how one status change looks in Discord. */
export interface Announcement {
  enabled: boolean
  /** "{number}", "{type}", "{cars}", "{time}" and "{lap}" are filled in. */
  title: string
  /** "#e0598a" */
  color: string
}

/** Desktop app, Announce page: which parts of the incident the embed shows. */
export interface EmbedFields {
  cars: boolean
  rules: boolean
  investigation: boolean
  decision: boolean
  penalty: boolean
  sessionTime: boolean
  reviewedBy: boolean
}

/** Desktop app, Announce page: live announcements through a Discord webhook. */
export interface DiscordSettings {
  enabled: boolean
  webhookUrl: string
  username: string
  avatarUrl: string
  mention: string
  footer: string
  fields: EmbedFields
  events: Record<AnnouncedStatus, Announcement>
}

export type Density = 'compact' | 'comfortable'

/** Desktop app, Settings → Display. */
export interface DisplayPrefs {
  density: Density
  /** Whole-window zoom in percent (80–150). */
  textScale: number
  /** Standings column ids switched off. */
  hiddenColumns: string[]
  /** Inspector section ids kept folded. */
  collapsedSections: string[]
  /** Race page: the quick log + feed folded to a thin strip, for a wider timing tower. */
  racePanelFolded: boolean
}

export interface AppConfig {
  lookbackSeconds: number
  stewardName: string
  adapter: AdapterName
  /** Resolved effective path — never null (falls back to default when unconfigured). */
  archiveDir: string
  /** Desktop app only: where the Save dialogs open, resolved to a real path. */
  exportDir?: string
  /** Desktop app only; null when no rule book is loaded. */
  rulebook?: Rulebook | null
  /** Desktop app only. */
  display?: DisplayPrefs
  /** Desktop app only. */
  discord?: DiscordSettings
  /** Desktop app only: the welcome screen (Team or on your own) was answered. */
  welcomed?: boolean
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
  | 'rules'
  | 'loggedBy'
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
  Pick<
    AppConfig,
    | 'lookbackSeconds'
    | 'stewardName'
    | 'archiveDir'
    | 'exportDir'
    | 'display'
    | 'discord'
    | 'welcomed'
  >
>

/** POST /api/incidents/merge */
export interface MergeIncidentsInput {
  /** At least 2 UUIDs — all must exist and none may already be a merged child. */
  incidentIds: string[]
  /** The incident to treat as primary; defaults to the one with the lowest sequenceNumber. */
  primaryId?: string
}

/** penalties: one row per penalised car, for correcting the race results. */
export type CsvVariant = 'full' | 'drivers' | 'penalties'
export type CsvDelimiter = 'semicolon' | 'comma'

/** Server → client only. All mutations go through REST (prompt §7.6). */
export interface ServerEvents {
  'session:update': SessionInfo
  'standings:update': StandingEntry[]
  'incidents:update': Incident[]
  'config:update': AppConfig
  'account:update': AccountView
  'team:update': TeamView
}
