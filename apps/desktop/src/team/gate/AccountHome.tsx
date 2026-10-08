import { useState } from 'react'
import type { Me, MyLeague } from '@stewardpad/shared'
import { account, team } from '../../backend/team'
import { useWorkspace } from '../../workspace/Workspace'
import { useAction, useLeagues } from '../useTeam'
import { AccountHeader } from './AccountHeader'
import styles from './AccountHome.module.scss'
import { CreateLeague } from './CreateLeague'
import gate from './Gate.module.scss'
import { LeaguePicker } from './LeaguePicker'
import { RequestSent } from './RequestSent'
import { FreeAppCard, InvitedCard } from './SideCards'
import { Subscribe } from './Subscribe'
import { useSubscription } from './useSubscription'

/** Boards 03b and 03c: requesting a subscription, beside joining with an invite. */
function SubscribeView({ me, onBack }: { me: Me; onBack: (() => void) | null }) {
  const { view, reload } = useSubscription()
  const request = view?.request
  const waiting = request && (request.status === 'pending' || request.status === 'declined')
  const changed = () => {
    reload()
    void account.refresh()
  }
  return (
    <div className={styles.split}>
      <AccountHeader me={me} />
      {waiting ? (
        <RequestSent request={request} howToPay={view.howToPay} onChange={changed} />
      ) : (
        <Subscribe howToPay={view?.howToPay ?? null} onSent={changed} />
      )}
      <div className={styles.side}>
        <InvitedCard />
        <FreeAppCard emphasis={Boolean(waiting)} />
        {onBack && (
          <button type="button" className={gate.note} onClick={onBack}>
            ← Back to your leagues
          </button>
        )}
      </div>
    </div>
  )
}

/** The account's home: the leagues (board 04), or the subscription when there are none. */
export function AccountHome({ me }: { me: Me }) {
  const { showAccount, go } = useWorkspace()
  const { leagues, error } = useLeagues()
  const [subscribing, setSubscribing] = useState(false)
  const [creating, setCreating] = useState(false)
  const entering = useAction()
  const enter = (league: MyLeague) =>
    void entering.run(async () => {
      await team.enter(league.id)
      showAccount(false)
      go('race')
    })
  if (!leagues)
    return <div className={gate.page}>{error && <p className={gate.error}>{error}</p>}</div>
  const pickLeague = leagues.length > 0 || me.subscriptionStatus === 'active'
  if (subscribing || !pickLeague) {
    return (
      <div className={gate.page}>
        <SubscribeView me={me} onBack={pickLeague ? () => setSubscribing(false) : null} />
      </div>
    )
  }
  return (
    <div className={gate.page}>
      <div className={styles.single}>
        <AccountHeader me={me} />
        <LeaguePicker
          me={me}
          leagues={leagues}
          entering={entering.pending}
          onEnter={enter}
          onCreate={() => setCreating(true)}
          onSubscribe={() => setSubscribing(true)}
        />
        {entering.error && <p className={gate.error}>{entering.error}</p>}
      </div>
      {creating && (
        <CreateLeague
          onCreated={(league) => {
            setCreating(false)
            enter(league)
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  )
}
