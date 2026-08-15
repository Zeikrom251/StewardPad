import type { ComponentType, SVGProps } from 'react'
import type { IncidentStatus } from '@stewardpad/shared'
import {
  CheckCircleIcon,
  FlagIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from './icons'

const BADGE_BASE = 'flex w-fit items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium'

/** One color per status, everywhere (DESIGN.md "Incident status"). */
const STATUS_CLASSES: Record<IncidentStatus, string> = {
  NOTED: 'bg-status-noted/12 text-status-noted border-status-noted/40',
  UNDER_INVESTIGATION:
    'bg-status-under-investigation/12 text-status-under-investigation border-status-under-investigation/40',
  NO_FURTHER_ACTION:
    'bg-status-no-further-action/12 text-status-no-further-action border-status-no-further-action/40',
  PENALTY_APPLIED:
    'bg-status-penalty-applied/12 text-status-penalty-applied border-status-penalty-applied/40',
  DISMISSED: 'bg-status-dismissed/12 text-status-dismissed border-status-dismissed/40',
}

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  NOTED: 'Noted',
  UNDER_INVESTIGATION: 'Under investigation',
  NO_FURTHER_ACTION: 'No further action',
  PENALTY_APPLIED: 'Penalty applied',
  DISMISSED: 'Dismissed',
}

/** One glyph per status, purely a reinforcement — label text is still the information carrier. */
const STATUS_ICON: Record<IncidentStatus, ComponentType<SVGProps<SVGSVGElement>>> = {
  NOTED: InformationCircleIcon,
  UNDER_INVESTIGATION: MagnifyingGlassIcon,
  NO_FURTHER_ACTION: CheckCircleIcon,
  PENALTY_APPLIED: FlagIcon,
  DISMISSED: XCircleIcon,
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const StatusIcon = STATUS_ICON[status]
  return (
    <span className={`${BADGE_BASE} ${STATUS_CLASSES[status]}`}>
      <StatusIcon className="size-4" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  )
}

/** Derived from the label map so a status added to the shared union can't be missed here. */
export const STATUSES = Object.keys(STATUS_LABEL) as IncidentStatus[]
