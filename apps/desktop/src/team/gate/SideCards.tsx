import { useState } from 'react'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import styles from './AccountHome.module.scss'
import gate from './Gate.module.scss'

/** Paste an invite: the join dialog shows what it joins first. */
export function JoinField() {
  const { setInvite } = useWorkspace()
  const [text, setText] = useState('')
  const join = () => text.trim() && setInvite(text.trim())
  return (
    <div className={gate.row}>
      <label className={cx(ui.field, ui.grow)}>
        <Icon name="link" size={14} className={ui.faint} />
        <input
          value={text}
          placeholder="Paste an invite link or code"
          aria-label="Invite link or code"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
        />
      </label>
      <button type="button" className={ui.btn} disabled={!text.trim()} onClick={join}>
        Join
      </button>
    </div>
  )
}

export function InvitedCard() {
  return (
    <section className={styles.small}>
      <div className={gate.row}>
        <span className={gate.tile}>
          <Icon name="link" size={18} />
        </span>
        <div>
          <b>Invited to a league?</b>
          <p className={gate.lead}>
            Stewards join free, no subscription. Paste the link your league sent you.
          </p>
        </div>
      </div>
      <JoinField />
    </section>
  )
}

export function FreeAppCard({ emphasis }: { emphasis: boolean }) {
  const { showAccount } = useWorkspace()
  return (
    <section className={styles.small}>
      <div className={gate.row}>
        <span className={gate.tile}>
          <Icon name="monitor" size={18} />
        </span>
        <div>
          <b>Use the free app</b>
          <p className={gate.lead}>
            Everything a steward needs on one PC: logging, review, exports, Discord posts. Works
            offline.
          </p>
        </div>
      </div>
      <button
        type="button"
        className={cx(ui.btn, ui.lg, emphasis && ui.primary)}
        onClick={() => showAccount(false)}
      >
        Continue with the free app
      </button>
      <p className={styles.hint}>You can request a subscription later in Settings → Account.</p>
    </section>
  )
}
