import { useLive } from '../../backend/LiveProvider'
import { account as accountApi, team } from '../../backend/team'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { Avatar } from '../../team/Avatar'
import { ConfirmButton } from '../../team/ConfirmButton'
import { ROLE_LABEL, atLeast } from '../../team/useTeam'
import { InviteCard } from './InviteCard'
import { SessionCard } from './SessionCard'
import { SubscriptionCard, ThisPcCard } from './SideCards'
import { StewardsCard } from './StewardsCard'
import { StreamCard } from './StreamCard'
import page from './TeamPage.module.scss'

/** Not in a league on this PC: signing in, or picking one. */
function NotLinked({ signedIn }: { signedIn: boolean }) {
  const { showAccount } = useWorkspace()
  return (
    <div className={page.empty}>
      <Icon name="users" size={32} />
      <h1>Steward with your league</h1>
      <p>
        Share incidents with the other stewards as you log them, follow one PC’s live timing, and
        decide together. Everything also stays on this PC.
      </p>
      <button
        type="button"
        className={cx(ui.btn, ui.primary, ui.lg)}
        onClick={() => (signedIn ? showAccount(true) : void accountApi.signIn())}
      >
        {signedIn ? 'Choose a league' : 'Sign in with Discord'}
      </button>
    </div>
  )
}

/** Board 06: the league, its stewards, invites, the session and the live stream. */
export function TeamPage() {
  const live = useLive()
  const { report } = useWorkspace()
  if (!live) return null
  const { team: view, account } = live
  const me = account.me
  const league = view.league
  if (!view.leagueId || !me) return <NotLinked signedIn={Boolean(me)} />
  const role = league?.role
  return (
    <div className={page.page}>
      <div className={page.inner}>
        <header className={page.header}>
          <Avatar id={view.leagueId} name={view.leagueName ?? ''} letters={2} size={52} square />
          <div>
            <h1>{view.leagueName}</h1>
            <p>
              {role
                ? `You’re ${role === 'OWNER' ? 'the owner' : `a ${ROLE_LABEL[role].toLowerCase()}`}`
                : 'Connecting…'}
            </p>
          </div>
          <span className={ui.grow} />
          {role === 'OWNER' ? (
            <ConfirmButton
              question="Delete the league, its sessions and incidents on the server?"
              confirm="Delete the league"
              onConfirm={() =>
                void team
                  .deleteLeague()
                  .catch((e: unknown) => report('Could not delete the league', e))
              }
            >
              <Icon name="trash" size={14} />
              Delete the league
            </ConfirmButton>
          ) : (
            <ConfirmButton
              question="Leave the league?"
              confirm="Leave"
              onConfirm={() =>
                void team
                  .removeMember(me.id)
                  .catch((e: unknown) => report('Could not leave the league', e))
              }
            >
              <Icon name="logout" size={14} />
              Leave the league
            </ConfirmButton>
          )}
        </header>
        <div className={page.column}>
          {league && <StewardsCard view={view} league={league} myId={me.id} />}
          {role && atLeast(role, 'HEAD_STEWARD') && <InviteCard myRole={role} />}
          <SessionCard view={view} />
        </div>
        <div className={page.column}>
          <StreamCard view={view} />
          {role === 'OWNER' && <SubscriptionCard me={me} />}
          <ThisPcCard view={view} />
        </div>
      </div>
    </div>
  )
}
