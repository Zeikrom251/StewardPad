import { useEffect, useRef } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { Icon, type IconName } from '../icons'
import { cx } from '../ui/primitives'
import styles from './MarkdownEditor.module.scss'

type Mark = 'heading' | 'bold' | 'italic' | 'bulletList' | 'orderedList'

const TOOLS: Array<[Mark, IconName, string]> = [
  ['heading', 'heading', 'Heading'],
  ['bold', 'bold', 'Bold'],
  ['italic', 'italic', 'Italic'],
  ['bulletList', 'list', 'Bullet list'],
  ['orderedList', 'numbered', 'Numbered list'],
]

function toggle(editor: Editor, mark: Mark): void {
  const chain = editor.chain().focus()
  const commands = {
    heading: () => chain.toggleHeading({ level: 2 }),
    bold: () => chain.toggleBold(),
    italic: () => chain.toggleItalic(),
    bulletList: () => chain.toggleBulletList(),
    orderedList: () => chain.toggleOrderedList(),
  }
  commands[mark]().run()
}

function Toolbar({ editor, label, tools }: { editor: Editor; label: string; tools: typeof TOOLS }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      Object.fromEntries(tools.map(([mark]) => [mark, e.isActive(mark)])),
  })
  return (
    <div className={styles.toolbar} role="toolbar" aria-label={`${label} formatting`}>
      {tools.map(([mark, icon, name]) => (
        <button
          key={mark}
          type="button"
          className={styles.tool}
          aria-label={name}
          aria-pressed={active[mark] ?? false}
          onClick={() => toggle(editor, mark)}
        >
          <Icon name={icon} size={15} />
        </button>
      ))}
    </div>
  )
}

/**
 * Rich-text box that stores plain markdown (bold, italic, lists; headings only where asked,
 * for the rule book), so the CSV export stays text. `lastEmitted` stops an echo loop when
 * the value resyncs.
 */
export function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder,
  headings = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  headings?: boolean
  className?: string
}) {
  const lastEmitted = useRef(value)
  const editor = useEditor({
    extensions: [StarterKit.configure(headings ? {} : { heading: false }), Markdown],
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        'aria-label': label,
        'data-placeholder': placeholder,
        class: styles.text ?? '',
      },
    },
    onUpdate({ editor: e }) {
      const markdown = e.getMarkdown()
      lastEmitted.current = markdown
      onChange(markdown)
    },
  })

  useEffect(() => {
    if (!editor || value === lastEmitted.current) return
    editor.commands.setContent(value, { emitUpdate: false, contentType: 'markdown' })
    lastEmitted.current = value
  }, [editor, value])

  return (
    <div className={cx(styles.editor, className)}>
      {editor && (
        <Toolbar
          editor={editor}
          label={label}
          tools={headings ? TOOLS : TOOLS.filter(([mark]) => mark !== 'heading')}
        />
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
