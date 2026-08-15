import { useEffect, useState } from 'react'

/**
 * Archive directory path — plain text input, commits on blur.
 * ponytail: no folder-browser dialog; this is a web app with no filesystem
 * picker API. A text path matching the existing Header fields is correct scope.
 */
export function ArchiveDirField({
  value,
  onCommit,
}: {
  value: string
  onCommit: (path: string) => void
}) {
  const [text, setText] = useState(value)

  useEffect(() => setText(value), [value])

  return (
    <label className="flex items-center gap-1 text-xs text-text-muted">
      Archive:
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => onCommit(text)}
        placeholder="Archive folder path"
        className="w-40 rounded-sm border border-border-strong bg-surface px-1 py-0.5 text-text"
        aria-label="Archive directory path"
      />
    </label>
  )
}
