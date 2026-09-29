import styles from './Toggle.module.scss'

/** An on/off switch; the label is read out, the track shows the state. */
export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (on: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={styles.toggle}
      onClick={() => onChange(!on)}
    >
      <span />
    </button>
  )
}
