/** One release in the changelog folder (changelog/README.md describes the format). */
export interface ChangelogEntry {
  /** Without the leading "v": 0.2.0, 0.1.0-alpha.1 */
  version: string
  /** YYYY-MM-DD */
  date: string
  title: string
  /** The notes, Markdown. */
  body: string
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
// 1.2.3 or a pre-release (1.2.3-alpha.1), as in tauri.conf.json.
const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** The git tag's "v" is welcome in the file name and the front matter. */
const bare = (version: string) => version.replace(/^v/, '')

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
  const version = bare(meta.get('version') ?? '')
  const date = meta.get('date') ?? ''
  if (!VERSION.test(version)) {
    throw new Error(`${file}: "version" must look like 1.2.3 or 1.2.3-alpha.1`)
  }
  const name = bare(file.replace(/^.*\//, '').replace(/\.md$/, ''))
  if (name !== version) throw new Error(`${file}: "version" is not the file name`)
  if (!DATE.test(date)) throw new Error(`${file}: "date" must look like 2026-10-14`)
  return { version, date, title: meta.get('title') ?? '', body: raw.slice(match[0].length).trim() }
}

function compareIdentifiers(a: string, b: string): number {
  const numeric = [/^\d+$/.test(a), /^\d+$/.test(b)]
  if (numeric[0] && numeric[1]) return Number(a) - Number(b)
  if (numeric[0] !== numeric[1]) return numeric[0] ? -1 : 1
  return a.localeCompare(b)
}

/** Semantic version order, as the updater sees it: 0.1.0-alpha.1 < 0.1.0-alpha.2 < 0.1.0 < 0.10.0. */
export function compareVersions(a: string, b: string): number {
  const pa = VERSION.exec(a)
  const pb = VERSION.exec(b)
  if (!pa || !pb) return a.localeCompare(b)
  for (let i = 1; i <= 3; i++) {
    const diff = Number(pa[i] ?? 0) - Number(pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  // A pre-release comes before the release it leads to.
  if (pa[4] === undefined || pb[4] === undefined) return pa[4] ? -1 : pb[4] ? 1 : 0
  const ia = pa[4].split('.')
  const ib = pb[4].split('.')
  for (let i = 0; i < Math.min(ia.length, ib.length); i++) {
    const diff = compareIdentifiers(ia[i] ?? '', ib[i] ?? '')
    if (diff !== 0) return diff
  }
  return ia.length - ib.length
}

export const newestFirst = (a: ChangelogEntry, b: ChangelogEntry): number =>
  compareVersions(b.version, a.version)

/** Only files named after a version are releases (the folder's README is not). */
export const isReleaseFile = (file: string): boolean =>
  /(^|\/)v?\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?\.md$/.test(file)
