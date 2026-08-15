import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { Select } from '../Select'

const BTN_BASE = 'rounded-sm p-1 text-text-muted hover:bg-surface-raised hover:text-text'
const BTN_ACTIVE = 'rounded-sm p-1 bg-accent/10 text-accent'
const SNIPPET_FIELD =
  'rounded-sm border border-border-strong bg-surface py-0.5 pl-1 pr-5 text-xs text-text-muted'
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={active ? BTN_ACTIVE : BTN_BASE}
    >
      {children}
    </button>
  )
}

/**
 * Minimal markdown editor (bold, italic, bullet, ordered list — no headings).
 * Stores and emits plain markdown strings; round-trips via @tiptap/markdown.
 * lastEmittedRef prevents echo-loops when the draft resyncs from a new incident.
 */
export function MarkdownEditor({
  value,
  onChange,
  label,
  snippets,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  /** Canned phrases offered via an "Insert…" picker in the toolbar. */
  snippets?: string[]
}) {
  const lastEmittedRef = useRef(value)

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false }), Markdown],
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        'aria-label': label,
        'aria-multiline': 'true',
        role: 'textbox',
      },
    },
    onUpdate({ editor: e }) {
      const md = e.getMarkdown()
      lastEmittedRef.current = md
      onChange(md)
    },
  })

  // Sync when the open incident changes (external value, not our own edit).
  useEffect(() => {
    if (!editor || value === lastEmittedRef.current) return
    editor.commands.setContent(value, { emitUpdate: false, contentType: 'markdown' })
    lastEmittedRef.current = value
  }, [editor, value])

  function insertSnippet(index: string): void {
    const snippet = snippets?.[Number(index)]
    if (!snippet || !editor) return
    editor.chain().focus().insertContent(snippet, { contentType: 'markdown' }).run()
  }

  return (
    <div className="markdown-editor mt-1 w-full overflow-hidden rounded-sm border border-border-strong bg-surface">
      <div
        className="flex items-center gap-1 border-b border-border px-1.5 py-1"
        role="toolbar"
        aria-label={`${label} formatting`}
      >
        <ToolbarButton
          label="Bold"
          active={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor?.isActive('italic') ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          label="Ordered list"
          active={editor?.isActive('orderedList') ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        {snippets && snippets.length > 0 && (
          <Select
            value=""
            onChange={(event) => insertSnippet(event.target.value)}
            className={SNIPPET_FIELD}
            wrapperClassName="ml-auto inline-block"
            aria-label={`Insert ${label} snippet`}
          >
            <option value="">Insert…</option>
            {snippets.map((snippet, index) => (
              <option key={snippet} value={index}>
                {truncate(snippet, 48)}
              </option>
            ))}
          </Select>
        )}
      </div>
      <EditorContent editor={editor} className="px-2 py-1.5 text-sm text-text" />
    </div>
  )
}
