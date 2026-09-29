import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '../icons'
import { Kbd, cx } from './primitives'
import { PickOptions } from './PickOptions'
import type { PickList } from './usePickList'
import ui from './ui.module.scss'
import styles from './PickerDialog.module.scss'

/**
 * A native modal <dialog> to tick several items from a long list (rules, cars): search,
 * All / Selected, and Apply. The browser gives the backdrop, the focus trap and Esc.
 */
export function PickerDialog<T>({
  label,
  placeholder,
  list,
  total,
  summary,
  filters,
  header,
  empty,
  row,
  wide = false,
  onApply,
  onClose,
}: {
  label: string
  placeholder: string
  list: PickList<T>
  total: number
  /** The chosen items, as the footer names them ("3.3.c", "#38"). */
  summary: string[]
  /** Extra filters beside the search (the car classes). */
  filters?: ReactNode
  /** Column titles above the rows. */
  header?: ReactNode
  empty: string
  row: (item: T) => ReactNode
  wide?: boolean
  onApply: () => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    // Guarded: React's dev double-run would call showModal on an open dialog.
    if (dialog.current && !dialog.current.open) dialog.current.showModal()
    dialog.current?.querySelector('input')?.focus()
  }, [])
  const close = () => dialog.current?.close()
  const apply = () => {
    onApply()
    close()
  }
  return (
    <dialog
      ref={dialog}
      className={styles.modal}
      data-size={wide ? 'wide' : undefined}
      aria-label={label}
      onClose={onClose}
      // The dialog box is the backdrop area: its content fills it edge to edge.
      onClick={(e) => e.target === dialog.current && close()}
      onKeyDown={(e) => list.onKeyDown(e, apply)}
    >
      <div className={styles.head}>
        <h2>{label}</h2>
        <span className={ui.grow} />
        <button type="button" className={ui.iconBtn} aria-label="Close (Esc)" onClick={close}>
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className={styles.tools}>
        <label className={cx(ui.field, ui.grow)}>
          <Icon name="search" size={14} className={ui.faint} />
          <input
            value={list.query}
            placeholder={placeholder}
            aria-label={placeholder}
            onChange={(e) => list.search(e.target.value)}
          />
        </label>
        {filters}
        <span className={ui.seg}>
          <button
            type="button"
            aria-pressed={!list.onlyChosen}
            onClick={() => list.showOnlyChosen(false)}
          >
            All<span className={ui.count}>{total}</span>
          </button>
          <button
            type="button"
            aria-pressed={list.onlyChosen}
            onClick={() => list.showOnlyChosen(true)}
          >
            Selected<span className={ui.count}>{summary.length}</span>
          </button>
        </span>
      </div>
      {header}
      <PickOptions list={list} empty={empty} row={row} />
      <div className={styles.foot}>
        <span className={cx(ui.trunc, ui.grow, styles.summary)}>
          {summary.length ? summary.join(', ') : 'Nothing selected'}
        </span>
        <span className={ui.faint}>
          <Kbd>↵</Kbd> tick <Kbd>Ctrl ↵</Kbd> apply
        </span>
        <button type="button" className={cx(ui.btn, ui.sm)} onClick={close}>
          Cancel
        </button>
        <button type="button" className={cx(ui.btn, ui.primary, ui.sm)} onClick={apply}>
          Apply{summary.length > 0 && ` (${summary.length})`}
        </button>
      </div>
    </dialog>
  )
}
