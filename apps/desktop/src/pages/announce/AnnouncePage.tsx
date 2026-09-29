import type { DiscordSettings } from '@stewardpad/shared'
import { cx } from '../../ui/primitives'
import { Toggle } from '../../ui/Toggle'
import ui from '../../ui/ui.module.scss'
import { ContentGroup } from './ContentGroup'
import { EventsGroup } from './EventsGroup'
import { PreviewPanel } from './PreviewPanel'
import { QueuePanel } from './QueuePanel'
import { WebhookGroup } from './WebhookGroup'
import { isWebhookUrl, useDiscordSettings } from './useDiscordSettings'
import styles from './AnnouncePage.module.scss'

type State = 'live' | 'off' | 'unlinked'

const STATE_TEXT: Record<State, string> = {
  live: 'Live: status changes are posted',
  off: 'Off: nothing is posted',
  unlinked: 'Add a webhook link to go live',
}

function stateOf(settings: DiscordSettings): State {
  if (!isWebhookUrl(settings.webhookUrl)) return 'unlinked'
  return settings.enabled ? 'live' : 'off'
}

function Header({
  settings,
  onToggle,
}: {
  settings: DiscordSettings
  onToggle: (on: boolean) => void
}) {
  const state = stateOf(settings)
  return (
    <div className={styles.header}>
      <div className={styles.title}>
        <h1>Discord announcements</h1>
        <span className={ui.muted}>
          Each status change goes to your league&apos;s channel as it happens: under investigation,
          no further action, penalty, dismissed.
        </span>
      </div>
      <span className={styles.live} data-state={state}>
        <i />
        {STATE_TEXT[state]}
      </span>
      <Toggle on={settings.enabled} onChange={onToggle} label="Announce live on Discord" />
    </div>
  )
}

/** The Announce page: webhook and embed settings on the left, preview and queue on the right. */
export function AnnouncePage() {
  const discord = useDiscordSettings()
  const settings = discord.settings
  if (!settings) return null
  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <Header settings={settings} onToggle={(enabled) => discord.update({ enabled })} />
        <WebhookGroup settings={settings} update={discord.update} />
        <EventsGroup settings={settings} updateEvent={discord.updateEvent} />
        <ContentGroup
          settings={settings}
          update={discord.update}
          updateFields={discord.updateFields}
        />
      </div>
      <aside className={cx(styles.side)}>
        <PreviewPanel settings={settings} />
        <QueuePanel />
      </aside>
    </div>
  )
}
