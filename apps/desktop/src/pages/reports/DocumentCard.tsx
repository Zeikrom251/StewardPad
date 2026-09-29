import { useState } from 'react'
import type { Snapshot } from '../../backend/backend'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import type { DocumentOptions } from './document/renderDocument'
import { ExportCard } from './ExportCard'
import { DOCUMENT_CONTENTS, SESSION_LABEL } from './ReportParts'
import { printDecisions, saveDecisionsHtml } from './saveExports'
import styles from './ReportsPage.module.scss'

function useDocumentOptions(live: Snapshot) {
  const { trackName, sessionType, serverName } = live.session
  const fallback = [trackName, SESSION_LABEL[sessionType]].filter(Boolean).join(' · ')
  const [title, setTitle] = useState('')
  const [nameStewards, setNameStewards] = useState(false)
  const options = (): DocumentOptions => ({
    title: title.trim() || fallback || 'Stewards’ decisions',
    circuit: trackName,
    session: SESSION_LABEL[sessionType],
    server: serverName ?? '',
    incidents: live.incidents,
    nameStewards,
  })
  return { title, setTitle, fallback, nameStewards, setNameStewards, options }
}

/** The formatted stewards' document: HTML that opens anywhere, or PDF through Print. */
export function DocumentCard({ live }: { live: Snapshot }) {
  const { report } = useWorkspace()
  const doc = useDocumentOptions(live)
  const print = () => {
    try {
      printDecisions(doc.options())
    } catch (error: unknown) {
      report('Could not open the print dialog', error)
    }
  }
  return (
    <ExportCard
      id="decisions"
      className={styles.wide}
      icon="file"
      title="Stewards’ decisions document"
      blurb="A formatted document for drivers and the league: every decision with its cars, rules and penalty, and a penalty summary."
      includes={DOCUMENT_CONTENTS}
      audience="public"
      button="Save as HTML…"
      save={() => saveDecisionsHtml(doc.options(), live.config.exportDir ?? '')}
      extra={
        <button type="button" className={cx(ui.btn, ui.lg)} onClick={print}>
          <Icon name="file" size={16} />
          Print or save as PDF…
        </button>
      }
    >
      <div className={styles.docOptions}>
        <label className={cx(ui.field, ui.grow)}>
          <span className={ui.label}>Title</span>
          <input
            value={doc.title}
            placeholder={doc.fallback || 'Round 4 · Sebring 1812 km'}
            aria-label="Document title"
            onChange={(e) => doc.setTitle(e.target.value)}
          />
        </label>
        <button
          type="button"
          role="checkbox"
          aria-checked={doc.nameStewards}
          className={styles.checkOption}
          onClick={() => doc.setNameStewards(!doc.nameStewards)}
        >
          <span className={ui.check} aria-checked={doc.nameStewards}>
            {doc.nameStewards && <Icon name="check" size={11} strokeWidth={3} />}
          </span>
          Name the stewards
        </button>
      </div>
    </ExportCard>
  )
}
