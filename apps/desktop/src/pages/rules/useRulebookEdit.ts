import { useEffect, useRef, useState } from 'react'
import type { Rulebook, RulebookCheck } from '@stewardpad/shared'
import { backend } from '../../backend/backend'
import { useWorkspace } from '../../workspace/Workspace'

const CHECK_DELAY_MS = 300

/** Books imported before editing existed kept only their rules: one line each. */
export function rulebookText(book: Rulebook): string {
  return book.text || book.rules.map((r) => `${r.code} ${r.title}`).join('\n\n')
}

/**
 * Markdown reads "5. Pit lane" as a list item, and tiptap renumbers a list in order when it
 * writes it back: chapters 1, 2, 5 would silently become 1, 2, 3. Escaped, each stays a
 * paragraph keeping its own number, and tiptap writes it back unescaped.
 */
function escapeListNumbers(markdown: string): string {
  return markdown.replace(/^(\s*)(\d+)([.)])(?=\s)/gm, '$1$2\\$3')
}

// Leaving the page mid-edit must not lose the text: it waits here until saved or discarded.
let unsaved: string | null = null

export const hasUnsavedEdit = () => unsaved !== null

/** The edited text, checked by the backend a moment after each change. */
function useCheck(text: string) {
  const { report } = useWorkspace()
  const [check, setCheck] = useState<{ text: string; result: RulebookCheck } | null>(null)
  const latest = useRef(0)
  useEffect(() => {
    const request = ++latest.current
    const timer = window.setTimeout(() => {
      backend
        .checkRulebook(text)
        .then((result) => request === latest.current && setCheck({ text, result }))
        .catch((error: unknown) => report('Could not check the rule book', error))
    }, CHECK_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [text, report])
  // A result for older text would enable Save on text nobody checked.
  return check?.text === text ? check.result : null
}

export function useRulebookEdit(book: Rulebook, onClose: () => void) {
  const { report } = useWorkspace()
  const [original] = useState(() => escapeListNumbers(rulebookText(book)))
  const [text, setText] = useState(() => unsaved ?? original)
  const check = useCheck(text)
  const dirty = text !== original
  const edit = (next: string) => {
    unsaved = next
    setText(next)
  }
  const close = () => {
    unsaved = null
    onClose()
  }
  const save = () => {
    backend
      .saveRulebook(text)
      .then(close)
      .catch((error: unknown) => report('Could not save the rule book', error))
  }
  const numberOutline = () => {
    backend
      .numberRulebook(text)
      .then(edit)
      .catch((error: unknown) => report('Could not number the rule book', error))
  }
  const canSave = dirty && check !== null && check.problems.length === 0
  return { text, edit, check, dirty, canSave, save, numberOutline, discard: close }
}
