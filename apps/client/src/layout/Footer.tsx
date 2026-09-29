import { Link } from '../router'
import { APP_VERSION, GITHUB_URL, ISSUES_URL, LICENSE_URL, RELEASES_URL } from '../site'
import { Lockup } from './Nav'
import styles from './Layout.module.scss'

type Item = [string, string]

const COLUMNS: Array<[string, Item[]]> = [
  [
    'Product',
    [
      ['/#features', 'Features'],
      ['/download', 'Download'],
      ['/changelog', 'Changelog'],
      [RELEASES_URL, 'All releases'],
    ],
  ],
  [
    'Documentation',
    [
      ['/docs/install', 'Getting started'],
      ['/docs/logging', 'Logging incidents'],
      ['/docs/rule-book', 'Rule book'],
      ['/docs/troubleshooting', 'Troubleshooting'],
    ],
  ],
  [
    'Project',
    [
      [GITHUB_URL, 'Source code'],
      [ISSUES_URL, 'Report an issue'],
      [LICENSE_URL, 'GPL-3.0 licence'],
    ],
  ],
]

function FooterLink([to, label]: Item) {
  if (to.startsWith('http')) {
    return (
      <a key={to} href={to} target="_blank" rel="noreferrer">
        {label}
      </a>
    )
  }
  return (
    <Link key={to} to={to}>
      {label}
    </Link>
  )
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Lockup size={18} />
          <p>
            Race control for Le Mans Ultimate stewards. Free, open source, and it runs on your PC.
          </p>
          <span className={styles.version}>Version {APP_VERSION}</span>
        </div>
        {COLUMNS.map(([title, items]) => (
          <div key={title} className={styles.footerColumn}>
            <b>{title}</b>
            {items.map(FooterLink)}
          </div>
        ))}
      </div>
      <p className={styles.disclaimer}>
        StewardPad is an independent project, not affiliated with or endorsed by the developers or
        publishers of Le Mans Ultimate. Le Mans Ultimate is a trademark of its respective owners.
      </p>
    </footer>
  )
}
