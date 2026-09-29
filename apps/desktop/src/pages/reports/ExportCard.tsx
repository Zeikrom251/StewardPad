import { useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../../icons'
import { formatAgo } from '../../lib/format'
import { useNow } from '../../lib/useNow'
import { AudienceTag, cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import styles from './ReportsPage.module.scss'

interface Saved {
  path: string
  at: number
}

// Where each file last went, kept for the app's life so it survives switching pages.
const lastSaved: Record<string, Saved> = {}

/** Runs a save (null = the dialog was cancelled) and remembers where the file went. */
function useSave(id: string, run: () => Promise<string | null>) {
  const { report } = useWorkspace()
  const [saved, setSaved] = useState<Saved | undefined>(lastSaved[id])
  const saveAs = () => {
    run()
      .then((path) => {
        if (!path) return
        lastSaved[id] = { path, at: Date.now() }
        setSaved(lastSaved[id])
      })
      .catch((error: unknown) => report('Could not save the file', error))
  }
  return { saved, saveAs }
}

function SavedFoot({ saved }: { saved: Saved | undefined }) {
  const now = useNow(10_000)
  return (
    <div className={styles.cardFoot}>
      {saved ? (
        <>
          <Icon name="check" size={13} strokeWidth={2.2} className={styles.ok} />
          Saved {formatAgo(saved.at, now)}
          <span className={cx(ui.mono, ui.faint, ui.trunc, ui.grow)}>{saved.path}</span>
        </>
      ) : (
        <>
          <Icon name="clock" size={13} />
          Not saved this session
        </>
      )}
    </div>
  )
}

/** One export destination: what the file contains, and a native Save dialog. */
export function ExportCard({
  id,
  icon,
  title,
  blurb,
  includes,
  audience,
  button,
  save,
  extra,
  className,
  children,
}: {
  /** Remembers this card's last save across page switches. */
  id: string
  icon: IconName
  title: string
  blurb: string
  /** Content chips; a leading "~" marks one the file leaves out. */
  includes: string[]
  audience: 'public' | 'internal'
  button: string
  save: () => Promise<string | null>
  /** More actions beside the save button (Print). */
  extra?: ReactNode
  className?: string
  children?: ReactNode
}) {
  const { saved, saveAs } = useSave(id, save)
  const pub = audience === 'public'
  return (
    <div className={cx(ui.card, styles.exportCard, className)}>
      <div className={styles.cardTop}>
        <div className={styles.cardHead}>
          <span className={styles.cardIcon} data-public={pub || undefined}>
            <Icon name={icon} size={18} />
          </span>
          <span className={styles.cardTitle}>
            <b>{title}</b>
            <span>{blurb}</span>
          </span>
          <AudienceTag audience={audience}>{pub ? 'Public' : 'Internal'}</AudienceTag>
        </div>
        <div className={styles.includes}>
          {includes.map((item) => (
            <span key={item} data-excluded={item.startsWith('~') || undefined}>
              {item.replace(/^~/, '')}
            </span>
          ))}
        </div>
        {children}
        <span className={ui.grow} />
        <div className={styles.actions}>
          <button type="button" className={cx(ui.btn, ui.lg, pub && ui.primary)} onClick={saveAs}>
            <Icon name="download" size={16} strokeWidth={pub ? 2 : 1.75} />
            {button}
          </button>
          {extra}
        </div>
      </div>
      <SavedFoot saved={saved} />
    </div>
  )
}
