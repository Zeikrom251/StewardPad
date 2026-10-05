import type { LeagueRole, Member } from '@stewardpad/shared'
import { team } from '../../backend/team'
import { Select } from '../../ui/Select'
import { useWorkspace } from '../../workspace/Workspace'
import { ROLE_LABEL, atLeast } from '../../team/useTeam'

export type Action = 'remove' | 'owner' | 'leave'

const RANK: Record<LeagueRole, number> = { STEWARD: 1, HEAD_STEWARD: 2, OWNER: 3 }

/** What `me` may do to `member`: only to roles strictly below their own, never to themselves. */
export function actions(
  me: LeagueRole,
  member: Member,
  mine: boolean,
): Array<{ value: Action; label: string }> {
  if (mine) return member.role === 'OWNER' ? [] : [{ value: 'leave', label: 'Leave the league' }]
  const list: Array<{ value: Action; label: string }> = []
  if (RANK[me] > RANK[member.role] && atLeast(me, 'HEAD_STEWARD'))
    list.push({ value: 'remove', label: 'Remove from the league' })
  if (me === 'OWNER') list.push({ value: 'owner', label: 'Make them the owner' })
  return list
}

export function RoleCell({ me, member, mine }: { me: LeagueRole; member: Member; mine: boolean }) {
  const { report } = useWorkspace()
  const editable = !mine && RANK[me] > RANK[member.role] && atLeast(me, 'HEAD_STEWARD')
  if (!editable) return <b>{ROLE_LABEL[member.role]}</b>
  const options = (['STEWARD', 'HEAD_STEWARD'] as const)
    .filter((role) => RANK[role] < RANK[me])
    .map((role) => ({ value: role, label: ROLE_LABEL[role] }))
  return (
    <Select
      value={member.role}
      options={options}
      label={`Role of ${member.displayName}`}
      onChange={(role) =>
        void team
          .changeRole(member.userId, role)
          .catch((e: unknown) => report('Could not change the role', e))
      }
    />
  )
}
