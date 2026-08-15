import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'

const EXIT_MS = 150
const SIZE_CLASSES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' } as const

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Shared overlay primitive on native `<dialog>` — used by IncidentEditor and
 * ShortcutHelpOverlay so both get identical Escape/backdrop/focus-trap
 * behaviour instead of two hand-rolled variants (user override of prompt §8:
 * a centred modal, not a side panel).
 *
 * `showModal()` gives focus-trap, focus-move-in, focus-return-on-close, and
 * `aria-modal` for free — the only things this adds are: an animated
 * fade+scale entrance/exit (native close is instant), a backdrop-click
 * handler (browser support for declarative `closedby="any"` light-dismiss
 * still excludes Safari), and a body scroll lock.
 *
 * The dialog stays mounted whenever this component is (see IncidentEditor,
 * which is always in the tree) so the exit transition has something to
 * animate — unmounting on `open=false` would skip straight past `close()`.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  size = 'lg',
}: {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: ReactNode
  /** 'sm' for a short prompt (confirm dialogs), 'md' for a search/list
   * overlay, 'lg' is the editor-sized default. */
  size?: 'sm' | 'md' | 'lg'
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined

    if (open) {
      if (!dialog.open) {
        dialog.showModal()
        // Without an [autofocus] descendant, showModal() focuses the first
        // focusable element in tree order — here, the header's close
        // button. That leaves a stray Space keypress (which our shortcut
        // guard correctly stops from reaching onQuickLog) free to hit the
        // browser's own "activate the focused button" behaviour instead,
        // closing the dialog. Focus the dialog container itself so no
        // control holds default focus.
        dialog.focus({ preventScroll: true })
      }
      document.body.style.overflow = 'hidden'
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }

    if (!dialog.open) return undefined
    setVisible(false)
    const delay = prefersReducedMotion() ? 0 : EXIT_MS
    const timer = window.setTimeout(() => {
      dialog.close()
      document.body.style.overflow = ''
    }, delay)
    return () => window.clearTimeout(timer)
  }, [open])

  // Belt-and-suspenders: restore scroll if the component unmounts mid-open.
  useEffect(() => () => void (document.body.style.overflow = ''), [])

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    // Take over from the native instant-close so the exit fade (driven by
    // the effect above, once the parent flips `open` to false) gets to run.
    event.preventDefault()
    onClose()
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>): void {
    // Backdrop clicks land on the dialog element itself (::backdrop has no
    // DOM node of its own) — but so does a click on the dialog's own
    // padding, which must NOT dismiss. Distinguish by comparing the click
    // point against the dialog's content box, not just the event target.
    const dialog = dialogRef.current
    if (event.target !== dialog || !dialog) return
    const rect = dialog.getBoundingClientRect()
    const insideContent =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width
    if (!insideContent) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      aria-modal="true"
      tabIndex={-1}
      onCancel={handleCancel}
      onClick={handleClick}
      className={`m-auto max-h-[85vh] w-full ${SIZE_CLASSES[size]} overflow-y-auto rounded-md border border-border-strong bg-surface-raised p-6 shadow-2xl backdrop:bg-ground/80 transition-all duration-150 motion-reduce:transition-none motion-reduce:scale-100 ${visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
    >
      {children}
    </dialog>
  )
}
