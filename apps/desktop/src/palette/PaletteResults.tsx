import { useEffect, useRef } from 'react'
import { Icon } from '../icons'
import { Kbd, cx } from '../ui/primitives'
import ui from '../ui/ui.module.scss'
import type { Result } from './usePaletteResults'
import styles from './CommandPalette.module.scss'

function Option({
  result,
  active,
  onPick,
  onHover,
}: {
  result: Result
  active: boolean
  onPick: () => void
  onHover: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])
  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={active}
      className={styles.option}
      onClick={onPick}
      onMouseMove={onHover}
    >
      <span className={styles.lead}>{result.lead}</span>
      <span className={styles.main}>
        <span className={ui.trunc}>{result.main}</span>
        {result.sub && <span className={cx(ui.muted, ui.trunc, styles.sub)}>{result.sub}</span>}
      </span>
      {result.right && <span className={styles.right}>{result.right}</span>}
    </button>
  )
}

export function Footer() {
  return (
    <div className={styles.foot}>
      <span>
        <Icon name="updown" size={13} />
        Navigate
      </span>
      <span>
        <Icon name="enter" size={13} />
        Open
      </span>
      <span>
        <Kbd>Esc</Kbd>
        Close
      </span>
      <span className={ui.grow} />
      <span className={ui.faint}>
        Type <b className={ui.mono}>#12</b> to jump to an incident
      </span>
    </div>
  )
}

/** Results under their group labels; `active` indexes the flat list. */
export function Results({
  results,
  active,
  onPick,
  onHover,
}: {
  results: Result[]
  active: number
  onPick: (r: Result) => void
  onHover: (i: number) => void
}) {
  const groups = [...new Set(results.map((r) => r.group))]
  return (
    <div className={styles.results} role="listbox">
      {groups.map((group) => (
        <div key={group} className={styles.group}>
          <span className={ui.label}>{group}</span>
          {results.map((r, i) =>
            r.group === group ? (
              <Option
                key={r.key}
                result={r}
                active={i === active}
                onPick={() => onPick(r)}
                onHover={() => onHover(i)}
              />
            ) : null,
          )}
        </div>
      ))}
      {results.length === 0 && <p className={styles.empty}>Nothing matches.</p>}
    </div>
  )
}
