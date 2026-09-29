import type { ComponentType } from 'react'
import { FirstRace, Install } from './pages/GettingStarted'
import { IncidentsList, Review } from './pages/Incidents'
import { Reports } from './pages/Publishing'
import { Data, Settings, Shortcuts } from './pages/Reference'
import { Troubleshooting } from './pages/Troubleshooting'
import { RuleBook } from './pages/RuleBook'
import { Discord, Team } from './pages/Sharing'
import { Inspector, Logging } from './pages/Stewarding'

export interface Doc {
  slug: string
  title: string
  /** One line under the title, and the page's description. */
  summary: string
  Page: ComponentType
}

/** The sidebar, in reading order: a new steward can go top to bottom. */
export const SECTIONS: Array<[string, Doc[]]> = [
  [
    'Getting started',
    [
      {
        slug: 'install',
        title: 'Install StewardPad',
        summary: 'Download, install and update the app on Windows.',
        Page: Install,
      },
      {
        slug: 'first-race',
        title: 'Your first race',
        summary: 'Your name, the data source, and a tour of the window.',
        Page: FirstRace,
      },
    ],
  ],
  [
    'Stewarding',
    [
      {
        slug: 'logging',
        title: 'Logging incidents',
        summary: 'Select the cars, press Space, and what the look-back does.',
        Page: Logging,
      },
      {
        slug: 'inspector',
        title: 'The inspector',
        summary: 'Status, cars and roles, notes, rules, decision and penalty.',
        Page: Inspector,
      },
      {
        slug: 'incidents',
        title: 'Incidents and merging',
        summary: 'The full list, filters, bulk actions and merging duplicates.',
        Page: IncidentsList,
      },
      {
        slug: 'review',
        title: 'Review queue',
        summary: 'Decide the undecided incidents one at a time.',
        Page: Review,
      },
    ],
  ],
  [
    'League rules',
    [
      {
        slug: 'rule-book',
        title: 'Rule book',
        summary: 'Import your league’s rules and cite them on every decision.',
        Page: RuleBook,
      },
    ],
  ],
  [
    'Publishing',
    [
      {
        slug: 'reports',
        title: 'Reports and exports',
        summary: 'The decisions document, the spreadsheets and the results file.',
        Page: Reports,
      },
      {
        slug: 'discord',
        title: 'Discord announcements',
        summary: 'Post each decision to your league’s channel as you make it.',
        Page: Discord,
      },
      {
        slug: 'team',
        title: 'Working as a team',
        summary: 'Split the incidents between stewards and merge the results.',
        Page: Team,
      },
    ],
  ],
  [
    'Reference',
    [
      { slug: 'settings', title: 'Settings', summary: 'What each setting does.', Page: Settings },
      {
        slug: 'shortcuts',
        title: 'Keyboard shortcuts',
        summary: 'Every key the app answers to.',
        Page: Shortcuts,
      },
      {
        slug: 'data',
        title: 'Your data and privacy',
        summary: 'Where everything is stored and what goes over the network.',
        Page: Data,
      },
      {
        slug: 'troubleshooting',
        title: 'Troubleshooting',
        summary: 'When the game is not found, a file looks wrong, or a message fails.',
        Page: Troubleshooting,
      },
    ],
  ],
]

export const DOCS: Doc[] = SECTIONS.flatMap(([, docs]) => docs)
