import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { AnnouncedStatus, Incident } from '@stewardpad/shared'
import { onBackendEvent, type Snapshot } from '../backend/backend'
import { useLive } from '../backend/LiveProvider'
import { buildPayload, fillTitle, isAnnounced } from './discordEmbed'
import { SAMPLE_INCIDENT } from './sample'
import { postWebhook } from './webhook'

export interface Delivery {
  id: string
  /** The incident as it was announced (kept for Retry); null for the test message. */
  incident: Incident | null
  status: AnnouncedStatus
  at: number
  outcome: 'sent' | 'failed'
  detail: string
}

type Latest = MutableRefObject<Snapshot | null>
type RecordDelivery = (entry: Omit<Delivery, 'id' | 'at'>) => void

const LOG_SIZE = 50
const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

function useLog() {
  const [log, setLog] = useState<Delivery[]>([])
  const record = useCallback<RecordDelivery>((entry) => {
    setLog((all) =>
      [{ ...entry, id: crypto.randomUUID(), at: Date.now() }, ...all].slice(0, LOG_SIZE),
    )
  }, [])
  return { log, record }
}

/**
 * One message per status change, sent at once and one after another: two quick changes
 * (Investigating, then Penalty) reach the channel in the order they were made.
 */
function useSender(latest: Latest, record: RecordDelivery) {
  const chain = useRef<Promise<void>>(Promise.resolve())
  return useCallback(
    (incident: Incident, status: AnnouncedStatus, testNote?: string) => {
      chain.current = chain.current.then(async () => {
        const snapshot = latest.current
        const settings = snapshot?.config.discord
        if (!snapshot || !settings) return
        const payload = buildPayload(incident, status, settings, snapshot.session.trackName)
        if (testNote) payload.content = testNote
        const entry = { incident: testNote ? null : incident, status }
        try {
          await postWebhook(settings.webhookUrl, payload)
          const title = fillTitle(settings.events[status].title, incident)
          record({ ...entry, outcome: 'sent', detail: testNote ? 'Test message' : title })
        } catch (error: unknown) {
          record({ ...entry, outcome: 'failed', detail: reason(error) })
        }
      })
      return chain.current
    },
    [latest, record],
  )
}

/** Everything the Announce page shows and does; lives for the app's life (AnnouncerProvider). */
export function useAnnouncerState() {
  const live = useLive()
  const latest = useRef(live)
  latest.current = live
  const { log, record } = useLog()
  const send = useSender(latest, record)

  useEffect(() => {
    const stop = onBackendEvent('announcement:due', ({ incident }) => {
      const settings = latest.current?.config.discord
      const status = incident.status
      if (!settings?.enabled || !settings.webhookUrl.trim() || !isAnnounced(status)) return
      if (settings.events[status].enabled) void send(incident, status)
    })
    return () => {
      stop
        .then((unlisten) => unlisten())
        .catch((error: unknown) => console.error('Failed to stop the announcement listener', error))
    }
  }, [send])

  const retry = (delivery: Delivery) => {
    if (delivery.incident) void send(delivery.incident, delivery.status)
  }
  const sendTest = async () => {
    if (!latest.current?.config.discord?.webhookUrl.trim()) {
      throw new Error('Paste the webhook link first')
    }
    await send(
      SAMPLE_INCIDENT,
      'PENALTY_APPLIED',
      'Test from StewardPad: this is how a penalty will be announced.',
    )
  }
  return { log, retry, sendTest }
}

export type Announcer = ReturnType<typeof useAnnouncerState>
