import { APP_VERSION } from '../site'
import { Button } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'
import { Screenshot } from './Screenshot'
import styles from './Home.module.scss'

const PROOF: Array<[IconName, string]> = [
  ['gauge', 'Live standings from Le Mans Ultimate'],
  ['clock', 'Every incident stamped for the replay'],
  ['lock', 'No account, no cloud, no tracking'],
  ['code', 'Free and open source'],
]

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroText}>
        <span className={styles.eyebrow}>Race control for Le Mans Ultimate</span>
        <h1>
          Steward the race,
          <br />
          <span>not the spreadsheet.</span>
        </h1>
        <p>
          StewardPad reads the live session from Le Mans Ultimate, stamps each incident at the
          moment it happened, and turns your review into decisions drivers can read. Free, open
          source, and it runs entirely on your PC.
        </p>
        <div className={styles.actions}>
          <Button to="/download" kind="primary" icon="windows" large>
            Download for Windows
          </Button>
          <Button to="/docs" icon="book" large>
            Read the docs
          </Button>
        </div>
        <span className={styles.fine}>Version {APP_VERSION} · Windows 10 and 11 · GPL-3.0</span>
      </div>
      <div className={styles.heroShot}>
        <Screenshot
          src="/screens/race-control.jpg"
          alt="StewardPad during a race: live standings for 24 cars, the quick-log panel with two cars selected, and the incident feed."
          eager
        />
        <span className={styles.chipStamp} aria-hidden="true">
          <Icon name="clock" size={15} />
          Stamped <b>00:59:50</b> · now − 10 s
        </span>
        <span className={styles.chipPenalty} aria-hidden="true">
          <Icon name="flag" size={15} />
          Penalty · <b>#38</b> 5-second time penalty
        </span>
      </div>
      <ul className={styles.proof}>
        {PROOF.map(([icon, text]) => (
          <li key={text}>
            <Icon name={icon} size={18} />
            {text}
          </li>
        ))}
      </ul>
    </section>
  )
}
