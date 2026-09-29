import { useEffect, useState } from 'react'
import { cx } from './primitives'
import ui from './ui.module.scss'

/**
 * A text setting saved when the steward leaves the field (or presses Enter), not on every
 * keystroke: half-typed values never reach the backend's validation.
 */
export function CommitInput({
  value,
  onCommit,
  label,
  placeholder,
  type = 'text',
  maxLength,
  className,
}: {
  value: string
  onCommit: (value: string) => void
  label: string
  placeholder?: string
  type?: 'text' | 'password'
  maxLength?: number
  className?: string
}) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <label className={cx(ui.field, className)}>
      <input
        type={type}
        value={text}
        aria-label={label}
        placeholder={placeholder}
        maxLength={maxLength}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== value && onCommit(text)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </label>
  )
}
