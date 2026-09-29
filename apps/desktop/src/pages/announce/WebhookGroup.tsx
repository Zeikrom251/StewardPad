import { useState } from 'react'
import type { DiscordSettings } from '@stewardpad/shared'
import { useAnnouncer } from '../../announce/AnnouncerProvider'
import { Icon } from '../../icons'
import { CommitInput } from '../../ui/CommitInput'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { Group, Row } from '../settings/SettingsGroups'
import { isWebhookUrl } from './useDiscordSettings'
import styles from './AnnouncePage.module.scss'

/** The link is a password to the channel: hidden unless asked, checked while typing. */
function WebhookLink({ url, onCommit }: { url: string; onCommit: (url: string) => void }) {
  const [shown, setShown] = useState(false)
  return (
    <div className={styles.stack}>
      <div className={styles.inline}>
        <CommitInput
          type={shown ? 'text' : 'password'}
          value={url}
          onCommit={(next) => onCommit(next.trim())}
          label="Discord webhook link"
          placeholder="https://discord.com/api/webhooks/…"
          className={ui.grow}
        />
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={() => setShown(!shown)}>
          <Icon name="eye" size={14} />
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {url && (
        <span className={isWebhookUrl(url) ? styles.ok : styles.bad}>
          {isWebhookUrl(url) ? 'Discord webhook link' : 'Not a Discord webhook link'}
        </span>
      )}
    </div>
  )
}

function TestButton({ ready }: { ready: boolean }) {
  const { sendTest } = useAnnouncer()
  const { report } = useWorkspace()
  const [sending, setSending] = useState(false)
  const send = () => {
    setSending(true)
    sendTest()
      .catch((error: unknown) => report('Could not send the test message', error))
      .finally(() => setSending(false))
  }
  return (
    <button type="button" className={ui.btn} disabled={!ready || sending} onClick={send}>
      <Icon name="radio" size={14} />
      {sending ? 'Sending…' : 'Send a test message'}
    </button>
  )
}

export function WebhookGroup({
  settings,
  update,
}: {
  settings: DiscordSettings
  update: (patch: Partial<DiscordSettings>) => void
}) {
  return (
    <Group label="Webhook">
      <Row
        label="Webhook link"
        help="In Discord: the channel's settings, Integrations, Webhooks, Copy Webhook URL. It stays on this PC."
      >
        <WebhookLink url={settings.webhookUrl} onCommit={(webhookUrl) => update({ webhookUrl })} />
      </Row>
      <Row label="Sender" help="The name and picture the announcements come from.">
        <div className={styles.stack}>
          <CommitInput
            value={settings.username}
            onCommit={(username) => update({ username })}
            label="Sender name"
            placeholder="Race Control"
            maxLength={80}
          />
          <CommitInput
            value={settings.avatarUrl}
            onCommit={(avatarUrl) => update({ avatarUrl: avatarUrl.trim() })}
            label="Sender picture link"
            placeholder="https://…/league-logo.png (optional)"
          />
        </div>
      </Row>
      <Row label="Test" help="Posts a sample penalty to the channel, whatever is switched on.">
        <TestButton ready={isWebhookUrl(settings.webhookUrl)} />
      </Row>
    </Group>
  )
}
