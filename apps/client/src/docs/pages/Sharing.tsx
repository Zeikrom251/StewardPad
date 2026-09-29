import { Link } from '../../router'
import { Callout, Shot } from '../parts'

export function Discord() {
  return (
    <>
      <p className="lead">
        Post each decision to your league’s Discord channel the moment you make it: under
        investigation, no further action, penalty, dismissed.
      </p>
      <Shot
        src="/screens/discord.jpg"
        alt="The Discord page: the webhook, the status changes to announce, and a preview of the penalty message."
      />
      <h2>1. Create a webhook in Discord</h2>
      <p>
        In the channel where decisions go:{' '}
        <b>Edit channel → Integrations → Webhooks → New Webhook</b>, then <b>Copy Webhook URL</b>.
        You need the Manage Webhooks permission, so ask a server admin if you don’t have it.
      </p>
      <h2>2. Paste it in StewardPad</h2>
      <p>
        On the <b>Discord</b> page, paste the link in <b>Webhook link</b>. StewardPad says whether
        it looks like a Discord webhook. Press <b>Send a test message</b> to check the channel
        receives it, then switch the page to <b>Live</b>.
      </p>
      <Callout tone="private">
        Anyone with the webhook link can post in that channel. It is kept on this PC only: not in
        session files, not in any export.
      </Callout>
      <h2>3. Choose what is announced</h2>
      <ul>
        <li>
          <b>Status changes</b>: switch each of the four on or off, with its own title and colour.
          Titles fill in <code>{'{number}'}</code>, <code>{'{type}'}</code>, <code>{'{cars}'}</code>
          , <code>{'{time}'}</code> and <code>{'{lap}'}</code>.
        </li>
        <li>
          <b>Embed shows</b>: cars and their roles, rules broken, investigation, decision, penalty,
          session time and lap. The steward’s name is off unless you tick it. Empty parts are left
          out.
        </li>
        <li>
          <b>Mention</b>: <code>@here</code> or a role (<code>{'<@&role id>'}</code>) to ping
          people. Empty means nobody is pinged.
        </li>
        <li>
          <b>Sender</b> and <b>Footer</b>: the name and picture messages come from, and the small
          line under each one.
        </li>
      </ul>
      <p>The preview on the right shows the exact message, built from your latest real incident.</p>
      <h2>How messages are sent</h2>
      <p>
        Every status change sends one message, straight away, with the incident as it is at that
        moment, so write the decision before you set the penalty status. Quick changes arrive in
        order. <b>Sent this session</b> lists each message; a failed one says why and can be sent
        again.
      </p>
      <p>
        Only the changes you make are announced. Merging other stewards’ files never posts their
        decisions a second time. <Link to="/docs/team">Working as a team</Link>
      </p>
    </>
  )
}

export function Team() {
  return (
    <>
      <p className="lead">
        Several stewards, one race: split the incidents, work on your own PCs, and merge the results
        into one complete session.
      </p>
      <h2>Split the work</h2>
      <p>
        Agree who takes which incidents, for example by number or by class. Everyone stewards the
        same session in their own StewardPad, with their name set in Settings.
      </p>
      <h2>Share and merge</h2>
      <ol>
        <li>
          Each steward, on the Reports page under <b>Share with the other stewards</b>:{' '}
          <b>Export my session file…</b>. It holds every incident with every field, steward notes
          included, so share it only between stewards.
        </li>
        <li>
          One steward drags all the files onto the Reports page (or chooses{' '}
          <b>Import &amp; merge files…</b>).
        </li>
        <li>StewardPad merges them and reports, file by file, what was added and updated.</li>
      </ol>
      <h2>How the merge decides</h2>
      <ul>
        <li>
          Incidents are matched by their id, then by the collision LMU reported, which is the same
          on every PC.
        </li>
        <li>An incident someone worked on beats an untouched copy.</li>
        <li>
          If two stewards both changed the same incident, the most recent change wins and the report
          lists it as a conflict, so you can check it.
        </li>
        <li>
          Incidents only one steward logged are added with the next free numbers; the report says
          which were renumbered.
        </li>
      </ul>
      <Callout>
        Before merging, StewardPad saves a backup of your session in the archive folder. A file from
        another track or another session type is refused while you are connected.
      </Callout>
    </>
  )
}
