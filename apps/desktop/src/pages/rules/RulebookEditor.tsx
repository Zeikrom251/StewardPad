import { useState } from 'react'
import type { Incident, Rulebook, RulebookCheck } from '@stewardpad/shared'
import { Icon } from '../../icons'
import { MarkdownEditor } from '../../inspector/MarkdownEditor'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { RuleProblems } from './RuleProblems'
import { useRulebookEdit } from './useRulebookEdit'
import styles from './RulesPage.module.scss'

function CheckStatus({ check }: { check: RulebookCheck | null }) {
  if (!check) return <span className={cx(ui.faint, styles.small)}>Checking…</span>
  const count = check.problems.length
  return (
    <span className={cx(styles.small, count ? styles.bad : ui.muted)}>
      {count
        ? `${count} problem${count > 1 ? 's' : ''} to fix`
        : `${check.rules.length} rule${check.rules.length === 1 ? '' : 's'}`}
    </span>
  )
}

function DiscardButton({ dirty, onDiscard }: { dirty: boolean; onDiscard: () => void }) {
  const [armed, setArmed] = useState(false)
  if (!dirty) {
    return (
      <button type="button" className={cx(ui.btn, ui.sm)} onClick={onDiscard}>
        Cancel
      </button>
    )
  }
  return (
    <button
      type="button"
      className={cx(ui.btn, ui.sm, armed ? ui.danger : ui.ghost)}
      onBlur={() => setArmed(false)}
      onClick={() => (armed ? onDiscard() : setArmed(true))}
    >
      {armed ? 'Discard your changes?' : 'Discard'}
    </button>
  )
}

/** How a rule is written in this book: bold numbers (an imported outline) or plain ones. */
function Structure({ explicit }: { explicit: boolean }) {
  if (explicit) {
    return (
      <p className={styles.structure}>
        A rule is a line starting with its number in bold: <b>3.3.a</b> Causing a collision is
        prohibited. Select the number and press Bold. Lines without a bold number are text.
      </p>
    )
  }
  return (
    <p className={styles.structure}>
      One rule per line, starting with its number: <code>3</code>, <code>3.2</code>,{' '}
      <code>3.2.a</code>. The rule text goes on the lines below it. A heading can be a rule too (
      <code>## 3 Racing conduct</code>).
    </p>
  )
}

/** Rules page → Edit: the book's Markdown in the rich-text editor, saved only once clean. */
export function RulebookEditor({
  book,
  incidents,
  onClose,
}: {
  book: Rulebook
  incidents: Incident[]
  onClose: () => void
}) {
  const edit = useRulebookEdit(book, onClose)
  return (
    <div className={styles.page}>
      <div className={ui.toolbar}>
        <h1>Editing rule book</h1>
        <span className={cx(ui.trunc, ui.faint, styles.small)}>{book.name}</span>
        <span className={ui.grow} />
        <CheckStatus check={edit.check} />
        <DiscardButton dirty={edit.dirty} onDiscard={edit.discard} />
        <button
          type="button"
          className={cx(ui.btn, ui.primary, ui.sm)}
          disabled={!edit.canSave}
          onClick={edit.save}
        >
          <Icon name="save" size={14} />
          Save
        </button>
      </div>
      {edit.check && (
        <RuleProblems check={edit.check} incidents={incidents} onNumber={edit.numberOutline} />
      )}
      <div className={styles.editArea}>
        <Structure explicit={edit.check?.explicit ?? false} />
        <MarkdownEditor
          headings
          value={edit.text}
          onChange={edit.edit}
          label="Rule book"
          placeholder="3.2 Causing a collision"
          className={styles.bookEditor}
        />
      </div>
    </div>
  )
}
