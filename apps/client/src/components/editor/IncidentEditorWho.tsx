import type { Incident, InvolvedCar, InvolvedRole, StandingEntry } from '@stewardpad/shared'
import { Select } from '../Select'

const ROLES: InvolvedRole[] = ['REPORTED', 'REPORTER', 'INVOLVED']
const SELECT_FIELD =
  'w-full rounded-sm border border-border-strong bg-surface py-1 pl-2 pr-7 text-sm text-text'
const ROLE_FIELD =
  'rounded-sm border border-border-strong bg-surface py-0.5 pl-1 pr-5 text-xs text-text'

function otherIncidentsFor(car: InvolvedCar, incidents: Incident[], excludeId: string): Incident[] {
  return incidents.filter(
    (incident) =>
      incident.id !== excludeId &&
      incident.cars.some((c) => c.carNumber === car.carNumber && c.carClass === car.carClass),
  )
}

/** Section 2: Who — cars involved, picked from standings; adds on selection. */
export function IncidentEditorWho({
  cars,
  standings,
  onChangeCars,
  incidents,
  currentIncidentId,
  onOpenIncident,
}: {
  cars: InvolvedCar[]
  standings: StandingEntry[]
  onChangeCars: (cars: InvolvedCar[]) => void
  /** Full session incident list, for the "also in" history strip below each
   * car — omit (as LogMissedIncidentModal does, its incident has no id yet)
   * to skip the history lookup entirely. */
  incidents?: Incident[]
  currentIncidentId?: string
  onOpenIncident?: (id: string) => void
}) {
  // A car already added drops out of the picker — same identity signal
  // InvolvedCar itself uses (carNumber isn't unique alone, see its comment).
  const available = standings.filter(
    (s) => !cars.some((c) => c.carNumber === s.carNumber && c.carClass === s.carClass),
  )

  const selectFromStandings = (slotId: string): void => {
    const standing = standings.find((s) => String(s.slotId) === slotId)
    if (!standing) return
    onChangeCars([
      ...cars,
      {
        carNumber: standing.carNumber,
        driverName: standing.driverName,
        carClass: standing.carClass,
        lapAtIncident: standing.lapsCompleted,
        role: 'INVOLVED',
      },
    ])
  }

  const setRole = (index: number, role: InvolvedRole): void => {
    onChangeCars(cars.map((car, i) => (i === index ? { ...car, role } : car)))
  }

  return (
    <section className="border-t border-border py-4">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">Who</h3>
      <ul className="space-y-1">
        {cars.map((car, index) => {
          const history =
            incidents && currentIncidentId !== undefined
              ? otherIncidentsFor(car, incidents, currentIncidentId)
              : []
          return (
            <li key={`${car.carNumber}-${index}`} className="text-sm text-text">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">
                  #{car.carNumber} {car.driverName}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <Select
                    value={car.role}
                    onChange={(event) => setRole(index, event.target.value as InvolvedRole)}
                    className={ROLE_FIELD}
                    aria-label={`Role for ${car.driverName}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => onChangeCars(cars.filter((_, i) => i !== index))}
                    className="text-xs text-text-muted hover:text-status-penalty-applied"
                    aria-label={`Remove ${car.driverName}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
              {history.length > 0 && (
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-text-faint">
                  Also in:
                  {history.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => onOpenIncident?.(h.id)}
                      className="text-accent hover:underline"
                    >
                      #{h.sequenceNumber}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <Select
        value=""
        onChange={(event) => selectFromStandings(event.target.value)}
        className={SELECT_FIELD}
        wrapperClassName="mt-2 block w-full"
        aria-label="Add car from standings"
      >
        <option value="">Add car from standings…</option>
        {available.map((s) => (
          <option key={s.slotId} value={s.slotId}>
            #{s.carNumber} {s.driverName}
            {s.carClass ? ` (${s.carClass})` : ''}
          </option>
        ))}
      </Select>
    </section>
  )
}
