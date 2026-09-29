import type { WebhookPayload } from './discordEmbed'

// Discord's per-webhook limit is 5 messages per 2 s: one wait-and-retry covers a burst.
const MAX_RETRY_WAIT_MS = 10_000

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (error: unknown) {
    console.warn(`Discord answered ${response.status} without a JSON body`, error)
    return null
  }
}

function field(body: unknown, key: string): unknown {
  if (typeof body !== 'object' || body === null) return undefined
  return Object.entries(body).find(([name]) => name === key)?.[1]
}

/** Discord's reply as something a steward can act on. */
function describe(status: number, body: unknown): string {
  if (status === 401 || status === 404) return 'The webhook link is wrong or was deleted in Discord'
  if (status === 429) return 'Discord is rate-limiting this webhook: try again in a moment'
  const message = field(body, 'message')
  return `Discord refused the message (${status}${typeof message === 'string' ? `: ${message}` : ''})`
}

/** Posts one message; throws with a readable reason. `?wait=true` makes Discord confirm it. */
export async function postWebhook(url: string, payload: WebhookPayload): Promise<void> {
  const target = `${url.trim()}${url.includes('?') ? '&' : '?'}wait=true`
  for (let attempt = 0; ; attempt++) {
    let response: Response
    try {
      response = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (error: unknown) {
      console.error('Discord webhook unreachable', error)
      throw new Error('Could not reach Discord: check the internet connection')
    }
    if (response.ok) return
    const body = await readJson(response)
    const retryAfter = field(body, 'retry_after')
    if (response.status === 429 && attempt === 0 && typeof retryAfter === 'number') {
      await new Promise((done) => setTimeout(done, Math.min(retryAfter * 1000, MAX_RETRY_WAIT_MS)))
      continue
    }
    throw new Error(describe(response.status, body))
  }
}
