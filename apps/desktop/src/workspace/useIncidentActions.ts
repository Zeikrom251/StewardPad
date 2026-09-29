import { backend } from '../backend/backend'
import { useLive } from '../backend/LiveProvider'
import { carsForSlots, newestFirst } from '../lib/cars'
import { useWorkspace } from './Workspace'

/** The steward's logging actions — shared by the buttons, the shortcuts and the palette. */
export function useIncidentActions() {
  const live = useLive()
  const { page, selection, clearSelection, openIncident, report, go } = useWorkspace()

  /** Space: stamps now − look-back on the backend, for the selected cars (or none). */
  const quickLog = () => {
    if (!live) return
    if (!live.session.connected) {
      report('Quick log unavailable', 'LMU is offline. Log a missed incident and type the time')
      return
    }
    backend
      .quickLog({ slotIds: selection.map(String), loggedBy: live.config.stewardName || undefined })
      .then(() => clearSelection())
      .catch((error: unknown) => report('Quick log failed', error))
  }

  /** A missed incident is stamped "now" and opened, so the steward types the real time. */
  const logMissed = () => {
    if (!live) return
    const cars = carsForSlots(selection, live.standings)
    backend
      .createIncident({ cars, eventSeconds: live.session.elapsedSeconds })
      .then((incident) => {
        clearSelection()
        openIncident(incident.id)
      })
      .catch((error: unknown) => report('Could not create the incident', error))
  }

  const openLatest = () => {
    const latest = newestFirst(live?.incidents ?? [])[0]
    if (!latest) return
    // The inspector docks on both incident pages; elsewhere, come back to race control.
    if (page !== 'incidents') go('race')
    openIncident(latest.id)
  }

  return { quickLog, logMissed, openLatest }
}
