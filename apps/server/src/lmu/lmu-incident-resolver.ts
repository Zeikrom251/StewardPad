/**
 * Raw LMU incidents feed → resolved collision events. Shared by RestLmuAdapter
 * and MockLmuAdapter so there is exactly one place this can be wrong — same
 * boundary rule as `rest-lmu-mapper.ts`, just not REST-specific since the mock
 * adapter feeds it synthetic rows in the same raw shape.
 *
 * Raw fields (`player`, `contactWith`, `et`) and the `"Immovable"` sentinel are
 * confirmed against `scripts/output/rest_watch_getIncidentsList_0.json` (a live
 * 46-entry capture) — nothing else about the endpoint is assumed.
 */

import type { StandingEntry } from '@stewardpad/shared'

export interface RawLmuContact {
  player: string
  contactWith: string
  et: number
}

export type LmuCollisionType = 'CONTACT' | 'OFF_TRACK'

export interface LmuCollisionCar {
  /** The join key. carNumber/driverName are display-only — never re-looked-up by. */
  slotId: number
  carNumber: string
  driverName: string
  carClass: string
}

export interface LmuCollision {
  /** Order-normalized so the same real-world contact keys identically every poll. */
  key: string
  et: number
  type: LmuCollisionType
  cars: LmuCollisionCar[]
  /** Raw `contactWith` text when it named neither a known driver nor "Immovable". */
  unresolvedOther: string | null
}

const IMMOVABLE = 'Immovable'

// LMU reports each collision from both cars' perspective, et differing by a
// few hundredths of a second (observed max 0.07s in the live sample; the next
// nearest reciprocal-looking candidate in that same sample was 0.23s away —
// a clear gap, so 0.1s catches every real duplicate without over-merging
// genuinely separate contacts happening seconds apart in the same battle).
const PAIR_TOLERANCE_SECONDS = 0.1

// Keyed on slotID, not names or car numbers: two different drivers can share
// a name, and two cars can share a number in a different class, so either
// string could collide two genuinely different real-world contacts onto one
// key. `otherKey` falls back to the raw contactWith text only when there is
// no resolved car to key on ("Immovable" or an unrecognized sentinel).
function dedupeKey(
  primary: LmuCollisionCar,
  other: LmuCollisionCar | null,
  contactWithRaw: string,
  et: number,
): string {
  const otherKey = other ? String(other.slotId) : contactWithRaw
  return `${[String(primary.slotId), otherKey].sort().join('|')}@${Math.round(et * 100)}`
}

interface ContactPair {
  leader: RawLmuContact
  et: number
}

/** Merges each contact's reciprocal rows into one, keeping the earlier `et`. */
function pairContacts(raw: RawLmuContact[]): ContactPair[] {
  const used = new Array<boolean>(raw.length).fill(false)
  const pairs: ContactPair[] = []
  for (const [i, a] of raw.entries()) {
    if (used[i]) continue
    used[i] = true
    const match = findReciprocal(raw, a, i + 1, used)
    pairs.push({ leader: a, et: match ? Math.min(a.et, match.et) : a.et })
  }
  return pairs
}

/** Closest unused reciprocal row within tolerance, marking it used if found. */
function findReciprocal(
  raw: RawLmuContact[],
  a: RawLmuContact,
  from: number,
  used: boolean[],
): RawLmuContact | null {
  let best: { index: number; row: RawLmuContact } | null = null
  let bestDiff = Infinity
  for (const [j, b] of raw.entries()) {
    if (j < from || used[j]) continue
    if (b.player !== a.contactWith || b.contactWith !== a.player) continue
    const diff = Math.abs(b.et - a.et)
    if (diff <= PAIR_TOLERANCE_SECONDS && diff < bestDiff) {
      best = { index: j, row: b }
      bestDiff = diff
    }
  }
  if (!best) return null
  used[best.index] = true
  return best.row
}

// A name that matches zero OR MORE THAN ONE standings slot cannot be safely
// attributed to a single car — an ambiguous name (two drivers sharing one)
// is exactly as dangerous as an unresolved one, since taking the first match
// silently attributes an incident to the wrong driver. Both are reported
// through the same "unresolved" path by the caller: never guess.
function findCar(driverName: string, standings: StandingEntry[]): LmuCollisionCar | null {
  const matches = standings.filter((s) => s.driverName === driverName)
  const [only] = matches
  if (matches.length !== 1 || !only) return null
  return {
    slotId: only.slotId,
    carNumber: only.carNumber,
    driverName: only.driverName,
    carClass: only.carClass,
  }
}

/**
 * Resolves the full (cumulative) raw incidents list against the current grid.
 * Idempotent: given the same raw list and standings, every collision gets the
 * same `key` every time — callers dedupe across polls by tracking seen keys,
 * not by diffing the raw feed themselves.
 */
export function resolveLmuCollisions(
  raw: RawLmuContact[],
  standings: StandingEntry[],
  onUnresolvedPlayer: (name: string) => void,
): LmuCollision[] {
  const collisions: LmuCollision[] = []
  for (const { leader, et } of pairContacts(raw)) {
    const primary = findCar(leader.player, standings)
    if (!primary) {
      onUnresolvedPlayer(leader.player)
      continue
    }
    collisions.push(buildCollision(leader.contactWith, primary, et, standings))
  }
  return collisions
}

// A `contactWith` that isn't "Immovable" but also doesn't name a car on the
// current grid is handled the same way as "Immovable": a single-car incident,
// never a CONTACT with a fabricated second car. The raw text is kept in
// `unresolvedOther` so an unrecognized future sentinel is still visible.
function buildCollision(
  contactWith: string,
  primary: LmuCollisionCar,
  et: number,
  standings: StandingEntry[],
): LmuCollision {
  const other = contactWith === IMMOVABLE ? null : findCar(contactWith, standings)
  const key = dedupeKey(primary, other, contactWith, et)
  if (other) return { key, et, type: 'CONTACT', cars: [primary, other], unresolvedOther: null }
  const unresolvedOther = contactWith === IMMOVABLE ? null : contactWith
  return { key, et, type: 'OFF_TRACK', cars: [primary], unresolvedOther }
}
