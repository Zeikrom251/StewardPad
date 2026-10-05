import type { TeamView } from '@stewardpad/shared'
import type { IconName } from '../icons'

export interface SyncState {
  tone: 'good' | 'busy' | 'warn' | 'off'
  icon: IconName
  text: string
}

const changes = (n: number) => `${String(n)} change${n === 1 ? '' : 's'}`

/** Board 07 → status bar, the sync item: what the league link is doing, in words. */
export function syncState(view: TeamView): SyncState | null {
  if (!view.leagueId) return null
  if (view.connection === 'inactive')
    return { tone: 'off', icon: 'cloudOff', text: 'Team sync off · the owner’s subscription ended' }
  if (view.connection === 'offline' || view.connection === 'off')
    return {
      tone: 'warn',
      icon: 'cloudOff',
      text:
        view.pending > 0
          ? `Offline · ${changes(view.pending)} kept on this PC, sent when back`
          : 'Offline · changes wait on this PC',
    }
  if (view.connection === 'connecting')
    return { tone: 'busy', icon: 'refresh', text: 'Connecting…' }
  if (view.pending > 0)
    return { tone: 'busy', icon: 'refresh', text: `Sending ${changes(view.pending)}…` }
  return { tone: 'good', icon: 'cloud', text: 'Synced' }
}
