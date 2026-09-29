import type { Incident, RulebookCheck } from '@stewardpad/shared'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import styles from './RulesPage.module.scss'

/** Rules cited this session that the edit removed or renumbered. */
function lostCitations(incidents: Incident[], check: RulebookCheck): string[] {
  const kept = new Set(check.rules.map((r) => r.code))
  const cited = incidents.flatMap((i) => (i.rules ?? []).map((r) => r.code))
  return [...new Set(cited)].filter((code) => !kept.has(code))
}

function Problems({ check, incidents }: { check: RulebookCheck; incidents: Incident[] }) {
  const lost = lostCitations(incidents, check)
  if (check.problems.length === 0 && lost.length === 0) return null
  return (
    <ul className={styles.problems} aria-live="polite">
      {check.problems.map((p, i) => (
        <li key={i} data-level="error">
          <Icon name="alert" size={14} />
          <span>
            {p.message}
            {p.line && <code>{p.line}</code>}
          </span>
        </li>
      ))}
      {lost.map((code) => (
        <li key={code} data-level="warning">
          <Icon name="alert" size={14} />
          <span>
            Rule {code} is cited this session but is no longer in the book. Those incidents keep the
            old wording.
          </span>
        </li>
      ))}
    </ul>
  )
}

/** A pasted Google Docs / Word list: offered its full numbers before any other problem. */
function OutlineBanner({ onNumber }: { onNumber: () => void }) {
  return (
    <div className={styles.outline} role="status">
      <Icon name="numbered" size={16} />
      <span className={ui.grow}>
        This looks like a numbered list from Google Docs or Word: every level starts again at
        &ldquo;1.&rdquo;, so the numbers repeat. StewardPad can write each rule&apos;s full number
        (3.3.a, 3.4.b.iii), the way the league cites them.
      </span>
      <button type="button" className={cx(ui.btn, ui.primary, ui.sm)} onClick={onNumber}>
        Number the rules
      </button>
    </div>
  )
}

/** What stops the save, or the one fix that clears most of it. */
export function RuleProblems({
  check,
  incidents,
  onNumber,
}: {
  check: RulebookCheck
  incidents: Incident[]
  onNumber: () => void
}) {
  if (check.outline) return <OutlineBanner onNumber={onNumber} />
  return <Problems check={check} incidents={incidents} />
}
