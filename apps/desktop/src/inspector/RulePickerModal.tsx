import type { RuleRef } from '@stewardpad/shared'
import { inBookOrder, ruleDepth, searchRules } from '../lib/rules'
import { cx } from '../ui/primitives'
import { PickerDialog } from '../ui/PickerDialog'
import { usePickList } from '../ui/usePickList'
import ui from '../ui/ui.module.scss'
import styles from './RulePicker.module.scss'

/** Rules broken → Select: the whole rule book, full titles, as many rules as apply. */
export function RulePickerModal({
  book,
  picked,
  onApply,
  onClose,
}: {
  book: RuleRef[]
  picked: RuleRef[]
  onApply: (rules: RuleRef[]) => void
  onClose: () => void
}) {
  const list = usePickList<RuleRef>({
    initial: picked.map((r) => r.code),
    keyOf: (r) => r.code,
    filter: (query) => searchRules(book, query),
  })
  const result = inBookOrder(book, picked, list.chosen)
  return (
    <PickerDialog
      label="Rules broken"
      placeholder="Find a rule by number (3.3) or words (collision)"
      list={list}
      total={book.length}
      summary={result.map((r) => r.code)}
      empty="No rule matches."
      onApply={() => onApply(result)}
      onClose={onClose}
      row={(rule) => (
        <span className={styles.rule} data-depth={ruleDepth(rule.code)}>
          <span className={cx(ui.mono, styles.code)}>{rule.code}</span>
          <span className={styles.title}>{rule.title}</span>
        </span>
      )}
    />
  )
}
