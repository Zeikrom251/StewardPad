import { useCallback } from 'react'
import type { AppConfig, UpdateConfigInput } from '@stewardpad/shared'
import { apiPatch } from '../lib/api'
import { socket } from '../lib/socket'
import { useLiveValue } from './useLiveValue'

function subscribeConfig(onValue: (value: AppConfig) => void): () => void {
  socket.on('config:update', onValue)
  return () => socket.off('config:update', onValue)
}

export function useConfig(): {
  config: AppConfig | null
  updateConfig: (input: UpdateConfigInput) => Promise<void>
} {
  const config = useLiveValue(subscribeConfig, '/config')

  const updateConfig = useCallback(async (input: UpdateConfigInput) => {
    await apiPatch<AppConfig>('/config', input)
  }, [])

  return { config, updateConfig }
}
