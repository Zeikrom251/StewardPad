import { useCallback, useEffect, useState } from 'react'
import { getVersion } from '@tauri-apps/api/app'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { backend } from '../backend/backend'
import { useWorkspace } from '../workspace/Workspace'
import { failureReason } from './failureReason'

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'latest' }
  | { kind: 'available'; update: Update }
  | { kind: 'downloading'; update: Update; percent: number | null }
  | { kind: 'installing'; update: Update }
  | { kind: 'failed'; reason: string }

export interface Updater {
  /** This build's version, from tauri.conf.json. */
  current: string | null
  state: UpdateState
  checkNow: () => void
  /** Downloads the new version, saves the session, then runs the installer (it closes the app). */
  install: () => void
}

// Let the app settle before reaching out: the check never delays the first screen.
const STARTUP_DELAY_MS = 5_000

export function useUpdaterState(): Updater {
  const { report } = useWorkspace()
  const [current, setCurrent] = useState<string | null>(null)
  const [state, setState] = useState<UpdateState>({ kind: 'idle' })

  const checkNow = useCallback(() => {
    setState({ kind: 'checking' })
    check()
      .then((update) => setState(update ? { kind: 'available', update } : { kind: 'latest' }))
      .catch((error: unknown) => {
        // Offline at the track is normal: Settings says why, and the steward can retry there.
        console.warn('[update] Could not check for a new version:', error)
        setState({ kind: 'failed', reason: failureReason(error) })
      })
  }, [])

  useEffect(() => {
    getVersion()
      .then(setCurrent)
      .catch((error: unknown) => console.warn('[update] Could not read the app version:', error))
    const timer = window.setTimeout(checkNow, STARTUP_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [checkNow])

  const install = useCallback(() => {
    if (state.kind !== 'available') return
    const { update } = state
    let total = 0
    let received = 0
    let shown: number | null = null
    setState({ kind: 'downloading', update, percent: null })
    update
      .download((event) => {
        if (event.event === 'Started') total = event.data.contentLength ?? 0
        if (event.event !== 'Progress' || total === 0) return
        received += event.data.chunkLength
        const percent = Math.floor((received * 100) / total)
        if (percent === shown) return
        shown = percent
        setState({ kind: 'downloading', update, percent })
      })
      .then(() => backend.flushSession())
      .then(() => {
        setState({ kind: 'installing', update })
        return update.install()
      })
      .catch((error: unknown) => {
        report('Could not install the update', error)
        setState({ kind: 'available', update })
      })
  }, [state, report])

  return { current, state, checkNow, install }
}
