import { useCallback, useEffect, useState } from 'react'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastState {
  id: number
  message: string
  /** Rendered separately so it can get font-mono tabular-nums (DESIGN.md). */
  timestamp?: string
  action?: ToastAction
}

const AUTO_DISMISS_MS = 3000
/** Longer window for undo — needs enough time to read and react, not just glance. */
const UNDO_DISMISS_MS = 6000

/** One toast at a time, auto-dismissed — used for the quick-log confirmation and undo prompts. */
export function useToast(): {
  toast: ToastState | null
  showToast: (message: string, options?: { timestamp?: string; action?: ToastAction }) => void
  dismissToast: () => void
} {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback(
    (message: string, options?: { timestamp?: string; action?: ToastAction }) => {
      setToast({ id: Date.now(), message, timestamp: options?.timestamp, action: options?.action })
    },
    [],
  )

  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (!toast) return
    const id = toast.id
    const timer = window.setTimeout(
      () => {
        setToast((current) => (current?.id === id ? null : current))
      },
      toast.action ? UNDO_DISMISS_MS : AUTO_DISMISS_MS,
    )
    return () => window.clearTimeout(timer)
  }, [toast])

  return { toast, showToast, dismissToast }
}
