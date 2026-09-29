import { Link } from '../router'
import { Kbd } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'
import styles from './Home.module.scss'

const STEPS: Array<[string, string, string]> = [
  ['01', 'Install it', 'Download the Windows installer and run it. No account to create.'],
  [
    '02',
    'Open the session',
    'Join the session in Le Mans Ultimate on the same PC. To practise first, switch StewardPad to the built-in simulator.',
  ],
  ['03', 'Press Space', 'Something happens on track: select the cars and press Space. That is it.'],
]

export function Steps() {
  return (
    <section className={styles.steps}>
      <header className={styles.sectionHead}>
        <span className={styles.eyebrow}>How it works</span>
        <h2>Ready before the formation lap.</h2>
      </header>
      <ol>
        {STEPS.map(([n, title, body]) => (
          <li key={n}>
            <span className={styles.stepNumber}>{n}</span>
            <b>{title}</b>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <p className={styles.stepsNote}>
        Everything has a key: <Kbd>Space</Kbd> logs, <Kbd>Ctrl K</Kbd> finds any car or incident,{' '}
        <Kbd>?</Kbd> shows the rest. <Link to="/docs/shortcuts">All shortcuts</Link>
      </p>
    </section>
  )
}

const PRIVACY: Array<[IconName, string, string]> = [
  [
    'lock',
    'Runs on your PC',
    'The session is a file on your own disk, saved half a second after every change. A crash never loses the race.',
  ],
  ['user', 'No account', 'Nothing to sign up for, nothing to log into, no licence key.'],
  [
    'folder',
    'Your files, your folder',
    'Exports go where you choose. Steward notes never leave the stewards: they are in no export.',
  ],
  [
    'code',
    'Open source',
    'GPL-3.0 on GitHub. Read the code, report an issue, or build it yourself.',
  ],
]

export function Privacy() {
  return (
    <section className={styles.privacy}>
      <header className={styles.sectionHead}>
        <span className={styles.eyebrow}>Local first</span>
        <h2>Your race data stays with you.</h2>
        <p>
          StewardPad talks to two things only: Le Mans Ultimate on your own machine, and Discord if
          you switch announcements on. No telemetry, no cloud.
        </p>
      </header>
      <div className={styles.cards}>
        {PRIVACY.map(([icon, title, body]) => (
          <div key={title} className={styles.card}>
            <Icon name={icon} size={22} />
            <b>{title}</b>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Team() {
  return (
    <section className={styles.team}>
      <Icon name="users" size={26} />
      <div>
        <h2>Three stewards, one session.</h2>
        <p>
          Split the incidents between you. Each steward exports a session file; one of you drops the
          others in, and StewardPad merges them into one complete session, reporting any incident
          two of you changed.
        </p>
      </div>
      <Link className={styles.more} to="/docs/team">
        Working as a team <Icon name="arrow" size={16} />
      </Link>
    </section>
  )
}
