import { useMemo, useState } from 'react'
import type { Incident, StandingEntry } from '@stewardpad/shared'
import { Icon } from '../../icons'
import { carKey, incidentsByCar } from '../../lib/cars'
import { classLabel } from '../../lib/labels'
import { Kbd, cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { useDisplay } from '../../workspace/useDisplay'
import { StandingsHead, StandingsRow } from './StandingsRow'
import { visibleColumns } from './standingsColumns'
import styles from './Standings.module.scss'

/** The search box Ctrl F focuses (useShortcuts). */
export const STANDINGS_SEARCH_ID = 'standings-search'

function matches(entry: StandingEntry, carClass: string, query: string): boolean {
  if (carClass !== 'ALL' && entry.carClass !== carClass) return false
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [entry.carNumber, entry.driverName, entry.teamName].some((v) =>
    v.toLowerCase().includes(q),
  )
}

function ClassFilter({
  standings,
  value,
  onChange,
}: {
  standings: StandingEntry[]
  value: string
  onChange: (c: string) => void
}) {
  const classes = [...new Set(standings.map((s) => s.carClass))]
  const option = (id: string, label: string, count: number) => (
    <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>
      {id !== 'ALL' && <i className={styles.swatch} data-class={id} />}
      {label}
      <span className={ui.count}>{count}</span>
    </button>
  )
  return (
    <span className={ui.seg}>
      {option('ALL', 'All', standings.length)}
      {classes.map((c) =>
        option(c, classLabel(c), standings.filter((s) => s.carClass === c).length),
      )}
    </span>
  )
}

/** Timing tower: class filter, search, and the live order (design/02-race-control.html). */
export function Standings({
  standings,
  incidents,
}: {
  standings: StandingEntry[]
  incidents: Incident[]
}) {
  const { selection, toggleCar, openId } = useWorkspace()
  const [carClass, setCarClass] = useState('ALL')
  const [query, setQuery] = useState('')
  const byCar = useMemo(() => incidentsByCar(incidents), [incidents])
  const marked = new Set(incidents.find((i) => i.id === openId)?.cars.map(carKey))
  const rows = standings.filter((s) => matches(s, carClass, query))
  const leaderLap = standings[0]?.lapsCompleted
  const { columns, template } = visibleColumns(useDisplay().prefs.hiddenColumns)

  return (
    <section className={styles.standings}>
      <div className={ui.toolbar}>
        <h1>Standings</h1>
        {leaderLap !== undefined && (
          <span className={cx(ui.mono, ui.muted, styles.small)}>Lap {leaderLap}</span>
        )}
        <ClassFilter standings={standings} value={carClass} onChange={setCarClass} />
        <span className={ui.grow} />
        <label className={cx(ui.field, styles.search)}>
          <Icon name="search" size={14} className={ui.faint} />
          <input
            id={STANDINGS_SEARCH_ID}
            value={query}
            placeholder="Find car or driver"
            onChange={(e) => setQuery(e.target.value)}
          />
          <Kbd>Ctrl F</Kbd>
        </label>
      </div>
      <div className={styles.table}>
        <StandingsHead columns={columns} template={template} />
        <div className={styles.body}>
          {rows.map((entry) => (
            <StandingsRow
              key={entry.slotId}
              entry={entry}
              columns={columns}
              template={template}
              order={selection.indexOf(entry.slotId) + 1}
              marked={marked.has(carKey(entry))}
              incidents={byCar.get(carKey(entry)) ?? []}
              onToggle={toggleCar}
            />
          ))}
          {rows.length === 0 && (
            <p className={styles.empty}>
              {standings.length ? 'No car matches this filter.' : 'Waiting for cars on track…'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
