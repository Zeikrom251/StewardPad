import type { FileReport, ImportReport } from '../../backend/backend'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useSessionSharing } from './useSessionSharing'
import styles from './ReportsPage.module.scss'

const list = (numbers: number[]) => numbers.map((n) => `#${n}`).join(', ')

function FileLine({ file }: { file: FileReport }) {
  if (file.error) {
    return (
      <li data-state="error">
        <b>{file.file}</b>: skipped, {file.error}
      </li>
    )
  }
  const from = file.exportedBy ? ` (${file.exportedBy})` : ''
  return (
    <li>
      <b>{file.file}</b>
      {from}: {file.updated} taken from their work, {file.added} new, {file.unchanged} unchanged.
      {file.conflicts.length > 0 && (
        <span data-state="conflict">
          {' '}
          Edited on both PCs, newer edit kept. Check {list(file.conflicts)}.
        </span>
      )}
      {file.renumbered.length > 0 && (
        <span className={ui.muted}>
          {' '}
          Their {file.renumbered.map((r) => `#${r.from} is #${r.to}`).join(', ')} here.
        </span>
      )}
    </li>
  )
}

function ImportResult({ result }: { result: ImportReport }) {
  return (
    <div className={styles.importResult}>
      <ul>
        {result.files.map((file, i) => (
          <FileLine key={i} file={file} />
        ))}
      </ul>
      {result.backup && (
        <span className={cx(ui.faint, ui.trunc)}>
          Session before the import saved to <span className={ui.mono}>{result.backup}</span>
        </span>
      )}
    </div>
  )
}

/** Shows where to aim; the drop itself is caught anywhere on the page (useFileDrop). */
function DropZone({ dragging, onClick }: { dragging: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={styles.dropZone}
      data-dragging={dragging || undefined}
      onClick={onClick}
    >
      <Icon name="merge" size={18} />
      <b>{dragging ? 'Drop to import and merge' : 'Drag session files here'}</b>
      <span>
        {dragging
          ? 'Every .json file is merged in one go'
          : 'or click to choose them. Several at once is fine.'}
      </span>
    </button>
  )
}

/**
 * Several stewards, one session: each treats their share of the incidents and exports a
 * session file; one steward imports the others' and saves the CSVs from the merged result.
 */
export function TeamSession() {
  const { exportedTo, result, dragging, exportFile, importFiles } = useSessionSharing()
  return (
    <div className={cx(ui.card, styles.team)}>
      <div className={styles.cardHead}>
        <span className={styles.cardIcon}>
          <Icon name="merge" size={18} />
        </span>
        <span className={styles.cardTitle}>
          <b>Share with the other stewards</b>
          <span>
            Split the incidents between you. Each steward exports their session file; one imports
            the others&apos; and gets every treated incident in one session.
          </span>
        </span>
        <button type="button" className={ui.btn} onClick={exportFile}>
          <Icon name="download" size={15} />
          Export my session file…
        </button>
        <button type="button" className={cx(ui.btn, ui.primary)} onClick={importFiles}>
          <Icon name="merge" size={15} strokeWidth={2} />
          Import & merge files…
        </button>
      </div>
      <DropZone dragging={dragging} onClick={importFiles} />
      {exportedTo && (
        <span className={cx(ui.muted, ui.trunc, styles.exported)}>
          <Icon name="check" size={13} strokeWidth={2.2} className={styles.ok} />
          Exported to <span className={ui.mono}>{exportedTo}</span>
        </span>
      )}
      {result && <ImportResult result={result} />}
    </div>
  )
}
