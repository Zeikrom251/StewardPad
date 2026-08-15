import { useCallback, useState } from 'react'

export interface UseSelection {
  /** Ordered car numbers, oldest first — order is "car A vs car B". Max 2. */
  selected: string[]
  toggle: (carNumber: string) => void
  clear: () => void
}

/** Selecting a third car drops the oldest, keeping the most recent two. */
export function useSelection(): UseSelection {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = useCallback((carNumber: string) => {
    setSelected((prev) => {
      if (prev.includes(carNumber)) return prev.filter((c) => c !== carNumber)
      if (prev.length < 2) return [...prev, carNumber]
      return [...prev.slice(1), carNumber]
    })
  }, [])

  const clear = useCallback(() => setSelected([]), [])

  return { selected, toggle, clear }
}
