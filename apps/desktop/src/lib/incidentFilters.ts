import type { Incident, IncidentSource, IncidentStatus, IncidentType } from '@stewardpad/shared'

export interface IncidentFilters {
  status: IncidentStatus | null
  source: IncidentSource | null
  type: IncidentType | null
  query: string
}

export const NO_FILTERS: IncidentFilters = { status: null, source: null, type: null, query: '' }

/** "#12" or "12" finds incident 12; anything else matches car numbers, drivers and text. */
function matchesQuery(incident: Incident, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const sequence = q.replace(/^#/, '')
  if (/^\d+$/.test(sequence) && String(incident.sequenceNumber) === sequence) return true
  const haystack = [
    incident.summary,
    incident.decision,
    ...incident.cars.flatMap((c) => [c.carNumber, c.driverName]),
  ]
  return haystack.some((text) => text.toLowerCase().includes(sequence))
}

export function filterIncidents(incidents: Incident[], f: IncidentFilters): Incident[] {
  return incidents.filter(
    (i) =>
      (!f.status || i.status === f.status) &&
      (!f.source || i.source === f.source) &&
      (!f.type || i.type === f.type) &&
      matchesQuery(i, f.query),
  )
}

/** Session-time order, the way a steward reviews: newest first by default. */
export function sortByTime(incidents: Incident[], newestFirst: boolean): Incident[] {
  const sign = newestFirst ? -1 : 1
  return [...incidents].sort((a, b) => sign * (a.eventSeconds - b.eventSeconds))
}
