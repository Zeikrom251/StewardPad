import type { Snapshot } from '../backend/backend'
import { useLive } from '../backend/LiveProvider'
import styles from './StatusBar.module.scss'

type Link = 'starting' | 'simulator' | 'connected' | 'offline'

const LINK_LABEL: Record<Link, string> = {
  starting: 'Starting…',
  simulator: 'Simulator running',
  connected: 'LMU connected',
  offline: 'LMU offline — retrying',
}

function linkState(live: Snapshot | null): Link {
  if (!live) return 'starting'
  if (!live.session.connected) return 'offline'
  return live.config.adapter === 'mock' ? 'simulator' : 'connected'
}

/** Ambient state strip: data source, incident counts, look-back, steward. */
export function StatusBar() {
  const live = useLive()
  const link = linkState(live)
  const open = live?.incidents.filter((i) => i.status === 'UNDER_INVESTIGATION').length ?? 0
  return (
    <footer className={styles.bar}>
      <span className={styles.item} data-link={link}>
        <i className={styles.dot} />
        {LINK_LABEL[link]}
      </span>
      {live && (
        <>
          <span className={styles.item}>
            {live.incidents.length} incidents
            {open > 0 && <span className={styles.open}>· {open} open</span>}
          </span>
          <span className={styles.spacer} />
          <span className={styles.item}>
            Look-back <b className={styles.value}>{live.config.lookbackSeconds}s</b>
          </span>
          <span className={styles.item}>
            <b className={styles.value}>{live.config.stewardName || 'No steward name set'}</b>
          </span>
        </>
      )}
    </footer>
  )
}
