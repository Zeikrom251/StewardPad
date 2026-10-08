import { Mark } from '@stewardpad/brand'
import { Icon } from '../../icons'
import { DiscordMark } from './DiscordMark'
import styles from './SigningIn.module.scss'

/** What Discord shows in the browser: StewardPad asks for the username and email, nothing else. */
export function Consent() {
  return (
    <div>
      <div className={styles.browser}>
        <span className={styles.address}>
          <Icon name="lock" size={12} />
          <b>discord.com</b>/oauth2/authorize
        </span>
        <div className={styles.consent}>
          <span className={styles.marks}>
            <Mark size={40} />
            <span>
              <DiscordMark size={26} />
            </span>
          </span>
          <b>StewardPad</b>
          wants to access your Discord account
          <ul>
            <li>
              <Icon name="check" size={16} strokeWidth={3} />
              Access your username, avatar and banner
            </li>
            <li>
              <Icon name="check" size={16} strokeWidth={3} />
              Access your email address
            </li>
          </ul>
        </div>
      </div>
      <p className={styles.caption}>
        In your browser: Discord’s own page. StewardPad only gets a one-time code back.
      </p>
    </div>
  )
}
