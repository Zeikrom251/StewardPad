import { useEffect, useRef } from 'react'
import type { AnnouncedStatus, Announcement, DiscordSettings } from '@stewardpad/shared'
import { CommitInput } from '../../ui/CommitInput'
import { StatusChip } from '../../ui/primitives'
import { Toggle } from '../../ui/Toggle'
import { Group, Row } from '../settings/SettingsGroups'
import { ANNOUNCED } from './useDiscordSettings'
import styles from './AnnouncePage.module.scss'

/**
 * The native colour picker, saved once when it closes (its "change" event): React's
 * onChange fires on every drag step, which would save dozens of times a second.
 */
function ColorInput({
  value,
  label,
  onCommit,
}: {
  value: string
  label: string
  onCommit: (color: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const commit = useRef(onCommit)
  commit.current = onCommit
  useEffect(() => {
    const el = input.current
    if (!el) return
    const save = () => commit.current(el.value)
    el.addEventListener('change', save)
    return () => el.removeEventListener('change', save)
    // `value` remounts the input (see its key), so the listener moves to the new one.
  }, [value])
  // Keyed by the saved colour, so a save from elsewhere resets the uncontrolled input.
  return (
    <input
      key={value}
      ref={input}
      type="color"
      className={styles.color}
      defaultValue={value}
      aria-label={label}
    />
  )
}

function EventRow({
  status,
  style,
  onChange,
}: {
  status: AnnouncedStatus
  style: Announcement
  onChange: (patch: Partial<Announcement>) => void
}) {
  return (
    <div className={styles.event} data-off={!style.enabled || undefined}>
      <Toggle
        on={style.enabled}
        onChange={(enabled) => onChange({ enabled })}
        label={`Announce ${status}`}
      />
      <span className={styles.eventStatus}>
        <StatusChip status={status} />
      </span>
      <CommitInput
        value={style.title}
        onCommit={(title) => onChange({ title })}
        label={`Title for ${status}`}
        maxLength={200}
        className={styles.eventTitle}
      />
      <ColorInput
        value={style.color}
        label={`Colour for ${status}`}
        onCommit={(color) => onChange({ color })}
      />
    </div>
  )
}

export function EventsGroup({
  settings,
  updateEvent,
}: {
  settings: DiscordSettings
  updateEvent: (status: AnnouncedStatus, patch: Partial<Announcement>) => void
}) {
  return (
    <Group label="What to announce">
      <Row
        label="Status changes"
        help="Each one on or off, with its title and colour. The title fills in {number}, {type}, {cars}, {time} and {lap}."
      >
        <div className={styles.events}>
          {ANNOUNCED.map((status) => (
            <EventRow
              key={status}
              status={status}
              style={settings.events[status]}
              onChange={(patch) => updateEvent(status, patch)}
            />
          ))}
        </div>
      </Row>
    </Group>
  )
}
