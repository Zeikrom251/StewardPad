import type { Snapshot } from '../../backend/backend'
import { useLive } from '../../backend/LiveProvider'
import { Icon } from '../../icons'
import styles from './TimingSource.module.scss'

type From = 'stream' | 'streaming' | 'game'

interface Source {
  from: From
  lead: string
  name: string
  detail: string | null
}

const ICON: Record<From, 'radio' | 'monitor'> = {
  stream: 'radio',
  streaming: 'radio',
  game: 'monitor',
}

const TITLE: Record<From, string> = {
  stream:
    'A teammate streams this session: their standings and clock replace your data source, and their game logs the contacts for everyone.',
  streaming: 'Your timing goes to every PC in the league, and your game logs the contacts.',
  game: 'This PC’s own data source (Settings → Data source). Once a teammate streams, their timing replaces it.',
}

function sourceOf(live: Snapshot): Source {
  const stream = live.team?.watching ? live.team.stream : null
  if (stream) {
    return {
      from: 'stream',
      lead: 'Live from',
      name: `${stream.streamer.displayName}’s PC`,
      detail: null,
    }
  }
  const name = live.config.adapter === 'mock' ? 'the simulator' : 'your game'
  if (live.team?.streaming) {
    return { from: 'streaming', lead: 'Streaming', name, detail: null }
  }
  return {
    from: 'game',
    lead: 'From',
    name,
    detail: live.session.connected ? null : 'offline',
  }
}

/**
 * Board 05, in a league: whose timing the standings show. A teammate's stream replaces this PC's
 * own source (team/events.rs), so the two must never look alike: blue is the league's stream.
 */
export function TimingSource() {
  const live = useLive()
  if (!live?.team?.leagueId) return null
  const { from, lead, name, detail } = sourceOf(live)
  return (
    <span className={styles.source} data-from={from} title={TITLE[from]}>
      <Icon name={ICON[from]} size={14} />
      <span>
        {lead} <b>{name}</b>
        {detail && ` · ${detail}`}
      </span>
    </span>
  )
}
