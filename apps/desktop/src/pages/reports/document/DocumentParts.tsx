import type { ReactNode } from 'react'
import type { Incident } from '@stewardpad/shared'
import { Mark } from '@stewardpad/brand'
import { formatHms } from '../../../lib/format'
import { TYPE_LABEL, classLabel } from '../../../lib/labels'
import { CarNumber } from './DecisionBlock'
import { penalisedCar, penaltyText } from '../../../lib/incidentText'
import type { DocumentData } from './documentData'

export function Letterhead() {
  return (
    <header className="letterhead">
      <span className="brand">
        <Mark size={20} />
        StewardPad
      </span>
      <span className="doctype">Stewards&apos; decisions</span>
    </header>
  )
}

/** The event at a glance, as a ruled row of facts. */
export function EventFacts({ data }: { data: DocumentData }) {
  const issued = data.issuedAt.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })
  const penalties = data.decided.filter((i) => i.penalty).length
  const facts: Array<[string, string]> = [
    ['Circuit', data.circuit || 'n/a'],
    ['Session', data.session || 'n/a'],
    ['Issued', issued],
    ['Decisions', `${data.decided.length} (${penalties} with a penalty)`],
  ]
  if (data.server) facts.splice(2, 0, ['Server', data.server])
  return (
    <table className="facts">
      <tbody>
        <tr>
          {facts.map(([label, value]) => (
            <td key={label}>
              <span>{label}</span>
              {value}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="part">
      <h2>
        <span className="n">{n}</span>
        <span className="t">{title}</span>
      </h2>
      {children}
    </section>
  )
}

export function PenaltySummary({ decided }: { decided: Incident[] }) {
  const penalised = decided.filter((i) => i.penalty)
  if (penalised.length === 0) return <p className="none">No penalties were issued.</p>
  return (
    <table className="grid">
      <thead>
        <tr>
          <th>Incident</th>
          <th>Car</th>
          <th>Driver</th>
          <th>Class</th>
          <th>Penalty</th>
          <th>Infringement</th>
          <th>Served</th>
        </tr>
      </thead>
      <tbody>
        {penalised.map((i) => {
          const car = penalisedCar(i)
          return (
            <tr key={i.id}>
              <td className="num">{i.sequenceNumber}</td>
              <td>
                <CarNumber number={i.penalty?.appliedTo ?? ''} />
              </td>
              <td>{car?.driverName}</td>
              <td>{car ? classLabel(car.carClass) : ''}</td>
              <td>{i.penalty && penaltyText(i.penalty)}</td>
              <td>{(i.rules ?? []).map((r) => r.code).join(', ') || 'n/a'}</td>
              <td>{i.penalty?.served ? 'Yes' : 'No'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function PendingList({ pending }: { pending: Incident[] }) {
  return (
    <>
      <p className="lead">A decision on these incidents will follow in a later document.</p>
      <table className="grid">
        <thead>
          <tr>
            <th>Incident</th>
            <th>Session time</th>
            <th>Type</th>
            <th>Cars</th>
          </tr>
        </thead>
        <tbody>
          {pending.map((i) => (
            <tr key={i.id}>
              <td className="num">{i.sequenceNumber}</td>
              <td className="num">{formatHms(i.eventSeconds)}</td>
              <td>{TYPE_LABEL[i.type]}</td>
              <td>{i.cars.map((c) => c.carNumber).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/** Named stewards sign on a line each; anonymous ones sign as a panel. */
export function Signatures({ stewards }: { stewards: string[] }) {
  return (
    <div className="signatures">
      <p className="lead">The Stewards</p>
      {stewards.length > 0 && (
        <div className="names">
          {stewards.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      )}
    </div>
  )
}
