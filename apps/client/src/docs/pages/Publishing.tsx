import { Callout, Path, Shot } from '../parts'

const EXPORTS: Array<[string, string, string]> = [
  [
    'Stewards’ decisions document',
    'Public',
    'A formatted document: the event, a penalty summary, then every decision with its cars, rules broken, investigation, decision and penalty. Save it as a web page, or print it to PDF.',
  ],
  [
    'Driver decision sheet (CSV)',
    'Public',
    'Every published decision as a spreadsheet, with who caused it and who was affected.',
  ],
  [
    'Penalty sheet (CSV)',
    'Public',
    'One row per penalised car: incident, car, class, driver, penalty, seconds, served. What whoever corrects the results needs.',
  ],
  [
    'Full steward log (CSV)',
    'Internal',
    'Everything in the driver sheet plus the audit trail: who logged and reviewed each incident, the keypress time, the look-back, merges.',
  ],
  [
    'Results file (JSON)',
    'Public',
    'Decisions and penalties in a stable, versioned format (stewardpad-results, version 1) for a league website or a Discord bot.',
  ],
]

export function Reports() {
  return (
    <>
      <p className="lead">
        The <b>Reports</b> page turns the session into files for drivers, for the results and for
        your records. Each file opens a Save dialog in your export folder.
      </p>
      <Shot
        src="/screens/reports.jpg"
        alt="The Reports page: status counts, the decisions document card and the spreadsheets."
      />
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>For</th>
            <th>What is in it</th>
          </tr>
        </thead>
        <tbody>
          {EXPORTS.map(([name, audience, body]) => (
            <tr key={name}>
              <td>
                <b>{name}</b>
              </td>
              <td>{audience}</td>
              <td>{body}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Callout tone="private">
        Steward notes are in none of these files. Penalty notes and, unless you choose otherwise,
        steward names stay out of every public one.
      </Callout>
      <h2>The decisions document</h2>
      <p>
        Give it a title (“Endurance League · Round 4 · Sebring”), then <b>Save as HTML…</b> for a
        single file that opens in any browser, or <b>Print or save as PDF…</b> and pick “Microsoft
        Print to PDF” as the printer. <b>Name the stewards</b> is off by default: turn it on to sign
        each decision and list the stewards at the end.
      </p>
      <p>
        Only decided incidents are in it (penalty, no further action, dismissed); those still open
        are listed at the end as “Still under review”.
      </p>
      <h2>Spreadsheets</h2>
      <p>
        The CSV files are UTF-8 and use semicolons by default, which Excel opens directly in most
        European languages. Choose <b>Comma</b> at the top of the page for English Excel, Google
        Sheets or Numbers. Cells that start like a formula are neutralised, so a driver name can
        never run as one.
      </p>
      <h2>Where files go</h2>
      <p>
        Save dialogs open in <Path>Settings → Storage → Export folder</Path>, by default an{' '}
        <code>exports</code> folder in StewardPad’s own folder. Pick any folder you like; you can
        still choose another place in each dialog.
      </p>
    </>
  )
}
