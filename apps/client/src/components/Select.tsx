import type { SelectHTMLAttributes } from 'react'
import { ChevronDownIcon } from './icons'

/**
 * Native <select> with the app's own chrome instead of OS default styling —
 * every select in the app was rendering with the browser's native arrow and
 * system font, the one field type with no shared treatment (design audit).
 * The closed control AND the open option list are both themed by the global
 * `select`/`::picker(select)` rule in `index.css` (`appearance: base-select`
 * with an `appearance: none` fallback) — nothing here sets `appearance`
 * itself, since a Tailwind utility class lives in the utilities layer and
 * would always beat that base-layer rule regardless of value or source
 * order. This component just draws the chevron that replaces the native
 * arrow in both the supported and fallback case. Pass the same border/bg/
 * text classes already used for inputs, with right padding roomy enough for
 * the chevron (`pr-5`/`pr-7`, not `px-*`, since a later utility can't
 * reliably beat a `px-*` shorthand already in the string — Tailwind's
 * cascade order, not string order, decides that).
 */
export function Select({
  className = '',
  wrapperClassName = 'inline-block',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  return (
    <span className={`relative ${wrapperClassName}`}>
      <select {...props} className={className} />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-1.5 size-3 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
    </span>
  )
}
