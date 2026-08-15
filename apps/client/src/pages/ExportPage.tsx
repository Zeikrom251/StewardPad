import { useState } from 'react'
import type { CsvDelimiter } from '@stewardpad/shared'
import { useAppData } from '../context/AppDataContext'
import { STATUSES, STATUS_LABEL } from '../components/StatusBadge'
import { apiPost } from '../lib/api'
import { ArchiveBoxIcon, ArrowDownTrayIcon } from '../components/icons'

const TOGGLE_ACTIVE = 'rounded-sm bg-accent px-3 py-1 text-ground'
const TOGGLE_INACTIVE = 'rounded-sm border border-border-strong px-3 py-1 text-text'

function csvUrl(variant: 'full' | 'drivers', delimiter: CsvDelimiter): string {
  return `/api/export/csv?variant=${variant}&delimiter=${delimiter}`
}

export function ExportPage() {
  const { incidents } = useAppData()
  const [delimiter, setDelimiter] = useState<CsvDelimiter>('semicolon')
  const [archiving, setArchiving] = useState(false)
  const [archived, setArchived] = useState(false)

  const counts = STATUSES.map((status) => ({
    status,
    count: incidents.filter((incident) => incident.status === status).length,
  }))

  const handleArchive = async (): Promise<void> => {
    setArchiving(true)
    try {
      await apiPost<{ archived: boolean }>('/session/archive')
      setArchived(true)
    } catch (error) {
      console.error('Failed to archive session', error)
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <section>
        <h2 className="mb-2 text-sm font-medium text-text">Incidents by status</h2>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          {counts.map(({ status, count }) => (
            <li
              key={status}
              className="flex justify-between rounded-sm border border-border px-3 py-1.5 text-text-muted"
            >
              <span>{STATUS_LABEL[status]}</span>
              <span className="tabular-nums text-text">{count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-text">Delimiter</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setDelimiter('semicolon')}
            className={delimiter === 'semicolon' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}
          >
            ; semicolon
          </button>
          <button
            type="button"
            onClick={() => setDelimiter('comma')}
            className={delimiter === 'comma' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}
          >
            , comma
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-sm border border-border-strong p-4">
          <a
            href={csvUrl('full', delimiter)}
            className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <ArrowDownTrayIcon className="size-4" aria-hidden="true" />
            Full steward log
          </a>
          <p className="mt-1 text-xs text-text-muted">
            Every field, including internal steward notes — for your own records.
          </p>
        </div>
        <div className="rounded-sm border border-border-strong p-4">
          <a
            href={csvUrl('drivers', delimiter)}
            className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <ArrowDownTrayIcon className="size-4" aria-hidden="true" />
            Driver decision sheet
          </a>
          <p className="mt-1 text-xs text-text-muted">
            Published decisions only, no internal notes — for the drivers.
          </p>
        </div>
      </section>

      <p className="rounded-sm border border-status-under-investigation/40 bg-status-under-investigation/12 px-3 py-2 text-xs text-text">
        Penalties recorded here are not applied in-game. Drivers must be told, and must serve them
        themselves.
      </p>

      <section>
        <button
          type="button"
          onClick={handleArchive}
          disabled={archiving}
          className="flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-1.5 text-sm text-text hover:bg-surface-raised disabled:opacity-50"
        >
          <ArchiveBoxIcon className="size-4" aria-hidden="true" />
          {archiving ? 'Archiving…' : 'Archive session'}
        </button>
        {archived && <span className="ml-2 text-xs text-status-no-further-action">Archived.</span>}
      </section>
    </div>
  )
}
