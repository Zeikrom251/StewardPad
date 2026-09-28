import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type {
  AppConfig,
  CreateIncidentInput,
  CsvDelimiter,
  CsvVariant,
  Incident,
  MergeIncidentsInput,
  QuickLogInput,
  ServerEvents,
  SessionInfo,
  StandingEntry,
  UpdateConfigInput,
  UpdateIncidentInput,
} from '@stewardpad/shared'

/**
 * The Rust backend (src-tauri/src/commands.rs). Same operations and payloads as the old
 * NestJS REST API; events keep the Socket.IO names (ServerEvents).
 */

export interface Snapshot {
  session: SessionInfo
  standings: StandingEntry[]
  incidents: Incident[]
  config: AppConfig
}

/** What a failed command rejects with (src-tauri/src/error.rs). */
export interface BackendError {
  kind: 'notFound' | 'invalid' | 'io'
  message: string
}

export interface CsvExport {
  csv: string
  filename: string
}

export const backend = {
  snapshot: () => invoke<Snapshot>('get_snapshot'),
  getIncident: (id: string) => invoke<Incident>('get_incident', { id }),
  quickLog: (input: QuickLogInput) => invoke<Incident>('quick_log', { input }),
  createIncident: (input: CreateIncidentInput) => invoke<Incident>('create_incident', { input }),
  updateIncident: (id: string, input: UpdateIncidentInput) =>
    invoke<Incident>('update_incident', { id, input }),
  deleteIncident: (id: string) => invoke<void>('delete_incident', { id }),
  mergeIncidents: (input: MergeIncidentsInput) => invoke<Incident>('merge_incidents', { input }),
  /** Archives a copy, then clears the list — also the "Clear all" action. */
  archiveSession: () => invoke<void>('archive_session'),
  updateConfig: (input: UpdateConfigInput) => invoke<AppConfig>('update_config', { input }),
  exportCsv: (variant: CsvVariant, delimiter: CsvDelimiter) =>
    invoke<CsvExport>('export_csv', { variant, delimiter }),
}

export function onBackendEvent<K extends keyof ServerEvents>(
  event: K,
  handler: (payload: ServerEvents[K]) => void,
): Promise<UnlistenFn> {
  return listen<ServerEvents[K]>(event, (e) => handler(e.payload))
}

export function isBackendError(error: unknown): error is BackendError {
  return typeof error === 'object' && error !== null && 'kind' in error && 'message' in error
}
