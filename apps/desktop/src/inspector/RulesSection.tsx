import { useState } from 'react'
import type { RuleRef } from '@stewardpad/shared'
import { useLive } from '../backend/LiveProvider'
import { Icon } from '../icons'
import { AudienceTag, cx } from '../ui/primitives'
import ui from '../ui/ui.module.scss'
import { useWorkspace } from '../workspace/Workspace'
import { Collapsible } from './Collapsible'
import { RulePickerModal } from './RulePickerModal'
import styles from './Inspector.module.scss'

/** Which rules were broken, picked from the league's rule book (Settings → Rule book). */
export function RulesSection({
  rules,
  onChange,
}: {
  rules: RuleRef[]
  onChange: (rules: RuleRef[]) => void
}) {
  const rulebook = useLive()?.config.rulebook ?? null
  const { go } = useWorkspace()
  const [picking, setPicking] = useState(false)
  return (
    <Collapsible
      id="rules"
      icon="file"
      title="Rules broken"
      summary={rules.length ? rules.map((r) => r.code).join(', ') : 'None'}
      aside={<AudienceTag audience="public">Visible to drivers</AudienceTag>}
    >
      {rules.map((rule) => (
        <div key={rule.code} className={styles.rule}>
          <span className={ui.mono}>{rule.code}</span>
          <span className={ui.grow}>{rule.title}</span>
          <button
            type="button"
            className={ui.iconBtn}
            aria-label={`Remove rule ${rule.code}`}
            onClick={() => onChange(rules.filter((r) => r.code !== rule.code))}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
      {rulebook ? (
        <button
          type="button"
          className={cx(ui.btn, styles.pickRules)}
          onClick={() => setPicking(true)}
        >
          <Icon name="book" size={14} />
          {rules.length ? 'Change the rules broken…' : 'Select the rules broken…'}
        </button>
      ) : (
        <p className={cx(styles.hint, styles.noRulebook)}>
          No rule book loaded.{' '}
          <button type="button" onClick={() => go('settings')}>
            Add your league&apos;s in Settings
          </button>
        </p>
      )}
      {picking && rulebook && (
        <RulePickerModal
          book={rulebook.rules}
          picked={rules}
          onApply={onChange}
          onClose={() => setPicking(false)}
        />
      )}
    </Collapsible>
  )
}
