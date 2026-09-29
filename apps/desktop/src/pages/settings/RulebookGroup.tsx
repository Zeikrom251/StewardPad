import { useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import type { Rulebook } from '@stewardpad/shared'
import { backend } from '../../backend/backend'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { Group, Row } from './SettingsGroups'
import styles from './SettingsPage.module.scss'

export function useRulebookActions() {
  const { report } = useWorkspace()
  const importFile = () => {
    open({ filters: [{ name: 'Rule book (text)', extensions: ['txt', 'md'] }] })
      .then((path) => (typeof path === 'string' ? backend.importRulebook(path) : undefined))
      .catch((error: unknown) => report('Could not import the rule book', error))
  }
  const remove = () => {
    backend
      .removeRulebook()
      .catch((error: unknown) => report('Could not remove the rule book', error))
  }
  return { importFile, remove }
}

/** The loaded book: name, rule count, and the first rules so the steward sees it parsed right. */
function Loaded({
  rulebook,
  onReplace,
  onRemove,
}: {
  rulebook: Rulebook
  onReplace: () => void
  onRemove: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <div className={styles.inline}>
        <Icon name="file" size={14} />
        <span className={styles.book}>
          <b className={ui.trunc}>{rulebook.name}</b>
          <span>{rulebook.rules.length} rules</span>
        </span>
        <button type="button" className={ui.btn} onClick={onReplace}>
          Replace…
        </button>
        <button
          type="button"
          className={cx(ui.btn, confirm ? ui.danger : ui.ghost)}
          onBlur={() => setConfirm(false)}
          onClick={() => (confirm ? onRemove() : setConfirm(true))}
        >
          {confirm ? 'Remove the rule book?' : 'Remove'}
        </button>
      </div>
      <ul className={styles.rulePreview}>
        {rulebook.rules.slice(0, 5).map((rule) => (
          <li key={rule.code}>
            <span className={ui.mono}>{rule.code}</span> {rule.title}
          </li>
        ))}
        {rulebook.rules.length > 5 && (
          <li className={ui.faint}>…and {rulebook.rules.length - 5} more</li>
        )}
      </ul>
    </>
  )
}

/** Optional: the league's rule book, so the inspector can cite the rules broken. */
export function RulebookGroup({ rulebook }: { rulebook: Rulebook | null }) {
  const { importFile, remove } = useRulebookActions()
  return (
    <Group label="Rule book">
      <Row
        label="League rule book"
        help="Optional. Lets you pick the broken rules on each incident; they go in both CSV exports."
      >
        {rulebook ? (
          <Loaded rulebook={rulebook} onReplace={importFile} onRemove={remove} />
        ) : (
          <>
            <button type="button" className={cx(ui.btn, styles.source)} onClick={importFile}>
              <Icon name="file" size={15} />
              Import rule book…
            </button>
            <span className={cx(ui.faint, styles.inline)}>
              A .txt or .md file (Google Docs: File, Download, Plain text). Numbered lists get their
              full numbers (3.3.a); otherwise every line starting with a rule number is a rule.
            </span>
          </>
        )}
      </Row>
    </Group>
  )
}
