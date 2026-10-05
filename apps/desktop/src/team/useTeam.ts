import { useCallback, useEffect, useState } from 'react'
import type { AccountView, LeagueRole, MyLeague, TeamView } from '@stewardpad/shared'
import { isBackendError } from '../backend/backend'
import { useLive } from '../backend/LiveProvider'
import { team } from '../backend/team'

export function useAccount(): AccountView | null {
  return useLive()?.account ?? null
}

export function useTeam(): TeamView | null {
  return useLive()?.team ?? null
}

const RANK: Record<LeagueRole, number> = { STEWARD: 1, HEAD_STEWARD: 2, OWNER: 3 }

/** The API decides; this only hides what the role can't do. */
export const atLeast = (role: LeagueRole | undefined, needed: LeagueRole) =>
  role !== undefined && RANK[role] >= RANK[needed]

export const ROLE_LABEL: Record<LeagueRole, string> = {
  OWNER: 'Owner',
  HEAD_STEWARD: 'Head steward',
  STEWARD: 'Steward',
}

/** A message for the steward from a failed command. */
export function failure(error: unknown): string {
  return isBackendError(error) ? error.message : String(error)
}

/** Runs one action at a time, keeping its pending state and last error for the UI. */
export function useAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(async <T>(work: () => Promise<T>): Promise<T | undefined> => {
    setPending(true)
    setError(null)
    try {
      return await work()
    } catch (caught) {
      setError(failure(caught))
      return undefined
    } finally {
      setPending(false)
    }
  }, [])
  return { run, pending, error, setError }
}

/** The leagues the steward belongs to, read from the API when shown. */
export function useLeagues() {
  const [leagues, setLeagues] = useState<MyLeague[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(() => {
    team.leagues().then(setLeagues, (caught: unknown) => setError(failure(caught)))
  }, [])
  useEffect(reload, [reload])
  return { leagues, error, reload }
}
