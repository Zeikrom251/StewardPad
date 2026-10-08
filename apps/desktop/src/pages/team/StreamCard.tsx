import type { TeamView } from '@stewardpad/shared'
import { team } from '../../backend/team'
import { useLive } from '../../backend/LiveProvider'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { Avatar } from '../../team/Avatar'
import { atLeast, useAction } from '../../team/useTeam'
import page from './TeamPage.module.scss'

function GameState() {
  const live = useLive()
  const running = Boolean(live?.session.connected)
  const source = live?.config.adapter === 'mock' ? 'The simulator' : 'Le Mans Ultimate'
  return (
    <span className={page.status} data-on={running ? '' : undefined}>
      <i />
      {running ? `${source} is running on this PC` : 'Le Mans Ultimate isn’t running here'}
    </span>
  )
}

const since = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/** Board 07 → Team page, live timing: start, watch, or stop the league's one stream. */
export function StreamCard({ view }: { view: TeamView }) {
  const running = Boolean(useLive()?.session.connected)
  const { run, pending, error } = useAction()
  const stream = view.stream
  const watching = Math.max(view.online.length - 1, 0)
  const elsewhere = stream && stream.sessionId !== view.session?.id
  return (
    <section className={page.card}>
      <div className={page.cardHead}>
        <span className={page.eyebrow}>Live timing</span>
        <span className={ui.grow} />
        {view.streaming && (
          <span className={page.chip} data-tone="live">
            LIVE
          </span>
        )}
      </div>
      {!stream && (
        <>
          <h2>Nobody is streaming yet</h2>
          <p>Stream this PC’s timing so every steward sees the same standings and clock.</p>
          <GameState />
          <button
            type="button"
            className={cx(ui.btn, ui.primary, ui.lg)}
            disabled={!running || pending}
            onClick={() => void run(team.startStream)}
          >
            <Icon name="radio" size={16} />
            Start streaming to the league
          </button>
        </>
      )}
      {stream && view.streaming && (
        <>
          <h2>You’re streaming</h2>
          <p>
            {watching} steward{watching === 1 ? ' is' : 's are'} watching. Closing StewardPad or the
            game stops the stream.
          </p>
          <GameState />
          <button
            type="button"
            className={cx(ui.btn, ui.lg)}
            disabled={pending}
            onClick={() => void run(team.stopStream)}
          >
            <Icon name="x" size={15} />
            Stop streaming
          </button>
        </>
      )}
      {stream && !view.streaming && (
        <>
          <div className={page.cardHead}>
            <Avatar
              id={stream.streamer.id}
              name={stream.streamer.displayName}
              size={36}
              presence="live"
            />
            <div>
              <h2>{stream.streamer.displayName} is streaming</h2>
              <p>
                Since {since(stream.startedAt)}
                {elsewhere ? ' · another session' : ''}
              </p>
            </div>
          </div>
          <p>
            One stream per league. If {stream.streamer.displayName}’s stream drops, anyone running
            the game can start a new one.
          </p>
          {elsewhere && (
            <button
              type="button"
              className={ui.btn}
              disabled={pending}
              onClick={() => void run(() => team.switchSession(stream.sessionId))}
            >
              Follow that session
            </button>
          )}
          {atLeast(view.league?.role, 'HEAD_STEWARD') && (
            <button
              type="button"
              className={cx(ui.btn, ui.ghost)}
              disabled={pending}
              onClick={() => void run(team.stopStream)}
            >
              Stop their stream
            </button>
          )}
        </>
      )}
      {error && <p className={page.error}>{error}</p>}
    </section>
  )
}
