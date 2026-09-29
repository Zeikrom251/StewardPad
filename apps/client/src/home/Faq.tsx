import type { ReactNode } from 'react'
import { Link } from '../router'
import styles from './Home.module.scss'

const FAQ: Array<[string, ReactNode]> = [
  [
    'Is StewardPad free?',
    'Yes. It is free and open source under the GPL-3.0 licence, with no paid tier.',
  ],
  [
    'Does it apply penalties in the game?',
    'No. StewardPad records and publishes decisions; drivers serve their penalties themselves, as your league’s rules say.',
  ],
  [
    'Do I need Le Mans Ultimate running?',
    <>
      To steward a real session, yes, on the same PC. To learn the app, switch to the built-in
      simulator in Settings: it invents a full grid to practise on.{' '}
      <Link to="/docs/first-race">Your first race</Link>
    </>,
  ],
  [
    'Can several stewards work on the same race?',
    <>
      Yes. Each one exports a session file and one steward merges them.{' '}
      <Link to="/docs/team">Working as a team</Link>
    </>,
  ],
  [
    'Will it read my league’s rule book?',
    <>
      Most likely. Download it from Google Docs as plain text, or save a Word or PDF file as text,
      and import it. <Link to="/docs/rule-book">Rule book</Link>
    </>,
  ],
  [
    'Which computers does it run on?',
    'Windows 10 and 11, 64-bit, like Le Mans Ultimate itself. There is no macOS or Linux build.',
  ],
  [
    'Where is my data?',
    <>
      In a folder on your PC, never online. <Link to="/docs/data">Your data and privacy</Link>
    </>,
  ],
  [
    'Is it made by the Le Mans Ultimate team?',
    'No. StewardPad is an independent project, built by and for league stewards.',
  ],
]

export function Faq() {
  return (
    <section className={styles.faq} id="faq">
      <header className={styles.sectionHead}>
        <span className={styles.eyebrow}>Questions</span>
        <h2>Before race day.</h2>
      </header>
      <div className={styles.faqList}>
        {FAQ.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
