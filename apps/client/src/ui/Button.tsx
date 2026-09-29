import type { ReactNode } from 'react'
import { Link } from '../router'
import { Icon, type IconName } from './Icon'
import styles from './ui.module.scss'

type Kind = 'primary' | 'secondary' | 'ghost'

/** A call to action: an in-site Link, or an external link (GitHub) opened in a new tab. */
export function Button({
  to,
  kind = 'secondary',
  icon,
  large,
  children,
}: {
  to: string
  kind?: Kind
  icon?: IconName
  large?: boolean
  children: ReactNode
}) {
  const className = [styles.btn, styles[kind], large && styles.lg].filter(Boolean).join(' ')
  const content = (
    <>
      {icon && <Icon name={icon} size={large ? 19 : 17} />}
      {children}
    </>
  )
  if (to.startsWith('http')) {
    return (
      <a className={className} href={to} target="_blank" rel="noreferrer">
        {content}
      </a>
    )
  }
  return (
    <Link className={className} to={to}>
      {content}
    </Link>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>
}
