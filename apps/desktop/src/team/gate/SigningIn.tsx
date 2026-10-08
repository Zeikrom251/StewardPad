import { useEffect, useState } from 'react'
import { onBackendEvent } from '../../backend/backend'
import { account } from '../../backend/team'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useAccount, useAction } from '../useTeam'
import { Consent } from './Consent'
import gate from './Gate.module.scss'
import styles from './SigningIn.module.scss'

function Steps() {
  const steps: Array<[string, 'done' | 'now' | 'next']> = [
    ['Browser opened', 'done'],
    ['Approve StewardPad on Discord', 'now'],
    ['Choose your league', 'next'],
  ]
  return (
    <ol className={styles.steps}>
      {steps.map(([text, state]) => (
        <li key={text} data-state={state}>
          <span className={styles.step}>
            {state === 'done' && <Icon name="check" size={13} strokeWidth={2.5} />}
          </span>
          {text}
        </li>
      ))}
    </ol>
  )
}

/** "App didn't open?": the code the website shows, pasted here. */
function PasteCode() {
  const [code, setCode] = useState('')
  const { run, pending, error, setError } = useAction()
  useEffect(() => {
    const stop = onBackendEvent('account:failed', ({ message }) => setError(message))
    return () => void stop.then((unlisten) => unlisten())
  }, [setError])
  const submit = () => void run(() => account.redeem(code))
  return (
    <div className={gate.stack}>
      <b>Browser didn’t open, or the app didn’t?</b>
      <div className={gate.row}>
        <label className={cx(ui.field, ui.grow)}>
          <input
            value={code}
            placeholder="Paste the code, e.g. 4F7K-2Q9M"
            aria-label="Sign-in code"
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        <button
          type="button"
          className={cx(ui.btn, ui.primary)}
          disabled={pending || !code.trim()}
          onClick={submit}
        >
          Sign in
        </button>
      </div>
      {error && <p className={gate.error}>{error}</p>}
    </div>
  )
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => void navigator.clipboard.writeText(url).then(() => setCopied(true))
  return (
    <div className={gate.row}>
      <span className={cx(ui.field, ui.grow, ui.trunc, styles.link)}>{url}</span>
      <button type="button" className={ui.btn} onClick={copy}>
        <Icon name={copied ? 'check' : 'copy'} size={14} />
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  )
}

/** Board 03: the browser is signing in; this window updates by itself (or takes the code). */
export function SigningIn() {
  const url = useAccount()?.signInUrl
  return (
    <div className={gate.page}>
      <div className={styles.layout}>
        <Consent />
        <section className={gate.card}>
          <span className={styles.spinner} />
          <h2>Finish signing in in your browser</h2>
          <p className={gate.lead}>
            We opened Discord in your default browser. Approve StewardPad there and come back: this
            window updates by itself.
          </p>
          <Steps />
          <div className={styles.divider} />
          {url && <CopyLink url={url} />}
          <PasteCode />
          <div className={gate.row}>
            <button type="button" className={ui.btn} onClick={() => void account.signIn()}>
              <Icon name="external" size={14} />
              Open a new sign-in page
            </button>
            <button
              type="button"
              className={cx(ui.btn, ui.ghost)}
              onClick={() => void account.cancelSignIn()}
            >
              Cancel
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
