import { useMemo, useState } from 'react'
import type { Incident, IncidentStatus, MergeIncidentsInput } from '@stewardpad/shared'
import { useAppData } from '../context/AppDataContext'
import { DEFAULT_FILTERS, filterIncidents, sortBySessionTimeDesc } from '../lib/incidentFilters'
import { toEditableFields } from '../lib/incidentEditable'
import { apiDelete, apiPost, ApiError } from '../lib/api'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/Toast'
import { ConfirmModal } from '../components/ConfirmModal'
import { IncidentsFilterBar } from '../components/IncidentsFilterBar'
import { IncidentsGrid } from '../components/IncidentsGrid'
import { BulkActionBar } from '../components/BulkActionBar'
import { LogMissedIncidentModal } from '../components/LogMissedIncidentModal'

function toggleId(ids: Set<string>, id: string): Set<string> {
  const next = new Set(ids)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export function IncidentsPage() {
  const { incidents, createIncident, updateIncident, deleteIncident, openIncident } = useAppData()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [logMissedOpen, setLogMissedOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  // ponytail: second Toast instance — coexists with GlobalShortcuts' toast; overlap
  // only if quick-log and merge fire in the same second, which is not a real scenario.
  const { toast, showToast, dismissToast } = useToast()

  const visible = useMemo(
    () => sortBySessionTimeDesc(filterIncidents(incidents, filters)),
    [incidents, filters],
  )

  const confirmDelete = (): void => {
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    if (!id) return
    const incident = incidents.find((i) => i.id === id)
    if (!incident) return
    const snapshot = toEditableFields(incident)
    deleteIncident(id)
      .then(() => {
        showToast(`Incident #${incident.sequenceNumber} deleted`, {
          action: {
            label: 'Undo',
            onClick: () => {
              createIncident(snapshot).catch((error: unknown) =>
                console.error('Failed to undo delete', error),
              )
            },
          },
        })
      })
      .catch((error) => console.error('Failed to delete incident', error))
  }

  const applyBulkStatus = (status: IncidentStatus): void => {
    const ids = [...selectedIds]
    Promise.all(ids.map((id) => updateIncident(id, { status }))).catch((error) =>
      console.error('Failed to bulk-update status', error),
    )
    setSelectedIds(new Set())
  }

  const confirmClear = (): void => {
    setConfirmClearAll(false)
    const snapshot = incidents.map(toEditableFields)
    apiDelete('/incidents')
      .then(() => {
        setSelectedIds(new Set())
        showToast(`${snapshot.length} incidents cleared`, {
          action: {
            label: 'Undo',
            onClick: () => {
              // Sequential so the recreated incidents' server-assigned
              // sequence numbers land in the same relative order as before.
              ;(async () => {
                for (const fields of snapshot) await createIncident(fields)
              })().catch((error: unknown) => console.error('Failed to undo clear all', error))
            },
          },
        })
      })
      .catch((error: unknown) => {
        showToast('Clear all failed')
        console.error('Failed to clear incidents', error)
      })
  }

  const mergeSelected = (): void => {
    const incidentIds = [...selectedIds]
    const input: MergeIncidentsInput = { incidentIds }
    apiPost<Incident>('/incidents/merge', input)
      .then(() => setSelectedIds(new Set()))
      .catch((error: unknown) => {
        const detail =
          error instanceof ApiError && error.detail
            ? error.detail
            : 'Merge failed — check the selection'
        showToast(detail)
        console.error('Merge failed', error)
      })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <IncidentsFilterBar
        filters={filters}
        onChange={setFilters}
        onLogMissed={() => setLogMissedOpen(true)}
        onClearAll={() => setConfirmClearAll(true)}
      />
      <LogMissedIncidentModal open={logMissedOpen} onClose={() => setLogMissedOpen(false)} />
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Delete incident?"
        message="You can undo this from the toast that appears right after."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
      <ConfirmModal
        open={confirmClearAll}
        title={`Clear all ${incidents.length} incidents?`}
        message="A copy is kept in the archive, and you can also undo this from the toast that appears right after."
        confirmLabel="Clear all"
        onConfirm={confirmClear}
        onCancel={() => setConfirmClearAll(false)}
      />
      <BulkActionBar
        count={selectedIds.size}
        onApplyStatus={applyBulkStatus}
        onMerge={mergeSelected}
        onClear={() => setSelectedIds(new Set())}
      />
      <Toast toast={toast} onDismiss={dismissToast} />
      <div className="flex-1 overflow-auto">
        <IncidentsGrid
          incidents={visible}
          selectedIds={selectedIds}
          onToggleSelect={(id) => setSelectedIds((prev) => toggleId(prev, id))}
          onOpen={openIncident}
          onDelete={setConfirmDeleteId}
        />
      </div>
    </div>
  )
}
