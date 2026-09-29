import type {
  AnnouncedStatus,
  DiscordSettings,
  Incident,
  IncidentStatus,
  InvolvedCar,
} from '@stewardpad/shared'
import { formatHms } from '../lib/format'
import { ROLE_TEXT, lapOf, penalisedCar, penaltyText } from '../lib/incidentText'
import { TYPE_LABEL, classLabel } from '../lib/labels'

interface EmbedField {
  name: string
  value: string
}

export interface WebhookPayload {
  content?: string
  username?: string
  avatar_url?: string
  allowed_mentions: { parse: Array<'everyone' | 'roles' | 'users'> }
  embeds: Array<{
    title: string
    description: string
    color: number
    fields: EmbedField[]
    footer: { text: string }
    timestamp: string
  }>
}

// Discord refuses a message over these; cutting is better than losing the announcement.
const LIMIT = { title: 256, field: 1024, footer: 2048, content: 2000 }

export const isAnnounced = (status: IncidentStatus): status is AnnouncedStatus => status !== 'NOTED'

const cut = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`

/** The editor stores "&" as "&amp;"; Discord shows entities literally. */
const plain = (markdown: string) =>
  markdown
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()

/** "Penalty · Incident {number}" → "Penalty · Incident 12". */
export function fillTitle(template: string, incident: Incident): string {
  const values: Record<string, string> = {
    number: String(incident.sequenceNumber),
    type: TYPE_LABEL[incident.type],
    cars: incident.cars.map((c) => `#${c.carNumber}`).join(', '),
    time: formatHms(incident.eventSeconds),
    lap: lapOf(incident),
  }
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole)
}

const carLine = (car: InvolvedCar) =>
  `\`#${car.carNumber}\` **${car.driverName}** · ${classLabel(car.carClass)} · ${ROLE_TEXT[car.role]}`

/** The incident's parts the settings ask for, skipping any that are still empty. */
function fields(incident: Incident, status: AnnouncedStatus, s: DiscordSettings): EmbedField[] {
  const penalty = incident.penalty
  const car = penalisedCar(incident)
  const all: Array<[boolean, string, string]> = [
    [s.fields.cars, 'Cars', incident.cars.map(carLine).join('\n')],
    [
      s.fields.rules,
      'Rules broken',
      (incident.rules ?? []).map((r) => `**${r.code}** ${r.title}`).join('\n'),
    ],
    [s.fields.investigation, 'Investigation', plain(incident.summary)],
    [s.fields.decision && status !== 'UNDER_INVESTIGATION', 'Decision', plain(incident.decision)],
    [
      s.fields.penalty && status === 'PENALTY_APPLIED' && penalty !== null,
      'Penalty',
      penalty
        ? `**${penaltyText(penalty)}** for car ${penalty.appliedTo}${car ? ` (${car.driverName})` : ''}`
        : '',
    ],
    [s.fields.reviewedBy, 'Reviewed by', incident.reviewedBy ?? ''],
  ]
  return all
    .filter(([shown, , value]) => shown && value !== '')
    .map(([, name, value]) => ({ name, value: cut(value, LIMIT.field) }))
}

/** One status change as a webhook message: the embed styled per the Announce page. */
export function buildPayload(
  incident: Incident,
  status: AnnouncedStatus,
  settings: DiscordSettings,
  trackName: string,
): WebhookPayload {
  const style = settings.events[status]
  const when = settings.fields.sessionTime
    ? ` · Session time ${formatHms(incident.eventSeconds)} · Lap ${lapOf(incident) || 'n/a'}`
    : ''
  const mention = settings.mention.trim()
  return {
    content: mention ? cut(mention, LIMIT.content) : undefined,
    username: settings.username.trim() || undefined,
    avatar_url: settings.avatarUrl.trim() || undefined,
    // Only a mention the stewards typed may ping anyone.
    allowed_mentions: { parse: mention ? ['everyone', 'roles', 'users'] : [] },
    embeds: [
      {
        title: cut(fillTitle(style.title, incident), LIMIT.title),
        description: `**${TYPE_LABEL[incident.type]}**${when}`,
        color: parseInt(style.color.slice(1), 16),
        fields: fields(incident, status, settings),
        footer: { text: cut(settings.footer.trim() || `StewardPad · ${trackName}`, LIMIT.footer) },
        timestamp: new Date().toISOString(),
      },
    ],
  }
}
