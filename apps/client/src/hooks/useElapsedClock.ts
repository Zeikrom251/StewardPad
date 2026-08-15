import { useEffect, useRef, useState } from 'react'
import type { SessionInfo } from '@stewardpad/shared'

const TICK_MS = 200

/**
 * Interpolates the elapsed clock between server ticks so it counts
 * smoothly instead of jumping once per socket update. Re-anchored to the
 * server value every time one arrives, so drift never exceeds one tick.
 */
export function useElapsedClock(session: SessionInfo | null): number {
  const anchor = useRef({ elapsed: 0, receivedAt: Date.now() })
  const [displaySeconds, setDisplaySeconds] = useState(0)

  useEffect(() => {
    if (!session) return
    anchor.current = { elapsed: session.elapsedSeconds, receivedAt: Date.now() }
    setDisplaySeconds(session.elapsedSeconds)
  }, [session])

  useEffect(() => {
    const id = window.setInterval(() => {
      const { elapsed, receivedAt } = anchor.current
      setDisplaySeconds(elapsed + (Date.now() - receivedAt) / 1000)
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  return displaySeconds
}
