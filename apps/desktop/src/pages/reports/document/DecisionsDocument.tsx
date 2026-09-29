import { DecisionBlock } from './DecisionBlock'
import type { DocumentData } from './documentData'
import {
  EventFacts,
  Letterhead,
  PenaltySummary,
  PendingList,
  Section,
  Signatures,
} from './DocumentParts'

/** The stewards' decisions for one session, as a formal A4 document (after FIA bulletins). */
export function DecisionsDocument({ data }: { data: DocumentData }) {
  return (
    <main>
      <Letterhead />
      <h1>{data.title}</h1>
      <EventFacts data={data} />
      <table className="parties">
        <tbody>
          <tr>
            <th scope="row">To</th>
            <td>All competitors</td>
            <th scope="row">From</th>
            <td>The Stewards</td>
          </tr>
        </tbody>
      </table>
      <p className="intro">
        The Stewards have reviewed the incidents below and issue the following decisions.
      </p>
      <Section n={1} title="Summary of penalties">
        <PenaltySummary decided={data.decided} />
      </Section>
      <Section n={2} title="Decisions">
        {data.decided.length === 0 && <p className="none">No decision has been issued yet.</p>}
        {data.decided.map((incident) => (
          <DecisionBlock
            key={incident.id}
            incident={incident}
            html={data.html[incident.id] ?? { investigation: '', decision: '' }}
            signed={data.stewards.length > 0}
          />
        ))}
      </Section>
      {data.pending.length > 0 && (
        <Section n={3} title="Still under review">
          <PendingList pending={data.pending} />
        </Section>
      )}
      <Signatures stewards={data.stewards} />
      <p className="notice">
        Penalties are served by the drivers themselves: they are not applied in the game.
      </p>
    </main>
  )
}
