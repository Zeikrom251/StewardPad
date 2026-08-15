import type { StandingEntry } from '@stewardpad/shared'
import { socket } from '../lib/socket'
import { useLiveValue } from './useLiveValue'

function subscribeStandings(onValue: (value: StandingEntry[]) => void): () => void {
  socket.on('standings:update', onValue)
  return () => socket.off('standings:update', onValue)
}

export function useStandings(): StandingEntry[] {
  return useLiveValue(subscribeStandings, '/standings') ?? []
}
