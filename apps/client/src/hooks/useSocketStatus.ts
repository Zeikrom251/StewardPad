import { useEffect, useState } from 'react'
import { socket } from '../lib/socket'

/** Whether the browser currently has a live socket to the backend at all. */
export function useSocketStatus(): boolean {
  const [open, setOpen] = useState(socket.connected)

  useEffect(() => {
    // The socket is a module singleton, so it can finish connecting before this
    // effect subscribes — re-read it here or a missed `connect` pins the header
    // dot on amber for the whole session.
    setOpen(socket.connected)
    const onConnect = (): void => setOpen(true)
    const onDisconnect = (): void => setOpen(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  return open
}
