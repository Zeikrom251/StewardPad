import { useEffect, useState } from 'react'

/** `Look-back: [10]s` — commits on blur/Enter, reverts on an invalid value. */
export function LookbackControl({
  value,
  onCommit,
}: {
  value: number
  onCommit: (seconds: number) => void
}) {
  const [text, setText] = useState(String(value))

  useEffect(() => setText(String(value)), [value])

  const commit = (): void => {
    const next = Number(text)
    if (Number.isFinite(next) && next >= 0 && next !== value) onCommit(next)
    else setText(String(value))
  }

  return (
    <label className="flex items-center gap-1 text-xs text-text-muted">
      Look-back:
      <input
        type="number"
        min={0}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        className="w-14 rounded-sm border border-border-strong bg-surface px-1 py-0.5 text-text"
        aria-label="Look-back seconds"
      />
      s
    </label>
  )
}
