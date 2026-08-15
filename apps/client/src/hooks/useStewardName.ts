import { useState } from 'react'

const STORAGE_KEY = 'stewardpad:stewardName'

/**
 * The name stamped on every incident. Kept in localStorage (prompt §8) so
 * quick-log never waits on a config round trip — it's read synchronously
 * at keypress time, not fetched.
 */
export function useStewardName(): [string, (name: string) => void] {
  const [name, setNameState] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')

  const setName = (next: string): void => {
    setNameState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return [name, setName]
}
