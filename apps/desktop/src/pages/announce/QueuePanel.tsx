import { useAnnouncer } from '../../announce/AnnouncerProvider'
import type { Delivery } from '../../announce/useAnnouncerState'
import { Icon } from '../../icons'
import { formatAgo } from '../../lib/format'
import { STATUS } from '../../lib/labels'
import { useNow } from '../../lib/useNow'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import styles from './AnnouncePage.module.scss'

function Sent({ delivery, now }: { delivery: Delivery; now: number }) {
  const { retry } = useAnnouncer()
  const failed = delivery.outcome === 'failed'
  return (
    <div className={styles.queueRow} data-outcome={delivery.outcome}>
      <Icon name={failed ? 'alert' : 'check'} size={14} className={styles.outcome} />
      <b className={ui.mono}>
        {delivery.incident ? `#${delivery.incident.sequenceNumber}` : 'Test'}
      </b>
      <span className={cx(ui.grow, ui.trunc)} title={delivery.detail}>
        {STATUS[delivery.status].short} · {delivery.detail}
      </span>
      <span className={ui.faint}>{formatAgo(delivery.at, now)}</span>
      {failed && delivery.incident && (
        <button type="button" className={cx(ui.btn, ui.sm)} onClick={() => retry(delivery)}>
          Retry
        </button>
      )}
    </div>
  )
}

/** Every message sent this session, newest first; a failed one can be sent again. */
export function QueuePanel() {
  const { log } = useAnnouncer()
  const now = useNow(1000)
  return (
    <section className={styles.panel}>
      <span className={ui.label}>Sent this session</span>
      {log.length === 0 && <p className={styles.note}>Nothing sent yet.</p>}
      {log.map((delivery) => (
        <Sent key={delivery.id} delivery={delivery} now={now} />
      ))}
    </section>
  )
}
