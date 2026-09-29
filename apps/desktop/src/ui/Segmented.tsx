import { cx } from './primitives'
import ui from './ui.module.scss'
import styles from './Toggle.module.scss'

/** A few exclusive choices side by side (density, text size, hold time). */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<[T, string]>
  onChange: (v: T) => void
}) {
  return (
    <span className={cx(ui.seg, styles.segmented)}>
      {options.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </span>
  )
}
