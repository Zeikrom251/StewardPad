import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { DiscordSettings } from '@stewardpad/shared'
import { buildPayload, fillTitle } from './discordEmbed'
import { SAMPLE_INCIDENT } from './sample'

const announcement = (title: string) => ({ enabled: true, title, color: '#e0598a' })
const settings: DiscordSettings = {
  enabled: true,
  webhookUrl: 'https://discord.com/api/webhooks/1/x',
  username: 'Race Control',
  avatarUrl: '',
  mention: '',
  footer: '',
  fields: {
    cars: true,
    rules: true,
    investigation: true,
    decision: true,
    penalty: true,
    sessionTime: true,
    reviewedBy: false,
  },
  events: {
    UNDER_INVESTIGATION: announcement('Under investigation · Incident {number}'),
    NO_FURTHER_ACTION: announcement('No further action · Incident {number}'),
    PENALTY_APPLIED: announcement('Penalty · {cars} · {type}'),
    DISMISSED: announcement('Dismissed · Incident {number}'),
  },
}

test('fills the title placeholders and leaves unknown ones as written', () => {
  assert.equal(fillTitle('#{number} {type} {nope}', SAMPLE_INCIDENT), '#12 Contact {nope}')
})

test('a penalty embed carries the cars, rules and penalty, colour as a number, no ping', () => {
  const embed = buildPayload(SAMPLE_INCIDENT, 'PENALTY_APPLIED', settings, 'Sebring').embeds[0]
  assert.equal(embed?.title, 'Penalty · #38, #85 · Contact')
  assert.equal(embed?.color, 0xe0598a)
  assert.deepEqual(
    embed?.fields.map((f) => f.name),
    ['Cars', 'Rules broken', 'Investigation', 'Decision', 'Penalty'],
  )
  const payload = buildPayload(SAMPLE_INCIDENT, 'PENALTY_APPLIED', settings, 'Sebring')
  assert.deepEqual(payload.allowed_mentions.parse, [])
})

test('under investigation shows no decision or penalty yet, and never the steward unless asked', () => {
  const embed = buildPayload(SAMPLE_INCIDENT, 'UNDER_INVESTIGATION', settings, 'Sebring').embeds[0]
  const names = embed?.fields.map((f) => f.name) ?? []
  assert.ok(
    !names.includes('Decision') && !names.includes('Penalty') && !names.includes('Reviewed by'),
  )
})

test('the editor entities read as characters in Discord', () => {
  const incident = { ...SAMPLE_INCIDENT, summary: 'Contact &amp; spin' }
  const embed = buildPayload(incident, 'PENALTY_APPLIED', settings, 'Sebring').embeds[0]
  assert.equal(embed?.fields.find((f) => f.name === 'Investigation')?.value, 'Contact & spin')
})
