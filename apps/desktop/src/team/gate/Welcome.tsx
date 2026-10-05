import { Mark } from '@stewardpad/brand'
import { backend } from '../../backend/backend'
import { account } from '../../backend/team'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useUpdater } from '../../update/UpdaterProvider'
import { useAction } from '../useTeam'
import { DiscordMark } from './DiscordMark'
import gate from './Gate.module.scss'
import styles from './Welcome.module.scss'

const POINTS = [
  'Log incidents with a look-back timestamp',
  'Review, decide and publish to drivers',
  'Announce decisions on Discord',
]

function Brand() {
  const { current } = useUpdater()
  return (
    <div className={styles.brand}>
      <Mark size={56} />
      <h1>
        Steward<span>Pad</span>
      </h1>
      <p className={styles.tagline}>Race control for Le Mans Ultimate stewards.</p>
      <ul>
        {POINTS.map((point) => (
          <li key={point}>
            <Icon name="check" size={16} strokeWidth={2.2} />
            {point}
          </li>
        ))}
      </ul>
      <p className={styles.version}>{current ? `v${current} · ` : ''}Free and open source</p>
    </div>
  )
}

/** Board 02: with your league (sign in) or on your own. Asked once; Settings → Account later. */
export function Welcome() {
  const { run, pending, error } = useAction()
  const answer = (signIn: boolean) =>
    run(async () => {
      await backend.updateConfig({ welcomed: true })
      if (signIn) await account.signIn()
    })
  return (
    <div className={gate.page}>
      <div className={styles.welcome}>
        <Brand />
        <section className={gate.card}>
          <h2>Get started</h2>
          <p className={gate.lead}>
            Pick how you’ll use StewardPad today. You can change it any time in Settings → Account.
          </p>
          <div className={styles.team}>
            <div className={gate.row}>
              <span className={gate.tile}>
                <DiscordMark size={22} />
              </span>
              <div>
                <b>Steward with your league</b>
                <span className={styles.chip}>TEAM</span>
                <p>
                  Sign in with Discord to join your league’s team: shared incidents, live timing
                  from the host PC, decisions in sync.
                </p>
              </div>
            </div>
            <button
              type="button"
              className={gate.discord}
              disabled={pending}
              onClick={() => void answer(true)}
            >
              <DiscordMark />
              Sign in with Discord
            </button>
          </div>
          <div className={styles.option}>
            <div className={gate.row}>
              <span className={gate.tile}>
                <Icon name="monitor" size={20} />
              </span>
              <div>
                <b>Steward on your own</b>
                <p>Everything on this PC, no account. Works offline at the track. Free, always.</p>
              </div>
            </div>
            <button
              type="button"
              className={cx(ui.btn, ui.lg)}
              disabled={pending}
              onClick={() => void answer(false)}
            >
              Continue without an account
            </button>
          </div>
          {error && <p className={gate.error}>{error}</p>}
          <p className={gate.note}>
            <Icon name="shield" size={14} />
            StewardPad never sees your Discord password.
          </p>
        </section>
      </div>
    </div>
  )
}
