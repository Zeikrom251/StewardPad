import { useEffect, useState } from 'react'
import type { ToastState } from '../hooks/useToast'

/**
 * DESIGN.md "Quick-log toast" — fixed top-right, opposite the selection
 * bar. Enter is fade + slide via a mount-frame flip.
 * ponytail: no exit transition, since index.css owns keyframes and this is
 * not editable — the toast just unmounts when useToast clears it.
 */
export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss?: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!toast) return
    setVisible(false)
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [toast])

  if (!toast) return null

  return (
    <div
      role="status"
      className={`fixed top-4 right-4 flex items-center gap-3 rounded-sm border-l-2 border-status-no-further-action bg-surface-raised px-4 py-3 text-sm text-text shadow-lg transition-all duration-200 motion-reduce:transition-none motion-reduce:transform-none ${visible ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'}`}
    >
      <span>
        {toast.message}
        {toast.timestamp && <span className="font-mono tabular-nums"> {toast.timestamp}</span>}
      </span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick()
            onDismiss?.()
          }}
          className="shrink-0 font-medium text-accent hover:underline"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}
