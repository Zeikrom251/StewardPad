import type { ReactNode } from 'react'
import { Kbd } from '../ui/Button'
import { Icon } from '../ui/Icon'
import styles from './Docs.module.scss'

type Tone = 'note' | 'warn' | 'private'

const TONE_ICON = { note: 'check', warn: 'alert', private: 'lock' } as const

/** A boxed aside: a tip, a caution, or something that stays between stewards. */
export function Callout({ tone = 'note', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <aside className={styles.callout} data-tone={tone}>
      <Icon name={TONE_ICON[tone]} size={18} />
      <div>{children}</div>
    </aside>
  )
}

/** A real screen of the app. */
export function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className={styles.shot}>
      <img src={src} alt={alt} width={2880} height={1800} loading="lazy" decoding="async" />
      <figcaption>{alt}</figcaption>
    </figure>
  )
}

/** Keys and what they do, as a two-column table. */
export function Keys({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <table className={styles.keys}>
      <tbody>
        {rows.map(([keys, what]) => (
          <tr key={keys}>
            <td>
              {keys.split(' + ').map((key, i) => (
                <span key={key}>
                  {i > 0 && ' + '}
                  <Kbd>{key}</Kbd>
                </span>
              ))}
            </td>
            <td>{what}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** A short path through the app: Settings → Storage → Export folder. */
export function Path({ children }: { children: string }) {
  return <span className={styles.path}>{children}</span>
}
