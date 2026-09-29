import { Mark } from '@stewardpad/brand'
import { Link, useTitle } from '../router'
import { APP_VERSION, GITHUB_URL, RELEASES_URL } from '../site'
import { Button, Kbd } from '../ui/Button'
import { Icon } from '../ui/Icon'
import styles from './Download.module.scss'

const REQUIREMENTS = [
  'Windows 10 or 11, 64-bit',
  'Le Mans Ultimate on the same PC to steward a live session',
  'Microsoft Edge WebView2 (built into Windows 11; the installer adds it on Windows 10 if missing)',
]

function DownloadCard() {
  return (
    <div className={styles.card}>
      <span className={styles.tile}>
        <Mark size={72} />
      </span>
      <div className={styles.cardText}>
        <h2>StewardPad for Windows</h2>
        <span className={styles.meta}>
          Version {APP_VERSION} · Installer (.exe) · Free, GPL-3.0
        </span>
      </div>
      <div className={styles.cardActions}>
        <Button to={RELEASES_URL} kind="primary" icon="download" large>
          Download the installer
        </Button>
        <a className={styles.notes} href={RELEASES_URL} target="_blank" rel="noreferrer">
          Release notes and older versions
        </a>
      </div>
    </div>
  )
}

/** The installer, what it needs, and the one warning Windows shows the first time. */
export function DownloadPage() {
  useTitle('Download')
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Download</span>
        <h1>Get StewardPad.</h1>
        <p>
          One installer, no account. You can log your first incident a minute after it finishes.
        </p>
      </header>
      <DownloadCard />
      <div className={styles.columns}>
        <section>
          <h3>
            <Icon name="check" size={18} /> What you need
          </h3>
          <ul>
            {REQUIREMENTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>
            <Icon name="alert" size={18} /> The first time you run it
          </h3>
          <p>
            The installer is not code-signed yet, so Windows SmartScreen may say it “protected your
            PC”. Choose <b>More info</b>, then <b>Run anyway</b>. The source of every release is on
            GitHub.
          </p>
          <p>
            Then open <Link to="/docs/first-race">Your first race</Link>: set your name, pick Le
            Mans Ultimate or the simulator, and press <Kbd>Space</Kbd>.
          </p>
        </section>
        <section>
          <h3>
            <Icon name="code" size={18} /> Build it yourself
          </h3>
          <p>With Node.js 20, pnpm and the Rust toolchain on Windows:</p>
          <pre className={styles.code}>
            <code>{`git clone ${GITHUB_URL}.git\ncd StewardPad\npnpm install\npnpm desktop:build`}</code>
          </pre>
          <p>The installer lands in the Tauri bundle folder.</p>
        </section>
      </div>
    </div>
  )
}
