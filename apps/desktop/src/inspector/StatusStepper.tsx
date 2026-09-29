import type { IncidentStatus } from '@stewardpad/shared'
import { Icon } from '../icons'
import { STATUS, STATUS_ORDER } from '../lib/labels'
import ui from '../ui/ui.module.scss'
import styles from './Inspector.module.scss'

/** One click per status — the review flow is the order they're listed in. */
export function StatusStepper({
  value,
  onChange,
}: {
  value: IncidentStatus
  onChange: (s: IncidentStatus) => void
}) {
  return (
    <div className={styles.status}>
      <div className={styles.sectionHead}>
        <span className={ui.label}>Status</span>
        <span className={styles.hint}>One click · autosaves</span>
      </div>
      <div className={styles.stepper} role="radiogroup" aria-label="Status">
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={status === value}
            data-status={status}
            title={STATUS[status].label}
            onClick={() => onChange(status)}
          >
            <Icon name={STATUS[status].icon} size={15} strokeWidth={2} />
            {STATUS[status].short}
          </button>
        ))}
      </div>
    </div>
  )
}
