import type { Incident } from '@stewardpad/shared'
import { backend } from '../backend/backend'
import { Icon } from '../icons'
import { ReviewerStack } from '../team/ReviewerStack'
import { useMyName } from '../team/useMyName'
import { cx } from '../ui/primitives'
import ui from '../ui/ui.module.scss'
import { useWorkspace } from '../workspace/Workspace'
import styles from './Inspector.module.scss'

/**
 * Who is on this incident: claimed, or by editing it. Claim says "I'm on it" to the other
 * stewards; Unclaim takes only this steward's name off.
 */
export function ClaimRow({ incident }: { incident: Incident }) {
  const me = useMyName()
  const { report } = useWorkspace()
  const mine = Boolean(me) && incident.reviewers.includes(me)
  const toggle = () => {
    const change = mine ? backend.unclaimIncident : backend.claimIncident
    change(incident.id).catch((error: unknown) =>
      report(mine ? 'Could not unclaim the incident' : 'Could not claim the incident', error),
    )
  }
  const names = incident.reviewers.map((name) => (name === me ? 'You' : name)).join(', ')
  return (
    <div className={styles.claims}>
      <span className={styles.key}>Claimed by</span>
      {incident.reviewers.length > 0 ? (
        <span className={styles.claimers}>
          <ReviewerStack names={incident.reviewers} />
          <span className={ui.trunc}>{names}</span>
        </span>
      ) : (
        <span className={cx(ui.faint, ui.grow)}>
          {me ? 'Nobody yet' : 'Set your name in Settings to claim incidents'}
        </span>
      )}
      <button
        type="button"
        className={cx(ui.btn, ui.sm, !mine && ui.primary)}
        disabled={!me}
        onClick={toggle}
      >
        <Icon name={mine ? 'x' : 'user'} size={14} />
        {mine ? 'Unclaim' : 'Claim'}
      </button>
    </div>
  )
}
