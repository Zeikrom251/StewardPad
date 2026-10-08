import { useState } from 'react'
import type { MyLeague } from '@stewardpad/shared'
import { team } from '../../backend/team'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { Modal } from '../Modal'
import { useAction } from '../useTeam'
import gate from './Gate.module.scss'

/** Board 04b: a name is all a league needs; the owner invites the stewards next. */
export function CreateLeague({
  onCreated,
  onClose,
}: {
  onCreated: (league: MyLeague) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const { run, pending, error } = useAction()
  const create = () =>
    void run(async () => {
      onCreated(await team.createLeague(name))
    })
  const footer = (
    <>
      <span className={gate.note}>
        <Icon name="check" size={14} />
        Included in your subscription
      </span>
      <span className={ui.grow} />
      <button type="button" className={cx(ui.btn, ui.ghost)} onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        className={cx(ui.btn, ui.primary)}
        disabled={pending || name.trim().length < 2}
        onClick={create}
      >
        Create league
      </button>
    </>
  )
  return (
    <Modal
      title="Create a league"
      subtitle="You’re the owner. Next, you invite your stewards: they join free."
      footer={footer}
      onClose={onClose}
    >
      <label className={gate.stack}>
        <b>League name</b>
        <span className={ui.field}>
          <input
            value={name}
            maxLength={60}
            placeholder="Apex Endurance League"
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
        </span>
      </label>
      {error && <p className={gate.error}>{error}</p>}
    </Modal>
  )
}
