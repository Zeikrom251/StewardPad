import type { ReactNode } from 'react'
import type { Incident, InvolvedCar } from '@stewardpad/shared'
import { formatHms } from '../../../lib/format'
import { STATUS, TYPE_LABEL, classLabel } from '../../../lib/labels'
import { ROLE_TEXT, lapOf, penalisedCar, penaltyText } from '../../../lib/incidentText'

/** A car number in a plain ruled box, as on an entry list. */
export function CarNumber({ number }: { number: string }) {
  return <span className="car-no">{number}</span>
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{children}</td>
    </tr>
  )
}

function Car({ car }: { car: InvolvedCar }) {
  return (
    <div className="car">
      <CarNumber number={car.carNumber} />
      <span>
        <b>{car.driverName}</b>
        <span className="sep">·</span>
        {classLabel(car.carClass)}
        <span className="sep">·</span>
        <span className="role" data-role={car.role}>
          {ROLE_TEXT[car.role]}
        </span>
      </span>
    </div>
  )
}

/** The stewards' Markdown, already HTML from the editor's own schema: no raw markup gets in. */
function Rich({ html }: { html: string }) {
  return <div className="rich" dangerouslySetInnerHTML={{ __html: html }} />
}

function PenaltyValue({ incident }: { incident: Incident }) {
  const penalty = incident.penalty
  if (!penalty) return null
  const car = penalisedCar(incident)
  return (
    <span className="penalty">
      <span>
        <b>{penaltyText(penalty)}</b> for car {penalty.appliedTo}
        {car && ` (${car.driverName})`}
      </span>
      <span className="served" data-served={penalty.served}>
        {penalty.served ? 'Served' : 'Not yet served'}
      </span>
    </span>
  )
}

/** One decision as a formal record: a heading, then labelled rows of facts and findings. */
export function DecisionBlock({
  incident,
  html,
  signed,
}: {
  incident: Incident
  html: { investigation: string; decision: string }
  /** Show who reviewed it (the stewards chose to be named). */
  signed: boolean
}) {
  const rules = incident.rules ?? []
  return (
    <section className="decision" data-status={incident.status}>
      <div className="decision-head">
        <span className="incident-no">
          <span>Incident</span>
          {incident.sequenceNumber}
        </span>
        <div className="decision-title">
          <h3>{TYPE_LABEL[incident.type]}</h3>
          <span className="when">
            Session time {formatHms(incident.eventSeconds)} · Lap {lapOf(incident) || 'n/a'}
          </span>
        </div>
        <span className="outcome">{STATUS[incident.status].label}</span>
      </div>
      <table className="record">
        <tbody>
          <Row label={incident.cars.length > 1 ? 'Cars' : 'Car'}>
            {incident.cars.map((car) => (
              <Car key={`${car.carNumber}|${car.carClass}`} car={car} />
            ))}
          </Row>
          {rules.length > 0 && (
            <Row label="Infringement">
              {rules.map((rule) => (
                <div key={rule.code} className="rule">
                  <b>{rule.code}</b>
                  <span>{rule.title}</span>
                </div>
              ))}
            </Row>
          )}
          {html.investigation && (
            <Row label="Investigation">
              <Rich html={html.investigation} />
            </Row>
          )}
          {html.decision && (
            <Row label="Decision">
              <Rich html={html.decision} />
            </Row>
          )}
          {incident.penalty && (
            <Row label="Penalty">
              <PenaltyValue incident={incident} />
            </Row>
          )}
          {signed && incident.reviewedBy && <Row label="Reviewed by">{incident.reviewedBy}</Row>}
        </tbody>
      </table>
    </section>
  )
}
