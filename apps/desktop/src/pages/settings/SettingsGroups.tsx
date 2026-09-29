import type { ReactNode } from 'react'
import type { Snapshot } from '../../backend/backend'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useDataSource } from '../../workspace/useDataSource'
import { FolderField } from './FolderField'
import styles from './SettingsPage.module.scss'

export function Row({
  label,
  help,
  children,
}: {
  label: string
  help: string
  children: ReactNode
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>
        <b>{label}</b>
        <span>{help}</span>
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  )
}

export function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <span className={ui.label}>{label}</span>
      <div className={cx(ui.card, styles.rows)}>{children}</div>
    </div>
  )
}

function linkState({ session, config, standings }: Snapshot): string {
  if (!session.connected)
    return config.adapter === 'mock' ? 'Starting…' : 'Waiting for the game, retrying'
  const where = session.trackName ? ` · ${session.trackName}` : ''
  return `${config.adapter === 'mock' ? 'Running' : 'Connected'} · ${standings.length} cars${where}`
}

/** design/06 — the source switch, live status underneath. Switching takes effect at once. */
function DataSource({ live }: { live: Snapshot }) {
  const switchTo = useDataSource()
  const adapter = live.config.adapter
  return (
    <>
      <span className={cx(ui.seg, styles.source)}>
        <button type="button" aria-pressed={adapter === 'rest'} onClick={() => switchTo('rest')}>
          <Icon name="plug" size={14} />
          Le Mans Ultimate
        </button>
        <button type="button" aria-pressed={adapter === 'mock'} onClick={() => switchTo('mock')}>
          <Icon name="radio" size={14} className={styles.simIcon} />
          Simulator
        </button>
      </span>
      <span className={styles.inline}>
        <i className={live.session.connected ? styles.dot : styles.dotOff} />
        {linkState(live)}
      </span>
      <span className={cx(ui.faint, styles.inline)}>
        Switching keeps your incidents. Use Clear all first if you want a fresh list.
      </span>
    </>
  )
}

export function StorageGroup() {
  return (
    <Group label="Storage">
      <Row
        label="Session file"
        help="Written 500 ms after every change, atomically. Survives a crash."
      >
        <span className={cx(ui.field, ui.faint, styles.path)}>
          %APPDATA%\com.emeraldstudio.stewardpad\current-session.json
        </span>
      </Row>
      <Row
        label="Export folder"
        help="Where every Save dialog opens: reports, the decisions document, session files. Empty resets to StewardPad's own folder."
      >
        <FolderField setting="exportDir" />
      </Row>
      <Row
        label="Archive folder"
        help="Where Clear all writes its snapshot before emptying the list."
      >
        <FolderField setting="archiveDir" />
      </Row>
    </Group>
  )
}

export function SourceGroup({ live }: { live: Snapshot }) {
  return (
    <Group label="Data source">
      <Row
        label="Source"
        help="Read the live game, or let the simulator invent a field so you can train and demo without it."
      >
        <DataSource live={live} />
      </Row>
    </Group>
  )
}
