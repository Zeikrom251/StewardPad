import type { Incident, IncidentSource, IncidentStatus, IncidentType } from '@stewardpad/shared'
import { Icon, type IconName } from '../../icons'
import type { IncidentFilters as Filters } from '../../lib/incidentFilters'
import { STATUS, STATUS_ORDER, TYPE_LABEL, TYPE_ORDER } from '../../lib/labels'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { ClearAll } from './ClearAll'
import styles from './IncidentsPage.module.scss'

function Option({
  label,
  count,
  icon,
  status,
  on,
  onClick,
}: {
  label: string
  count: number
  icon?: IconName
  status?: IncidentStatus
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={styles.option}
      aria-pressed={on}
      data-status={status}
      onClick={onClick}
    >
      {icon && (
        <Icon name={icon} size={14} strokeWidth={2} className={status ? styles.toned : undefined} />
      )}
      {label}
      <span className={ui.count}>{count}</span>
    </button>
  )
}

const SOURCES: Array<[IncidentSource, string, IconName]> = [
  ['STEWARD', 'Steward', 'user'],
  ['LMU', 'LMU (auto)', 'radio'],
]

/** Facets with live counts. A second click on the active option clears it. */
export function IncidentFilters({
  incidents,
  filters,
  onChange,
  onLogMissed,
}: {
  incidents: Incident[]
  filters: Filters
  onChange: (f: Filters) => void
  onLogMissed: () => void
}) {
  const count = (test: (i: Incident) => boolean) => incidents.filter(test).length
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const types = TYPE_ORDER.filter((t: IncidentType) => incidents.some((i) => i.type === t))
  return (
    <aside className={styles.filters}>
      <div className={styles.filtersHead}>
        <h1>Incidents</h1>
        <span className={cx(ui.mono, ui.faint)}>{incidents.length}</span>
      </div>
      <label className={ui.field}>
        <Icon name="search" size={14} className={ui.faint} />
        <input
          value={filters.query}
          placeholder="#, car or driver…"
          onChange={(e) => set({ query: e.target.value })}
        />
      </label>
      <div className={styles.group}>
        <span className={ui.label}>Status</span>
        <Option
          label="All"
          count={incidents.length}
          icon="list"
          on={!filters.status}
          onClick={() => set({ status: null })}
        />
        {STATUS_ORDER.map((s) => (
          <Option
            key={s}
            label={STATUS[s].label}
            count={count((i) => i.status === s)}
            icon={STATUS[s].icon}
            status={s}
            on={filters.status === s}
            onClick={() => set({ status: filters.status === s ? null : s })}
          />
        ))}
      </div>
      <div className={styles.group}>
        <span className={ui.label}>Source</span>
        {SOURCES.map(([source, label, icon]) => (
          <Option
            key={source}
            label={label}
            count={count((i) => i.source === source)}
            icon={icon}
            on={filters.source === source}
            onClick={() => set({ source: filters.source === source ? null : source })}
          />
        ))}
      </div>
      {types.length > 0 && (
        <div className={styles.group}>
          <span className={ui.label}>Type</span>
          {types.map((t) => (
            <Option
              key={t}
              label={TYPE_LABEL[t]}
              count={count((i) => i.type === t)}
              on={filters.type === t}
              onClick={() => set({ type: filters.type === t ? null : t })}
            />
          ))}
        </div>
      )}
      <span className={styles.spacer} />
      <div className={styles.actions}>
        <button type="button" className={cx(ui.btn, ui.block)} onClick={onLogMissed}>
          <Icon name="plus" size={15} />
          Log missed incident
        </button>
        <ClearAll count={incidents.length} />
      </div>
    </aside>
  )
}
