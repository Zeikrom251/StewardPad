import type { ReactNode } from 'react'
import styles from './AnnouncePage.module.scss'

// **bold**, *italic*, `code`, @here and role/user mentions: what the embeds use.
const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|@here|@everyone|<@&?\d+>)/g

function inline(line: string, key: string): ReactNode[] {
  return line.split(TOKEN).map((part, i) => {
    const k = `${key}-${i}`
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <b key={k}>{part.slice(2, -2)}</b>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={k}>{part.slice(1, -1)}</code>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <i key={k}>{part.slice(1, -1)}</i>
    if (/^(@here|@everyone|<@&?\d+>)$/.test(part))
      return (
        <span key={k} className={styles.mention}>
          {part.startsWith('<@&') ? '@role' : part}
        </span>
      )
    return part
  })
}

/** Discord's Markdown as React text: no HTML is parsed, so nothing typed can inject markup. */
export function DiscordText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <span key={i} className={styles.line}>
          {/^\s*[-*] /.test(line) ? (
            <>• {inline(line.replace(/^\s*[-*] /, ''), `l${i}`)}</>
          ) : (
            inline(line, `l${i}`)
          )}
        </span>
      ))}
    </>
  )
}
