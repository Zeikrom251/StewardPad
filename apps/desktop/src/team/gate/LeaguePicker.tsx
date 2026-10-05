import type { Me, MyLeague, SubscriptionStatus } from '@stewardpad/shared'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { Avatar } from '../Avatar'
import { ROLE_LABEL } from '../useTeam'
import gate from './Gate.module.scss'
import styles from './LeaguePicker.module.scss'
import { JoinField } from './SideCards'

function LeagueRow({
  league,
  onEnter,
  busy,
}: {
  league: MyLeague
  onEnter: () => void
  busy: boolean
}) {
  const about = league.syncOn
    ? `${ROLE_LABEL[league.role]} · ${String(league.members)} steward${league.members === 1 ? '' : 's'}`
    : `${ROLE_LABEL[league.role]} · the owner’s subscription ended. Local sessions untouched.`
  return (
    <button
      type="button"
      className={styles.league}
      disabled={busy || !league.syncOn}
      onClick={onEnter}
    >
      <Avatar id={league.id} name={league.name} letters={2} size={40} square />
      <span className={ui.grow}>
        <b>{league.name}</b>
        <small>{about}</small>
      </span>
      <span className={styles.state} data-off={league.syncOn ? undefined : ''}>
        {league.syncOn ? 'ACTIVE' : 'ENDED'}
      </span>
      <Icon name="right" size={16} />
    </button>
  )
}

const CREATE: Record<
  Exclude<SubscriptionStatus, 'active'>,
  { title: string; text: string; action: string }
> = {
  none: {
    title: 'Run your own league',
    text: 'Request a subscription to create leagues, invite stewards and stream live timing to them. Requests are checked within 24 to 48 hours.',
    action: 'Request a subscription',
  },
  ended: {
    title: 'Run your own league',
    text: 'Your subscription ended. Request a new one to create leagues again.',
    action: 'Request a subscription',
  },
  pending: {
    title: 'Subscription requested',
    text: 'Creating a league unlocks once it’s accepted. Joining a league with an invite works now.',
    action: 'See the request',
  },
}

function CreateCard({
  status,
  onCreate,
  onSubscribe,
}: {
  status: SubscriptionStatus
  onCreate: () => void
  onSubscribe: () => void
}) {
  const copy =
    status === 'active'
      ? {
          title: 'Create a league',
          text: 'Your subscription includes unlimited leagues. Create one, then invite your stewards. Stewards you invite never pay.',
          action: 'Create a league',
        }
      : CREATE[status]
  return (
    <section className={styles.create} data-pending={status === 'pending' ? '' : undefined}>
      <span className={styles.plus}>
        <Icon
          name={status === 'active' ? 'plus' : status === 'pending' ? 'clock' : 'users'}
          size={18}
        />
      </span>
      <div>
        <b>{copy.title}</b>
        <p>{copy.text}</p>
        <button
          type="button"
          className={cx(ui.btn, status === 'pending' ? ui.ghost : ui.primary)}
          onClick={status === 'active' ? onCreate : onSubscribe}
        >
          {status === 'active' && <Icon name="plus" size={14} />}
          {copy.action}
        </button>
      </div>
    </section>
  )
}

/** Board 04: the steward's leagues, joining one from a link, creating one. */
export function LeaguePicker({
  me,
  leagues,
  entering,
  onEnter,
  onCreate,
  onSubscribe,
}: {
  me: Me
  leagues: MyLeague[]
  entering: boolean
  onEnter: (league: MyLeague) => void
  onCreate: () => void
  onSubscribe: () => void
}) {
  const { showAccount } = useWorkspace()
  return (
    <>
      {leagues.length > 0 && (
        <div className={gate.stack}>
          <span className={gate.label}>Your leagues</span>
          <div className={styles.list}>
            {leagues.map((league) => (
              <LeagueRow
                key={league.id}
                league={league}
                busy={entering}
                onEnter={() => onEnter(league)}
              />
            ))}
          </div>
        </div>
      )}
      <div className={gate.stack}>
        <span className={gate.label}>Join a league</span>
        <JoinField />
      </div>
      <CreateCard status={me.subscriptionStatus} onCreate={onCreate} onSubscribe={onSubscribe} />
      <button type="button" className={styles.solo} onClick={() => showAccount(false)}>
        Continue solo, without a league <Icon name="right" size={14} />
      </button>
    </>
  )
}
