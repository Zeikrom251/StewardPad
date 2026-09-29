import { useState } from 'react'
import type { Incident, Rulebook } from '@stewardpad/shared'
import { backend } from '../../backend/backend'
import { useLive } from '../../backend/LiveProvider'
import { saveDialog } from '../../lib/saveDialog'
import { Icon } from '../../icons'
import { searchRules } from '../../lib/rules'
import { sortByTime } from '../../lib/incidentFilters'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { useRulebookActions } from '../settings/RulebookGroup'
import { RuleRow } from './RuleRow'
import { rulebookText } from './useRulebookEdit'
import styles from './RulesPage.module.scss'

/** Rule code → the incidents citing it, in race order. */
function citationsByRule(incidents: Incident[]): Map<string, Incident[]> {
  const byRule = new Map<string, Incident[]>()
  for (const incident of sortByTime(incidents, false)) {
    for (const rule of incident.rules ?? []) {
      byRule.set(rule.code, [...(byRule.get(rule.code) ?? []), incident])
    }
  }
  return byRule
}

/** The book as Markdown, to send the edited version to the other stewards or the league. */
function useSaveAsMarkdown(rulebook: Rulebook) {
  const { report } = useWorkspace()
  const folder = useLive()?.config.exportDir ?? ''
  return () => {
    saveDialog(folder, `${rulebook.name}.md`, { name: 'Markdown', extensions: ['md'] })
      .then((path) => (path ? backend.saveMarkdown(path, rulebookText(rulebook)) : undefined))
      .catch((error: unknown) => report('Could not save the rule book', error))
  }
}

/** Read mode: the rules, searchable, each with how often it was cited this session. */
export function BookView({
  rulebook,
  incidents,
  onEdit,
}: {
  rulebook: Rulebook
  incidents: Incident[]
  onEdit: () => void
}) {
  const { importFile } = useRulebookActions()
  const saveAs = useSaveAsMarkdown(rulebook)
  const [query, setQuery] = useState('')
  const [onlyCited, setOnlyCited] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const citations = citationsByRule(incidents)
  const shown = searchRules(rulebook.rules, query, []).filter(
    (r) => !onlyCited || citations.has(r.code),
  )
  return (
    <div className={styles.page}>
      <div className={ui.toolbar}>
        <h1>Rule book</h1>
        <span className={cx(ui.trunc, ui.faint, styles.small)}>{rulebook.name}</span>
        <span className={ui.grow} />
        <label className={cx(ui.field, styles.search)}>
          <Icon name="search" size={14} className={ui.faint} />
          <input
            value={query}
            placeholder="Number or words"
            aria-label="Search the rule book"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className={ui.seg}>
          <button type="button" aria-pressed={!onlyCited} onClick={() => setOnlyCited(false)}>
            All<span className={ui.count}>{rulebook.rules.length}</span>
          </button>
          <button type="button" aria-pressed={onlyCited} onClick={() => setOnlyCited(true)}>
            Cited<span className={ui.count}>{citations.size}</span>
          </button>
        </span>
        <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={importFile}>
          Replace…
        </button>
        <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={saveAs}>
          <Icon name="download" size={14} />
          Save as .md…
        </button>
        <button type="button" className={cx(ui.btn, ui.sm)} onClick={onEdit}>
          <Icon name="file" size={14} />
          Edit
        </button>
      </div>
      <ul className={styles.rules}>
        {shown.map((rule) => (
          <RuleRow
            key={rule.code}
            rule={rule}
            citedBy={citations.get(rule.code) ?? []}
            expanded={expanded === rule.code}
            onToggle={() => setExpanded(expanded === rule.code ? null : rule.code)}
          />
        ))}
        {shown.length === 0 && (
          <li className={styles.none}>
            {onlyCited && !query ? 'No rule cited yet this session.' : 'No rule matches.'}
          </li>
        )}
      </ul>
    </div>
  )
}
