import { useEffect, useState } from 'react'
import type { TeamView } from '@stewardpad/shared'
import { Icon } from '../icons'
import { syncState } from '../team/syncState'
import { useWorkspace } from '../workspace/Workspace'
import styles from './StatusBar.module.scss'

/** Where the timing comes from when a league stream is involved; null: this PC's own source. */
export function StreamSource({ view }: { view: TeamView }) {
  const stream = view.stream
  if (view.streaming) {
    const watching = Math.max(view.online.length - 1, 0)
    return (
      <span className={styles.item} data-link="streaming">
        <i className={styles.dot} />
        Streaming to <b className={styles.value}>{view.leagueName}</b> · {watching} watching
      </span>
    )
  }
  if (!view.watching || !stream) return null
  return (
    <span className={styles.item} data-link="stream">
      <i className={styles.dot} />
      Live from <b className={styles.value}>{stream.streamer.displayName}’s PC</b>
    </span>
  )
}

/** Synced, sending, offline, or off: what the league link is doing. */
export function SyncItem({ view }: { view: TeamView }) {
  const { go } = useWorkspace()
  const state = syncState(view)
  if (!state) return null
  return (
    <button type="button" className={styles.sync} data-tone={state.tone} onClick={() => go('team')}>
      <Icon name={state.icon} size={13} />
      {state.text}
    </button>
  )
}

const NOTICE_MS = 10_000

/** A league event worth a line for a few seconds (a dropped stream, a closed session). */
export function TeamNotice({ view }: { view: TeamView }) {
  const [seen, setSeen] = useState<string | null>(null)
  useEffect(() => {
    const notice = view.notice
    if (!notice) return
    const timer = window.setTimeout(() => setSeen(notice), NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [view.notice])
  if (!view.notice || seen === view.notice) return null
  return (
    <span className={styles.teamNotice}>
      <Icon name="alert" size={12} />
      {view.notice}
    </span>
  )
}
