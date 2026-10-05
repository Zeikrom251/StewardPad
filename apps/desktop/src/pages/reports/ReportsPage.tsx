import { useState } from 'react'
import type { CsvDelimiter, Incident } from '@stewardpad/shared'
import { useLive } from '../../backend/LiveProvider'
import { Icon } from '../../icons'
import { STATUS, STATUS_ORDER } from '../../lib/labels'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { ClearAll } from '../incidents/ClearAll'
import { FolderField } from '../settings/FolderField'
import { ExportCards } from './ExportCards'
import { TeamSession } from './TeamSession'
import { DelimiterSwitch, subtitle } from './ReportParts'
import styles from './ReportsPage.module.scss'

function StatusTiles({ incidents }: { incidents: Incident[] }) {
  return (
    <div className={styles.tiles}>
      {STATUS_ORDER.map((s) => (
        <div key={s} className={cx(ui.card, styles.tile)} data-status={s}>
          <span>
            <Icon name={STATUS[s].icon} size={14} strokeWidth={2} />
            {STATUS[s].label}
          </span>
          <b>{incidents.filter((i) => i.status === s).length}</b>
        </div>
      ))}
    </div>
  )
}

function ArchiveCard({ count }: { count: number }) {
  return (
    <div className={cx(ui.card, styles.archive)}>
      <span className={styles.cardIcon}>
        <Icon name="archive" size={18} />
      </span>
      <span className={styles.cardTitle}>
        <b>Session archive</b>
        <span>
          Clearing the list always writes a snapshot of every incident, merged ones included, to
          this folder first.
        </span>
      </span>
      <FolderField setting="archiveDir" compact />
      <ClearAll count={count} />
    </div>
  )
}

/** design/05 — exports as destinations: what each file holds, then a native Save dialog. */
export function ReportsPage() {
  const live = useLive()
  const [delimiter, setDelimiter] = useState<CsvDelimiter>('semicolon')
  if (!live) return null
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.title}>
            <h1>Reports</h1>
            <span className={ui.muted}>{subtitle(live)}</span>
          </div>
          <span className={ui.grow} />
          <span className={ui.label}>CSV delimiter</span>
          <DelimiterSwitch value={delimiter} onChange={setDelimiter} />
        </div>
        <StatusTiles incidents={live.incidents} />
        <ExportCards live={live} delimiter={delimiter} />
        {live.team.leagueId ? (
          <div className={ui.warnbox}>
            <Icon name="cloud" size={16} />
            <span>
              This session syncs with <b>{live.team.leagueName}</b>: every steward already has every
              incident, so there are no session files to exchange.
            </span>
          </div>
        ) : (
          <TeamSession />
        )}
        <div className={ui.warnbox}>
          <Icon name="alert" size={16} />
          <span>
            Penalties recorded here are <b>not applied in-game</b>. Tell the drivers: they serve
            them themselves.
          </span>
        </div>
        <ArchiveCard count={live.incidents.length} />
      </div>
    </div>
  )
}
