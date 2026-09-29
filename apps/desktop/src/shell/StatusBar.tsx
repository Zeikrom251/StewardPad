import type { Snapshot } from '../backend/backend'
import { useLive } from '../backend/LiveProvider'
import { Icon } from '../icons'
import { useUpdater } from '../update/UpdaterProvider'
import { Kbd } from '../ui/primitives'
import { useWorkspace } from '../workspace/Workspace'
import styles from './StatusBar.module.scss'

type Link = 'starting' | 'simulator' | 'connected' | 'offline'

const LINK_LABEL: Record<Link, string> = {
  starting: 'Starting…',
  simulator: 'Simulator running',
  connected: 'LMU connected',
  offline: 'LMU offline, retrying',
}

function linkState(live: Snapshot | null): Link {
  if (!live) return 'starting'
  if (!live.session.connected) return 'offline'
  return live.config.adapter === 'mock' ? 'simulator' : 'connected'
}

function KeyHints() {
  return (
    <>
      <span className={styles.divider} />
      <span className={styles.item}>
        <Kbd>Space</Kbd> Log <Kbd>Ctrl K</Kbd> Commands <Kbd>?</Kbd> Shortcuts
      </span>
    </>
  )
}

/** A new release: shown until installed; Settings → Updates installs it when the steward chooses. */
function UpdateItem() {
  const { state } = useUpdater()
  const { go } = useWorkspace()
  if (state.kind !== 'available') return null
  return (
    <button type="button" className={styles.update} onClick={() => go('settings')}>
      <Icon name="download" size={12} />
      Update {state.update.version} available
    </button>
  )
}

/** Ambient state strip: data source, incident counts, look-back, steward, key hints. */
export function StatusBar() {
  const live = useLive()
  const { notice } = useWorkspace()
  const link = linkState(live)
  const open = live?.incidents.filter((i) => i.status === 'UNDER_INVESTIGATION').length ?? 0
  return (
    <footer className={styles.bar}>
      <span className={styles.item} data-link={link}>
        <i className={styles.dot} />
        {LINK_LABEL[link]}
      </span>
      {notice && (
        <span className={styles.notice} role="alert">
          <Icon name="alert" size={12} />
          {notice}
        </span>
      )}
      {live && !notice && (
        <span className={styles.item}>
          {live.incidents.length} {live.incidents.length === 1 ? 'incident' : 'incidents'}
          {open > 0 && <span className={styles.open}>· {open} open</span>}
        </span>
      )}
      <span className={styles.spacer} />
      <UpdateItem />
      {live && (
        <>
          <span className={styles.item}>
            <Icon name="history" size={12} />
            Look-back <b className={styles.value}>{live.config.lookbackSeconds}s</b>
          </span>
          <span className={styles.item}>
            <Icon name="user" size={12} />
            <b className={styles.value}>{live.config.stewardName || 'No steward name set'}</b>
          </span>
        </>
      )}
      <KeyHints />
    </footer>
  )
}
