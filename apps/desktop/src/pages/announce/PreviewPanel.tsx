import { useState } from 'react'
import type { AnnouncedStatus, DiscordSettings, Incident } from '@stewardpad/shared'
import { buildPayload, type WebhookPayload } from '../../announce/discordEmbed'
import { SAMPLE_INCIDENT } from '../../announce/sample'
import { useLive } from '../../backend/LiveProvider'
import { STATUS } from '../../lib/labels'
import { Segmented } from '../../ui/Segmented'
import ui from '../../ui/ui.module.scss'
import { DiscordText } from './discordText'
import { ANNOUNCED } from './useDiscordSettings'
import styles from './AnnouncePage.module.scss'

/** A Discord message as the channel shows it, from the exact payload that would be sent. */
function DiscordMessage({ payload }: { payload: WebhookPayload }) {
  const embed = payload.embeds[0]
  const name = payload.username ?? 'Webhook'
  return (
    <div className={styles.discord}>
      <span className={styles.avatar}>
        {payload.avatar_url ? <img src={payload.avatar_url} alt="" /> : name.slice(0, 1)}
      </span>
      <div className={styles.message}>
        <div className={styles.author}>
          <b>{name}</b>
          <span className={styles.appTag}>APP</span>
          <span className={styles.stamp}>Today at {new Date().toTimeString().slice(0, 5)}</span>
        </div>
        {payload.content && <DiscordText text={payload.content} />}
        {embed && (
          <div
            className={styles.embed}
            style={{ borderLeftColor: `#${embed.color.toString(16).padStart(6, '0')}` }}
          >
            <b className={styles.embedTitle}>{embed.title}</b>
            <DiscordText text={embed.description} />
            {embed.fields.map((field) => (
              <div key={field.name} className={styles.field}>
                <b>{field.name}</b>
                <DiscordText text={field.value} />
              </div>
            ))}
            <span className={styles.footer}>{embed.footer.text}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/** The latest real incident with that status, else the sample: what the channel will see. */
function exampleFor(
  incidents: Incident[],
  status: AnnouncedStatus,
): { incident: Incident; real: boolean } {
  const real = [...incidents].reverse().find((i) => i.status === status && i.mergedIntoId === null)
  return real
    ? { incident: real, real: true }
    : { incident: { ...SAMPLE_INCIDENT, status }, real: false }
}

export function PreviewPanel({ settings }: { settings: DiscordSettings }) {
  const live = useLive()
  const [status, setStatus] = useState<AnnouncedStatus>('PENALTY_APPLIED')
  const { incident, real } = exampleFor(live?.incidents ?? [], status)
  const payload = buildPayload(incident, status, settings, live?.session.trackName ?? '')
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={ui.label}>Preview</span>
        <Segmented
          value={status}
          options={ANNOUNCED.map((s) => [s, STATUS[s].short])}
          onChange={setStatus}
        />
      </div>
      <p className={styles.note}>
        {!settings.events[status].enabled
          ? 'Switched off: this status is not announced.'
          : real
            ? `Incident ${incident.sequenceNumber}, the latest with this status.`
            : 'A sample incident: no incident has this status yet.'}
      </p>
      <DiscordMessage payload={payload} />
    </section>
  )
}
