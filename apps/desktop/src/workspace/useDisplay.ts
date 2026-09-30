import { useEffect } from 'react'
import type { DisplayPrefs } from '@stewardpad/shared'
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { backend } from '../backend/backend'
import { useLive } from '../backend/LiveProvider'
import { useWorkspace } from './Workspace'

export const DEFAULT_DISPLAY: DisplayPrefs = {
  density: 'compact',
  textScale: 100,
  hiddenColumns: [],
  collapsedSections: [],
  racePanelFolded: false,
}

/** Settings → Display, read and written through the saved config. */
export function useDisplay() {
  const live = useLive()
  const { report } = useWorkspace()
  const prefs = live?.config.display ?? DEFAULT_DISPLAY
  const update = (patch: Partial<DisplayPrefs>) => {
    backend
      .updateConfig({ display: { ...prefs, ...patch } })
      .catch((error: unknown) => report('Could not save the display settings', error))
  }
  return { prefs, update }
}

/** Puts the display preferences into effect for the whole window. */
export function useApplyDisplay(): void {
  const { density, textScale } = useDisplay().prefs
  useEffect(() => {
    // Styles opt in with :global([data-density='comfortable']).
    document.documentElement.dataset.density = density
  }, [density])
  useEffect(() => {
    if (!isTauri()) return
    // The webview's own zoom scales text, spacing and layout together, like browser zoom.
    getCurrentWebview()
      .setZoom(textScale / 100)
      .catch((error: unknown) => console.error('Could not apply the text size', error))
  }, [textScale])
}
