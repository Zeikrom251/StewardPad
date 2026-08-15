/** Maps Incident[] to CSV rows. `drivers` excludes stewardNotes — prompt §7.7. */

import type { CsvVariant, Incident } from '@stewardpad/shared'
import { formatHms } from '../common/format-time.js'
import { buildCsv } from './csv-writer.js'

const FULL_HEADER = [
  '#',
  'Source',
  'Session Time',
  'Event Seconds',
  'Logged At Seconds',
  'Lookback Applied',
  'Lap',
  'Cars',
  'Car Class',
  'Drivers',
  'Type',
  'Status',
  'Summary',
  'Steward Notes',
  'Decision',
  'Penalty',
  'Logged By',
  'Reviewed By',
  'Wall Clock',
  'Created At',
  'Updated At',
  // Internal audit: which child incidents were folded into this row.
  // Excluded from DRIVERS_HEADER — same reasoning as stewardNotes.
  'Merged From',
]

// Car Class travels to the drivers file too, unlike stewardNotes: it is what
// lets a driver tell their own "#77" apart from the other class's "#77" on
// the same decision sheet — not internal deliberation, so it is not excluded.
const DRIVERS_HEADER = [
  '#',
  'Session Time',
  'Lap',
  'Cars',
  'Car Class',
  'Drivers',
  'Type',
  'Decision',
  'Penalty',
  'Status',
]

/**
 * @param incidents - already filtered to active (non-merged-child) rows
 * @param allIncidents - the full unfiltered list, used to resolve mergedFromIds
 *   to sequence numbers for the "Merged From" column. Defaults to `incidents`
 *   (safe when there are no merged incidents in the dataset).
 */
export function buildIncidentCsv(
  incidents: Incident[],
  variant: CsvVariant,
  delimiterChar: string,
  allIncidents: Incident[] = incidents,
): string {
  const header = variant === 'full' ? FULL_HEADER : DRIVERS_HEADER
  const seqById = new Map(allIncidents.map((i) => [i.id, i.sequenceNumber]))
  const rows = incidents.map((incident) =>
    variant === 'full' ? fullRow(incident, seqById) : driversRow(incident),
  )
  return buildCsv(header, rows, delimiterChar)
}

function carsField(incident: Incident): string {
  return incident.cars.map((c) => c.carNumber).join(', ')
}

function driversField(incident: Incident): string {
  return incident.cars.map((c) => c.driverName).join(', ')
}

function carClassField(incident: Incident): string {
  return incident.cars.map((c) => c.carClass).join(', ')
}

function penaltyField(incident: Incident): string {
  if (!incident.penalty) return ''
  const seconds = incident.penalty.seconds !== null ? ` ${incident.penalty.seconds}s` : ''
  return `${incident.penalty.type}${seconds}`
}

function lapField(incident: Incident): string {
  const lap = incident.cars[0]?.lapAtIncident
  return lap !== undefined && lap !== null ? String(lap) : ''
}

function mergedFromField(i: Incident, seqById: Map<string, number>): string {
  if (!i.mergedFromIds.length) return ''
  return i.mergedFromIds.map((id) => `#${seqById.get(id) ?? '?'}`).join(', ')
}

function fullRow(i: Incident, seqById: Map<string, number>): string[] {
  return [
    String(i.sequenceNumber),
    i.source,
    formatHms(i.eventSeconds),
    String(i.eventSeconds),
    String(i.loggedAtSeconds),
    String(i.lookbackApplied),
    lapField(i),
    carsField(i),
    carClassField(i),
    driversField(i),
    i.type,
    i.status,
    i.summary,
    i.stewardNotes,
    i.decision,
    penaltyField(i),
    i.loggedBy,
    i.reviewedBy ?? '',
    i.wallClock,
    i.createdAt,
    i.updatedAt,
    mergedFromField(i, seqById),
  ]
}

function driversRow(i: Incident): string[] {
  return [
    String(i.sequenceNumber),
    formatHms(i.eventSeconds),
    lapField(i),
    carsField(i),
    carClassField(i),
    driversField(i),
    i.type,
    i.decision,
    penaltyField(i),
    i.status,
  ]
}
