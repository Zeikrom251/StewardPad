import type { DiscordSettings, EmbedFields } from '@stewardpad/shared'
import { Icon } from '../../icons'
import { CommitInput } from '../../ui/CommitInput'
import ui from '../../ui/ui.module.scss'
import { Group, Row } from '../settings/SettingsGroups'
import styles from './AnnouncePage.module.scss'

const FIELDS: Array<[keyof EmbedFields, string]> = [
  ['cars', 'Cars and roles'],
  ['rules', 'Rules broken'],
  ['investigation', 'Investigation'],
  ['decision', 'Decision'],
  ['penalty', 'Penalty'],
  ['sessionTime', 'Session time and lap'],
  ['reviewedBy', 'Steward’s name'],
]

function FieldChecks({
  fields,
  onChange,
}: {
  fields: EmbedFields
  onChange: (patch: Partial<EmbedFields>) => void
}) {
  return (
    <div className={styles.checks}>
      {FIELDS.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="checkbox"
          aria-checked={fields[key]}
          onClick={() => onChange({ [key]: !fields[key] })}
        >
          <span className={ui.check} aria-checked={fields[key]}>
            {fields[key] && <Icon name="check" size={11} strokeWidth={3} />}
          </span>
          {label}
        </button>
      ))}
    </div>
  )
}

export function ContentGroup({
  settings,
  update,
  updateFields,
}: {
  settings: DiscordSettings
  update: (patch: Partial<DiscordSettings>) => void
  updateFields: (patch: Partial<EmbedFields>) => void
}) {
  return (
    <Group label="The message">
      <Row
        label="Embed shows"
        help="Each status change sends one message at once, with the incident as it is then. Empty parts are left out."
      >
        <FieldChecks fields={settings.fields} onChange={updateFields} />
      </Row>
      <Row
        label="Mention"
        help="Posted above the embed to ping someone: @here, or a role as <@&role id>. Empty: no ping."
      >
        <CommitInput
          value={settings.mention}
          onCommit={(mention) => update({ mention })}
          label="Mention"
          placeholder="@here"
          maxLength={200}
        />
      </Row>
      <Row
        label="Footer"
        help="The small line under each embed. Empty: StewardPad and the circuit."
      >
        <CommitInput
          value={settings.footer}
          onCommit={(footer) => update({ footer })}
          label="Footer"
          placeholder="Endurance League · Round 4"
          maxLength={2048}
        />
      </Row>
    </Group>
  )
}
