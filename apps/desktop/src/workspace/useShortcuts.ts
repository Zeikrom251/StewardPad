import { useEffect, useRef } from 'react'
import type { Snapshot } from '../backend/backend'
import { useLive } from '../backend/LiveProvider'
import { STANDINGS_SEARCH_ID } from '../pages/race/Standings'
import { useIncidentActions } from './useIncidentActions'
import { useWorkspace, type Workspace } from './Workspace'

interface Context {
  live: Snapshot | null
  ws: Workspace
  act: ReturnType<typeof useIncidentActions>
}

function focusedInput(): HTMLElement | null {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return null
  // Inside an open dropdown, Space/Esc/arrows belong to the list, not the app.
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable
  return typing || el.closest('[popover]') ? el : null
}

/** Esc peels one layer: leave the field, else close the inspector, else drop the selection. */
function escape({ ws }: Context): void {
  const input = focusedInput()
  if (input) input.blur()
  else if (ws.openId) ws.openIncident(null)
  else ws.clearSelection()
}

function findCar({ ws }: Context): void {
  ws.go('race')
  window.setTimeout(() => document.getElementById(STANDINGS_SEARCH_ID)?.focus())
}

// Chords work everywhere, even mid-typing.
const CHORDS: Record<string, (c: Context) => void> = {
  k: ({ ws }) => ws.setPaletteOpen(!ws.paletteOpen),
  f: findCar,
}

// Single keys stay silent while the steward is typing.
const KEYS: Record<string, (c: Context) => void> = {
  ' ': ({ act }) => act.quickLog(),
  e: ({ act }) => act.openLatest(),
  '?': ({ ws }) => ws.go('keys'),
}

function selectByPosition(key: string, { live, ws }: Context): void {
  const entry = live?.standings.find((s) => s.position === Number(key))
  if (entry) ws.toggleCar(entry.slotId)
}

function onKeyDown(event: KeyboardEvent, c: Context): void {
  // A modal (the rule picker) owns the keyboard: Esc closes it, Space is typing.
  if (document.querySelector('dialog[open]')) return
  const key = event.key.toLowerCase()
  const chord = event.ctrlKey ? CHORDS[key] : undefined
  if (chord) {
    event.preventDefault()
    chord(c)
    return
  }
  if (c.ws.paletteOpen) return // the palette handles its own keys
  if (key === 'escape') return escape(c)
  // A held key must never auto-repeat into a run of duplicate incidents.
  if (focusedInput() || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
  const action = KEYS[key]
  if (action) {
    event.preventDefault()
    action(c)
  } else if (key >= '1' && key <= '9') {
    selectByPosition(key, c)
  }
}

/** The keyboard layer (Settings → Keyboard): one window listener for the app's life. */
export function useShortcuts(): void {
  const live = useLive()
  const ws = useWorkspace()
  const act = useIncidentActions()
  const latest = useRef<Context>({ live, ws, act })
  latest.current = { live, ws, act }

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event, latest.current)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
}
