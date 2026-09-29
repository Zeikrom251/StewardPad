import { Link } from '../../router'
import { ISSUES_URL } from '../../site'

export function Troubleshooting() {
  return (
    <>
      <p className="lead">The problems stewards meet most, and what fixes them.</p>
      <h2>StewardPad does not see Le Mans Ultimate</h2>
      <ul>
        <li>
          Check <b>Settings → Data source</b> says Le Mans Ultimate, not Simulator.
        </li>
        <li>The game must run on the same PC, joined to a session.</li>
        <li>
          StewardPad reads the game’s local web API at <code>http://localhost:6397</code>. If your
          setup uses another address, start StewardPad with the environment variable{' '}
          <code>LMU_BASE_URL</code> set to it.
        </li>
      </ul>
      <p>While the game is away you can keep working: incidents, review and reports all run.</p>
      <h2>“Windows protected your PC”</h2>
      <p>
        The installer is not code-signed yet: choose <b>More info</b>, then <b>Run anyway</b>.
      </p>
      <h2>The rule book has too few rules, or odd numbers</h2>
      <p>
        Import the Google Docs or Word file as plain text rather than copying from a PDF, and read{' '}
        <Link to="/docs/rule-book">how rules are found</Link>. The editor lists every line it could
        not place.
      </p>
      <h2>Excel shows everything in one column</h2>
      <p>
        Your Excel expects commas: choose <b>Comma</b> at the top of the Reports page and save the
        file again.
      </p>
      <h2>A Discord message failed</h2>
      <p>
        The Sent list says why. “Wrong or deleted” means the webhook was removed in Discord: create
        a new one and paste its link. After fixing it, press Retry.
      </p>
      <h2>Still stuck?</h2>
      <p>
        <a href={ISSUES_URL} target="_blank" rel="noreferrer">
          Open an issue on GitHub
        </a>{' '}
        with what you did, what you expected and what happened.
      </p>
    </>
  )
}
