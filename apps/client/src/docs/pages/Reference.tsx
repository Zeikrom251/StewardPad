import { Link } from '../../router'
import { Callout, Keys } from '../parts'

const SETTINGS: Array<[string, string]> = [
  ['Steward', 'Your name, stamped as “Logged by” and “Reviewed by”.'],
  ['Rule book', 'Import, replace or remove your league’s rule book.'],
  [
    'Display',
    'Density (compact or comfortable), text size, which standings columns show, and which inspector sections stay folded.',
  ],
  ['Logging', 'The look-back: how far back Space stamps an incident, 0 to 120 seconds.'],
  ['Data source', 'Le Mans Ultimate or the simulator. Switching keeps your incidents.'],
  [
    'Storage',
    'Where the session file lives, where Save dialogs open (export folder), and where Clear all archives the list.',
  ],
]

export function Settings() {
  return (
    <>
      <p className="lead">Every setting saves as soon as you change it.</p>
      <table>
        <tbody>
          {SETTINGS.map(([group, what]) => (
            <tr key={group}>
              <td>
                <b>{group}</b>
              </td>
              <td>{what}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Discord announcements have their own page: <Link to="/docs/discord">Discord</Link>.
      </p>
    </>
  )
}

export function Shortcuts() {
  return (
    <>
      <p className="lead">
        Single keys are ignored while you type in a field; <b>Ctrl K</b>, <b>Alt ↑ ↓</b> and{' '}
        <b>Esc</b> always work. The Keys page in the app shows the same list.
      </p>
      <Keys
        rows={[
          ['Space', 'Log an incident with the selected car(s), or none'],
          ['1', 'Select the car in that standings position (1 to 9)'],
          ['Esc', 'Leave a field, close the inspector, then clear the selection'],
          ['E', 'Open the most recently logged incident'],
          ['Ctrl + K', 'Command palette: cars, incidents and actions'],
          ['Ctrl + F', 'Find a car in the standings'],
          ['Alt + ↓', 'Review page: next incident, even while typing'],
          ['Alt + ↑', 'Review page: previous incident'],
          ['?', 'Show all shortcuts'],
        ]}
      />
      <h2>In the pick-list windows</h2>
      <p>The rules and cars windows keep the search field focused:</p>
      <Keys
        rows={[
          ['↑', 'Move up the list (↓ moves down)'],
          ['Enter', 'Tick or untick the highlighted row'],
          ['Ctrl + Enter', 'Apply'],
          ['Esc', 'Cancel'],
        ]}
      />
    </>
  )
}

export function Data() {
  return (
    <>
      <p className="lead">
        StewardPad keeps everything in one folder on your PC and sends nothing anywhere you have not
        chosen.
      </p>
      <h2>Where it is</h2>
      <p>
        <code>%APPDATA%\com.emeraldstudio.stewardpad</code>, which holds:
      </p>
      <ul>
        <li>
          <code>current-session.json</code>: every incident and your settings, written half a second
          after each change and restored when StewardPad starts. A crash loses nothing.
        </li>
        <li>
          <code>archive\</code>: the snapshot Clear all writes, and the backup made before each
          merge of other stewards’ files.
        </li>
        <li>
          <code>exports\</code>: where Save dialogs open until you pick another export folder.
        </li>
      </ul>
      <p>Uninstalling keeps this folder. Delete it to remove every trace.</p>
      <h2>What goes over the network</h2>
      <ul>
        <li>
          <b>Le Mans Ultimate</b>, on your own PC only (<code>localhost</code>).
        </li>
        <li>
          <b>Discord</b>, only if you switch announcements on, and only the parts of an incident you
          chose.
        </li>
      </ul>
      <p>No account, no telemetry, no analytics, no automatic update check.</p>
      <Callout tone="private">
        Session files for other stewards contain steward notes. Share them between stewards only.
      </Callout>
    </>
  )
}
