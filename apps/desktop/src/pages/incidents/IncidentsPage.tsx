import { useState } from 'react'
import type { Incident } from '@stewardpad/shared'
import { useLive } from '../../backend/LiveProvider'
import { Inspector } from '../../inspector/Inspector'
import { Icon } from '../../icons'
import { NO_FILTERS, filterIncidents, sortByTime } from '../../lib/incidentFilters'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { useIncidentActions } from '../../workspace/useIncidentActions'
import { BulkBar } from './BulkBar'
import { IncidentFilters } from './IncidentFilters'
import { HEADERS, IncidentRow } from './IncidentRow'
import styles from './IncidentsPage.module.scss'

function ListToolbar({
  title,
  shown,
  newest,
  onSort,
}: {
  title: string
  shown: number
  newest: boolean
  onSort: () => void
}) {
  const { go } = useWorkspace()
  return (
    <div className={ui.toolbar}>
      <h1>{title}</h1>
      <span className={cx(ui.mono, ui.muted, styles.small)}>{shown} shown</span>
      <span className={ui.grow} />
      <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={onSort}>
        <Icon name="sort" size={14} />
        {newest ? 'Newest first' : 'Oldest first'}
      </button>
      <button type="button" className={cx(ui.btn, ui.sm)} onClick={() => go('reports')}>
        <Icon name="download" size={14} />
        Export…
      </button>
    </div>
  )
}

function IncidentTable({
  shown,
  total,
  checkedIds,
  onCheck,
}: {
  shown: Incident[]
  total: number
  checkedIds: string[]
  onCheck: (id: string) => void
}) {
  const { openId, openIncident } = useWorkspace()
  return (
    <>
      <div className={styles.head}>
        {HEADERS.map((h, i) => (
          <span key={i}>{h}</span>
        ))}
      </div>
      <div className={styles.rows}>
        {shown.map((incident) => (
          <IncidentRow
            key={incident.id}
            incident={incident}
            open={incident.id === openId}
            checked={checkedIds.includes(incident.id)}
            onOpen={() => openIncident(incident.id)}
            onCheck={() => onCheck(incident.id)}
          />
        ))}
        {shown.length === 0 && (
          <p className={styles.empty}>
            {total ? 'No incident matches these filters.' : 'No incidents logged yet.'}
          </p>
        )}
      </div>
    </>
  )
}

/** design/04 — review: facets left, two-line list with bulk merge, the inspector docked right. */
export function IncidentsPage() {
  const incidents = useLive()?.incidents ?? []
  const { openId } = useWorkspace()
  const { logMissed } = useIncidentActions()
  const [filters, setFilters] = useState(NO_FILTERS)
  const [newest, setNewest] = useState(true)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const shown = sortByTime(filterIncidents(incidents, filters), newest)
  const checked = incidents.filter((i) => checkedIds.includes(i.id))
  const open = incidents.find((i) => i.id === openId)
  const filtered = Boolean(filters.status || filters.source || filters.type || filters.query.trim())
  const toggleChecked = (id: string) =>
    setCheckedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  return (
    <>
      <IncidentFilters
        incidents={incidents}
        filters={filters}
        onChange={setFilters}
        onLogMissed={logMissed}
      />
      <section className={styles.list}>
        <ListToolbar
          title={filtered ? 'Filtered incidents' : 'All incidents'}
          shown={shown.length}
          newest={newest}
          onSort={() => setNewest(!newest)}
        />
        {checked.length > 0 && <BulkBar checked={checked} onDone={() => setCheckedIds([])} />}
        <IncidentTable
          shown={shown}
          total={incidents.length}
          checkedIds={checkedIds}
          onCheck={toggleChecked}
        />
      </section>
      {open && <Inspector key={open.id} incident={open} />}
    </>
  )
}
