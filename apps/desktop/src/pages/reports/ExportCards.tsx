import type { CsvDelimiter } from '@stewardpad/shared'
import type { Snapshot } from '../../backend/backend'
import { Icon } from '../../icons'
import { DocumentCard } from './DocumentCard'
import { ExportCard } from './ExportCard'
import {
  DRIVER_COLUMNS,
  DecisionPreview,
  FULL_COLUMNS,
  PENALTY_COLUMNS,
  RESULTS_CONTENTS,
} from './ReportParts'
import { saveCsv, saveResultsJson } from './saveExports'
import styles from './ReportsPage.module.scss'

/** design/05: the document first, then the spreadsheets, then the files for machines. */
export function ExportCards({ live, delimiter }: { live: Snapshot; delimiter: CsvDelimiter }) {
  const folder = live.config.exportDir ?? ''
  return (
    <div className={styles.cards}>
      <DocumentCard live={live} />
      <ExportCard
        id="drivers"
        icon="eye"
        title="Driver decision sheet"
        blurb="Published decisions only, as a spreadsheet for the drivers."
        includes={DRIVER_COLUMNS}
        audience="public"
        button="Save driver sheet…"
        save={() => saveCsv('drivers', delimiter, folder)}
      >
        <DecisionPreview incidents={live.incidents} />
      </ExportCard>
      <ExportCard
        id="penalties"
        icon="gavel"
        title="Penalty sheet"
        blurb="One row per penalised car: what the race results get corrected by."
        includes={PENALTY_COLUMNS}
        audience="public"
        button="Save penalty sheet…"
        save={() => saveCsv('penalties', delimiter, folder)}
      />
      <ExportCard
        id="full"
        icon="lock"
        title="Full steward log"
        blurb="Everything in the driver sheet plus the audit trail, for your records."
        includes={FULL_COLUMNS}
        audience="internal"
        button="Save full log…"
        save={() => saveCsv('full', delimiter, folder)}
      >
        <div className={styles.danger}>
          <Icon name="lock" size={16} />
          <span>
            Names who logged and reviewed each incident. Keep it for your records and send drivers
            the decision sheet. Steward notes are in neither file.
          </span>
        </div>
      </ExportCard>
      <ExportCard
        id="results"
        icon="plug"
        title="Results file (JSON)"
        blurb="Decisions and penalties in a stable, versioned format for a league website or a Discord bot."
        includes={RESULTS_CONTENTS}
        audience="public"
        button="Save results file…"
        save={() => saveResultsJson(folder)}
      />
    </div>
  )
}
