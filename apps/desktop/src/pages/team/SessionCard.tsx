import { useState } from 'react'
import type { LeagueSession, TeamView } from '@stewardpad/shared'
import { team } from '../../backend/team'
import { Icon } from '../../icons'
import { Select } from '../../ui/Select'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { atLeast, useAction } from '../../team/useTeam'
import page from './TeamPage.module.scss'

const TYPE: Record<LeagueSession['type'], string> = {
  PRACTICE: 'Practice',
  QUALIFYING: 'Qualifying',
  RACE: 'Race',
  UNKNOWN: 'Session',
}

/** The race session this PC's incidents belong to: every steward of the league on the same one. */
export function SessionCard({ view }: { view: TeamView }) {
  const { run, pending, error } = useAction()
  const [others, setOthers] = useState<LeagueSession[] | null>(null)
  const session = view.session
  const head = atLeast(view.league?.role, 'HEAD_STEWARD')
  const loadOthers = () =>
    void run(async () => setOthers((await team.sessions()).filter((s) => s.id !== session?.id)))
  return (
    <section className={page.card}>
      <div className={page.cardHead}>
        <span className={page.eyebrow}>Race session</span>
        <span className={ui.grow} />
        {session && (
          <span className={page.chip} data-tone={session.status === 'open' ? undefined : 'muted'}>
            {session.status.toUpperCase()}
          </span>
        )}
      </div>
      {session ? (
        <>
          <h2>{session.title}</h2>
          <p>
            {session.trackName} · {TYPE[session.type]}
            {session.status === 'closed' && ' · read-only: its incidents can’t change'}
          </p>
        </>
      ) : (
        <p>This league’s session was deleted. Open a new one to keep logging together.</p>
      )}
      <div className={ui.hstack}>
        <button
          type="button"
          className={cx(ui.btn, ui.sm)}
          disabled={pending}
          onClick={() => void run(() => team.openSession())}
        >
          <Icon name="plus" size={14} />
          New session
        </button>
        {head && session && (
          <button
            type="button"
            className={cx(ui.btn, ui.ghost, ui.sm)}
            disabled={pending}
            onClick={() =>
              void run(() => team.setSessionStatus(session.status === 'open' ? 'closed' : 'open'))
            }
          >
            {session.status === 'open' ? 'Close the session' : 'Reopen it'}
          </button>
        )}
        <span className={ui.grow} />
        {others === null ? (
          <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={loadOthers}>
            Other sessions…
          </button>
        ) : (
          <Select
            label="Follow another session"
            options={others.map((s) => ({ value: s.id, label: `${s.title} · ${s.status}` }))}
            onChange={(id) => void run(() => team.switchSession(id))}
            trigger={
              <span className={cx(ui.btn, ui.ghost, ui.sm)}>Follow another… ({others.length})</span>
            }
          />
        )}
      </div>
      {error && <p className={page.error}>{error}</p>}
    </section>
  )
}
