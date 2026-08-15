import type { ConnectionState } from '../hooks/useSession'

const DOT_CLASSES: Record<ConnectionState, string> = {
  connected: 'bg-status-no-further-action',
  connecting: 'bg-status-under-investigation',
  offline: 'bg-status-penalty-applied',
}

const LABEL: Record<ConnectionState, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  offline: 'Offline',
}

/** DESIGN.md "LMU connection dot" — the dot is accurate, the reassurance line is calm. */
export function ConnectionIndicator({ state }: { state: ConnectionState }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[state]}`} aria-hidden="true" />
      <span className="text-text-muted">{LABEL[state]}</span>
      {state === 'offline' && (
        <span className="text-text-muted">LMU offline — logging still works</span>
      )}
    </div>
  )
}
