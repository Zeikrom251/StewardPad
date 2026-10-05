import type { Incident } from '@stewardpad/shared'
import { useLive } from '../backend/LiveProvider'
import { Icon } from '../icons'
import { Avatar } from './Avatar'
import styles from './Attribution.module.scss'

const RECENT_MS = 60_000

/**
 * In a league, who logged an incident (board 05), "just now" for a minute, and the flag when
 * two stewards changed the same field and this PC's newer edit was kept.
 */
export function Attribution({ incident }: { incident: Incident }) {
  const live = useLive()
  const view = live?.team
  if (!view?.leagueId) return null
  const member = view.league?.roster.find((m) => m.displayName === incident.loggedBy)
  const mine = live?.account.me?.displayName === incident.loggedBy
  const recent = Date.now() - Date.parse(incident.createdAt) < RECENT_MS
  const name = incident.loggedBy || 'A former steward'
  return (
    <span className={styles.line}>
      <Avatar id={member?.userId ?? name} name={name} size={16} />
      <span>{mine ? 'You' : name}</span>
      {recent && !mine && <span className={styles.recent}>· just now</span>}
      {incident.version === undefined && <span className={styles.local}>· on this PC only</span>}
      {incident.editedTwice && (
        <span className={styles.twice}>
          <Icon name="history" size={12} />
          Edited twice · newer kept
        </span>
      )}
    </span>
  )
}
