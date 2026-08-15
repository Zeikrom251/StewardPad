/**
 * Loads the repo-root `.env` before any other module is evaluated.
 *
 * Two things make this fiddly, and both silently left the app on mock data:
 * `pnpm dev` starts Nest with the cwd at `apps/server`, so the default
 * cwd-relative lookup misses the root `.env`; and constants like `DATA_DIR` are
 * read at import time, so this must run before those imports, not after.
 * Import it first in `main.ts`.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'

function repoRoot(): string {
  let dir = __dirname
  while (!existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(dir)
    if (parent === dir) return process.cwd()
    dir = parent
  }
  return dir
}

const envPath = path.join(repoRoot(), '.env')
if (existsSync(envPath)) process.loadEnvFile(envPath)
