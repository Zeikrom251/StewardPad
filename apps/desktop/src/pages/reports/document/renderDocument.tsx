import { renderToStaticMarkup } from 'react-dom/server'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import type { Incident } from '@stewardpad/shared'
import { DecisionsDocument } from './DecisionsDocument'
import { splitByVerdict, stewardsOf, type DocumentData } from './documentData'
import pageCss from './document.css?raw'
import decisionCss from './decision.css?raw'
import tablesCss from './tables.css?raw'

/** The stewards' Markdown as HTML, through a headless editor with the notes' own schema. */
function markdownHtml(incidents: Incident[]): DocumentData['html'] {
  const editor = new Editor({ extensions: [StarterKit, Markdown] })
  const toHtml = (markdown: string) => {
    if (!markdown.trim()) return ''
    editor.commands.setContent(markdown, { contentType: 'markdown' })
    return editor.getHTML()
  }
  try {
    return Object.fromEntries(
      incidents.map((i) => [
        i.id,
        { investigation: toHtml(i.summary), decision: toHtml(i.decision) },
      ]),
    )
  } finally {
    editor.destroy()
  }
}

export interface DocumentOptions {
  title: string
  circuit: string
  session: string
  server: string
  incidents: Incident[]
  /** Sign with the reviewers' names; off keeps the stewards anonymous. */
  nameStewards: boolean
}

/** A CSS string literal: the title can hold quotes or backslashes. */
const cssString = (text: string) => `"${text.replace(/["\\]/g, '\\$&').replace(/\n/g, ' ')}"`

/** Every printed page carries the event and "Page 2 of 3" in its bottom margin. */
function pageFooter(title: string): string {
  return `@page {
  @bottom-left { content: ${cssString(`${title} · Stewards’ decisions`)}; font: 7.5pt Arial, sans-serif; color: #7a7a7a; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7.5pt Arial, sans-serif; color: #7a7a7a; }
}`
}

/** The decisions document as one self-contained HTML file: opens anywhere, prints to PDF. */
export function renderDecisionsDocument(options: DocumentOptions): string {
  const { decided, pending } = splitByVerdict(options.incidents)
  const data: DocumentData = {
    title: options.title,
    circuit: options.circuit,
    session: options.session,
    server: options.server,
    issuedAt: new Date(),
    decided,
    pending,
    html: markdownHtml(decided),
    stewards: options.nameStewards ? stewardsOf(decided) : [],
  }
  const page = renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{options.title}</title>
        <style
          dangerouslySetInnerHTML={{
            __html: pageCss + tablesCss + decisionCss + pageFooter(options.title),
          }}
        />
      </head>
      <body>
        <DecisionsDocument data={data} />
      </body>
    </html>,
  )
  return `<!doctype html>\n${page}`
}
