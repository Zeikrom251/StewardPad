import { useState } from 'react'
import type { Incident, InvolvedCar } from '@stewardpad/shared'
import { useLive } from '../backend/LiveProvider'
import { Icon } from '../icons'
import { carKey } from '../lib/cars'
import { ROLE_LABEL, ROLE_ORDER } from '../lib/labels'
import { Plate, cx } from '../ui/primitives'
import { Select } from '../ui/Select'
import ui from '../ui/ui.module.scss'
import { useWorkspace } from '../workspace/Workspace'
import { CarPickerModal } from './CarPickerModal'
import { Collapsible } from './Collapsible'
import styles from './Inspector.module.scss'

/** Opens the car picker; the picked cars replace the list (kept ones keep their role). */
function AddCars({
  cars,
  onChange,
}: {
  cars: InvolvedCar[]
  onChange: (cars: InvolvedCar[]) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} />
        {cars.length ? 'Add or remove cars' : 'Add cars'}
      </button>
      {open && <CarPickerModal cars={cars} onApply={onChange} onClose={() => setOpen(false)} />}
    </>
  )
}

function CarRow({
  car,
  incident,
  onChange,
  onRemove,
}: {
  car: InvolvedCar
  incident: Incident
  onChange: (c: InvolvedCar) => void
  onRemove: () => void
}) {
  const live = useLive()
  const { openIncident } = useWorkspace()
  const entry = live?.standings.find((s) => carKey(s) === carKey(car))
  const others = (live?.incidents ?? [])
    .filter((i) => i.id !== incident.id && i.cars.some((c) => carKey(c) === carKey(car)))
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
  const details = [
    entry?.teamName,
    car.lapAtIncident !== null && `Lap ${car.lapAtIncident}`,
    entry && `P${entry.position}`,
  ]
  return (
    <div className={styles.carBlock}>
      <div className={styles.carRow}>
        <Plate number={car.carNumber} carClass={car.carClass} />
        <span className={styles.who}>
          <b className={ui.trunc}>{car.driverName}</b>
          <span className={ui.trunc}>{details.filter(Boolean).join(' · ')}</span>
        </span>
        <span className={styles.role}>
          <Select
            value={car.role}
            options={ROLE_ORDER.map((role) => ({ value: role, label: ROLE_LABEL[role] }))}
            onChange={(role) => onChange({ ...car, role })}
            label={`Role of #${car.carNumber}`}
          />
        </span>
        <button
          type="button"
          className={ui.iconBtn}
          aria-label={`Remove #${car.carNumber}`}
          onClick={onRemove}
        >
          <Icon name="x" size={15} />
        </button>
      </div>
      {others.length > 0 && (
        <div className={styles.also}>
          Also in
          {others.map((other) => (
            <button key={other.id} type="button" onClick={() => openIncident(other.id)}>
              #{other.sequenceNumber}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Who was involved, each with a role; "also in" links to the car's other incidents. */
export function CarsSection({
  incident,
  cars,
  onChange,
}: {
  incident: Incident
  cars: InvolvedCar[]
  onChange: (cars: InvolvedCar[]) => void
}) {
  return (
    <Collapsible
      id="cars"
      title="Cars"
      summary={cars.map((c) => `#${c.carNumber}`).join(', ') || 'None'}
      aside={<AddCars cars={cars} onChange={onChange} />}
    >
      {cars.map((car, i) => (
        <CarRow
          key={carKey(car)}
          car={car}
          incident={incident}
          onChange={(next) => onChange(cars.map((c, j) => (j === i ? next : c)))}
          onRemove={() => onChange(cars.filter((_, j) => j !== i))}
        />
      ))}
      {cars.length === 0 && <p className={styles.hint}>No cars yet. Add them from the grid.</p>}
    </Collapsible>
  )
}
