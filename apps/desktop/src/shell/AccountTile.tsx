import { useLive } from '../backend/LiveProvider'
import { account } from '../backend/team'
import { Icon } from '../icons'
import { useWorkspace } from '../workspace/Workspace'
import { Avatar, type Presence } from '../team/Avatar'
import styles from './Rail.module.scss'

/** Bottom of the rail (board 07 → rail): signed out, signed in, offline or streaming. */
export function AccountTile() {
  const live = useLive()
  const { go, report } = useWorkspace()
  const me = live?.account.me
  if (!live || !me) {
    const signIn = () =>
      void account.signIn().catch((e: unknown) => report('Could not start signing in', e))
    return (
      <button type="button" className={styles.item} onClick={signIn}>
        <Icon name="user" size={20} />
        Sign in
      </button>
    )
  }
  const offline = live.account.status === 'offline' || live.team.connection === 'offline'
  const presence: Presence = live.team.streaming ? 'live' : offline ? 'offline' : 'online'
  return (
    <button
      type="button"
      className={styles.item}
      onClick={() => go('settings')}
      title={`Signed in as ${me.displayName}`}
    >
      <Avatar id={me.id} name={me.displayName} size={26} presence={presence} />
      <span className={styles.name}>{me.displayName.split(/\s+/)[0]}</span>
    </button>
  )
}
