// ponytail: Node 20's test runner does not resolve glob file args (that
// landed in later Node majors) — this walks the tree by hand instead of
// pulling in a glob dependency. Upgrade to `node --test "**/*.test.ts"`
// directly once the pinned Node version supports it.
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOTS = ['apps', 'packages']
const SKIP_DIRS = new Set(['node_modules', 'dist'])

function findTestFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      files.push(...findTestFiles(fullPath))
    } else if (entry.endsWith('.test.ts')) {
      files.push(fullPath)
    }
  }
  return files
}

const testFiles = ROOTS.flatMap(findTestFiles)
if (testFiles.length === 0) {
  console.log('No *.test.ts files found.')
  process.exit(0)
}

const result = spawnSync('tsx', ['--test', ...testFiles], { stdio: 'inherit' })
process.exit(result.status ?? 1)
