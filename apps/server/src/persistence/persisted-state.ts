import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Incident } from '@stewardpad/shared'

export interface PersistedConfig {
  lookbackSeconds: number
  stewardName: string
  /** null = use the ARCHIVE_DIR default. Empty string treated as null at read time. */
  archiveDir: string | null
}

export interface PersistedState {
  incidents: Incident[]
  nextSequenceNumber: number
  config: PersistedConfig
  /**
   * Dedupe keys for LMU collisions already turned into incidents — the LMU
   * incidents feed is cumulative, so this is what stops a restart or
   * reconnect from re-ingesting everything as new. Optional: absent on files
   * written before auto-create existed.
   */
  seenLmuCollisionKeys?: string[]
}

export const DEFAULT_CONFIG: PersistedConfig = {
  lookbackSeconds: 10,
  stewardName: '',
  archiveDir: null,
}
export const DEBOUNCE_MS = 500
/**
 * Anchored to the repo root, not `process.cwd()`. `pnpm dev` starts Nest with
 * the cwd at `apps/server`, so a relative './data' silently splits the
 * steward's incidents across two folders depending on how the app was started
 * — and the README points them at only one of them.
 */
function repoRoot(): string {
  let dir = __dirname
  while (!existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(dir)
    if (parent === dir) return process.cwd()
    dir = parent
  }
  return dir
}

export const DATA_DIR = process.env.DATA_DIR?.trim() || path.join(repoRoot(), 'data')
export const CURRENT_SESSION_PATH = path.join(DATA_DIR, 'current-session.json')
export const ARCHIVE_DIR = path.join(DATA_DIR, 'archive')
