import { useState } from 'react'
import type { InviteLink, LeagueRole, MemberRole } from '@stewardpad/shared'
import { team } from '../../backend/team'
import { Icon } from '../../icons'
import { Segmented } from '../../ui/Segmented'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useAction } from '../../team/useTeam'
import page from './TeamPage.module.scss'

/** Board 06: a link anyone can open; it signs them in and joins them. Shown once, kept nowhere. */
export function InviteCard({ myRole }: { myRole: LeagueRole }) {
  const [role, setRole] = useState<MemberRole>('STEWARD')
  const [link, setLink] = useState<InviteLink | null>(null)
  const [copied, setCopied] = useState(false)
  const { run, pending, error } = useAction()
  const create = () =>
    void run(async () => {
      setLink(await team.invite({ role, expiresInHours: 168 }))
      setCopied(false)
    })
  const copy = () =>
    link && void navigator.clipboard.writeText(link.url).then(() => setCopied(true))
  return (
    <section className={page.card}>
      <h2>Invite stewards</h2>
      <p>
        Anyone with the link signs in with Discord and joins as{' '}
        {role === 'STEWARD' ? 'steward' : 'head steward'}. The link expires in 7 days.
      </p>
      {myRole === 'OWNER' && (
        <Segmented
          value={role}
          options={[
            ['STEWARD', 'Steward'],
            ['HEAD_STEWARD', 'Head steward'],
          ]}
          onChange={setRole}
        />
      )}
      <div className={ui.hstack}>
        {link ? (
          <>
            <span className={cx(ui.field, ui.grow, ui.mono, ui.trunc)}>
              <Icon name="link" size={14} className={ui.faint} />
              {link.url}
            </span>
            <button type="button" className={ui.btn} onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} size={14} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </>
        ) : (
          <span className={cx(ui.grow, ui.faint)}>Make a link, then send it to your stewards.</span>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} disabled={pending} onClick={create}>
          <Icon name="refresh" size={14} />
          {link ? 'New link' : 'Make a link'}
        </button>
      </div>
      {error && <p className={page.error}>{error}</p>}
    </section>
  )
}
