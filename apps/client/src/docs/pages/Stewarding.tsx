import { Link } from '../../router'
import { Kbd } from '../../ui/Button'
import { Callout, Keys, Path, Shot } from '../parts'

export function Logging() {
  return (
    <>
      <p className="lead">
        During a race you don’t decide anything: you make sure nothing is forgotten, with a time the
        replay can jump to.
      </p>
      <h2>Select the cars</h2>
      <p>
        Click a car in the standings, or press its position: <Kbd>1</Kbd> to <Kbd>9</Kbd>. Select a
        second car for “car A vs car B”; a third replaces the oldest. <Kbd>Ctrl F</Kbd> finds a car
        by number or driver, <Kbd>Esc</Kbd> clears the selection.
      </p>
      <h2>Press Space</h2>
      <p>
        <Kbd>Space</Kbd> logs an incident with the selected cars (or none: you can add them later).
        It lands in the feed as <b>Noted</b>, ready to review.
      </p>
      <h2>The look-back</h2>
      <p>
        You press Space a few seconds after the moment: you saw it, then reacted. So StewardPad
        stamps the incident at <b>now minus your look-back</b>, 10 seconds by default. The quick-log
        panel always shows the exact stamp before you press (“Stamps at 00:59:50 · now − 10 s”).
      </p>
      <p>
        Change it in <Path>Settings → Logging → Look-back</Path> (0 to 120 seconds) or from the pill
        in the quick-log panel. The inspector keeps both times: when you pressed, and the stamp,
        which you can nudge by ±1 or ±5 seconds.
      </p>
      <Callout>
        A held Space never logs twice: key repeat is ignored, so one press is one incident.
      </Callout>
      <h2>Missed one?</h2>
      <p>
        <b>Log a missed incident…</b> under the Log button creates one at the current time and opens
        it, so you can set the right time and cars.
      </p>
      <h2>Incidents the game reports</h2>
      <p>
        With Le Mans Ultimate as the source, the collisions the game detects arrive by themselves,
        marked <b>LMU</b> and <b>Noted</b>. Review them like any other; the same collision is never
        added twice.
      </p>
      <h2>Keys while racing</h2>
      <Keys
        rows={[
          ['Space', 'Log an incident with the selected cars'],
          ['1', 'Select the car in P1 (up to 9)'],
          ['E', 'Open the most recent incident'],
          ['Ctrl + K', 'Find any car, incident or action'],
          ['Esc', 'Close the inspector, then clear the selection'],
        ]}
      />
    </>
  )
}

export function Inspector() {
  return (
    <>
      <p className="lead">
        Click an incident anywhere and it opens in the inspector, docked beside the standings. Every
        change saves on its own, half a second after you stop typing.
      </p>
      <Shot
        src="/screens/inspector.jpg"
        alt="The inspector open on a contact, with the penalty status, the cars and their roles."
      />
      <h2>Status</h2>
      <p>
        One click: <b>Noted</b>, <b>Under investigation</b>, <b>No further action</b>,{' '}
        <b>Penalty applied</b> or <b>Dismissed</b>. With{' '}
        <Link to="/docs/discord">Discord announcements</Link> on, each change is posted.
      </p>
      <h2>When</h2>
      <p>
        The stamp, the lap and a replay reference (“RACE 00:20:10 · Lap 12”) with a Copy button.
        Nudge the time by ±1 or ±5 seconds if the replay shows it a little off.
      </p>
      <h2>Cars and their roles</h2>
      <p>
        <b>Add or remove cars</b> opens the whole grid with positions, gaps, pit stops and each
        car’s incident count. Give every car its part: <b>Caused it</b>, <b>Affected</b>,{' '}
        <b>Involved</b>, <b>Reporter</b> or <b>Reported</b>. A penalty defaults to the car that
        caused it. “Also in #…” links to the car’s other incidents.
      </p>
      <h2>What drivers see, and what they don’t</h2>
      <Callout tone="private">
        <b>Steward notes</b> are for stewards only, on a hatched background: onboard checks, doubts,
        what to look at. They are in no report, no document and no Discord message.
      </Callout>
      <p>
        <b>Investigation</b> (the incident type and what happened), <b>Rules broken</b> and{' '}
        <b>Decision</b> are tagged “visible to drivers”: they are what the published documents and
        announcements show.
      </p>
      <h2>Rules broken</h2>
      <p>
        With a <Link to="/docs/rule-book">rule book</Link> loaded, choose every rule the incident
        broke from a searchable window; the numbers and titles appear in every export.
      </p>
      <h2>Penalty</h2>
      <p>
        Warning, reprimand, time penalty, drive-through, stop &amp; go, grid penalty for the next
        race or disqualification, with the seconds where they apply, the car, and whether it has
        been served. StewardPad never applies penalties in the game: drivers serve them.
      </p>
      <h2>Reviewed by</h2>
      <p>
        Nobody types it: saving a change stamps your name from Settings. Opening an incident without
        changing it keeps the previous steward’s name.
      </p>
    </>
  )
}
