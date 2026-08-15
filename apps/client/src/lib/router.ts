/**
 * ~20-line History API router — three routes don't need a dependency
 * (README "Dependencies, and why each one is here").
 */
import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  window.addEventListener('popstate', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('popstate', callback)
  }
}

function getSnapshot(): string {
  return window.location.pathname
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => '/')
}

export function navigate(path: string): void {
  if (path === window.location.pathname) return
  window.history.pushState({}, '', path)
  listeners.forEach((callback) => callback())
}
