import type { IncidentSource } from '@stewardpad/shared'

/**
 * Marks incidents auto-created from LMU's contact feed. LMU-detected is the
 * common case once auto-creation is on (DESIGN.md), so this deliberately
 * skips the badge recipe (StatusBadge/PhaseBadge) — a colored box on most
 * rows would compete with status for attention. Follows the quieter "PIT"
 * tag precedent instead: plain faint text, no border, no fill. Steward-
 * logged incidents get no tag at all — the tag's presence is the signal.
 */
export function SourceTag({ source }: { source: IncidentSource }) {
  if (source !== 'LMU') return null
  return (
    <span className="text-xs text-text-faint" title="Auto-created from LMU's contact feed">
      LMU
    </span>
  )
}
