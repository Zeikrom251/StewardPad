import type { SessionPhase } from '@stewardpad/shared'

const BADGE_BASE = 'rounded-sm border px-2 py-0.5 text-xs font-medium'
const NEUTRAL = 'bg-transparent text-text-muted border-border-strong'

/** Reuses status hues where the flag color already matches (DESIGN.md). */
const PHASE_CLASSES: Record<SessionPhase, string> = {
  GREEN:
    'bg-status-no-further-action/12 text-status-no-further-action border-status-no-further-action/40',
  YELLOW:
    'bg-status-under-investigation/12 text-status-under-investigation border-status-under-investigation/40',
  FCY: 'bg-phase-fcy/12 text-phase-fcy border-phase-fcy/40',
  SAFETY_CAR: 'bg-status-noted/12 text-status-noted border-status-noted/40',
  // RED (session red flag) uses the accent, not the penalty-applied status
  // color: a red flag is a live "stop, attention now" event — the exact
  // thing the accent is reserved for — not a past-tense decided outcome
  // like PENALTY_APPLIED. The two never appear side by side (this is a
  // session-level badge, PENALTY_APPLIED is per-incident), so no collision
  // with the accent/penalty hue separation documented in index.css.
  RED: 'bg-accent/12 text-accent border-accent/40',
  FINISHED: NEUTRAL,
  UNKNOWN: NEUTRAL,
}

const PHASE_LABEL: Record<SessionPhase, string> = {
  GREEN: 'Green',
  YELLOW: 'Yellow',
  FCY: 'Full-course yellow',
  SAFETY_CAR: 'Safety car',
  RED: 'Red',
  FINISHED: 'Finished',
  UNKNOWN: 'Unknown',
}

export function PhaseBadge({ phase }: { phase: SessionPhase }) {
  return <span className={`${BADGE_BASE} ${PHASE_CLASSES[phase]}`}>{PHASE_LABEL[phase]}</span>
}
