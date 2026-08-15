import { useAppData } from '../context/AppDataContext'
import { formatElapsed } from '../lib/format'
import { PhaseBadge } from './PhaseBadge'
import { ConnectionIndicator } from './ConnectionIndicator'
import { LookbackControl } from './LookbackControl'
import { StewardNameField } from './StewardNameField'
import { ArchiveDirField } from './ArchiveDirField'

const DEFAULT_LOOKBACK_SECONDS = 10

/** Persistent header (prompt §8) — every page renders this once, via App. */
export function Header() {
  const {
    session,
    connectionState,
    elapsedSeconds,
    config,
    updateConfig,
    stewardName,
    setStewardName,
  } = useAppData()

  const commitLookback = (seconds: number): void => {
    updateConfig({ lookbackSeconds: seconds }).catch((error) =>
      console.error('Failed to update look-back', error),
    )
  }

  const commitStewardName = (name: string): void => {
    updateConfig({ stewardName: name }).catch((error) =>
      console.error('Failed to update steward name', error),
    )
  }

  const commitArchiveDir = (archiveDir: string): void => {
    updateConfig({ archiveDir }).catch((error) =>
      console.error('Failed to update archive dir', error),
    )
  }

  return (
    <header className="flex items-center justify-between border-b border-border-strong border-t-4 border-t-accent bg-surface px-6 py-3">
      <div className="flex items-center gap-4">
        <div>
          <div className="text-sm font-medium text-text">{session?.trackName ?? 'No session'}</div>
          <div className="text-xs text-text-muted">{session?.sessionType ?? 'UNKNOWN'}</div>
        </div>
        <div className="font-mono text-3xl font-semibold tabular-nums text-text">
          {formatElapsed(elapsedSeconds)}
        </div>
        <PhaseBadge phase={session?.sessionPhase ?? 'UNKNOWN'} />
      </div>
      <div className="flex items-center gap-4">
        {config?.adapter === 'mock' && (
          <span
            className="rounded-sm border border-status-under-investigation/40 bg-status-under-investigation/12 px-2 py-0.5 text-xs font-medium text-status-under-investigation"
            title="Simulated data — not your live LMU session. Start with LMU_ADAPTER=rest to read the game."
          >
            SIMULATED DATA — not your live session
          </span>
        )}
        <ConnectionIndicator state={connectionState} />
        <LookbackControl
          value={config?.lookbackSeconds ?? DEFAULT_LOOKBACK_SECONDS}
          onCommit={commitLookback}
        />
        <StewardNameField
          value={stewardName}
          onChange={setStewardName}
          onCommit={commitStewardName}
        />
        <ArchiveDirField value={config?.archiveDir ?? ''} onCommit={commitArchiveDir} />
      </div>
    </header>
  )
}
