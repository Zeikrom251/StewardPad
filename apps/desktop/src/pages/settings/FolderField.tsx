import { useEffect, useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { backend } from '../../backend/backend'
import { useLive } from '../../backend/LiveProvider'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import styles from './SettingsPage.module.scss'

type FolderSetting = 'archiveDir' | 'exportDir'

const NAME: Record<FolderSetting, string> = {
  archiveDir: 'Archive folder',
  exportDir: 'Export folder',
}

/** A folder setting as an editable path, plus the native folder picker. */
function useFolder(setting: FolderSetting) {
  const { report } = useWorkspace()
  const current = useLive()?.config[setting] ?? ''
  const [text, setText] = useState(current)
  useEffect(() => setText(current), [current])

  const commit = (folder: string) => {
    if (folder === current) return
    backend.updateConfig({ [setting]: folder }).catch((error: unknown) => {
      setText(current)
      report(`Could not change the ${NAME[setting].toLowerCase()}`, error)
    })
  }
  const browse = () => {
    open({ directory: true, defaultPath: current || undefined })
      .then((picked) => {
        if (typeof picked === 'string') commit(picked)
      })
      .catch((error: unknown) => report('Could not open the folder picker', error))
  }
  return { text, setText, commit, browse }
}

/** A folder: type a path or pick one. An empty path resets to StewardPad's own folder. */
export function FolderField({ setting, compact }: { setting: FolderSetting; compact?: boolean }) {
  const { text, setText, commit, browse } = useFolder(setting)
  return (
    <div className={compact ? styles.folderCompact : styles.folder}>
      <label className={cx(ui.field, ui.grow)}>
        <Icon name="folder" size={14} className={ui.faint} />
        <input
          className={styles.path}
          value={text}
          aria-label={NAME[setting]}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => commit(text.trim())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
        />
      </label>
      <button type="button" className={ui.btn} onClick={browse}>
        Browse…
      </button>
    </div>
  )
}
