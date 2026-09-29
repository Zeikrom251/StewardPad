import { marked } from 'marked'
import { isReleaseFile, newestFirst, parseEntry, type ChangelogEntry } from './parse'

export interface Release extends ChangelogEntry {
  /** The notes as HTML: our own Markdown from the repo, rendered at build time. */
  html: string
}

// Every changelog/*.md in the repo, bundled with the site: a new file is a new release on
// the page, no code to touch.
const FILES = import.meta.glob<string>('../../../../changelog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function read([file, raw]: [string, string]): Release[] {
  try {
    const entry = parseEntry(file, raw)
    return [{ ...entry, html: marked.parse(entry.body, { async: false }) }]
  } catch (error) {
    // `pnpm test` rejects a malformed file before it ships; if one slips through, the page
    // still shows the others.
    console.error('[changelog] Skipped a release file:', error)
    return []
  }
}

export const RELEASES: Release[] = Object.entries(FILES)
  .filter(([file]) => isReleaseFile(file))
  .flatMap(read)
  .sort(newestFirst)
