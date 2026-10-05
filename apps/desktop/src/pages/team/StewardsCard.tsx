import type { LeagueView, Member, TeamView } from '@stewardpad/shared'
import { team } from '../../backend/team'
import { Icon } from '../../icons'
import { Select } from '../../ui/Select'
import { actions, RoleCell, type Action } from './MemberControls'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { Avatar, type Presence } from '../../team/Avatar'
import styles from './Stewards.module.scss'
import page from './TeamPage.module.scss'

function presenceOf(view: TeamView, member: Member): Presence {
  if (view.stream?.streamer.id === member.userId) return 'live'
  return view.online.includes(member.userId) ? 'online' : 'offline'
}

const NOW: Record<Presence, string> = { live: 'Streaming', online: 'Online', offline: 'Offline' }

function MemberRow({
  view,
  league,
  member,
  myId,
}: {
  view: TeamView
  league: LeagueView
  member: Member
  myId: string
}) {
  const { report } = useWorkspace()
  const mine = member.userId === myId
  const presence = presenceOf(view, member)
  const menu = actions(league.role, member, mine)
  const act = (action: Action) => {
    const work =
      action === 'owner' ? team.handOver(member.userId) : team.removeMember(member.userId)
    work.catch((e: unknown) => report('That didn’t go through', e))
  }
  return (
    <tr>
      <td>
        <span className={styles.who}>
          <Avatar id={member.userId} name={member.displayName} size={34} presence={presence} />
          <span>
            <b>{member.displayName}</b>
            <small>
              @{member.discordUsername}
              {mine && ' · you'}
            </small>
          </span>
        </span>
      </td>
      <td className={styles.role}>
        <RoleCell me={league.role} member={member} mine={mine} />
      </td>
      <td className={styles.now} data-state={presence}>
        {NOW[presence]}
      </td>
      <td className={styles.menu}>
        {menu.length > 0 && (
          <Select
            options={menu}
            onChange={act}
            label={`Actions for ${member.displayName}`}
            trigger={
              <span className={cx(ui.iconBtn)}>
                <Icon name="dots" size={16} />
              </span>
            }
          />
        )}
      </td>
    </tr>
  )
}

/** Board 06: who is in the league, their role, who is here now. */
export function StewardsCard({
  view,
  league,
  myId,
}: {
  view: TeamView
  league: LeagueView
  myId: string
}) {
  return (
    <section className={page.card}>
      <div className={page.cardHead}>
        <h2>Stewards</h2>
        <span className={ui.grow} />
        <span className={ui.faint}>
          {view.online.length} online · {league.roster.length} stewards
        </span>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Steward</th>
            <th>Role</th>
            <th>Now</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {league.roster.map((member) => (
            <MemberRow
              key={member.userId}
              view={view}
              league={league}
              member={member}
              myId={myId}
            />
          ))}
        </tbody>
      </table>
    </section>
  )
}
