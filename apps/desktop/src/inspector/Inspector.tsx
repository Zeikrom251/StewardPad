import { useState, type ReactNode } from 'react'
import type { Incident } from '@stewardpad/shared'
import { backend } from '../backend/backend'
import { Icon } from '../icons'
import { formatAgo, formatHms } from '../lib/format'
import { useNow } from '../lib/useNow'
import { Kbd, SourceTag, cx } from '../ui/primitives'
import ui from '../ui/ui.module.scss'
import { useWorkspace } from '../workspace/Workspace'
import { CaseSections, VerdictSections } from './IncidentSections'
import { StatusStepper } from './StatusStepper'
import { useIncidentDraft } from './useIncidentDraft'
import styles from './Inspector.module.scss'

/** Delete asks twice in place — no modal between the steward and the standings. */
export function DeleteButton({ incident }: { incident: Incident }) {
  const { openIncident, report } = useWorkspace()
  const [armed, setArmed] = useState(false)
  const remove = () => {
    backend
      .deleteIncident(incident.id)
      .then(() => openIncident(null))
      .catch((error: unknown) => report(`Could not delete #${incident.sequenceNumber}`, error))
  }
  if (!armed) {
    return (
      <button
        type="button"
        className={ui.iconBtn}
        aria-label="Delete incident"
        title="Delete"
        onClick={() => setArmed(true)}
      >
        <Icon name="trash" size={16} />
      </button>
    )
  }
  return (
    <button
      type="button"
      className={cx(ui.btn, ui.danger, ui.sm)}
      onBlur={() => setArmed(false)}
      onClick={remove}
      autoFocus
    >
      Delete #{incident.sequenceNumber}?
    </button>
  )
}

/** Autosave state, then the keys that apply where the editor sits (Esc close by default). */
export function Footer({ savedAt, children }: { savedAt: number | null; children?: ReactNode }) {
  const now = useNow()
  return (
    <div className={styles.foot}>
      {savedAt ? (
        <>
          <Icon name="check" size={13} strokeWidth={2.2} className={styles.saved} />
          Saved {formatAgo(savedAt, now)}
        </>
      ) : (
        'Changes save automatically'
      )}
      <span className={ui.grow} />
      <span className={ui.faint}>
        {children ?? (
          <>
            <Kbd>Esc</Kbd> close
          </>
        )}
      </span>
    </div>
  )
}

function InspectorHead({ incident }: { incident: Incident }) {
  const { openIncident } = useWorkspace()
  return (
    <div className={styles.head}>
      <div className={styles.title}>
        <div className={styles.titleRow}>
          <h2>Incident #{incident.sequenceNumber}</h2>
          <SourceTag source={incident.source} />
        </div>
        <span className={styles.hint}>
          Logged by {incident.loggedBy || 'LMU'} · {formatHms(incident.loggedAtSeconds)}
        </span>
      </div>
      <DeleteButton incident={incident} />
      <button
        type="button"
        className={ui.iconBtn}
        aria-label="Close (Esc)"
        title="Close (Esc)"
        onClick={() => openIncident(null)}
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  )
}

/** Docked incident editor (design/03): replaces the modal, so the standings stay visible. */
export function Inspector({ incident }: { incident: Incident }) {
  const { draft, setField, savedAt } = useIncidentDraft(incident)
  return (
    <aside className={styles.inspector} aria-label={`Incident #${incident.sequenceNumber}`}>
      <InspectorHead incident={incident} />
      <StatusStepper value={draft.status} onChange={(s) => setField('status', s)} />
      <div className={styles.body}>
        <CaseSections incident={incident} draft={draft} setField={setField} />
        <VerdictSections incident={incident} draft={draft} setField={setField} />
      </div>
      <Footer savedAt={savedAt} />
    </aside>
  )
}
