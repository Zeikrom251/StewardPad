import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '../icons'
import ui from '../ui/ui.module.scss'
import styles from './Modal.module.scss'

/**
 * A small native modal <dialog>: the browser gives the backdrop, the focus trap and Esc, and
 * the app's shortcuts step aside while it is open (useShortcuts).
 */
export function Modal({
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  footer: ReactNode
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [])
  return (
    <dialog ref={dialog} className={styles.modal} aria-label={title} onClose={onClose}>
      <div className={styles.head}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          type="button"
          className={ui.iconBtn}
          aria-label="Close (Esc)"
          onClick={() => dialog.current?.close()}
        >
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className={styles.body}>{children}</div>
      <div className={styles.foot}>{footer}</div>
    </dialog>
  )
}
