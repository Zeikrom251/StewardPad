import type { Incident, IncidentSource, IncidentStatus, IncidentType } from '@stewardpad/shared'

export interface IncidentFilters {
  status: IncidentStatus | 'ALL'
  type: IncidentType | 'ALL'
  source: IncidentSource | 'ALL'
  carNumber: string
  freeText: string
}

export const DEFAULT_FILTERS: IncidentFilters = {
  status: 'ALL',
  type: 'ALL',
  source: 'ALL',
  carNumber: '',
  freeText: '',
}

export const SOURCE_LABEL: Record<IncidentSource, string> = {
  STEWARD: 'Steward-logged',
  LMU: 'LMU-detected',
}

function matchesFreeText(incident: Incident, query: string): boolean {
  const haystack = [incident.summary, incident.decision, ...incident.cars.map((c) => c.driverName)]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query.toLowerCase())
}

export function filterIncidents(incidents: Incident[], filters: IncidentFilters): Incident[] {
  return incidents.filter((incident) => {
    if (filters.status !== 'ALL' && incident.status !== filters.status) return false
    if (filters.type !== 'ALL' && incident.type !== filters.type) return false
    if (filters.source !== 'ALL' && incident.source !== filters.source) return false
    if (filters.carNumber && !incident.cars.some((c) => c.carNumber.includes(filters.carNumber)))
      return false
    if (filters.freeText && !matchesFreeText(incident, filters.freeText)) return false
    return true
  })
}

/** Default sort: session time (eventSeconds) descending (prompt §8 Incidents). */
export function sortBySessionTimeDesc(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => b.eventSeconds - a.eventSeconds)
}
