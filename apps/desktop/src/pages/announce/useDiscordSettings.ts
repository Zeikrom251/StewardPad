import type {
  AnnouncedStatus,
  Announcement,
  DiscordSettings,
  EmbedFields,
} from '@stewardpad/shared'
import { backend } from '../../backend/backend'
import { useLive } from '../../backend/LiveProvider'
import { useWorkspace } from '../../workspace/Workspace'

/** The saved Discord settings and patch-style updates; each change saves at once. */
export function useDiscordSettings() {
  const { report } = useWorkspace()
  const settings = useLive()?.config.discord ?? null
  const update = (patch: Partial<DiscordSettings>) => {
    if (!settings) return
    backend
      .updateConfig({ discord: { ...settings, ...patch } })
      .catch((error: unknown) => report('Could not save the Discord settings', error))
  }
  const updateEvent = (status: AnnouncedStatus, patch: Partial<Announcement>) => {
    if (!settings) return
    update({ events: { ...settings.events, [status]: { ...settings.events[status], ...patch } } })
  }
  const updateFields = (patch: Partial<EmbedFields>) => {
    if (settings) update({ fields: { ...settings.fields, ...patch } })
  }
  return { settings, update, updateEvent, updateFields }
}

const WEBHOOK_HOSTS = [
  'https://discord.com/api/webhooks/',
  'https://discordapp.com/api/webhooks/',
  'https://ptb.discord.com/api/webhooks/',
  'https://canary.discord.com/api/webhooks/',
]

/** The same check as settings/discord.rs, to say so while typing rather than on save. */
export const isWebhookUrl = (url: string) =>
  WEBHOOK_HOSTS.some((host) => url.trim().startsWith(host))

export const ANNOUNCED: AnnouncedStatus[] = [
  'UNDER_INVESTIGATION',
  'NO_FURTHER_ACTION',
  'PENALTY_APPLIED',
  'DISMISSED',
]
