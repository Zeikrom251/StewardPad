import type { Incident, IncidentEditableFields } from '@stewardpad/shared'
import { formatElapsed } from '../../lib/format'
import { MinusIcon, PlusIcon } from '../icons'

const NUDGES = [-5, -1, 1, 5]

/** Section 1: When — timestamp nudges, live replayReference (prompt §8 editor). */
export function IncidentEditorWhen({
  incident,
  draft,
  onNudge,
}: {
  incident: Incident
  draft: IncidentEditableFields
  onNudge: (delta: number) => void
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">When</h3>
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg tabular-nums text-text">
          {formatElapsed(draft.eventSeconds)}
        </span>
        {NUDGES.map((delta) => (
          <button
            key={delta}
            type="button"
            onClick={() => onNudge(delta)}
            className="flex items-center gap-0.5 rounded-sm border border-border-strong px-2 py-0.5 text-xs text-text hover:bg-surface-raised"
          >
            {delta > 0 ? (
              <PlusIcon className="size-4" aria-hidden="true" />
            ) : (
              <MinusIcon className="size-4" aria-hidden="true" />
            )}
            {Math.abs(delta)}s
          </button>
        ))}
      </div>
      <p className="mt-2 font-mono text-sm text-text-muted">{incident.replayReference}</p>
      <p className="mt-1 text-xs text-text-faint">
        logged at {formatElapsed(incident.loggedAtSeconds)}, look-back {incident.lookbackApplied}s
      </p>
    </section>
  )
}
