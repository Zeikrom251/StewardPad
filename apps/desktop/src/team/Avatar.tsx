import { cx } from '../ui/primitives'
import styles from './Avatar.module.scss'

/** The same tint for the same id, every time. */
function hue(id: string): string {
  let sum = 0
  for (const char of id) sum = (sum * 31 + char.charCodeAt(0)) % 6
  return String(sum)
}

/** "Apex Endurance League" → "AE"; a person keeps one letter. */
export function initials(name: string, letters = 1): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const picked = letters === 1 ? words.slice(0, 1) : words.slice(0, letters)
  return picked.map((word) => word.charAt(0).toUpperCase()).join('') || '?'
}

export type Presence = 'online' | 'offline' | 'live'

/**
 * An initial on a tint. Never the Discord avatar image: the app loads nothing from Discord,
 * so a steward's IP reaches no third party just because a teammate opened the Team page.
 */
export function Avatar({
  id,
  name,
  size = 24,
  letters = 1,
  presence,
  square,
}: {
  id: string
  name: string
  size?: number
  letters?: number
  presence?: Presence
  square?: boolean
}) {
  return (
    <span
      className={cx(styles.avatar, square && styles.square)}
      data-hue={hue(id)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {initials(name, letters)}
      {presence && <i className={styles.dot} data-presence={presence} />}
    </span>
  )
}
