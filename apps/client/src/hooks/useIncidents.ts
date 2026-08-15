import { useCallback } from 'react'
import type {
  CreateIncidentInput,
  Incident,
  QuickLogInput,
  UpdateIncidentInput,
} from '@stewardpad/shared'
import { apiDelete, apiPatch, apiPost } from '../lib/api'
import { socket } from '../lib/socket'
import { useLiveValue } from './useLiveValue'

export interface UseIncidents {
  incidents: Incident[]
  quickLog: (input: QuickLogInput) => Promise<Incident>
  createIncident: (input: CreateIncidentInput) => Promise<Incident>
  updateIncident: (id: string, input: UpdateIncidentInput) => Promise<Incident>
  deleteIncident: (id: string) => Promise<void>
}

function subscribeIncidents(onValue: (value: Incident[]) => void): () => void {
  socket.on('incidents:update', onValue)
  return () => socket.off('incidents:update', onValue)
}

/** List comes from the socket push; mutations are plain REST (prompt §7.6). */
export function useIncidents(): UseIncidents {
  const incidents = useLiveValue(subscribeIncidents, '/incidents') ?? []

  const quickLog = useCallback(
    (input: QuickLogInput) => apiPost<Incident>('/incidents/quick', input),
    [],
  )
  const createIncident = useCallback(
    (input: CreateIncidentInput) => apiPost<Incident>('/incidents', input),
    [],
  )
  const updateIncident = useCallback(
    (id: string, input: UpdateIncidentInput) => apiPatch<Incident>(`/incidents/${id}`, input),
    [],
  )
  const deleteIncident = useCallback((id: string) => apiDelete(`/incidents/${id}`), [])

  return { incidents, quickLog, createIncident, updateIncident, deleteIncident }
}
