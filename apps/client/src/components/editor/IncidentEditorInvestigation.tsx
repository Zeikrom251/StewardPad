import type { IncidentEditableFields } from '@stewardpad/shared'
import { STEWARD_NOTES_SNIPPETS } from '../../lib/incidentSnippets'
import { MarkdownEditor } from './MarkdownEditor'

const FIELD =
  'mt-1 w-full rounded-sm border border-border-strong bg-surface px-2 py-1 text-sm text-text'

/** Section 4: Investigation — internal notes, never leaves the tool (drivers CSV excludes it). */
export function IncidentEditorInvestigation({
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
      <h3 className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">
        Investigation
      </h3>
      <p className="text-xs text-text-muted">
        Steward notes (internal — never exported to drivers)
      </p>
      <MarkdownEditor
        value={draft.stewardNotes}
        onChange={(value) => setField('stewardNotes', value)}
        label="Steward notes"
        snippets={STEWARD_NOTES_SNIPPETS}
      />
      <label className="mt-3 block text-xs text-text-muted">
        Reviewed by
        <input
          type="text"
          value={draft.reviewedBy ?? ''}
          onChange={(event) => setField('reviewedBy', event.target.value || null)}
          className={FIELD}
        />
      </label>
    </section>
  )
}
