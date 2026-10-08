import { useEffect, useRef } from 'react'
import { onBackendEvent } from '../../backend/backend'
import { useLive } from '../../backend/LiveProvider'
import { useWorkspace } from '../../workspace/Workspace'
import { AccountHome } from './AccountHome'
import { JoinInvite } from './JoinInvite'
import { SigningIn } from './SigningIn'
import { Welcome } from './Welcome'

export type Screen = 'welcome' | 'signingIn' | 'account'

/** The full-window screen showing instead of the race window, if any. */
export function useScreen(): Screen | null {
  const live = useLive()
  const { accountOpen } = useWorkspace()
  if (!live) return null
  if (live.account.status === 'signingIn') return 'signingIn'
  if (!live.config.welcomed) return 'welcome'
  if (accountOpen && live.account.me) return 'account'
  return null
}

/**
 * Opens the account's screens when a sign-in completes without a league, and shows an invite
 * from a stewardpad://join link.
 */
export function useAccountFlow() {
  const live = useLive()
  const { showAccount, setInvite } = useWorkspace()
  const status = live?.account.status
  const linked = Boolean(live?.team.leagueId)
  const previous = useRef(status)
  useEffect(() => {
    if (previous.current === 'signingIn' && status === 'signedIn' && !linked) showAccount(true)
    previous.current = status
  }, [status, linked, showAccount])
  useEffect(() => {
    const stop = onBackendEvent('join:requested', ({ invite }) => setInvite(invite))
    return () => void stop.then((unlisten) => unlisten())
  }, [setInvite])
}

export function GateScreen({ screen }: { screen: Screen }) {
  const me = useLive()?.account.me
  if (screen === 'welcome') return <Welcome />
  if (screen === 'signingIn') return <SigningIn />
  return me ? <AccountHome me={me} /> : null
}

/** The join dialog, wherever the steward is. */
export function InviteDialog() {
  const { invite } = useWorkspace()
  return invite ? <JoinInvite invite={invite} /> : null
}
