import { useState, type KeyboardEvent } from 'react'
import { Icon } from '../icons'
import { Kbd } from '../ui/primitives'
import { Footer, Results } from './PaletteResults'
import { useWorkspace } from '../workspace/Workspace'
import { usePaletteResults, type Result } from './usePaletteResults'
import styles from './CommandPalette.module.scss'

const MOVES: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }

/** Arrow keys move through the flat result list; Enter picks, Esc closes. */
function useListKeys(
  results: Result[],
  pick: (r: Result | undefined) => void,
  onClose: () => void,
) {
  const [active, setActive] = useState(0)
  const onKeyDown = (e: KeyboardEvent) => {
    const move = MOVES[e.key]
    if (move !== undefined) {
      e.preventDefault()
      setActive((i) => (i + move + results.length) % Math.max(results.length, 1))
    } else if (e.key === 'Enter') pick(results[active])
    else if (e.key === 'Escape') onClose()
  }
  return { active, setActive, onKeyDown }
}

/** design/07 — Ctrl K: one search for cars, incidents and actions. */
function Palette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const results = usePaletteResults(query)
  const pick = (result: Result | undefined) => {
    if (!result) return
    onClose()
    result.run()
  }
  const { active, setActive, onKeyDown } = useListKeys(results, pick, onClose)
  return (
    <div className={styles.scrim} onMouseDown={onClose}>
      <div
        className={styles.palette}
        role="dialog"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <label className={styles.input}>
          <Icon name="search" size={18} />
          <input
            autoFocus
            value={query}
            placeholder="Car, driver, #incident or action…"
            aria-label="Search"
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
          />
          <Kbd>Esc</Kbd>
        </label>
        <Results results={results} active={active} onPick={pick} onHover={setActive} />
        <Footer />
      </div>
    </div>
  )
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useWorkspace()
  return paletteOpen ? <Palette onClose={() => setPaletteOpen(false)} /> : null
}
