import { Mark, Wordmark } from '@stewardpad/brand'
import { Link, usePath } from '../router'
import { GITHUB_URL } from '../site'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import styles from './Layout.module.scss'

const LINKS: Array<[string, string]> = [
  ['/#features', 'Features'],
  ['/docs', 'Documentation'],
  ['/#faq', 'FAQ'],
]

/** The brand lockup: reduced-cut mark and wordmark, as in the app's title bar. */
export function Lockup({ size = 20 }: { size?: number }) {
  return (
    <span className={styles.lockup}>
      <Mark size={Math.round(size * 1.4)} />
      <Wordmark size={size} />
    </span>
  )
}

export function Nav() {
  const path = usePath()
  return (
    <header className={styles.nav}>
      <div className={styles.navInner}>
        <Link to="/" aria-label="StewardPad home">
          <Lockup />
        </Link>
        <nav className={styles.links} aria-label="Main">
          {LINKS.map(([to, label]) => (
            <Link
              key={to}
              to={to}
              aria-current={!to.startsWith('/#') && path.startsWith(to) ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <span className={styles.grow} />
        <a className={styles.github} href={GITHUB_URL} target="_blank" rel="noreferrer">
          <Icon name="github" size={19} />
          <span>GitHub</span>
        </a>
        <Button to="/download" kind="primary" icon="download">
          Download
        </Button>
      </div>
    </header>
  )
}
