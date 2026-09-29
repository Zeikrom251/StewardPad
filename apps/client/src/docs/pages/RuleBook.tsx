import { Link } from '../../router'
import { Callout, Path, Shot } from '../parts'

const OUTLINE = `Section 3: Racing Regulations
1. General Racing Regulations
   1. Drivers are expected to follow racing regulations.
3. Behaviour while Overtaking and Defending
   3. Causing a collision is prohibited.
   5. Overtaking and defending regulations are as follows:
      3. On a straight, adequate racing room should be given.`

const NUMBERED = `3      Racing Regulations
3.1    General Racing Regulations
3.1.a  Drivers are expected to follow racing regulations.
3.3    Behaviour while Overtaking and Defending
3.3.c  Causing a collision is prohibited.
3.3.e  Overtaking and defending regulations are as follows:
3.3.e.iii  On a straight, adequate racing room should be given.`

export function RuleBook() {
  return (
    <>
      <p className="lead">
        Load your league’s rule book once, and every decision can cite the exact rules broken, with
        their numbers, in every export and announcement. It is optional.
      </p>
      <h2>Import it</h2>
      <p>
        <Path>Settings → Rule book → Import rule book…</Path> (or the Rules page) takes a{' '}
        <code>.txt</code> or <code>.md</code> file:
      </p>
      <ul>
        <li>
          <b>Google Docs</b>: File → Download → <b>Plain text (.txt)</b>.
        </li>
        <li>
          <b>Word</b>: Save as → <b>Plain Text</b>.
        </li>
        <li>
          <b>PDF</b>: copy the text into a text file, or export it as text from your PDF reader.
        </li>
      </ul>
      <h2>How rules are found</h2>
      <p>StewardPad understands the two ways rule books are written.</p>
      <h3>Numbers written in the text</h3>
      <p>
        Every line that starts with a rule number becomes a rule:{' '}
        <code>3.2 Causing a collision</code>, <code>Article 12: Track limits</code>,{' '}
        <code>§ 7) Pit lane speed</code>, <code>## 4.1.a Blocking</code>. Other lines are the rule
        text, kept in the book but not listed as rules.
      </p>
      <h3>Numbered lists (Google Docs, Word)</h3>
      <p>
        Automatic numbered lists save each level’s own number: “3.”, then an indented “1.”. Your
        league reads and cites them as 3.3.a, because both editors number list levels 1, a, i.
        StewardPad rebuilds those full numbers on import. This:
      </p>
      <pre>
        <code>{OUTLINE}</code>
      </pre>
      <p>becomes these rules:</p>
      <pre>
        <code>{NUMBERED}</code>
      </pre>
      <p>
        “Section”, “Chapter” and “Part” headings start a new top level. A line without a number that
        introduces a list (“LMGT3:”, “General Regulations”) becomes a group with a number of its
        own. If the document itself uses a number twice, the second one moves to the next free
        number, so every rule can be cited.
      </p>
      <Callout tone="warn">
        StewardPad assumes the default list style, 1 then a then i. If your league’s document
        numbers every level 1, 2, 3 (3.3.1), the rebuilt numbers will not match yours.
      </Callout>
      <h2>The Rules page</h2>
      <Shot
        src="/screens/rules.jpg"
        alt="The Rules page searched for 3.3, with rule 3.3.c cited by two incidents."
      />
      <p>
        Search by number (“3.3” lists 3.3 and everything under it) or by words. <b>Cited</b> shows
        only the rules used this session; click a cited rule to see its incidents and open one in
        the review.
      </p>
      <h2>Citing rules on an incident</h2>
      <p>
        In the inspector, <b>Rules broken</b> opens a window with the whole book: search, tick every
        rule that applies, and Apply. Rules are saved in book order.{' '}
        <Link to="/docs/inspector">The inspector</Link>
      </p>
      <h2>Editing the book</h2>
      <p>
        <b>Edit</b> opens the book in a rich-text editor. In a book imported from numbered lists,
        rules are the lines whose number is <b>bold</b>; in a hand-written book, every line that
        starts with a number. Before saving, StewardPad checks the structure and lists every line
        that breaks it: a number used twice, capital letters in a number, a number without a title,
        a rule whose number is not bold. Save stays off until the list is empty.
      </p>
      <p>
        Pasted a whole numbered document instead of importing it? The editor offers{' '}
        <b>Number the rules</b>, which does what import does. <b>Save as .md…</b> writes the book to
        a file, to send to the other stewards or back to the league.
      </p>
      <Callout>
        Incidents keep the rule wording they were decided with. If you renumber or remove a rule
        that was cited this session, the editor warns you before you save.
      </Callout>
    </>
  )
}
