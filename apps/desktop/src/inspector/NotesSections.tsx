import type { IncidentEditableFields } from '@stewardpad/shared'
import { TYPE_LABEL, TYPE_ORDER } from '../lib/labels'
import { AudienceTag } from '../ui/primitives'
import { Select } from '../ui/Select'
import { Collapsible } from './Collapsible'
import { MarkdownEditor } from './MarkdownEditor'
import { PenaltyBox } from './PenaltyBox'
import styles from './Inspector.module.scss'

export type SetField = <K extends keyof IncidentEditableFields>(
  key: K,
  value: IncidentEditableFields[K],
) => void

/** Stewards only, on a hatched surface: in no CSV export (shared session files keep it). */
export function StewardNotesSection({
  draft,
  setField,
}: {
  draft: IncidentEditableFields
  setField: SetField
}) {
  return (
    <Collapsible
      id="notes"
      icon="lock"
      title="Steward notes"
      className={styles.private}
      summary={draft.stewardNotes.trim() ? 'Written' : 'Empty'}
      aside={<AudienceTag audience="internal">Stewards only · never exported</AudienceTag>}
    >
      <MarkdownEditor
        label="Steward notes"
        placeholder="Onboard notes, what to check, anything for the other stewards…"
        value={draft.stewardNotes}
        onChange={(v) => setField('stewardNotes', v)}
      />
    </Collapsible>
  )
}

/** What happened and what the stewards found: published with the decision. */
export function InvestigationSection({
  draft,
  setField,
}: {
  draft: IncidentEditableFields
  setField: SetField
}) {
  return (
    <Collapsible
      id="investigation"
      icon="search"
      title="Investigation"
      summary={TYPE_LABEL[draft.type]}
      aside={<AudienceTag audience="public">Visible to drivers</AudienceTag>}
    >
      <Select
        value={draft.type}
        options={TYPE_ORDER.map((type) => ({ value: type, label: TYPE_LABEL[type] }))}
        onChange={(type) => setField('type', type)}
        label="Incident type"
      />
      <MarkdownEditor
        label="Investigation"
        placeholder="What happened and what the replay shows…"
        value={draft.summary}
        onChange={(v) => setField('summary', v)}
      />
    </Collapsible>
  )
}

export function DecisionSection({
  draft,
  setField,
}: {
  draft: IncidentEditableFields
  setField: SetField
}) {
  return (
    <Collapsible
      id="decision"
      icon="eye"
      title="Decision"
      summary={draft.penalty ? 'Penalty set' : draft.decision.trim() ? 'Written' : 'Empty'}
      aside={<AudienceTag audience="public">Visible to drivers</AudienceTag>}
    >
      <MarkdownEditor
        label="Decision"
        placeholder="Write the decision drivers will read…"
        value={draft.decision}
        onChange={(v) => setField('decision', v)}
      />
      <PenaltyBox
        penalty={draft.penalty}
        cars={draft.cars}
        onChange={(p) => setField('penalty', p)}
      />
    </Collapsible>
  )
}
