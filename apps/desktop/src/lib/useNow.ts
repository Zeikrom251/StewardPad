import { useEffect, useState } from 'react'

/** Wall-clock milliseconds, re-rendering every `intervalMs` — for "saved 3s ago" labels. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
