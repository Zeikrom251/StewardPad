import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useUpdater } from '../../update/UpdaterProvider'
import type { UpdateState } from '../../update/useUpdaterState'
import { Group, Row } from './SettingsGroups'
import styles from './UpdatesGroup.module.scss'

function status(state: UpdateState): string {
  switch (state.kind) {
    case 'idle':
      return 'StewardPad looks for a new version on GitHub each time it starts.'
    case 'checking':
      return 'Looking for a new version…'
    case 'latest':
      return 'You have the latest version.'
    case 'offline':
      return 'Could not reach GitHub. Check the connection and try again.'
    case 'available':
      return `Version ${state.update.version} is out. Your session is saved first, then StewardPad closes for a few seconds while it installs and reopens by itself. Best done between sessions.`
    case 'downloading':
      return `Downloading version ${state.update.version}${state.percent === null ? '…' : ` · ${state.percent}%`}`
    case 'installing':
      return `Installing version ${state.update.version}…`
  }
}

function Action() {
  const { state, checkNow, install } = useUpdater()
  if (state.kind === 'available')
    return (
      <button type="button" className={cx(ui.btn, ui.primary)} onClick={install}>
        <Icon name="download" size={14} />
        Install {state.update.version} and restart
      </button>
    )
  const busy =
    state.kind === 'checking' || state.kind === 'downloading' || state.kind === 'installing'
  return (
    <button type="button" className={ui.btn} onClick={checkNow} disabled={busy}>
      <Icon name="history" size={14} />
      Check for updates
    </button>
  )
}

/** Settings → Updates: the running version, a manual check, and installing a new release. */
export function UpdatesGroup() {
  const { current, state } = useUpdater()
  const notes = 'update' in state ? state.update.body?.trim() : undefined
  return (
    <Group label="Updates">
      <Row label={`StewardPad ${current ?? ''}`.trim()} help={status(state)}>
        <div className={styles.action}>
          <Action />
        </div>
        {notes && <div className={styles.notes}>{notes}</div>}
      </Row>
    </Group>
  )
}
