import { useEffect, useRef, useState, type RefObject } from 'react'

/** Places the open list under its button, or above it when there's no room below. */
function place(button: HTMLElement, list: HTMLElement): void {
  const r = button.getBoundingClientRect()
  list.style.minWidth = `${r.width}px`
  list.style.left = `${Math.max(8, Math.min(r.left, innerWidth - list.offsetWidth - 8))}px`
  const fitsBelow = innerHeight - r.bottom >= list.offsetHeight + 8 || r.top < innerHeight / 2
  list.style.top = `${fitsBelow ? r.bottom + 4 : r.top - list.offsetHeight - 4}px`
}

/** The list is fixed to where the button was; if the page scrolls under it, close it. */
function useCloseOnScroll(open: boolean, list: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (!(e.target instanceof Node && list.current?.contains(e.target)))
        list.current?.hidePopover()
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, list])
}

/**
 * A button that opens a popover list. Popovers sit in the top layer (never clipped by a
 * scrolling panel) and close on Esc or an outside click for free.
 */
export function usePopoverList(onClose: () => void) {
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  // Clicking the button while open first light-dismisses the list; don't reopen it.
  const closedAt = useRef(0)

  useEffect(() => {
    const el = list.current
    if (!el) return
    const onToggle = (e: Event) => {
      const isOpen = e instanceof ToggleEvent && e.newState === 'open'
      setOpen(isOpen)
      if (isOpen) return
      closedAt.current = performance.now()
      onClose()
    }
    el.addEventListener('toggle', onToggle)
    return () => el.removeEventListener('toggle', onToggle)
  }, [onClose])

  useCloseOnScroll(open, list)

  const show = (focusIndex: number) => {
    const b = button.current
    const l = list.current
    if (!b || !l || performance.now() - closedAt.current < 200) return
    l.showPopover()
    place(b, l)
    optionButtons(l)[Math.max(0, focusIndex)]?.focus()
  }
  return { button, list, open, show }
}

export const optionButtons = (list: HTMLElement) => [
  ...list.querySelectorAll<HTMLButtonElement>('[role=option]'),
]
