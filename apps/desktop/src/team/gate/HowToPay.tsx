import { Icon } from '../../icons'
import { Markdown } from '../../ui/Markdown'
import styles from './Subscribe.module.scss'

/** The payment instructions staff keep up to date, in Markdown (back office → How to pay). */
export function HowToPay({ text }: { text: string | null }) {
  return (
    <div className={styles.howToPay}>
      <b>
        <Icon name="card" size={16} />
        How to pay
      </b>
      <div className={styles.text}>
        <Markdown
          text={text?.trim() || 'Staff send a PayPal payment request to the email you give here.'}
        />
      </div>
    </div>
  )
}
