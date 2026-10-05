import { useLive } from '../backend/LiveProvider'
import { useWorkspace } from '../workspace/Workspace'
import { Avatar } from '../team/Avatar'
import styles from './TitleBar.module.scss'

/** Title bar, right: this PC's stream, the league and who is here (board 05). Opens Team. */
export function TeamPresence() {
  const view = useLive()?.team
  const { go } = useWorkspace()
  if (!view?.leagueId) return null
  const roster = view.league?.roster ?? []
  const here = roster.filter((m) => view.online.includes(m.userId))
  const watching = Math.max(view.online.length - 1, 0)
  return (
    <>
      {view.streaming && (
        <button type="button" className={styles.streaming} onClick={() => go('team')}>
          <i />
          Streaming · {watching}
        </button>
      )}
      <button type="button" className={styles.league} onClick={() => go('team')} title="Team">
        <i data-live={view.connection === 'live' ? '' : undefined} />
        <span className={styles.leagueName}>{view.leagueName}</span>
        <span className={styles.faces}>
          {here.slice(0, 4).map((m) => (
            <Avatar key={m.userId} id={m.userId} name={m.displayName} size={24} />
          ))}
        </span>
      </button>
    </>
  )
}
