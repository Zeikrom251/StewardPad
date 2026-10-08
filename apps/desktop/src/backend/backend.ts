import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type {
  AccountView,
  AdapterName,
  AppConfig,
  CreateIncidentInput,
  CsvDelimiter,
  CsvVariant,
  Incident,
  MergeIncidentsInput,
  QuickLogInput,
  RulebookCheck,
  ServerEvents,
  SessionInfo,
  StandingEntry,
  TeamView,
  UpdateConfigInput,
  UpdateIncidentInput,
} from '@stewardpad/shared'

/**
 * The Rust backend (src-tauri/src/commands/). Same operations and payloads as the old
 * NestJS REST API; events keep the Socket.IO names (ServerEvents).
 */

export interface Snapshot {
  session: SessionInfo
  standings: StandingEntry[]
  incidents: Incident[]
  config: AppConfig
  account: AccountView
  team: TeamView
}

/** What a failed command rejects with (src-tauri/src/error.rs). */
export interface BackendError {
  kind: 'notFound' | 'invalid' | 'io' | 'offline' | 'signedOut' | 'refused'
  message: string
  /** The StewardPad API's rule, when it refused (STREAM_TAKEN, OWNS_LEAGUES…). */
  code?: string
}

export interface CsvExport {
  csv: string
  filename: string
}

/** One imported session file (src-tauri/src/share). `error` = skipped, with the reason. */
export interface FileReport {
  file: string
  exportedBy: string
  added: number
  updated: number
  unchanged: number
  conflicts: number[]
  renumbered: Array<{ from: number; to: number }>
  error: string | null
}

export interface ImportReport {
  files: FileReport[]
  backup: string | null
}

export const backend = {
  snapshot: () => invoke<Snapshot>('get_snapshot'),
  getIncident: (id: string) => invoke<Incident>('get_incident', { id }),
  quickLog: (input: QuickLogInput) => invoke<Incident>('quick_log', { input }),
  createIncident: (input: CreateIncidentInput) => invoke<Incident>('create_incident', { input }),
  updateIncident: (id: string, input: UpdateIncidentInput) =>
    invoke<Incident>('update_incident', { id, input }),
  deleteIncident: (id: string) => invoke<void>('delete_incident', { id }),
  /** All or none: if one id is unknown, nothing is deleted. */
  deleteIncidents: (ids: string[]) => invoke<void>('delete_incidents', { ids }),
  mergeIncidents: (input: MergeIncidentsInput) => invoke<Incident>('merge_incidents', { input }),
  /** This steward joins the incident's reviewers, or leaves them (never anyone else). */
  claimIncident: (id: string) => invoke<Incident>('claim_incident', { id }),
  unclaimIncident: (id: string) => invoke<Incident>('unclaim_incident', { id }),
  /** Archives a copy, then clears the list — also the "Clear all" action. */
  archiveSession: () => invoke<void>('archive_session'),
  /** Writes the session now, skipping the debounce (before the updater closes the app). */
  flushSession: () => invoke<void>('flush_session'),
  updateConfig: (input: UpdateConfigInput) => invoke<AppConfig>('update_config', { input }),
  /** Stops the running data source and starts the other one; saved with the session. */
  setAdapter: (adapter: AdapterName) => invoke<AppConfig>('set_adapter', { adapter }),
  /** Reads a text/Markdown rule book; its numbered lines become the rules. */
  importRulebook: (path: string) => invoke<AppConfig>('import_rulebook', { path }),
  removeRulebook: () => invoke<AppConfig>('remove_rulebook'),
  /** Every line of an edited rule book that breaks the structure. */
  checkRulebook: (text: string) => invoke<RulebookCheck>('check_rulebook', { text }),
  /** Full rule numbers (3.3.a) for a pasted Google Docs / Word numbered list. */
  numberRulebook: (text: string) => invoke<string>('number_rulebook', { text }),
  /** Replaces the book with the edited Markdown; refused while it has a problem. */
  saveRulebook: (text: string) => invoke<AppConfig>('save_rulebook', { text }),
  /** Decisions and penalties as versioned JSON (.json only), for a league site or bot. */
  saveResultsJson: (path: string) => invoke<void>('save_results_json', { path }),
  /** The decisions document the UI rendered (.html only). */
  saveHtml: (path: string, content: string) => invoke<void>('save_html', { path, content }),
  saveMarkdown: (path: string, content: string) => invoke<void>('save_markdown', { path, content }),
  exportCsv: (variant: CsvVariant, delimiter: CsvDelimiter) =>
    invoke<CsvExport>('export_csv', { variant, delimiter }),
  /** Writes the export to a path from the native Save dialog (.csv only). */
  saveCsv: (variant: CsvVariant, delimiter: CsvDelimiter, path: string) =>
    invoke<void>('save_csv', { variant, delimiter, path }),
  /** Every incident, every field — for another steward to import. */
  saveSessionFile: (path: string) => invoke<void>('save_session_file', { path }),
  /** Merges other stewards' session files into this session. */
  importSessions: (paths: string[]) => invoke<ImportReport>('import_sessions', { paths }),
}

/** A steward moved an incident to a new status (the Announce page posts it to Discord). */
export interface AnnouncementDue {
  /** As saved, with its new status. */
  incident: Incident
}

/** The Socket.IO events of the old server, plus the desktop app's own. */
interface DesktopEvents extends ServerEvents {
  'announcement:due': AnnouncementDue
  /** A stewardpad://signed-in link arrived but the code was refused. */
  'account:failed': { message: string }
  /** A stewardpad://join link arrived: show the invite before joining. */
  'join:requested': { invite: string }
}

export function onBackendEvent<K extends keyof DesktopEvents>(
  event: K,
  handler: (payload: DesktopEvents[K]) => void,
): Promise<UnlistenFn> {
  return listen<DesktopEvents[K]>(event, (e) => handler(e.payload))
}

export function isBackendError(error: unknown): error is BackendError {
  return typeof error === 'object' && error !== null && 'kind' in error && 'message' in error
}
