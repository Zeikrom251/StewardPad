import { Link, useDescription, useTitle } from '../router'
import { RELEASES, type Release } from './entries'
import styles from './Changelog.module.scss'

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

function ReleaseNotes({ release, latest }: { release: Release; latest: boolean }) {
  return (
    <section className={styles.release} id={`v${release.version}`}>
      <div className={styles.meta}>
        <a className={styles.version} href={`#v${release.version}`}>
          v{release.version}
        </a>
        <time dateTime={release.date}>{formatDate(release.date)}</time>
        {latest && <span className={styles.latest}>Latest</span>}
      </div>
      <div className={`${styles.article} ${styles.notes}`}>
        {release.title && <h2>{release.title}</h2>}
        <div dangerouslySetInnerHTML={{ __html: release.html }} />
      </div>
    </section>
  )
}

/** Every release, newest first, from the Markdown files in the repo's changelog folder. */
export function ChangelogPage() {
  useTitle('Changelog')
  useDescription('What changed in each StewardPad release, newest first.')
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Changelog</span>
        <h1>What’s new in StewardPad</h1>
        <p>
          Every release, newest first. <Link to="/download">Download the latest version</Link>.
        </p>
      </header>
      {RELEASES.map((release, i) => (
        <ReleaseNotes key={release.version} release={release} latest={i === 0} />
      ))}
    </div>
  )
}
