import { useEffect, useState } from 'react'
import type { InvitePreview } from '@stewardpad/shared'
import { team } from '../../backend/team'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { Avatar } from '../Avatar'
import { Modal } from '../Modal'
import { ROLE_LABEL, failure, useAction } from '../useTeam'
import gate from './Gate.module.scss'

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** An invite (pasted, or a stewardpad://join link): what it joins, then joining and following it. */
export function JoinInvite({ invite }: { invite: string }) {
  const { setInvite, showAccount, go } = useWorkspace()
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const { run, pending, error } = useAction()
  useEffect(() => {
    team.previewInvite(invite).then(setPreview, (caught: unknown) => setProblem(failure(caught)))
  }, [invite])
  const close = () => setInvite(null)
  const join = () =>
    void run(async () => {
      const league = await team.join(invite)
      await team.enter(league.id)
      close()
      showAccount(false)
      go('team')
    })
  const footer = (
    <>
      <span className={ui.grow} />
      <button type="button" className={cx(ui.btn, ui.ghost)} onClick={close}>
        Cancel
      </button>
      <button
        type="button"
        className={cx(ui.btn, ui.primary)}
        disabled={!preview || pending}
        onClick={join}
      >
        Join the league
      </button>
    </>
  )
  return (
    <Modal title="Join a league" footer={footer} onClose={close}>
      {problem && <p className={gate.error}>This invite can’t be used: {problem}</p>}
      {preview && (
        <div className={gate.row}>
          <Avatar
            id={preview.league.name}
            name={preview.league.name}
            letters={2}
            size={48}
            square
          />
          <div>
            <b>{preview.league.name}</b>
            <p className={gate.lead}>
              {ROLE_LABEL[preview.role]} ·{' '}
              {preview.invitedBy ? `invited by ${preview.invitedBy} · ` : ''}
              {String(preview.league.members)} stewards · valid until {day(preview.expiresAt)}
            </p>
          </div>
        </div>
      )}
      <p className={gate.lead}>
        Joining is free: no subscription needed. The league’s stewards will see your Discord name.
      </p>
      {error && <p className={gate.error}>{error}</p>}
    </Modal>
  )
}
