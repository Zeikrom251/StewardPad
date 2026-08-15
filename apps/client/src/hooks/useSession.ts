import type { SessionInfo } from '@stewardpad/shared'
import { socket } from '../lib/socket'
import { useLiveValue } from './useLiveValue'
import { useSocketStatus } from './useSocketStatus'

/** Dot state for the header (DESIGN.md "LMU connection dot"). */
export type ConnectionState = 'connected' | 'connecting' | 'offline'

function subscribeSession(onValue: (value: SessionInfo) => void): () => void {
  socket.on('session:update', onValue)
  return () => socket.off('session:update', onValue)
}

function toConnectionState(socketOpen: boolean, session: SessionInfo | null): ConnectionState {
  if (!socketOpen) return 'connecting'
  if (!session?.connected) return 'offline'
  return 'connected'
}

export function useSession(): { session: SessionInfo | null; connectionState: ConnectionState } {
  const session = useLiveValue(subscribeSession, '/session')
  const socketOpen = useSocketStatus()
  return { session, connectionState: toConnectionState(socketOpen, session) }
}
