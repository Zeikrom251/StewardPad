import { useLive } from '../backend/LiveProvider'
import { Icon, type IconName } from '../icons'
import { useWorkspace, type Page } from '../workspace/Workspace'
import styles from './Rail.module.scss'

const TOP: Array<[Page, IconName, string]> = [
  ['race', 'gauge', 'Race'],
  ['incidents', 'flag', 'Incidents'],
  ['review', 'queue', 'Review'],
  ['rules', 'book', 'Rules'],
  ['reports', 'file', 'Reports'],
  ['announce', 'radio', 'Discord'],
]
const BOTTOM: Array<[Page, IconName, string]> = [
  ['keys', 'keyboard', 'Keys'],
  ['settings', 'sliders', 'Settings'],
]

/** Left navigation. The Incidents badge counts what is still under investigation. */
export function Rail() {
  const { page: active, go } = useWorkspace()
  const open = useLive()?.incidents.filter((i) => i.status === 'UNDER_INVESTIGATION').length ?? 0
  const item = ([page, icon, label]: [Page, IconName, string]) => (
    <button
      key={page}
      type="button"
      className={page === active ? styles.active : styles.item}
      aria-current={page === active ? 'page' : undefined}
      onClick={() => go(page)}
    >
      <Icon name={icon} size={20} />
      {label}
      {page === 'incidents' && open > 0 && (
        <span className={styles.badge} aria-label={`${open} under investigation`}>
          {open}
        </span>
      )}
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
