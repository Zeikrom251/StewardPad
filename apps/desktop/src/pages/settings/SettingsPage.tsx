import { useEffect, useState } from 'react'
import { backend } from '../../backend/backend'
import { useLive } from '../../backend/LiveProvider'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { AccountGroup } from './AccountGroup'
import { DisplayGroup } from './DisplayGroup'
import { Group, Row, SourceGroup, StorageGroup } from './SettingsGroups'
import { LookbackSetting } from './LookbackSetting'
import { RulebookGroup } from './RulebookGroup'
import { Shortcuts } from './Shortcuts'
import { UpdatesGroup } from './UpdatesGroup'
import styles from './SettingsPage.module.scss'

function StewardName({ current }: { current: string }) {
  const { report } = useWorkspace()
  const [text, setText] = useState(current)
  useEffect(() => setText(current), [current])
  const commit = () => {
    if (text.trim() === current) return
    backend
      .updateConfig({ stewardName: text.trim() })
      .catch((error: unknown) => report('Could not save your name', error))
  }
  return (
    <label className={cx(ui.field, styles.name)}>
      <input
        value={text}
        maxLength={80}
        placeholder="e.g. Julien Marchand"
        aria-label="Your name"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </label>
  )
}

/** design/06 — steward name, look-back, data source, storage, updates, keyboard. Changes save at once. */
export function SettingsPage() {
  const live = useLive()
  if (!live) return null
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.title}>
          <h1>Settings</h1>
          <span className={ui.muted}>Changes save immediately.</span>
        </div>
        <AccountGroup live={live} />
        <Group label="Steward">
          <Row
            label="Your name"
            help={
              live.team.leagueId
                ? 'Stamped as “Logged by” when stewarding on your own. In a league, your Discord name is.'
                : 'Stamped as “Logged by” on every incident you create.'
            }
          >
            <StewardName current={live.config.stewardName} />
          </Row>
        </Group>
        <RulebookGroup rulebook={live.config.rulebook ?? null} />
        <DisplayGroup />
        <Group label="Logging">
          <Row
            label="Look-back"
            help="How far back Space stamps an incident. You react after the moment, so this puts the timestamp where the replay needs to start."
          >
            <LookbackSetting
              seconds={live.config.lookbackSeconds}
              elapsed={live.session.elapsedSeconds}
            />
          </Row>
        </Group>
        <SourceGroup live={live} />
        <StorageGroup />
        <UpdatesGroup />
        <div className={styles.group}>
          <span className={ui.label}>Keyboard</span>
          <Shortcuts />
        </div>
      </div>
    </div>
  )
}
