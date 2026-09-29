import { useEffect, useRef, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'

/**
 * Files dragged from the OS onto the window, while the calling page is mounted. Tauri
 * catches the drop itself (the page's HTML drop event never gets real paths) and hands
 * over absolute paths. `dragging` is true while files hover the window.
 */
export function useFileDrop(onDrop: (paths: string[]) => void): boolean {
  const [dragging, setDragging] = useState(false)
  const latest = useRef(onDrop)
  latest.current = onDrop

  useEffect(() => {
    if (!isTauri()) return
    let stop: UnlistenFn | undefined
    let cancelled = false
    getCurrentWebview()
      .onDragDropEvent(({ payload }) => {
        setDragging(payload.type === 'enter' || payload.type === 'over')
        if (payload.type === 'drop') latest.current(payload.paths)
      })
      .then((unlisten) => (cancelled ? unlisten() : (stop = unlisten)))
      .catch((error: unknown) => console.error('File drop is unavailable', error))
    return () => {
      cancelled = true
      stop?.()
    }
  }, [])

  return dragging
}
