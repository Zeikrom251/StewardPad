import { useLive } from '../backend/LiveProvider'

/**
 * The name this PC signs claims and edits with, as the backend does (`steward_name`): the
 * account's in a league, Settings → Your name otherwise. Empty: nobody to sign as.
 */
export function useMyName(): string {
  const live = useLive()
  if (!live) return ''
  const me = live.account.me
  return me && live.team.leagueId ? me.displayName : live.config.stewardName.trim()
}
