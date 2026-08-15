import type { InvolvedCar, Penalty, PenaltyType } from '@stewardpad/shared'
import { PENALTY_TYPES, PENALTY_TYPE_LABEL, TIMED_PENALTY_TYPES } from '../../lib/penaltyTypes'
import { Select } from '../Select'

const FIELD =
  'mt-1 w-full rounded-sm border border-border-strong bg-surface px-2 py-1 text-sm text-text'
const SELECT_FIELD =
  'w-full rounded-sm border border-border-strong bg-surface py-1 pl-2 pr-7 text-sm text-text'

function defaultPenalty(type: PenaltyType, appliedTo: string): Penalty {
  return { type, seconds: null, appliedTo, served: false, notes: '' }
}

/** The penalty block within Decision — type, seconds when relevant, applied-to car, served. */
export function PenaltyFields({
  penalty,
  cars,
  onChange,
}: {
  penalty: Penalty | null
  cars: InvolvedCar[]
  onChange: (penalty: Penalty | null) => void
}) {
  const setPenaltyType = (value: string): void => {
    if (value === 'NONE') {
      onChange(null)
      return
    }
    const type = value as PenaltyType
    onChange(penalty ? { ...penalty, type } : defaultPenalty(type, cars[0]?.carNumber ?? ''))
  }

  const update = (patch: Partial<Penalty>): void => {
    if (penalty) onChange({ ...penalty, ...patch })
  }

  return (
    <div className="mt-3">
      <label className="block text-xs text-text-muted">
        Penalty
        <Select
          value={penalty?.type ?? 'NONE'}
          onChange={(event) => setPenaltyType(event.target.value)}
          className={SELECT_FIELD}
          wrapperClassName="mt-1 block w-full"
        >
          <option value="NONE">None</option>
          {PENALTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {PENALTY_TYPE_LABEL[type]}
            </option>
          ))}
        </Select>
      </label>
      {penalty && (
        <div className="mt-2 space-y-2">
          {TIMED_PENALTY_TYPES.includes(penalty.type) && (
            <label className="block text-xs text-text-muted">
              Seconds
              <input
                type="number"
                min={0}
                value={penalty.seconds ?? ''}
                onChange={(event) =>
                  update({ seconds: event.target.value === '' ? null : Number(event.target.value) })
                }
                className={`w-24 ${FIELD}`}
              />
            </label>
          )}
          <label className="block text-xs text-text-muted">
            Applied to
            <Select
              value={penalty.appliedTo}
              onChange={(event) => update({ appliedTo: event.target.value })}
              className={SELECT_FIELD}
              wrapperClassName="mt-1 block w-full"
            >
              {cars.map((car) => (
                <option key={car.carNumber} value={car.carNumber}>
                  #{car.carNumber} {car.driverName}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={penalty.served}
              onChange={(event) => update({ served: event.target.checked })}
            />
            Served
          </label>
          <label className="block text-xs text-text-muted">
            Penalty notes
            <textarea
              value={penalty.notes}
              onChange={(event) => update({ notes: event.target.value })}
              rows={2}
              className={FIELD}
            />
          </label>
        </div>
      )}
    </div>
  )
}
