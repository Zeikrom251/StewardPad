import type { SubscriptionRequest } from '@stewardpad/shared'
import { account } from '../../backend/team'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useAction } from '../useTeam'
import gate from './Gate.module.scss'
import { HowToPay } from './HowToPay'
import styles from './Subscribe.module.scss'

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

function Steps({ request }: { request: SubscriptionRequest }) {
  const months = `${String(request.months)} month${request.months === 1 ? '' : 's'}`
  return (
    <ol className={styles.steps}>
      <li data-state="done">
        <i>
          <Icon name="check" size={12} strokeWidth={2.5} />
        </i>
        Request sent{' '}
        <small>
          {when(request.createdAt)} · {months}
        </small>
      </li>
      <li data-state="now">
        <i />
        Being checked <small>up to 48 hours</small>
      </li>
      <li>
        <i />
        Subscription active <small>then create your first league</small>
      </li>
    </ol>
  )
}

/** Board 03c: the request waits for staff. A declined one says why, and can be sent again. */
export function RequestSent({
  request,
  howToPay,
  onChange,
}: {
  request: SubscriptionRequest
  howToPay: string | null
  onChange: () => void
}) {
  const { run, pending, error } = useAction()
  const declined = request.status === 'declined'
  return (
    <section className={cx(gate.card, styles.form)}>
      <div className={styles.sent}>
        <span>
          <Icon name={declined ? 'ban' : 'clock'} size={22} />
        </span>
        <div>
          <h2>{declined ? 'Request declined' : 'Request sent'}</h2>
          <p className={gate.lead}>
            {declined
              ? (request.declineReason ?? 'Staff declined it.')
              : 'We check every request by hand, within 24 to 48 hours.'}
          </p>
        </div>
      </div>
      {!declined && <Steps request={request} />}
      <HowToPay text={howToPay} />
      {request.message && (
        <div className={styles.field}>
          <b>Your message</b>
          <span className={ui.muted}>“{request.message}”</span>
        </div>
      )}
      <p className={gate.lead}>
        You’ll see the answer here and in Settings → Account. You can close this and carry on with
        the free app.
      </p>
      {error && <p className={gate.error}>{error}</p>}
      {declined ? (
        <button type="button" className={cx(ui.btn, ui.primary)} onClick={onChange}>
          Request again
        </button>
      ) : (
        <button
          type="button"
          className={cx(ui.btn, ui.ghost)}
          disabled={pending}
          onClick={() =>
            void run(async () => {
              await account.cancelRequest()
              onChange()
            })
          }
        >
          <Icon name="x" size={14} />
          Cancel the request
        </button>
      )}
    </section>
  )
}
