import { Modal } from './Modal'

/** Replaces window.confirm for destructive actions (delete, clear all). */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-modal-title" size="sm">
      <h2 id="confirm-modal-title" className="text-sm font-medium text-text">
        {title}
      </h2>
      <p className="mt-2 text-sm text-text-muted">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border border-border-strong px-3 py-1 text-sm text-text-muted hover:text-text"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-sm bg-status-penalty-applied px-3 py-1 text-sm font-medium text-ground"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
