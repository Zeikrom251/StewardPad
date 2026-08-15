/**
 * Narrows raw `GET /rest/watch/getIncidentsList/{minTimeBetweenContacts}` JSON
 * to `RawLmuContact[]`. Same parse-then-map split as `rest-lmu-types.ts`: this
 * file is the only place allowed to know the endpoint's raw field names.
 *
 * Confirmed against `scripts/output/rest_watch_getIncidentsList_0.json` — a
 * live 46-entry capture, exactly three fields per entry, nothing else.
 */

import type { RawLmuContact } from '../lmu-incident-resolver.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseContact(payload: unknown): RawLmuContact | null {
  if (!isRecord(payload)) return null
  const player = payload.player
  const contactWith = payload.contactWith
  const et = payload.et
  if (typeof player !== 'string' || typeof contactWith !== 'string' || typeof et !== 'number') {
    return null
  }
  return { player, contactWith, et }
}

export interface IncidentsParseResult {
  entries: RawLmuContact[]
  skipped: number
}

// One bad entry must not cost the whole feed — same policy as standings.
export function parseIncidentsList(payload: unknown): IncidentsParseResult | null {
  if (!Array.isArray(payload)) return null
  const entries: RawLmuContact[] = []
  let skipped = 0
  for (const item of payload) {
    const entry = parseContact(item)
    if (entry === null) {
      skipped++
      continue
    }
    entries.push(entry)
  }
  return { entries, skipped }
}
