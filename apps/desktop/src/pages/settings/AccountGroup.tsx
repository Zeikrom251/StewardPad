import type { Snapshot } from '../../backend/backend'
import { account } from '../../backend/team'
import { Icon } from '../../icons'
import { saveDialog } from '../../lib/saveDialog'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useWorkspace } from '../../workspace/Workspace'
import { Avatar } from '../../team/Avatar'
import { ConfirmButton } from '../../team/ConfirmButton'
import { useAction } from '../../team/useTeam'
import { Group, Row } from './SettingsGroups'

const SUBSCRIPTION = {
  none: 'None',
  pending: 'Requested, being checked',
  active: 'Active',
  ended: 'Ended',
}
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function SignedOut() {
  const { run, pending, error } = useAction()
  return (
    <Group label="Account">
      <Row
        label="Team"
        help="Sign in with Discord to steward with your league: shared incidents, live timing from the host PC, decisions in sync. Stewarding on your own needs no account."
      >
        <button
          type="button"
          className={cx(ui.btn, ui.primary)}
          disabled={pending}
          onClick={() => void run(account.signIn)}
        >
          Sign in with Discord
        </button>
        {error && <span className={ui.muted}>{error}</span>}
      </Row>
    </Group>
  )
}

/** Download my data: GDPR art. 15 and 20, as a file the steward keeps. */
function DownloadData({ folder }: { folder: string }) {
  const { run, pending, error } = useAction()
  const download = () =>
    void run(async () => {
      const path = await saveDialog(folder, 'stewardpad-my-data.json', {
        name: 'JSON',
        extensions: ['json'],
      })
      if (path) await account.exportData(path)
    })
  return (
    <div className={ui.hstack}>
      <button type="button" className={ui.btn} disabled={pending} onClick={download}>
        <Icon name="download" size={14} />
        Download my data
      </button>
      {error && <span className={ui.muted}>{error}</span>}
    </div>
  )
}

/** Settings → Account: who is signed in, the subscription, and the steward's rights over their data. */
export function AccountGroup({ live }: { live: Snapshot }) {
  const { showAccount } = useWorkspace()
  const remove = useAction()
  const me = live.account.me
  if (!me) return <SignedOut />
  const pending = live.team.pending
  const ends = me.subscriptionEndsAt ? ` · until ${day(me.subscriptionEndsAt)}` : ''
  return (
    <Group label="Account">
      <Row
        label="Signed in"
        help={`@${me.discordUsername} on Discord · ${me.email}. Your sign-in is kept in Windows Credential Manager, never in a file.`}
      >
        <div className={ui.hstack}>
          <Avatar id={me.id} name={me.displayName} size={28} />
          <b className={ui.grow}>{me.displayName}</b>
          <ConfirmButton
            question={
              pending > 0
                ? `${String(pending)} unsent changes stay on this PC only. Sign out?`
                : 'Sign out?'
            }
            confirm="Sign out"
            onConfirm={() => void account.signOut()}
          >
            <Icon name="logout" size={14} />
            Sign out
          </ConfirmButton>
        </div>
      </Row>
      <Row
        label="Subscription"
        help={`${SUBSCRIPTION[me.subscriptionStatus]}${ends}. Leagues sync while their owner's subscription runs; invited stewards never pay.`}
      >
        <div className={ui.hstack}>
          <button type="button" className={ui.btn} onClick={() => showAccount(true)}>
            {live.team.leagueId ? 'Leagues and subscription' : 'Choose a league or subscribe'}
          </button>
        </div>
      </Row>
      <Row
        label="Your data"
        help="Everything StewardPad’s servers hold about you, as a JSON file (GDPR, articles 15 and 20). Your incidents also stay on this PC, in the session file."
      >
        <DownloadData folder={live.config.exportDir ?? ''} />
      </Row>
      <Row
        label="Delete my account"
        help="Erases your account, sign-ins, requests and subscriptions from StewardPad’s servers (GDPR, article 17). Incidents you logged stay with their league, unsigned. Hand over or delete the leagues you own first."
      >
        <div className={ui.hstack}>
          <ConfirmButton
            question="Delete your account for good?"
            confirm="Delete my account"
            disabled={remove.pending}
            onConfirm={() => void remove.run(account.deleteAccount)}
          >
            <Icon name="trash" size={14} />
            Delete my account
          </ConfirmButton>
          {remove.error && <span className={ui.muted}>{remove.error}</span>}
        </div>
      </Row>
    </Group>
  )
}
