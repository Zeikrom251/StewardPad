import type { IncidentEditableFields } from '@stewardpad/shared'
import { INCIDENT_TYPES, INCIDENT_TYPE_LABEL } from '../../lib/incidentTypes'
import { Select } from '../Select'

const FIELD =
  'mt-1 w-full rounded-sm border border-border-strong bg-surface px-2 py-1 text-sm text-text'
const SELECT_FIELD =
  'w-full rounded-sm border border-border-strong bg-surface py-1 pl-2 pr-7 text-sm text-text'

/** Section 3: What — incident type and one-line summary. */
export function IncidentEditorWhat({
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
    <section>
      <h3 className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">What</h3>
      <label className="block text-xs text-text-muted">
        Type
        <Select
          value={draft.type}
          onChange={(event) =>
            setField('type', event.target.value as IncidentEditableFields['type'])
          }
          className={SELECT_FIELD}
          wrapperClassName="mt-1 block w-full"
        >
          {INCIDENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {INCIDENT_TYPE_LABEL[type]}
            </option>
          ))}
        </Select>
      </label>
      <label className="mt-3 block text-xs text-text-muted">
        Summary
        <textarea
          value={draft.summary}
          onChange={(event) => setField('summary', event.target.value)}
          rows={2}
          className={FIELD}
        />
      </label>
    </section>
  )
}
