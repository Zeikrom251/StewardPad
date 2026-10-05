import type { Me, TeamView } from '@stewardpad/shared'
import { team } from '../../backend/team'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { ConfirmButton } from '../../team/ConfirmButton'
import { syncState } from '../../team/syncState'
import page from './TeamPage.module.scss'

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** The owner's subscription: the league syncs while it runs. */
export function SubscriptionCard({ me }: { me: Me }) {
  const { go } = useWorkspace()
  const active = me.subscriptionStatus === 'active'
  return (
    <section className={page.card}>
      <div className={page.cardHead}>
        <span className={page.eyebrow}>Your subscription</span>
        <span className={ui.grow} />
        <span className={page.chip} data-tone={active ? undefined : 'muted'}>
          {active ? 'ACTIVE' : 'ENDED'}
        </span>
      </div>
      <p>
        {active && me.subscriptionEndsAt
          ? `Runs until ${day(me.subscriptionEndsAt)}`
          : active
            ? 'Runs until revoked'
            : 'Ended: the league is read-only'}
        {' · this league runs on it'}
      </p>
      <button type="button" className={ui.btn} onClick={() => go('settings')}>
        <Icon name="card" size={14} />
        Manage in Settings → Account
      </button>
    </section>
  )
}

/** This PC's side of the sync: what it holds, and leaving the league's session. */
export function ThisPcCard({ view }: { view: TeamView }) {
  const { report } = useWorkspace()
  const state = syncState(view)
  return (
    <section className={page.card}>
      <span className={page.eyebrow}>This PC</span>
      {state && (
        <span className={cx(page.status)} data-on={state.tone === 'good' ? '' : undefined}>
          <Icon name={state.icon} size={15} />
          <b>{state.text}</b>
        </span>
      )}
      <p>Every incident is saved on this PC too, so nothing is lost if the connection drops.</p>
      <ConfirmButton
        question="Stop syncing here?"
        confirm="Stop syncing"
        onConfirm={() =>
          void team.leaveLink().catch((e: unknown) => report('Could not stop syncing', e))
        }
      >
        <Icon name="cloudOff" size={14} />
        Stop syncing on this PC
      </ConfirmButton>
      {view.pending > 0 && (
        <p>
          {view.pending} change{view.pending === 1 ? '' : 's'} not sent yet would stay on this PC
          only.
        </p>
      )}
    </section>
  )
}
