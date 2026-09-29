import type { Snapshot } from '../../backend/backend'
import { Icon } from '../../icons'
import { formatHms } from '../../lib/format'
import { ClassTag, Kbd, Plate, cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { useIncidentActions } from '../../workspace/useIncidentActions'
import { LookbackPill } from './LookbackPill'
import styles from './QuickLog.module.scss'

function SelectedCars({ live }: { live: Snapshot }) {
  const { selection, toggleCar } = useWorkspace()
  const entries = selection.flatMap((id) => live.standings.filter((s) => s.slotId === id))
  if (entries.length === 0) {
    return (
      <div className={styles.hint}>
        <Icon name="flag" size={18} />
        <span>
          Click standings rows or press <b className={ui.mono}>1–9</b> to pick cars.{' '}
          <b className={ui.mono}>Space</b> logs with or without a selection.
        </span>
      </div>
    )
  }
  return entries.map((entry, i) => (
    <div key={entry.slotId} className={styles.car}>
      <span className={styles.order}>{i + 1}</span>
      <Plate number={entry.carNumber} carClass={entry.carClass} />
      <span className={styles.who}>
        <b className={ui.trunc}>{entry.driverName}</b>
        <span className={ui.trunc}>
          {entry.teamName} · P{entry.position}
        </span>
      </span>
      <ClassTag carClass={entry.carClass} />
      <button
        type="button"
        className={ui.iconBtn}
        aria-label={`Remove #${entry.carNumber}`}
        onClick={() => toggleCar(entry.slotId)}
      >
        <Icon name="x" size={15} />
      </button>
    </div>
  ))
}

/** What Space will stamp, shown before it's pressed — the look-back made visible. */
function StampPreview({ live }: { live: Snapshot }) {
  const { selection } = useWorkspace()
  const lookback = live.config.lookbackSeconds
  const first = live.standings.find((s) => s.slotId === selection[0]) ?? live.standings[0]
  return (
    <div className={styles.stamp}>
      <Icon name="clock" size={13} />
      <span className={ui.muted}>Stamps at</span>
      <b className={ui.mono}>{formatHms(live.session.elapsedSeconds - lookback)}</b>
      {first && <span className={cx(ui.mono, ui.muted)}>· Lap {first.lapsCompleted}</span>}
      <span className={ui.grow} />
      <span className={cx(ui.mono, ui.faint)}>now − {lookback}s</span>
    </div>
  )
}

function OfflineActions({ live }: { live: Snapshot }) {
  const { logMissed } = useIncidentActions()
  const lastKnown = formatHms(live.session.elapsedSeconds - live.config.lookbackSeconds)
  return (
    <>
      <div className={ui.warnbox}>
        <Icon name="alert" size={16} />
        <span>
          No live clock. Space would stamp the <b>last known</b> time ({lastKnown}). Log it as a
          missed incident and type the time instead.
        </span>
      </div>
      <button type="button" className={cx(ui.btn, ui.primary, ui.lg, ui.block)} onClick={logMissed}>
        <Icon name="plus" size={16} strokeWidth={2} />
        Log a missed incident…
      </button>
    </>
  )
}

function LiveActions({ live }: { live: Snapshot }) {
  const { selection, clearSelection } = useWorkspace()
  const { quickLog, logMissed } = useIncidentActions()
  const numbers = selection.flatMap((id) =>
    live.standings.filter((s) => s.slotId === id).map((s) => `#${s.carNumber}`),
  )
  return (
    <>
      <SelectedCars live={live} />
      <StampPreview live={live} />
      <button type="button" className={cx(ui.btn, ui.primary, ui.lg, ui.block)} onClick={quickLog}>
        <Icon name="flag" size={16} strokeWidth={2} />
        Log incident
        {numbers.length > 0 && <span className={styles.vs}>{numbers.join(' vs ')}</span>}
        <Kbd>Space</Kbd>
      </button>
      <div className={styles.foot}>
        <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={logMissed}>
          <Icon name="plus" size={15} />
          Log a missed incident…
        </button>
        <span className={ui.grow} />
        {selection.length > 0 && (
          <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={clearSelection}>
            Clear <Kbd>Esc</Kbd>
          </button>
        )}
      </div>
    </>
  )
}

/** Docked quick-log panel: selection, stamp preview, and the one big button. */
export function QuickLog({ live }: { live: Snapshot }) {
  return (
    <div className={styles.quickLog}>
      <div className={styles.head}>
        <span className={ui.label}>Quick log</span>
        <span className={ui.grow} />
        <LookbackPill value={live.config.lookbackSeconds} />
      </div>
      {live.session.connected ? <LiveActions live={live} /> : <OfflineActions live={live} />}
    </div>
  )
}
