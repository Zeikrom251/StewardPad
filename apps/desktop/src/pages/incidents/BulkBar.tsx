import type { Incident, IncidentStatus } from '@stewardpad/shared'
import { backend } from '../../backend/backend'
import { Icon } from '../../icons'
import { STATUS, STATUS_ORDER } from '../../lib/labels'
import { cx } from '../../ui/primitives'
import { Select } from '../../ui/Select'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import styles from './IncidentsPage.module.scss'

function SetStatusMenu({ onPick }: { onPick: (status: IncidentStatus) => void }) {
  return (
    <Select
      options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS[s].label }))}
      onChange={onPick}
      label="Set status of the selected incidents"
      className={cx(ui.btn, ui.sm)}
      trigger={
        <>
          Set status
          <Icon name="down" size={13} />
        </>
      }
    />
  )
}

function useBulkActions(checked: Incident[], onDone: () => void) {
  const { openIncident, report } = useWorkspace()
  const sorted = [...checked].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
  const primary = sorted[0]
  const setStatus = (status: IncidentStatus) => {
    Promise.all(checked.map((i) => backend.updateIncident(i.id, { status })))
      .then(onDone)
      .catch((error: unknown) => report('Could not update every incident', error))
  }
  const merge = () => {
    backend
      .mergeIncidents({ incidentIds: sorted.map((i) => i.id) })
      .then((merged) => {
        onDone()
        openIncident(merged.id)
      })
      .catch((error: unknown) => report('Merge failed', error))
  }
  return { sorted, primary, setStatus, merge }
}

/** Bulk actions on the ticked rows: set one status, or merge into the earliest incident. */
export function BulkBar({ checked, onDone }: { checked: Incident[]; onDone: () => void }) {
  const { sorted, primary, setStatus, merge } = useBulkActions(checked, onDone)
  return (
    <div className={styles.bulk}>
      <span className={ui.check} aria-checked="true">
        <Icon name="check" size={11} strokeWidth={3} />
      </span>
      <b>{checked.length} selected</b>
      <span className={cx(ui.muted, ui.trunc, styles.small)}>
        {sorted.map((i) => `#${i.sequenceNumber}`).join(' · ')}
      </span>
      <span className={ui.grow} />
      <SetStatusMenu onPick={setStatus} />
      {primary && checked.length > 1 && (
        <button type="button" className={cx(ui.btn, ui.primary, ui.sm)} onClick={merge}>
          <Icon name="merge" size={14} strokeWidth={2} />
          Merge into #{primary.sequenceNumber}
        </button>
      )}
      <button type="button" className={ui.iconBtn} aria-label="Clear selection" onClick={onDone}>
        <Icon name="x" size={15} />
      </button>
    </div>
  )
}
