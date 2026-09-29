import type { ReactNode } from 'react'
import type { Incident, StandingEntry } from '@stewardpad/shared'
import { backend, type Snapshot } from '../backend/backend'
import { useLive } from '../backend/LiveProvider'
import { Icon } from '../icons'
import { surname } from '../lib/cars'
import { formatHms } from '../lib/format'
import { filterIncidents, NO_FILTERS } from '../lib/incidentFilters'
import { TYPE_LABEL, classLabel } from '../lib/labels'
import { Plate, StatusChip } from '../ui/primitives'
import ui from '../ui/ui.module.scss'
import { useIncidentActions } from '../workspace/useIncidentActions'
import { useWorkspace, type Workspace } from '../workspace/Workspace'

export interface Result {
  group: 'Cars' | 'Incidents' | 'Actions'
  key: string
  lead: ReactNode
  main: ReactNode
  sub?: string
  right?: ReactNode
  run: () => void
}

const LIMIT = 5

function matchesCar(s: StandingEntry, q: string): boolean {
  return [s.carNumber, `#${s.carNumber}`, s.driverName, s.teamName].some((v) =>
    v.toLowerCase().includes(q),
  )
}

function carResult(s: StandingEntry, ws: Workspace): Result {
  return {
    group: 'Cars',
    key: `car-${s.slotId}`,
    lead: <Plate number={s.carNumber} carClass={s.carClass} />,
    main: <b>{s.driverName}</b>,
    sub: `${s.teamName} · ${classLabel(s.carClass)} · P${s.position}`,
    right: 'Select car',
    run: () => {
      ws.go('race')
      if (!ws.selection.includes(s.slotId)) ws.toggleCar(s.slotId)
    },
  }
}

function incidentResult(i: Incident, ws: Workspace): Result {
  const cars = i.cars.map((c) => `#${c.carNumber} ${surname(c.driverName)}`).join(', ')
  return {
    group: 'Incidents',
    key: i.id,
    lead: <span className={ui.mono}>#{i.sequenceNumber}</span>,
    main: (
      <>
        <b>{TYPE_LABEL[i.type]}</b>
        {cars && <span className={ui.muted}> · {cars}</span>}
      </>
    ),
    sub: formatHms(i.eventSeconds),
    right: <StatusChip status={i.status} />,
    run: () => {
      // Pages with their own editor keep it; elsewhere the inspector opens beside the race.
      if (ws.page !== 'incidents' && ws.page !== 'review') ws.go('race')
      ws.openIncident(i.id)
    },
  }
}

/** Logs straight for the top car match — the palette's "Space" for a car found by name. */
function logForCar(s: StandingEntry, live: Snapshot, ws: Workspace): Result {
  return {
    group: 'Actions',
    key: 'log-car',
    lead: <Icon name="flag" size={16} strokeWidth={2} />,
    main: `Log incident for #${s.carNumber} ${surname(s.driverName)}`,
    run: () => {
      backend
        .quickLog({ slotIds: [String(s.slotId)], loggedBy: live.config.stewardName || undefined })
        .catch((error: unknown) => ws.report('Quick log failed', error))
    },
  }
}

function navigationActions(ws: Workspace, logMissed: () => void): Result[] {
  const action = (
    key: string,
    icon: Parameters<typeof Icon>[0]['name'],
    main: string,
    run: () => void,
  ): Result => ({
    group: 'Actions',
    key,
    lead: <Icon name={icon} size={16} />,
    main,
    run,
  })
  return [
    action('missed', 'plus', 'Log a missed incident…', logMissed),
    action('all', 'list', 'Show all incidents', () => ws.go('incidents')),
    action('review', 'queue', 'Review queue', () => ws.go('review')),
    action('rules', 'book', 'Rule book', () => ws.go('rules')),
    action('announce', 'radio', 'Discord announcements', () => ws.go('announce')),
    action('export', 'download', 'Save driver decision sheet…', () => ws.go('reports')),
    action('settings', 'sliders', 'Settings', () => ws.go('settings')),
  ]
}

/** Everything Ctrl K can reach for a query, flattened in display order. */
export function usePaletteResults(query: string): Result[] {
  const live = useLive()
  const ws = useWorkspace()
  const { logMissed } = useIncidentActions()
  if (!live) return []
  const q = query.trim().toLowerCase()
  const cars = q ? live.standings.filter((s) => matchesCar(s, q)).slice(0, LIMIT) : []
  const incidents = filterIncidents(live.incidents, { ...NO_FILTERS, query: q })
    .sort((a, b) => b.sequenceNumber - a.sequenceNumber)
    .slice(0, q ? LIMIT : 3)
  const top = cars[0]
  const actions = navigationActions(ws, logMissed).filter(
    (a) => !q || String(a.main).toLowerCase().includes(q),
  )
  return [
    ...cars.map((s) => carResult(s, ws)),
    ...incidents.map((i) => incidentResult(i, ws)),
    ...(top && live.session.connected ? [logForCar(top, live, ws)] : []),
    ...actions,
  ]
}
