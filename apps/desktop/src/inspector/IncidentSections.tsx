import type { Incident, IncidentEditableFields } from '@stewardpad/shared'
import { CarsSection } from './CarsSection'
import { ClaimRow } from './ClaimRow'
import {
  DecisionSection,
  InvestigationSection,
  StewardNotesSection,
  type SetField,
} from './NotesSections'
import { RulesSection } from './RulesSection'
import { WhenSection } from './WhenSection'

interface SectionProps {
  incident: Incident
  draft: IncidentEditableFields
  setField: SetField
}

/** What is known: when it happened, who was involved, the stewards' own notes. */
export function CaseSections({ incident, draft, setField }: SectionProps) {
  return (
    <>
      <ClaimRow incident={incident} />
      <WhenSection
        incident={incident}
        eventSeconds={draft.eventSeconds}
        onChange={(s) => setField('eventSeconds', s)}
      />
      <CarsSection incident={incident} cars={draft.cars} onChange={(c) => setField('cars', c)} />
      <StewardNotesSection draft={draft} setField={setField} />
    </>
  )
}

/** What the drivers read: the investigation, the rules broken and the decision. */
export function VerdictSections({ incident, draft, setField }: SectionProps) {
  return (
    <>
      <InvestigationSection draft={draft} setField={setField} />
      <RulesSection rules={draft.rules ?? []} onChange={(rules) => setField('rules', rules)} />
      <DecisionSection draft={draft} setField={setField} />
    </>
  )
}
