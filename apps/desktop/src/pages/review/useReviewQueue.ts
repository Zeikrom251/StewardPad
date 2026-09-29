import { useEffect, useRef, useState } from 'react'
import type { Incident, IncidentStatus } from '@stewardpad/shared'
import { useLive } from '../../backend/LiveProvider'
import { sortByTime } from '../../lib/incidentFilters'
import { useWorkspace } from '../../workspace/Workspace'

export type QueueMode = 'todo' | 'all'

const UNDECIDED: ReadonlySet<IncidentStatus> = new Set(['NOTED', 'UNDER_INVESTIGATION'])

const isUndecided = (incident: Incident) => UNDECIDED.has(incident.status)

/** Alt+↓ / Alt+↑ move through the queue, even while typing a decision. */
function useStepKeys(step: (by: number) => void): void {
  const latest = useRef(step)
  latest.current = step
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const by = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
      if (!event.altKey || by === 0) return
      event.preventDefault()
      latest.current(by)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

/**
 * The incidents to review, in race order. The current one is the workspace's open incident,
 * so the review carries over to the Incidents page and back. It stays in the queue once
 * decided: its position holds until the steward moves on, then it drops out.
 */
export function useReviewQueue() {
  const incidents = useLive()?.incidents ?? []
  const { openId, openIncident } = useWorkspace()
  const [mode, setMode] = useState<QueueMode>('todo')
  const queue = sortByTime(
    incidents.filter((i) => mode === 'all' || isUndecided(i) || i.id === openId),
    false,
  )
  const index = Math.max(
    queue.findIndex((i) => i.id === openId),
    0,
  )
  const step = (by: number) => {
    const next = queue[index + by]
    if (next) openIncident(next.id)
  }
  useStepKeys(step)
  return {
    mode,
    setMode,
    queue,
    index,
    current: queue.at(index) ?? null,
    step,
    undecided: incidents.filter(isUndecided).length,
    total: incidents.length,
  }
}
