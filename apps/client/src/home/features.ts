import type { IconName } from '../ui/Icon'

export interface Feature {
  id: string
  icon: IconName
  label: string
  title: string
  body: string
  points: string[]
  image: string
  alt: string
  /** A portrait sheet rather than the app window. */
  tall?: boolean
  doc: string
}

// What a steward does in a race weekend, in the order they do it.
export const FEATURES: Feature[] = [
  {
    id: 'log',
    icon: 'clock',
    label: 'During the race',
    title: 'Log it now. Review it later.',
    body: 'You see a contact, you press Space. StewardPad stamps it a few seconds back, where the replay needs to start, so nothing is lost while the race goes on.',
    points: [
      'The stamp is “now minus your look-back”: 10 seconds by default.',
      'Pick the cars from the live standings, or with 1 to 9 by position.',
      'Collisions Le Mans Ultimate reports arrive on their own, marked LMU.',
    ],
    image: '/screens/race-control.jpg',
    alt: 'The race page: standings, two cars selected in the quick-log panel, the incident feed.',
    doc: '/docs/logging',
  },
  {
    id: 'inspect',
    icon: 'file',
    label: 'The incident',
    title: 'Everything about an incident, in one panel.',
    body: 'Status in one click, the exact session time, every car with its part in it. The standings stay on screen while you write.',
    points: [
      'Mark who caused it and who was affected, for the record and the penalty.',
      'Steward notes stay between stewards; the investigation is written for drivers.',
      'Everything saves as you type, and says who reviewed it.',
    ],
    image: '/screens/inspector.jpg',
    alt: 'The incident inspector open beside the standings, with a penalty decision.',
    doc: '/docs/inspector',
  },
  {
    id: 'review',
    icon: 'check',
    label: 'After the race',
    title: 'A review queue, one incident at a time.',
    body: 'Every undecided incident in race order, on a full screen. Decide one, move to the next without touching the mouse.',
    points: [
      'The case on the left, the verdict on the right.',
      'Alt + ↓ moves on, even in the middle of a sentence.',
      'Decided incidents drop out; the queue shows what is left.',
    ],
    image: '/screens/review.jpg',
    alt: 'The review page: the queue of incidents on the left, the selected incident full width.',
    doc: '/docs/review',
  },
  {
    id: 'rules',
    icon: 'book',
    label: 'Your league’s rules',
    title: 'Cite the rule, not a paraphrase.',
    body: 'Import your league’s rule book from Google Docs or Word. StewardPad rebuilds the full numbers your league uses, so a decision cites 3.3.c, not “the overtaking rule”.',
    points: [
      'Numbered lists become 3.3, 3.3.a, 3.3.e.iii, as the document shows them.',
      'Pick every rule an incident broke from a searchable window.',
      'Edit the book in the app; it tells you what breaks the structure.',
    ],
    image: '/screens/rules.jpg',
    alt: 'The rule book page, filtered to section 3.3, with one rule cited by two incidents.',
    doc: '/docs/rule-book',
  },
  {
    id: 'publish',
    icon: 'file',
    label: 'Publishing',
    title: 'Decisions drivers can read.',
    body: 'One click turns the session into a formal stewards’ document: every decision with its cars, the rules broken and the penalty. Save it as a web page or a PDF.',
    points: [
      'A penalty sheet for whoever corrects the results.',
      'A driver sheet and a full log as spreadsheets.',
      'A versioned JSON file for your league’s website or bot.',
    ],
    image: '/screens/decisions-document.jpg',
    alt: 'The first page of a stewards’ decisions document with a penalty summary.',
    tall: true,
    doc: '/docs/reports',
  },
  {
    id: 'discord',
    icon: 'radio',
    label: 'Live',
    title: 'Announce on Discord as you decide.',
    body: 'Paste a webhook link and every status change goes to your league’s channel: under investigation, no further action, penalty, dismissed.',
    points: [
      'Your titles, your colours, the parts of the incident you choose.',
      'A live preview shows the exact message before it is sent.',
      'Steward names stay out unless you switch them on.',
    ],
    image: '/screens/discord.jpg',
    alt: 'The Discord page: webhook settings and a preview of the penalty embed.',
    doc: '/docs/discord',
  },
]
