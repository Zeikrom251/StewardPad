import { Link } from '../../router'
import { RELEASES_URL } from '../../site'
import { Kbd } from '../../ui/Button'
import { Callout, Path, Shot } from '../parts'

export function Install() {
  return (
    <>
      <p className="lead">
        One installer for Windows, no account, nothing to configure before the first launch.
      </p>
      <h2>Download</h2>
      <p>
        StewardPad ships as a Windows installer on the{' '}
        <a href={RELEASES_URL} target="_blank" rel="noreferrer">
          releases page
        </a>
        . Download the <code>.exe</code> of the latest version and run it. It installs for your
        Windows user and adds StewardPad to the Start menu.
      </p>
      <h2>What you need</h2>
      <ul>
        <li>Windows 10 or 11, 64-bit.</li>
        <li>Le Mans Ultimate on the same PC, to steward a live session.</li>
        <li>
          Microsoft Edge WebView2, which draws the window. Windows 11 has it; on Windows 10 the
          installer adds it if it is missing.
        </li>
      </ul>
      <h2>The SmartScreen warning</h2>
      <p>
        The installer is not code-signed yet. The first time, Windows may show “Windows protected
        your PC”. Choose <b>More info</b>, then <b>Run anyway</b>.
      </p>
      <Callout>
        Every release is built from the public source on GitHub. If you prefer, build the installer
        yourself: the <Link to="/download">download page</Link> has the four commands.
      </Callout>
      <h2>Updating</h2>
      <p>
        Download the new installer and run it over the old version. Your session, settings and rule
        book stay where they are: they live in your user folder, not in the app.
      </p>
    </>
  )
}

export function FirstRace() {
  return (
    <>
      <p className="lead">
        Five minutes from the first launch to your first incident, with the game or without it.
      </p>
      <h2>1. Tell StewardPad who you are</h2>
      <p>
        Open <Path>Settings → Steward → Your name</Path> and type it. It is stamped on every
        incident you log (“Logged by”) and every one you decide (“Reviewed by”), which matters when
        several stewards share a session.
      </p>
      <h2>2. Choose where the race comes from</h2>
      <p>
        In <Path>Settings → Data source</Path>:
      </p>
      <ul>
        <li>
          <b>Le Mans Ultimate</b> reads the live session from the game on this PC: standings, lap
          times, pit stops and the collisions the game reports. Start the game and join the session;
          the title bar shows the track and the flag.
        </li>
        <li>
          <b>Simulator</b> invents a full multiclass grid that races on its own. Use it to learn the
          app, train new stewards, or try your league’s rule book before race day.
        </li>
      </ul>
      <p>
        Switching keeps your incidents. The badge in the title bar says which source is running.
      </p>
      <h2>3. The window</h2>
      <Shot
        src="/screens/race-control.jpg"
        alt="The race page: standings on the left, the quick-log panel and the incident feed on the right."
      />
      <ul>
        <li>
          <b>Title bar</b>: the track, the session, the flag and the race clock.
        </li>
        <li>
          <b>Rail</b> (left): Race, Incidents, Review, Rules, Reports, Discord, and at the bottom
          Keys and Settings.
        </li>
        <li>
          <b>Standings</b>: the live order. Click a row, or press its position (<Kbd>1</Kbd> to{' '}
          <Kbd>9</Kbd>), to select that car.
        </li>
        <li>
          <b>Quick log</b> and <b>Incidents</b> (right): the cars you selected, the stamp the next
          incident will get, and everything logged so far.
        </li>
        <li>
          <b>Status bar</b>: the source, the incident count, your look-back and your name.
        </li>
      </ul>
      <h2>4. Log your first incident</h2>
      <p>
        Select two cars and press <Kbd>Space</Kbd>. That is the whole routine during a race; the
        next page explains what the stamp means.
      </p>
      <p>
        <Link to="/docs/logging">Logging incidents →</Link>
      </p>
    </>
  )
}
