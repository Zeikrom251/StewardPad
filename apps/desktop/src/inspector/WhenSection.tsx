import { useEffect, useState } from 'react'
import type { Incident } from '@stewardpad/shared'
import { Icon } from '../icons'
import { formatHms, parseHms } from '../lib/format'
import { cx } from '../ui/primitives'
import ui from '../ui/ui.module.scss'
import { useWorkspace } from '../workspace/Workspace'
import styles from './Inspector.module.scss'

const NUDGES = [-5, -1, 1, 5]

/** Typed time: commits on Enter or blur, reverts if it doesn't parse. */
function TimeInput({ seconds, onChange }: { seconds: number; onChange: (s: number) => void }) {
  const [text, setText] = useState(formatHms(seconds))
  useEffect(() => setText(formatHms(seconds)), [seconds])
  const commit = () => {
    const parsed = parseHms(text)
    if (parsed === null) setText(formatHms(seconds))
    else onChange(parsed)
  }
  return (
    <input
      className={styles.bigTime}
      value={text}
      aria-label="Session time (HH:MM:SS)"
      spellCheck={false}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}

/** When it happened: the look-back-adjusted time, nudges, and the replay reference to scrub to. */
export function WhenSection({
  incident,
  eventSeconds,
  onChange,
}: {
  incident: Incident
  eventSeconds: number
  onChange: (seconds: number) => void
}) {
  const { report } = useWorkspace()
  // The saved reference lags the draft by one autosave; re-stamp the time locally.
  const reference = incident.replayReference.replace(/\d{2,}:\d{2}:\d{2}/, formatHms(eventSeconds))
  const copy = () => {
    navigator.clipboard
      .writeText(reference)
      .catch((error: unknown) => report('Could not copy the replay reference', error))
  }
  const origin =
    incident.source === 'LMU'
      ? 'Detected by LMU · no look-back'
      : `Keypress ${formatHms(incident.loggedAtSeconds)} · ${incident.lookbackApplied}s look-back`
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={ui.label}>
          <Icon name="clock" size={13} />
          When
        </span>
        <span className={styles.hint}>{origin}</span>
      </div>
      <div className={styles.timeRow}>
        <TimeInput seconds={eventSeconds} onChange={onChange} />
        <span className={ui.grow} />
        {NUDGES.map((delta) => (
          <button
            key={delta}
            type="button"
            className={styles.nudge}
            aria-label={`${delta > 0 ? 'Later' : 'Earlier'} by ${Math.abs(delta)} seconds`}
            onClick={() => onChange(Math.max(0, eventSeconds + delta))}
          >
            {delta > 0 ? `+${delta}` : `−${-delta}`}
          </button>
        ))}
      </div>
      <div className={styles.replay}>
        <span className={styles.key}>Replay</span>
        <span className={cx(ui.mono, ui.grow, styles.reference)}>{reference}</span>
        <button type="button" className={cx(ui.btn, ui.sm)} onClick={copy}>
          <Icon name="copy" size={13} />
          Copy
        </button>
      </div>
    </section>
  )
}
