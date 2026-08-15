import { io, type Socket } from 'socket.io-client'
import type { ServerEvents } from '@stewardpad/shared'

/** socket.io wants an events map of listener functions, not payload types. */
export type ListenEvents = { [K in keyof ServerEvents]: (payload: ServerEvents[K]) => void }

/**
 * Single shared connection, same origin — the Vite proxy (dev) and the
 * static server (prod build served by the same host) both forward
 * /socket.io to the backend, so no URL is needed. The server never listens
 * for client events (prompt §7.6: every mutation is REST), so emit is left
 * untyped rather than claiming a matching set of client→server events.
 */
export const socket: Socket<ListenEvents> = io()
