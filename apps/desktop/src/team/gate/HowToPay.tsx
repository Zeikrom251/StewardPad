import { Icon } from '../../icons'
import styles from './Subscribe.module.scss'

/** The payment instructions staff keep up to date. Plain text: never rendered as HTML. */
export function HowToPay({ text }: { text: string | null }) {
  return (
    <div className={styles.howToPay}>
      <b>
        <Icon name="card" size={16} />
        How to pay
      </b>
      <p>{text?.trim() || 'Staff send a PayPal payment request to the email you give here.'}</p>
    </div>
  )
}
