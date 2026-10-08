import { marked, type Token, type Tokens } from 'marked'
import type { ReactNode } from 'react'

function inline(tokens: Token[] | undefined): ReactNode {
  return tokens?.map((token, i) => <InlineToken key={i} token={token} />)
}

/**
 * Bold, italic, code and text. A link shows as its text: a click would take the app's own
 * window to that address. Raw HTML renders as nothing.
 */
function InlineToken({ token }: { token: Token }): ReactNode {
  switch (token.type) {
    case 'strong':
      return <strong>{inline((token as Tokens.Strong).tokens)}</strong>
    case 'em':
      return <em>{inline((token as Tokens.Em).tokens)}</em>
    case 'codespan':
      return <code>{(token as Tokens.Codespan).text}</code>
    case 'br':
      return <br />
    case 'html':
      return null
    default:
      return plain(token)
  }
}

/** Text, a link, and any other token: its children if it has some, its text otherwise. */
function plain(token: Token): ReactNode {
  if ('tokens' in token && token.tokens) return inline(token.tokens)
  const text: unknown = 'text' in token ? token.text : undefined
  return typeof text === 'string' ? text : null
}

function ListBlock({ list }: { list: Tokens.List }) {
  const items = list.items.map((item, i) => <li key={i}>{blocks(item.tokens)}</li>)
  return list.ordered ? <ol>{items}</ol> : <ul>{items}</ul>
}

function BlockToken({ token }: { token: Token }): ReactNode {
  switch (token.type) {
    case 'heading':
      return <h3>{inline((token as Tokens.Heading).tokens)}</h3>
    case 'paragraph':
      return <p>{inline((token as Tokens.Paragraph).tokens)}</p>
    case 'list':
      return <ListBlock list={token as Tokens.List} />
    case 'blockquote':
      return <blockquote>{blocks((token as Tokens.Blockquote).tokens)}</blockquote>
    case 'code':
      return <pre>{(token as Tokens.Code).text}</pre>
    case 'space':
    case 'html':
      return null
    default:
      return <InlineToken token={token} />
  }
}

function blocks(tokens: Token[]): ReactNode {
  return tokens.map((token, i) => <BlockToken key={i} token={token} />)
}

/**
 * Markdown typed in the website's back office (the "How to pay" text), as React elements from
 * marked's tokens, the way the website shows it: no HTML string is ever injected, so the text
 * can't run a script or load anything.
 */
export function Markdown({ text }: { text: string }) {
  return <>{blocks(marked.lexer(text))}</>
}
