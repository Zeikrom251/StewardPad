import type { InvolvedCar, Penalty } from '@stewardpad/shared'
import { Icon } from '../icons'
import { PENALTY_LABEL, PENALTY_ORDER, TIMED_PENALTIES } from '../lib/labels'
import { cx } from '../ui/primitives'
import { Select } from '../ui/Select'
import ui from '../ui/ui.module.scss'
import styles from './Inspector.module.scss'

function PenaltyFields({
  penalty,
  cars,
  onChange,
}: {
  penalty: Penalty
  cars: InvolvedCar[]
  onChange: (p: Penalty | null) => void
}) {
  const update = (patch: Partial<Penalty>) => onChange({ ...penalty, ...patch })
  const timed = TIMED_PENALTIES.has(penalty.type)
  return (
    <div className={styles.penalty}>
      <div className={styles.penaltyHead}>
        <span className={ui.label}>
          <Icon name="gavel" size={13} strokeWidth={2} />
          Penalty
        </span>
        <span className={ui.grow} />
        <button
          type="button"
          role="checkbox"
          aria-checked={penalty.served}
          className={styles.served}
          onClick={() => update({ served: !penalty.served })}
        >
          <span className={ui.check} aria-checked={penalty.served}>
            {penalty.served && <Icon name="check" size={11} strokeWidth={3} />}
          </span>
          Served
        </button>
        <button
          type="button"
          className={ui.iconBtn}
          aria-label="Remove penalty"
          onClick={() => onChange(null)}
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
      <div className={timed ? styles.penaltyGrid : undefined}>
        <label className={styles.fieldLabel}>
          Type
          <Select
            value={penalty.type}
            options={PENALTY_ORDER.map((type) => ({ value: type, label: PENALTY_LABEL[type] }))}
            onChange={(type) => update({ type })}
            label="Penalty type"
          />
        </label>
        {timed && (
          <label className={styles.fieldLabel}>
            Seconds
            <span className={cx(ui.field, ui.mono)}>
              <input
                type="number"
                min={0}
                step={1}
                value={penalty.seconds ?? ''}
                onChange={(e) =>
                  update({
                    seconds:
                      e.target.value === ''
                        ? null
                        : Math.max(0, Math.round(Number(e.target.value))),
                  })
                }
              />
            </span>
          </label>
        )}
      </div>
      <label className={styles.fieldLabel}>
        Applied to
        <Select
          value={penalty.appliedTo}
          options={cars.map((car) => ({
            value: car.carNumber,
            label: `#${car.carNumber} ${car.driverName}`,
          }))}
          onChange={(appliedTo) => update({ appliedTo })}
          label="Penalty applied to"
        />
      </label>
    </div>
  )
}

/** "Add penalty" until there is one; then its type, duration, target car and served flag. */
export function PenaltyBox({
  penalty,
  cars,
  onChange,
}: {
  penalty: Penalty | null
  cars: InvolvedCar[]
  onChange: (p: Penalty | null) => void
}) {
  if (penalty) return <PenaltyFields penalty={penalty} cars={cars} onChange={onChange} />
  // The penalty goes to the car that caused it, when the stewards have said which.
  const first = cars.find((c) => c.role === 'CAUSED') ?? cars[0]
  return (
    <button
      type="button"
      className={cx(ui.btn, ui.block, styles.addPenalty)}
      disabled={!first}
      title={first ? undefined : 'Add the car first: a penalty is applied to a car'}
      onClick={() =>
        first &&
        onChange({
          type: 'TIME_PENALTY',
          seconds: 5,
          appliedTo: first.carNumber,
          served: false,
          notes: '',
        })
      }
    >
      <Icon name="plus" size={15} />
      Add penalty
    </button>
  )
}
