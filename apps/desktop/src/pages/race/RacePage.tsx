import { useLive } from '../../backend/LiveProvider'
import { Inspector } from '../../inspector/Inspector'
import { Icon } from '../../icons'
import { formatHms } from '../../lib/format'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { useDataSource } from '../../workspace/useDataSource'
import { IncidentFeed } from './IncidentFeed'
import { QuickLog } from './QuickLog'
import { Standings } from './Standings'
import styles from './RacePage.module.scss'

/** design/08 — the failure state explains itself; incidents stay fully usable. */
function WaitingForLmu({ lastSeen }: { lastSeen: number }) {
  const switchTo = useDataSource()
  return (
    <section className={styles.offline}>
      <div className={ui.toolbar}>
        <h1>Standings</h1>
        <span className={cx(ui.mono, ui.faint, styles.small)}>No live timing</span>
      </div>
      <div className={styles.empty}>
        <span className={styles.pulse}>
          <Icon name="plug" size={26} />
        </span>
        <h2>Waiting for Le Mans Ultimate</h2>
        <p>
          {lastSeen > 0 ? (
            <>
              StewardPad lost the game at <b className={ui.mono}>{formatHms(lastSeen)}</b> and keeps
              retrying in the background.
            </>
          ) : (
            'StewardPad is looking for the game and keeps retrying in the background.'
          )}{' '}
          Every incident stays editable and exportable meanwhile.
        </p>
        <button type="button" className={ui.btn} onClick={() => switchTo('mock')}>
          <Icon name="radio" size={15} />
          Switch to simulator
        </button>
      </div>
    </section>
  )
}

/** Race control (design/02, 03, 08): timing tower left, quick log + feed or the inspector right. */
export function RacePage() {
  const live = useLive()
  const { openId } = useWorkspace()
  if (!live) return <p className={styles.loading}>Connecting to the backend…</p>
  const open = live.incidents.find((i) => i.id === openId)
  return (
    <>
      {/* The simulator is only "offline" for the second it takes to start. */}
      {live.session.connected || live.config.adapter === 'mock' ? (
        <Standings standings={live.standings} incidents={live.incidents} />
      ) : (
        <WaitingForLmu lastSeen={live.session.elapsedSeconds} />
      )}
      {open ? (
        <Inspector key={open.id} incident={open} />
      ) : (
        <aside className={styles.panel}>
          <QuickLog live={live} />
          <IncidentFeed incidents={live.incidents} />
        </aside>
      )}
    </>
  )
}
