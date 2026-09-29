import type { KeyboardEvent, ReactNode } from 'react'
import { Icon } from '../icons'
import { cx } from './primitives'
import styles from './Select.module.scss'
import { optionButtons, usePopoverList } from './usePopoverList'

export interface SelectOption<T> {
  value: T
  label: ReactNode
}

function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
  const items = optionButtons(e.currentTarget)
  const at = items.findIndex((item) => item === document.activeElement)
  const steps: Record<string, number> = {
    ArrowDown: at + 1,
    ArrowUp: at - 1,
    Home: 0,
    End: items.length - 1,
  }
  const next = steps[e.key]
  if (next === undefined) return
  e.preventDefault()
  items[Math.min(Math.max(next, 0), items.length - 1)]?.focus()
}

/**
 * The app's dropdown. A native <select> opens the OS menu, which WebKitGTK and WebView2
 * draw in their own (light) style; this list is ours.
 *
 * `value` shows the chosen option on a field-style button. `trigger` instead gives the
 * button a fixed face (a "+ Add car" menu, the look-back pill) and marks no option.
 */
export function Select<T extends string | number>({
  value,
  options: choices,
  onChange,
  label,
  trigger,
  className,
}: {
  value?: T
  options: Array<SelectOption<T>>
  onChange: (value: T) => void
  label: string
  trigger?: ReactNode
  className?: string
}) {
  const { button, list, open, show } = usePopoverList(() => button.current?.focus())
  const selected = choices.findIndex((o) => o.value === value)
  const pick = (next: T) => {
    list.current?.hidePopover()
    onChange(next)
  }
  return (
    <>
      <button
        ref={button}
        type="button"
        className={cx(trigger ? undefined : styles.field, className)}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => show(selected)}
      >
        {trigger ?? (
          <>
            <span className={styles.value}>{choices[selected]?.label}</span>
            <Icon name="down" size={14} />
          </>
        )}
      </button>
      <div
        ref={list}
        popover="auto"
        role="listbox"
        aria-label={label}
        className={styles.list}
        onKeyDown={moveFocus}
      >
        {choices.map((option, i) => (
          <button
            key={String(option.value)}
            type="button"
            role="option"
            aria-selected={i === selected}
            onClick={() => pick(option.value)}
          >
            <span className={styles.value}>{option.label}</span>
            {i === selected && <Icon name="check" size={13} strokeWidth={2.2} />}
          </button>
        ))}
        {choices.length === 0 && <span className={styles.empty}>Nothing to choose</span>}
      </div>
    </>
  )
}
