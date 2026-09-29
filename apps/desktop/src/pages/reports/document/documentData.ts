import type { Incident, IncidentStatus } from '@stewardpad/shared'

/** What the decisions document shows: published, never internal (no steward notes). */
export interface DocumentData {
  title: string
  circuit: string
  /** "Race", "Qualifying"; empty when LMU didn't say. */
  session: string
  server: string
  issuedAt: Date
  /** Incidents with a verdict, in race order. */
  decided: Incident[]
  /** Still open: listed so drivers know a ruling is coming. */
  pending: Incident[]
  /** Investigation and decision as HTML, by incident id (rendered from Markdown). */
  html: Record<string, { investigation: string; decision: string }>
  /** Empty when the stewards stay anonymous. */
  stewards: string[]
}

const DECIDED: ReadonlySet<IncidentStatus> = new Set([
  'PENALTY_APPLIED',
  'NO_FURTHER_ACTION',
  'DISMISSED',
])

export function splitByVerdict(incidents: Incident[]): {
  decided: Incident[]
  pending: Incident[]
} {
  const inRaceOrder = incidents
    .filter((i) => i.mergedIntoId === null)
    .sort((a, b) => a.eventSeconds - b.eventSeconds)
  return {
    decided: inRaceOrder.filter((i) => DECIDED.has(i.status)),
    pending: inRaceOrder.filter((i) => !DECIDED.has(i.status)),
  }
}

/** Everyone who signed a decision, alphabetically. */
export function stewardsOf(decided: Incident[]): string[] {
  const names = decided.flatMap((i) => (i.reviewedBy ? [i.reviewedBy] : []))
  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
}
