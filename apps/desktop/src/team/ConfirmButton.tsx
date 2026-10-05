import { useState, type ReactNode } from 'react'
import { cx } from '../ui/primitives'
import ui from '../ui/ui.module.scss'

/** A destructive action asks once more, in place: the first click arms it. */
export function ConfirmButton({
  question,
  confirm,
  onConfirm,
  disabled,
  children,
}: {
  question: string
  confirm: string
  onConfirm: () => void
  disabled?: boolean
  children: ReactNode
}) {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <button
        type="button"
        className={cx(ui.btn, ui.ghost, ui.sm)}
        disabled={disabled}
        onClick={() => setArmed(true)}
      >
        {children}
      </button>
    )
  }
  return (
    <span className={ui.hstack}>
      <span className={ui.muted}>{question}</span>
      <button
        type="button"
        className={cx(ui.btn, ui.danger, ui.sm)}
        autoFocus
        onClick={() => {
          setArmed(false)
          onConfirm()
        }}
      >
        {confirm}
      </button>
      <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={() => setArmed(false)}>
        Cancel
      </button>
    </span>
  )
}
