import { useState, type KeyboardEvent } from 'react'

const MOVES: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }

/**
 * A pick-list window's working copy (PickerDialog): nothing reaches the incident until
 * Apply. The search field keeps focus: ↑ ↓ move, Enter ticks, Ctrl+Enter applies.
 */
export function usePickList<T>({
  initial,
  keyOf,
  filter,
}: {
  initial: string[]
  keyOf: (item: T) => string
  /** The items the query matches, in display order. */
  filter: (query: string) => T[]
}) {
  const [chosen, setChosen] = useState(initial)
  const [query, setQuery] = useState('')
  const [onlyChosen, setOnlyChosen] = useState(false)
  const [active, setActive] = useState(0)
  const shown = filter(query).filter((item) => !onlyChosen || chosen.includes(keyOf(item)))

  const toggle = (key: string) =>
    setChosen((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]))
  const search = (text: string) => {
    setQuery(text)
    setActive(0)
  }
  const showOnlyChosen = (only: boolean) => {
    setOnlyChosen(only)
    setActive(0)
  }
  const onKeyDown = (event: KeyboardEvent, apply: () => void) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      apply()
      return
    }
    // Elsewhere (a focused button) ↑ ↓ and Enter keep their usual meaning.
    if (!(event.target instanceof HTMLInputElement)) return
    const move = MOVES[event.key]
    if (move !== undefined) {
      event.preventDefault()
      setActive((i) => Math.min(Math.max(i + move, 0), Math.max(shown.length - 1, 0)))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = shown[active]
      if (item) toggle(keyOf(item))
    }
  }
  return {
    chosen,
    query,
    onlyChosen,
    active,
    shown,
    keyOf,
    toggle,
    search,
    showOnlyChosen,
    setActive,
    onKeyDown,
  }
}

export type PickList<T> = ReturnType<typeof usePickList<T>>
