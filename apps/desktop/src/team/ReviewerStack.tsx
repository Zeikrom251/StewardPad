import { Avatar } from './Avatar'
import styles from './ReviewerStack.module.scss'

/** The stewards on an incident as overlapping initials, three at most, then "+N". */
export function ReviewerStack({ names, size = 18 }: { names: string[]; size?: number }) {
  if (names.length === 0) return null
  const shown = names.slice(0, 3)
  const label = `Claimed by ${names.join(', ')}`
  return (
    <span className={styles.stack} title={label} role="img" aria-label={label}>
      {shown.map((name) => (
        <Avatar key={name} id={name} name={name} size={size} />
      ))}
      {names.length > shown.length && (
        <span className={styles.more}>+{names.length - shown.length}</span>
      )}
    </span>
  )
}
