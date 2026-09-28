import { Icon, type IconName } from '../icons'
import styles from './Rail.module.scss'

export type Page = 'race' | 'incidents' | 'reports' | 'keys' | 'settings'

const TOP: Array<[Page, IconName, string]> = [
  ['race', 'gauge', 'Race'],
  ['incidents', 'flag', 'Incidents'],
  ['reports', 'file', 'Reports'],
]
const BOTTOM: Array<[Page, IconName, string]> = [
  ['keys', 'keyboard', 'Keys'],
  ['settings', 'sliders', 'Settings'],
]

export function Rail({ active, onNavigate }: { active: Page; onNavigate: (page: Page) => void }) {
  const item = ([page, icon, label]: [Page, IconName, string]) => (
    <button
      key={page}
      type="button"
      className={page === active ? styles.active : styles.item}
      aria-current={page === active ? 'page' : undefined}
      onClick={() => onNavigate(page)}
    >
      <Icon name={icon} size={20} />
      {label}
    </button>
  )
  return (
    <nav className={styles.rail} aria-label="Main">
      {TOP.map(item)}
      <div className={styles.spacer} />
      {BOTTOM.map(item)}
    </nav>
  )
}
