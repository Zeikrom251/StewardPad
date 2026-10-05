import { useState } from 'react'
import type { RequestSubscriptionInput } from '@stewardpad/shared'
import { account } from '../../backend/team'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import { Segmented } from '../../ui/Segmented'
import ui from '../../ui/ui.module.scss'
import { useAction } from '../useTeam'
import gate from './Gate.module.scss'
import { HowToPay } from './HowToPay'
import styles from './Subscribe.module.scss'

const POINTS = [
  'Create leagues',
  'Invite stewards, free for them',
  'Stream live timing',
  'History kept 12 months',
]
const MONTHS: Array<[1 | 2 | 3, string]> = [
  [1, '1 month'],
  [2, '2 months'],
  [3, '3 months'],
]

/** Board 03b: a subscription is requested, checked by hand, paid through PayPal. */
export function Subscribe({ howToPay, onSent }: { howToPay: string | null; onSent: () => void }) {
  const [input, setInput] = useState<RequestSubscriptionInput>({ paypalEmail: '', months: 1 })
  const { run, pending, error } = useAction()
  const send = () =>
    void run(async () => {
      await account.requestSubscription(input)
      onSent()
    })
  return (
    <section className={cx(gate.card, styles.form)}>
      <span className={styles.eyebrow}>StewardPad Team</span>
      <h2>Run your league with your stewards</h2>
      <p className={gate.lead}>
        Create leagues, invite your stewards and stream live timing to them.
      </p>
      <ul className={styles.points}>
        {POINTS.map((point) => (
          <li key={point}>
            <Icon name="check" size={15} strokeWidth={2.2} />
            {point}
          </li>
        ))}
      </ul>
      <label className={styles.field}>
        <b>Your PayPal email</b>
        <span className={ui.field}>
          <input
            type="email"
            value={input.paypalEmail}
            placeholder="you@example.com"
            autoComplete="email"
            onChange={(e) => setInput({ ...input, paypalEmail: e.target.value })}
          />
        </span>
        <span>Staff send the PayPal payment request here. It’s used for nothing else.</span>
      </label>
      <div className={styles.field}>
        <b>How long</b>
        <Segmented
          value={input.months}
          options={MONTHS}
          onChange={(months) => setInput({ ...input, months })}
        />
      </div>
      <HowToPay text={howToPay} />
      <label className={styles.field}>
        <b>
          Message<small>optional</small>
        </b>
        <span className={ui.area}>
          <textarea
            value={input.message ?? ''}
            maxLength={1000}
            rows={3}
            placeholder="Your league’s name, the payment reference, anything we should know…"
            onChange={(e) => setInput({ ...input, message: e.target.value })}
          />
        </span>
      </label>
      <p className={styles.info}>
        <Icon name="clock" size={15} />
        <span>
          <b>Requests are checked by hand.</b> Expect an answer within 24 to 48 hours. The free app
          stays fully usable meanwhile.
        </span>
      </p>
      {error && <p className={gate.error}>{error}</p>}
      <div className={styles.submit}>
        <button
          type="button"
          className={cx(ui.btn, ui.primary, ui.lg)}
          disabled={pending}
          onClick={send}
        >
          Request a subscription
        </button>
        Sends your request; nothing is charged by the app.
      </div>
    </section>
  )
}
