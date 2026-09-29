import { useState } from 'react'
import { backend } from '../../backend/backend'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import styles from './IncidentsPage.module.scss'

function ConfirmClear({
  count,
  onConfirm,
  onCancel,
}: {
  count: number
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className={styles.confirm}>
      <span>Archive all {count} incidents, then clear the list?</span>
      <div className={styles.confirmRow}>
        <button
          type="button"
          className={cx(ui.btn, ui.danger, ui.sm)}
          onClick={onConfirm}
          autoFocus
        >
          Archive & clear
        </button>
        <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/** Clear all = archive a snapshot, then empty the list. Asks once more, in place. */
export function ClearAll({ count }: { count: number }) {
  const { openIncident, report } = useWorkspace()
  const [armed, setArmed] = useState(false)
  const clear = () => {
    setArmed(false)
    backend
      .archiveSession()
      .then(() => openIncident(null))
      .catch((error: unknown) => report('Could not archive and clear the incidents', error))
  }
  if (!armed) {
    return (
      <button
        type="button"
        className={cx(ui.btn, ui.ghost, ui.sm, styles.clear)}
        disabled={count === 0}
        onClick={() => setArmed(true)}
      >
        <Icon name="trash" size={14} />
        Clear all incidents…
      </button>
    )
  }
  return <ConfirmClear count={count} onConfirm={clear} onCancel={() => setArmed(false)} />
}
