import type { ReactNode } from 'react'
import type { Incident, IncidentSource, IncidentStatus } from '@stewardpad/shared'
import { Icon } from '../icons'
import { STATUS, classLabel } from '../lib/labels'
import styles from './primitives.module.scss'

/** Joins the truthy class names — enough of `clsx` for this app. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>
}

export function StatusChip({ status }: { status: IncidentStatus }) {
  const meta = STATUS[status]
  return (
    <span className={styles.chip} data-status={status}>
      <Icon name={meta.icon} size={12} strokeWidth={2.25} />
      {meta.label}
    </span>
  )
}

/** Car number on a class-tinted plate — the class is readable at a glance. */
export function Plate({
  number,
  carClass,
  small,
}: {
  number: string
  carClass: string
  small?: boolean
}) {
  return (
    <span className={small ? styles.plateSm : styles.plate} data-class={carClass}>
      {number}
    </span>
  )
}

export function ClassTag({ carClass }: { carClass: string }) {
  return (
    <span className={styles.classTag} data-class={carClass}>
      <i />
      {classLabel(carClass)}
    </span>
  )
}

export function SourceTag({ source }: { source: IncidentSource }) {
  return <span className={styles.tag}>{source}</span>
}

/** On an incident others were merged into: their numbers. */
export function MergedTag({ incident }: { incident: Incident }) {
  const numbers = incident.mergedFromNumbers ?? []
  if (numbers.length === 0) return null
  const list = numbers.map((n) => `#${n}`).join(' ')
  return (
    <span className={styles.tag} title={`Merged from ${list}`}>
      <Icon name="merge" size={11} strokeWidth={2.2} />
      {list}
    </span>
  )
}

/** On a penalty: the inspector's Served box, so the grids show what is still to serve. */
export function ServedTag({ incident }: { incident: Incident }) {
  if (incident.status !== 'PENALTY_APPLIED' || !incident.penalty) return null
  const served = incident.penalty.served
  return (
    <span className={served ? styles.served : styles.unserved}>
      <Icon name={served ? 'check' : 'clock'} size={11} strokeWidth={2.2} />
      {served ? 'Served' : 'Not served'}
    </span>
  )
}

/** "Internal · never exported to drivers" vs "Visible to drivers". */
export function AudienceTag({
  audience,
  children,
}: {
  audience: 'internal' | 'public'
  children: ReactNode
}) {
  return (
    <span className={audience === 'public' ? styles.public : styles.internal}>
      <Icon name={audience === 'public' ? 'eye' : 'lock'} size={11} strokeWidth={2.2} />
      {children}
    </span>
  )
}
