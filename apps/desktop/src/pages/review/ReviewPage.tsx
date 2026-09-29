import type { Incident } from '@stewardpad/shared'
import { CaseSections, VerdictSections } from '../../inspector/IncidentSections'
import { DeleteButton, Footer } from '../../inspector/Inspector'
import { StatusStepper } from '../../inspector/StatusStepper'
import { useIncidentDraft } from '../../inspector/useIncidentDraft'
import { EmptyQueue, QueueList, ReviewHead, ReviewToolbar, StepHint } from './ReviewParts'
import { useReviewQueue } from './useReviewQueue'
import styles from './ReviewPage.module.scss'

/** The inspector's sections at full width: the case on the left, the verdict on the right. */
function ReviewEditor({ incident }: { incident: Incident }) {
  const { draft, setField, savedAt } = useIncidentDraft(incident)
  const sections = { incident, draft, setField }
  return (
    <section className={styles.editor} aria-label={`Incident #${incident.sequenceNumber}`}>
      <ReviewHead incident={incident}>
        <DeleteButton incident={incident} />
      </ReviewHead>
      <StatusStepper value={draft.status} onChange={(s) => setField('status', s)} />
      <div className={styles.columns}>
        <div className={styles.column}>
          <CaseSections {...sections} />
        </div>
        <div className={styles.column}>
          <VerdictSections {...sections} />
        </div>
      </div>
      <Footer savedAt={savedAt}>
        <StepHint />
      </Footer>
    </section>
  )
}

/** Post-race pass: one incident at a time, full width, stepping through what is undecided. */
export function ReviewPage() {
  const q = useReviewQueue()
  return (
    <div className={styles.page}>
      <ReviewToolbar
        mode={q.mode}
        onMode={q.setMode}
        undecided={q.undecided}
        total={q.total}
        position={q.current ? `${q.index + 1} of ${q.queue.length}` : null}
        step={q.step}
      />
      <div className={styles.body}>
        {q.current ? (
          <>
            <QueueList queue={q.queue} currentId={q.current.id} />
            <ReviewEditor key={q.current.id} incident={q.current} />
          </>
        ) : (
          <EmptyQueue total={q.total} onShowAll={() => q.setMode('all')} />
        )}
      </div>
    </div>
  )
}
