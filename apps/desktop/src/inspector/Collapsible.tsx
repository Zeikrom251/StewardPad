import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons'
import { cx } from '../ui/primitives'
import ui from '../ui/ui.module.scss'
import { useDisplay } from '../workspace/useDisplay'
import styles from './Inspector.module.scss'

/**
 * An inspector section whose header folds it. Which sections stay folded is a display
 * preference, so the choice follows the steward to every incident and across restarts.
 */
export function Collapsible({
  id,
  icon,
  title,
  aside,
  summary,
  className,
  children,
}: {
  id: string
  icon?: IconName
  title: string
  /** Right of the title: an audience tag or an action. */
  aside?: ReactNode
  /** Shown next to the title while folded, e.g. "2 cars". */
  summary?: string
  className?: string
  children: ReactNode
}) {
  const { prefs, update } = useDisplay()
  const folded = prefs.collapsedSections.includes(id)
  const toggle = () =>
    update({
      collapsedSections: folded
        ? prefs.collapsedSections.filter((s) => s !== id)
        : [...prefs.collapsedSections, id],
    })
  return (
    <section className={cx(styles.section, className)} data-folded={folded || undefined}>
      <div className={styles.sectionHead}>
        <button type="button" className={styles.fold} aria-expanded={!folded} onClick={toggle}>
          <Icon name="down" size={13} className={styles.chevron} />
          <span className={ui.label}>
            {icon && <Icon name={icon} size={13} />}
            {title}
          </span>
          {folded && summary && <span className={styles.summary}>{summary}</span>}
        </button>
        {aside}
      </div>
      {!folded && children}
    </section>
  )
}
