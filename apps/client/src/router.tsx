import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

// A few static pages don't need a routing library: the History API, and one event to tell
// React the path moved.
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

export function navigate(to: string): void {
  window.history.pushState(null, '', to)
  for (const listener of listeners) listener()
}

/** The current path, without a trailing slash ("/docs/install"). */
export function usePath(): string {
  const path = useSyncExternalStore(subscribe, () => window.location.pathname)
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

/** A new page starts at its top, or at the #section the link named. */
export function useScrollOnNavigate(path: string): void {
  useEffect(() => {
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1))
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [path])
}

export function useTitle(title: string): void {
  useEffect(() => {
    document.title = title
      ? `${title} · StewardPad`
      : 'StewardPad · Race control for Le Mans Ultimate'
  }, [title])
}

/** The page's search-result description (index.html holds the site-wide one). */
export function useDescription(text: string): void {
  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]')
    if (!meta) return
    const site = meta.getAttribute('content') ?? ''
    if (text) meta.setAttribute('content', text)
    return () => meta.setAttribute('content', site)
  }, [text])
}

/** An in-site link: a real <a> (middle click, copy link) that navigates without a reload. */
export function Link({ to, ...props }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    props.onClick?.(event)
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(to)
  }
  return <a {...props} href={to} onClick={onClick} />
}
