/** One release in the changelog folder (changelog/README.md describes the format). */
export interface ChangelogEntry {
  version: string
  /** YYYY-MM-DD */
  date: string
  title: string
  /** The notes, Markdown. */
  body: string
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const VERSION = /^\d+\.\d+\.\d+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

function fields(block: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of block.split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon > 0) map.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim())
  }
  return map
}

/** Reads one changelog file; throws with the file name when its front matter is wrong. */
export function parseEntry(file: string, raw: string): ChangelogEntry {
  const match = FRONT_MATTER.exec(raw)
  if (!match?.[1]) throw new Error(`${file}: it must start with a --- front matter --- block`)
  const meta = fields(match[1])
  const version = meta.get('version') ?? ''
  const date = meta.get('date') ?? ''
  if (!VERSION.test(version)) throw new Error(`${file}: "version" must look like 1.2.3`)
  if (!file.endsWith(`${version}.md`)) throw new Error(`${file}: "version" is not the file name`)
  if (!DATE.test(date)) throw new Error(`${file}: "date" must look like 2026-10-14`)
  return { version, date, title: meta.get('title') ?? '', body: raw.slice(match[0].length).trim() }
}

/** Sorts releases newest first: 0.10.0 comes before 0.9.0. */
export function newestFirst(a: ChangelogEntry, b: ChangelogEntry): number {
  const pa = a.version.split('.').map(Number)
  const pb = b.version.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/** Only files named after a version are releases (the folder's README is not). */
export const isReleaseFile = (file: string): boolean => /(^|\/)\d+\.\d+\.\d+\.md$/.test(file)
