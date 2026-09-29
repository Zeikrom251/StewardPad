import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isReleaseFile, newestFirst, parseEntry } from './parse'

const entry = (version: string) =>
  parseEntry(`${version}.md`, `---\nversion: ${version}\ndate: 2026-01-01\n---\n`)

test('reads the front matter and keeps the notes', () => {
  const raw =
    '---\nversion: 0.2.0\ndate: 2026-10-14\ntitle: Faster review\n---\n\n### Added\n\n- A thing\n'
  assert.deepEqual(parseEntry('changelog/0.2.0.md', raw), {
    version: '0.2.0',
    date: '2026-10-14',
    title: 'Faster review',
    body: '### Added\n\n- A thing',
  })
})

test('names the file when the front matter is wrong', () => {
  assert.throws(() => parseEntry('0.2.0.md', '### Added'), /0\.2\.0\.md: .*front matter/)
  assert.throws(
    () => parseEntry('0.2.0.md', '---\nversion: 0.3.0\ndate: 2026-10-14\n---\n'),
    /file name/,
  )
  assert.throws(
    () => parseEntry('0.2.0.md', '---\nversion: 0.2.0\ndate: 14/10/2026\n---\n'),
    /date/,
  )
})

test('sorts versions as numbers, newest first', () => {
  const sorted = [entry('0.9.0'), entry('0.10.0'), entry('0.9.1')].sort(newestFirst)
  assert.deepEqual(
    sorted.map((e) => e.version),
    ['0.10.0', '0.9.1', '0.9.0'],
  )
})

test('puts a pre-release before the release it leads to', () => {
  const versions = ['0.1.0-alpha.2', '0.1.0', '0.1.0-alpha.10', '0.1.0-beta.1', '0.1.0-alpha.1']
  assert.deepEqual(
    versions
      .map(entry)
      .sort(newestFirst)
      .map((e) => e.version),
    ['0.1.0', '0.1.0-beta.1', '0.1.0-alpha.10', '0.1.0-alpha.2', '0.1.0-alpha.1'],
  )
})

test('accepts the tag’s leading "v" and drops it', () => {
  const raw = '---\nversion: v0.1.0-alpha.1\ndate: 2026-09-29\n---\n'
  assert.equal(parseEntry('changelog/v0.1.0-alpha.1.md', raw).version, '0.1.0-alpha.1')
  assert.ok(isReleaseFile('changelog/v0.1.0-alpha.1.md'))
  assert.ok(!isReleaseFile('changelog/README.md'))
})

test('every release file in the changelog folder is valid', () => {
  const dir = join(import.meta.dirname, '../../../../changelog')
  const files = readdirSync(dir).filter(isReleaseFile)
  assert.ok(files.length > 0, 'the changelog folder has no release file')
  for (const file of files) parseEntry(file, readFileSync(join(dir, file), 'utf8'))
})
