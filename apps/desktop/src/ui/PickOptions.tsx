import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '../icons'
import type { PickList } from './usePickList'
import ui from './ui.module.scss'
import styles from './PickerDialog.module.scss'

/** The matching items as ticked rows; the highlighted one scrolls into view. */
export function PickOptions<T>({
  list,
  empty,
  row,
}: {
  list: PickList<T>
  empty: string
  row: (item: T) => ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' })
  }, [list.active])
  if (list.shown.length === 0) return <p className={styles.none}>{empty}</p>
  return (
    <div ref={box} className={styles.list} role="listbox" aria-multiselectable>
      {list.shown.map((item, i) => {
        const key = list.keyOf(item)
        const picked = list.chosen.includes(key)
        return (
          <button
            key={key}
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={picked}
            data-active={i === list.active || undefined}
            // Focus stays in the search field, so ↑ ↓ and Enter keep working after a click.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => list.toggle(key)}
            onMouseMove={() => list.setActive(i)}
          >
            <span className={ui.check} aria-checked={picked}>
              {picked && <Icon name="check" size={11} strokeWidth={3} />}
            </span>
            {row(item)}
          </button>
        )
      })}
    </div>
  )
}
