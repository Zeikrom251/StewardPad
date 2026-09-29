import { Link } from '../../router'
import { Kbd } from '../../ui/Button'
import { Callout, Path, Shot } from '../parts'

export function IncidentsList() {
  return (
    <>
      <p className="lead">
        The <b>Incidents</b> page is the whole session as a list: every incident, newest or oldest
        first, with the inspector docked on the right.
      </p>
      <h2>Filters</h2>
      <p>
        Narrow the list by status, by source (logged by a steward or reported by LMU) and by type,
        or search by incident number, car or driver. The rail’s Incidents badge counts what is still
        under investigation.
      </p>
      <h2>Bulk actions</h2>
      <p>Tick the boxes on several rows to act on all of them at once:</p>
      <ul>
        <li>
          <b>Set a status</b>: close a batch of lap-one touches as No further action in one go.
        </li>
        <li>
          <b>Merge</b>: two stewards logged the same contact, or LMU reported it as well. Merging
          keeps the first-logged incident (the lowest number) with its text, adds the others’ cars
          to it, and hides the rest from the list and the exports. The full steward log still names
          them in its “Merged from” column.
        </li>
      </ul>
      <h2>Clear all</h2>
      <p>
        At the end of a session, <b>Clear all incidents…</b> starts a clean list. It asks twice, and
        always writes a snapshot of every incident to the archive folder first (
        <Path>Settings → Storage → Archive folder</Path>).
      </p>
      <Callout tone="warn">
        Export what you need before you clear: the reports are built from the current list.
      </Callout>
    </>
  )
}

export function Review() {
  return (
    <>
      <p className="lead">
        After the race, the <b>Review</b> page takes you through the undecided incidents one at a
        time, on the full screen.
      </p>
      <Shot
        src="/screens/review.jpg"
        alt="The review page: the queue in race order on the left, one incident across the rest of the screen."
      />
      <h2>The queue</h2>
      <p>
        <b>To review</b> lists the incidents still Noted or Under investigation, in race order.{' '}
        <b>All</b> lists every incident. The one you are on stays in the queue after you decide it,
        so its place holds until you move on.
      </p>
      <h2>Moving through it</h2>
      <p>
        <b>Next</b> and <b>Previous</b> sit in the toolbar. <Kbd>Alt</Kbd> + <Kbd>↓</Kbd> and{' '}
        <Kbd>Alt</Kbd> + <Kbd>↑</Kbd> do the same, even while you type in a decision, so a whole
        review can be done from the keyboard.
      </p>
      <h2>The layout</h2>
      <p>
        The same sections as the <Link to="/docs/inspector">inspector</Link>, side by side: the case
        on the left (when, cars, steward notes), the verdict on the right (investigation, rules
        broken, decision and penalty).
      </p>
    </>
  )
}
