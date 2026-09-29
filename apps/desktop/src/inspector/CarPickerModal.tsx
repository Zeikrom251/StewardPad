import { useState } from 'react'
import type { InvolvedCar, StandingEntry } from '@stewardpad/shared'
import { useLive } from '../backend/LiveProvider'
import { carKey, gridClasses, incidentsByCar, searchCars, withChosenCars } from '../lib/cars'
import { formatLapTime } from '../lib/format'
import { classLabel } from '../lib/labels'
import { IncidentCount } from '../pages/race/StandingsRow'
import { ClassTag, Plate, cx } from '../ui/primitives'
import { PickerDialog } from '../ui/PickerDialog'
import { usePickList } from '../ui/usePickList'
import ui from '../ui/ui.module.scss'
import styles from './CarPicker.module.scss'

const COLUMNS = ['P', '#', 'Driver / Team', 'Class', 'Laps', 'Gap', 'Last', 'Pit', 'Inc']

function ClassFilter({
  classes,
  value,
  onChange,
}: {
  classes: Array<[string, number]>
  value: string | null
  onChange: (carClass: string | null) => void
}) {
  if (classes.length < 2) return null
  return (
    <span className={ui.seg}>
      <button type="button" aria-pressed={value === null} onClick={() => onChange(null)}>
        All classes
      </button>
      {classes.map(([carClass, count]) => (
        <button
          key={carClass}
          type="button"
          aria-pressed={value === carClass}
          onClick={() => onChange(carClass)}
        >
          {classLabel(carClass)}
          <span className={ui.count}>{count}</span>
        </button>
      ))}
    </span>
  )
}

/** Cars → Add: the whole grid with what a steward checks before naming a car. */
export function CarPickerModal({
  cars,
  onApply,
  onClose,
}: {
  cars: InvolvedCar[]
  onApply: (cars: InvolvedCar[]) => void
  onClose: () => void
}) {
  const live = useLive()
  const standings = live?.standings ?? []
  const byCar = incidentsByCar(live?.incidents ?? [])
  const [carClass, setCarClass] = useState<string | null>(null)
  const list = usePickList<StandingEntry>({
    initial: standings
      .filter((s) => cars.some((c) => carKey(c) === carKey(s)))
      .map((s) => String(s.slotId)),
    keyOf: (s) => String(s.slotId),
    filter: (query) => searchCars(standings, query, carClass),
  })
  const result = withChosenCars(cars, standings, list.chosen)
  const pickClass = (next: string | null) => {
    setCarClass(next)
    list.setActive(0)
  }
  return (
    <PickerDialog
      wide
      label="Cars involved"
      placeholder="Find a car by number (#38), driver or team"
      list={list}
      total={standings.length}
      summary={result.map((c) => `#${c.carNumber}`)}
      empty={
        standings.length
          ? 'No car matches.'
          : 'No cars on the grid: LMU or the simulator is not running.'
      }
      filters={
        <ClassFilter classes={gridClasses(standings)} value={carClass} onChange={pickClass} />
      }
      header={
        <div className={cx(styles.car, styles.header)}>
          {COLUMNS.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      }
      onApply={() => onApply(result)}
      onClose={onClose}
      row={(s) => (
        <span className={styles.car}>
          <span className={cx(ui.mono, styles.pos)}>{s.position}</span>
          <Plate number={s.carNumber} carClass={s.carClass} />
          <span className={styles.who}>
            <b className={ui.trunc}>{s.driverName}</b>
            <span className={ui.trunc}>{s.teamName}</span>
          </span>
          <ClassTag carClass={s.carClass} />
          <span className={ui.mono}>{s.lapsCompleted}</span>
          <span className={cx(ui.mono, ui.trunc)}>{s.gapToLeader}</span>
          <span className={cx(ui.mono, ui.muted)}>{formatLapTime(s.lastLapSeconds)}</span>
          <span className={ui.mono}>
            {s.inPit ? <b className={styles.inPit}>Pit</b> : s.pitStops}
          </span>
          <IncidentCount incidents={byCar.get(carKey(s)) ?? []} />
        </span>
      )}
    />
  )
}
