import type { ComponentType, SVGProps } from 'react'
import { navigate, usePathname } from '../lib/router'
import { ArrowDownTrayIcon, HomeIcon, ListBulletIcon } from './icons'

const LINKS: Array<[string, string, ComponentType<SVGProps<SVGSVGElement>>]> = [
  ['/', 'Dashboard', HomeIcon],
  ['/incidents', 'Incidents', ListBulletIcon],
  ['/export', 'Export', ArrowDownTrayIcon],
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 border-b border-border bg-surface px-6">
      {LINKS.map(([path, label, LinkIcon]) => (
        <a
          key={path}
          href={path}
          onClick={(event) => {
            event.preventDefault()
            navigate(path)
          }}
          className={
            pathname === path
              ? 'flex items-center gap-1.5 rounded-t-sm border-b-4 border-accent bg-accent/10 px-3 py-2 text-sm font-semibold text-accent'
              : 'flex items-center gap-1.5 border-b-4 border-transparent px-3 py-2 text-sm text-text-muted hover:text-text'
          }
        >
          <LinkIcon className="size-4" aria-hidden="true" />
          {label}
        </a>
      ))}
    </nav>
  )
}
