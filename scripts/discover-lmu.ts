/**
 * Phase 0 discovery — throwaway probe against a running LMU instance.
 * Run with `pnpm discover`. Never invent output: if LMU is unreachable this
 * prints that plainly, exits non-zero, and writes nothing fabricated.
 * See LMU_Steward_Dashboard_PROMPT.md §6.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Overridable because LMU binds to the Windows loopback: from WSL, or from a
// second machine on the same network, localhost is not where the game is.
const BASE = process.env.LMU_BASE_URL ?? 'http://localhost:6397'
const OUT_DIR = path.join(import.meta.dirname, 'output')
const RELEVANT = /standing|session|vehicle|driver|watch|score|state|incident/i
const FETCH_TIMEOUT_MS = 3000
const MAX_PROBES = 10

// Parameterized endpoints are skipped by default — we can't guess a path arg.
// These few are worth probing because we know what the arg means, so name a
// concrete value here rather than dropping the endpoint entirely.
// `minTimeBetweenContacts` is a seconds threshold LMU uses to coalesce repeated
// contact between the same pair; 0 asks for everything, unfiltered.
const PARAMETERIZED_PROBES: Record<string, string> = {
  '/rest/watch/getIncidentsList/{minTimeBetweenContacts}': '0',
}

interface SwaggerSchema {
  paths?: Record<string, Record<string, { summary?: string }>>
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function isSwaggerSchema(value: unknown): value is SwaggerSchema {
  return typeof value === 'object' && value !== null
}

function collectGetPaths(schema: SwaggerSchema): Array<{ path: string; summary: string }> {
  const paths = schema.paths ?? {}
  return Object.entries(paths)
    .filter(([, methods]) => 'get' in methods)
    .map(([p, methods]) => ({ path: p, summary: methods['get']?.summary ?? '' }))
}

function fillPathArg(urlPath: string, value: string): string {
  return urlPath.replace(/\{[^}]+\}/, value)
}

function sanitizeForFilename(urlPath: string): string {
  return urlPath.replace(/^\//, '').replace(/[/{}]+/g, '_') || 'root'
}

function summarizeTopLevel(body: unknown): { keys: string; arrayLength: string } {
  if (Array.isArray(body)) return { keys: '(array)', arrayLength: String(body.length) }
  if (body !== null && typeof body === 'object') {
    return { keys: Object.keys(body).join(', '), arrayLength: '-' }
  }
  return { keys: typeof body, arrayLength: '-' }
}

async function probeEndpoint(
  endpointPath: string,
): Promise<{ path: string; status: string; keys: string; arrayLength: string }> {
  const url = `${BASE}${endpointPath}`
  try {
    const body = await fetchJson(url)
    await mkdir(OUT_DIR, { recursive: true })
    await writeFile(
      path.join(OUT_DIR, `${sanitizeForFilename(endpointPath)}.json`),
      JSON.stringify(body, null, 2),
    )
    const { keys, arrayLength } = summarizeTopLevel(body)
    return { path: endpointPath, status: 'ok', keys, arrayLength }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { path: endpointPath, status: `error: ${message}`, keys: '-', arrayLength: '-' }
  }
}

async function main(): Promise<void> {
  console.log(`Phase 0 discovery — probing ${BASE} ...`)

  let schema: unknown
  try {
    schema = await fetchJson(`${BASE}/swagger-schema.json`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`\nLMU is not reachable at ${BASE} (${message}).`)
    console.error('This is expected if the game is not running on this machine.')
    console.error('To run discovery for real: start LMU on a Windows machine with the')
    console.error('REST API enabled, then run `pnpm discover` from that machine.')
    console.error('No schema was written. RestLmuAdapter must not be written until this')
    console.error('succeeds — the app continues to run on MockLmuAdapter only.')
    process.exitCode = 1
    return
  }

  if (!isSwaggerSchema(schema)) {
    console.error('swagger-schema.json did not parse as an object — aborting, writing nothing.')
    process.exitCode = 1
    return
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(path.join(OUT_DIR, 'swagger-schema.json'), JSON.stringify(schema, null, 2))
  console.log(`Saved schema to ${path.relative(process.cwd(), OUT_DIR)}/swagger-schema.json`)

  const getPaths = collectGetPaths(schema)
  const relevant = getPaths.filter((e) => RELEVANT.test(e.path) || RELEVANT.test(e.summary))
  console.log(`\n${relevant.length} relevant GET endpoints (of ${getPaths.length} total):`)
  for (const e of relevant) console.log(`  ${e.path}${e.summary ? `  — ${e.summary}` : ''}`)

  const parameterless = relevant.filter((e) => !e.path.includes('{')).slice(0, MAX_PROBES)
  const parameterized = relevant
    .map(
      (e) =>
        PARAMETERIZED_PROBES[e.path] !== undefined &&
        fillPathArg(e.path, PARAMETERIZED_PROBES[e.path]),
    )
    .filter((p): p is string => p !== false)
  const toProbe = [...parameterless.map((e) => e.path), ...parameterized]

  console.log(
    `\nProbing ${toProbe.length} endpoints (${parameterized.length} with a supplied arg)...`,
  )
  const results = []
  for (const p of toProbe) results.push(await probeEndpoint(p))

  console.log('\npath -> status -> top-level keys -> array length')
  for (const r of results) console.log(`${r.path} -> ${r.status} -> ${r.keys} -> ${r.arrayLength}`)

  console.log('\nPhase 0 complete. Review scripts/output/ and confirm the mapping before')
  console.log('anyone writes RestLmuAdapter.')
}

void main()
