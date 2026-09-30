import { useState } from 'react'
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

/** Deletes the ticked rows after one more click, in place (as the inspector's delete does). */
function DeleteSelected({ checked, onDone }: { checked: Incident[]; onDone: () => void }) {
  const { openId, openIncident, report } = useWorkspace()
  const [armed, setArmed] = useState(false)
  const remove = () => {
    const ids = checked.map((i) => i.id)
    backend
      .deleteIncidents(ids)
      .then(() => {
        if (openId && ids.includes(openId)) openIncident(null)
        onDone()
      })
      .catch((error: unknown) => report('Could not delete the selected incidents', error))
  }
  if (!armed) {
    return (
      <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={() => setArmed(true)}>
        <Icon name="trash" size={14} />
        Delete
      </button>
    )
  }
  return (
    <button
      type="button"
      className={cx(ui.btn, ui.danger, ui.sm)}
      onBlur={() => setArmed(false)}
      onClick={remove}
      autoFocus
    >
      Delete {checked.length} {checked.length === 1 ? 'incident' : 'incidents'}?
    </button>
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

/** Bulk actions on the ticked rows: delete them, set one status, or merge into the earliest. */
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
      <DeleteSelected checked={checked} onDone={onDone} />
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
