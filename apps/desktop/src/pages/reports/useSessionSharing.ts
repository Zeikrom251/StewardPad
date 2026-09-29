import { useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { backend, type ImportReport } from '../../backend/backend'
import { saveDialog } from '../../lib/saveDialog'
import { useLive } from '../../backend/LiveProvider'
import { useFileDrop } from '../../lib/useFileDrop'
import { useWorkspace } from '../../workspace/Workspace'

const JSON_FILTER = [{ name: 'StewardPad session', extensions: ['json'] }]

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Import other stewards' files: from the picker, or dropped anywhere on the Reports page. */
function useImport() {
  const { report } = useWorkspace()
  const [result, setResult] = useState<ImportReport | null>(null)
  const importPaths = (paths: string[]) => {
    const files = paths.filter((p) => p.toLowerCase().endsWith('.json'))
    if (files.length === 0) {
      report('Nothing to import', 'drop StewardPad session files (.json)')
      return
    }
    backend
      .importSessions(files)
      .then(setResult)
      .catch((error: unknown) => report('Could not import the session files', error))
  }
  const importFiles = () => {
    open({ multiple: true, filters: JSON_FILTER })
      .then((picked) => picked && picked.length > 0 && importPaths(picked))
      .catch((error: unknown) => report('Could not open the file picker', error))
  }
  const dragging = useFileDrop(importPaths)
  return { result, dragging, importFiles }
}

/** Export this session for the other stewards; import and merge theirs. */
export function useSessionSharing() {
  const live = useLive()
  const { report } = useWorkspace()
  const [exportedTo, setExportedTo] = useState<string | null>(null)
  const exportFile = async () => {
    const name = [live?.session.trackName || 'session', live?.config.stewardName || 'steward']
    const path = await saveDialog(
      live?.config.exportDir ?? '',
      `${name.map(slug).join('-')}.json`,
      {
        name: 'StewardPad session',
        extensions: ['json'],
      },
    )
    if (!path) return // cancelled
    await backend.saveSessionFile(path)
    setExportedTo(path)
  }
  return {
    ...useImport(),
    exportedTo,
    exportFile: () => {
      exportFile().catch((error: unknown) => report('Could not export the session file', error))
    },
  }
}
