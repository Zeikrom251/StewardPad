import type { IncidentEditableFields } from '@stewardpad/shared'
import { STATUSES, STATUS_LABEL } from '../StatusBadge'
import { DECISION_SNIPPETS } from '../../lib/incidentSnippets'
import { PenaltyFields } from './PenaltyFields'
import { Select } from '../Select'
import { MarkdownEditor } from './MarkdownEditor'

const SELECT_FIELD =
  'w-full rounded-sm border border-border-strong bg-surface py-1 pl-2 pr-7 text-sm text-text'

/** Section 5: Decision — status, published wording, penalty block. */
export function IncidentEditorDecision({
  draft,
  setField,
}: {
  draft: IncidentEditableFields
  setField: <K extends keyof IncidentEditableFields>(
    key: K,
    value: IncidentEditableFields[K],
  ) => void
}) {
  return (
    <section className="border-t border-border py-4">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">Decision</h3>
      <label className="block text-xs text-text-muted">
        Status
        <Select
          value={draft.status}
          onChange={(event) =>
            setField('status', event.target.value as IncidentEditableFields['status'])
          }
          className={SELECT_FIELD}
          wrapperClassName="mt-1 block w-full"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </Select>
      </label>
      <p className="mt-3 text-xs text-text-muted">Published decision (drivers see this)</p>
      <MarkdownEditor
        value={draft.decision}
        onChange={(value) => setField('decision', value)}
        label="Published decision"
        snippets={DECISION_SNIPPETS}
      />
      <PenaltyFields
        penalty={draft.penalty}
        cars={draft.cars}
        onChange={(penalty) => setField('penalty', penalty)}
      />
    </section>
  )
}
