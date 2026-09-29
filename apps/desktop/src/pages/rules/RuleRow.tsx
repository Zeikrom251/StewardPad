import type { Incident, RuleRef } from '@stewardpad/shared'
import { Icon } from '../../icons'
import { formatHms } from '../../lib/format'
import { TYPE_LABEL } from '../../lib/labels'
import { ruleDepth } from '../../lib/rules'
import { StatusChip, cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import styles from './RulesPage.module.scss'

function Citations({ incidents }: { incidents: Incident[] }) {
  const { go, openIncident } = useWorkspace()
  const open = (id: string) => {
    openIncident(id)
    go('review')
  }
  return (
    <ul className={styles.citations}>
      {incidents.map((i) => (
        <li key={i.id}>
          <button type="button" onClick={() => open(i.id)}>
            <span className={cx(ui.mono, ui.faint)}>#{i.sequenceNumber}</span>
            <span className={ui.mono}>{formatHms(i.eventSeconds)}</span>
            <b className={ui.grow}>{TYPE_LABEL[i.type]}</b>
            <StatusChip status={i.status} />
          </button>
        </li>
      ))}
    </ul>
  )
}

/** One rule; a cited rule expands to the incidents that cite it this session. */
export function RuleRow({
  rule,
  citedBy,
  expanded,
  onToggle,
}: {
  rule: RuleRef
  citedBy: Incident[]
  expanded: boolean
  onToggle: () => void
}) {
  const cited = citedBy.length > 0
  return (
    <li className={styles.rule} data-depth={ruleDepth(rule.code)}>
      <button
        type="button"
        className={styles.ruleLine}
        disabled={!cited}
        aria-expanded={cited ? expanded : undefined}
        onClick={onToggle}
      >
        <span className={cx(ui.mono, styles.code)}>{rule.code}</span>
        <span className={cx(ui.grow, styles.title)}>{rule.title}</span>
        {cited && (
          <span className={styles.cited}>
            Cited {citedBy.length}×
            <Icon name="down" size={13} className={styles.chevron} />
          </span>
        )}
      </button>
      {expanded && cited && <Citations incidents={citedBy} />}
    </li>
  )
}
