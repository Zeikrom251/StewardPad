import { useState } from 'react'
import { useLive } from '../../backend/LiveProvider'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useRulebookActions } from '../settings/RulebookGroup'
import { BookView } from './BookView'
import { RulebookEditor } from './RulebookEditor'
import { hasUnsavedEdit } from './useRulebookEdit'
import styles from './RulesPage.module.scss'

function NoRulebook() {
  const { importFile } = useRulebookActions()
  return (
    <div className={styles.empty}>
      <Icon name="book" size={28} />
      <b>No rule book loaded</b>
      <p>
        Import your league&apos;s rule book as a .txt or .md file. From Google Docs: File, Download,
        Plain text. Numbered lists get their full numbers (3.3.a, 3.4.b.iii); in a hand-written
        file, every line starting with a rule number (3, 3.2, &ldquo;Article 12&rdquo;) is a rule.
      </p>
      <button type="button" className={cx(ui.btn, ui.primary)} onClick={importFile}>
        <Icon name="file" size={15} />
        Import rule book…
      </button>
    </div>
  )
}

/** The league's rule book: read, search, see what was cited, edit it as Markdown. */
export function RulesPage() {
  const live = useLive()
  // An edit left unsaved (the steward switched page) reopens where it was.
  const [editing, setEditing] = useState(hasUnsavedEdit)
  const rulebook = live?.config.rulebook ?? null
  const incidents = live?.incidents ?? []
  if (!rulebook) return <NoRulebook />
  if (editing) {
    return (
      <RulebookEditor book={rulebook} incidents={incidents} onClose={() => setEditing(false)} />
    )
  }
  return <BookView rulebook={rulebook} incidents={incidents} onEdit={() => setEditing(true)} />
}
