import type { Me, SubscriptionStatus } from '@stewardpad/shared'
import { account } from '../../backend/team'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { Avatar } from '../Avatar'
import styles from './AccountHome.module.scss'

const STATUS: Record<SubscriptionStatus, string> = {
  none: 'No subscription',
  pending: 'Subscription requested',
  active: 'Subscription active',
  ended: 'Subscription ended',
}

export function AccountHeader({ me }: { me: Me }) {
  return (
    <header className={styles.header}>
      <Avatar id={me.id} name={me.displayName} size={44} />
      <div>
        <h1>Signed in as {me.displayName}</h1>
        <p>
          @{me.discordUsername} on Discord ·{' '}
          <b data-status={me.subscriptionStatus}>{STATUS[me.subscriptionStatus]}</b>
        </p>
      </div>
      <span className={ui.grow} />
      <button type="button" className={cx(ui.btn, ui.ghost)} onClick={() => void account.signOut()}>
        <Icon name="logout" size={15} />
        Sign out
      </button>
    </header>
  )
}
