import { useCallback, useEffect, useState } from 'react'
import type { SubscriptionView } from '@stewardpad/shared'
import { account } from '../../backend/team'
import { failure } from '../useTeam'

/** The latest subscription request and the payment instructions, read when shown. */
export function useSubscription() {
  const [view, setView] = useState<SubscriptionView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(() => {
    account.subscription().then(setView, (caught: unknown) => setError(failure(caught)))
  }, [])
  useEffect(reload, [reload])
  return { view, error, reload }
}
