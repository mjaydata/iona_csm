import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, List, ListOrdered, CheckSquare,
  Heading2, Quote, Code, Undo, Redo,
} from 'lucide-react'
import { clsx } from 'clsx'

interface TiptapNoteEditorProps {
  initialContent?: string
  placeholder?: string
  onUpdate?: (html: string, text: string) => void
  editable?: boolean
  compact?: boolean
}

function ToolbarButton({
  onClick, active, title, children,
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        'p-1 rounded transition-colors',
        active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      )}
    >
      {children}
    </button>
  )
}

export function TiptapNoteEditor({
  initialContent = '',
  placeholder = 'Write your note...',
  onUpdate,
  editable = true,
  compact = false,
}: TiptapNoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor: ed }) => {
      onUpdate?.(ed.getHTML(), ed.getText())
    },
    editorProps: {
      attributes: {
        class: clsx(
          'prose prose-sm max-w-none focus:outline-none',
          compact ? 'min-h-[60px]' : 'min-h-[120px]',
          'text-slate-700 text-xs leading-relaxed',
          '[&_ul[data-type="taskList"]]:list-none [&_ul[data-type="taskList"]]:pl-0',
          '[&_ul[data-type="taskList"]_li]:flex [&_ul[data-type="taskList"]_li]:items-start [&_ul[data-type="taskList"]_li]:gap-2',
          '[&_ul[data-type="taskList"]_li_label]:mt-0.5',
          '[&_ul[data-type="taskList"]_li_div]:flex-1',
          '[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-slate-800 [&_h2]:mt-3 [&_h2]:mb-1',
          '[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-slate-700 [&_h3]:mt-2 [&_h3]:mb-1',
          '[&_p]:my-1',
          '[&_ul]:my-1 [&_ol]:my-1',
          '[&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-500',
          '[&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-[11px]',
          '[&_.is-editor-empty:first-child::before]:text-slate-400 [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0',
        ),
      },
    },
  })

  if (!editor) return null

  const iconSize = 'w-3.5 h-3.5'

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {editable && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-slate-200 bg-slate-50 flex-wrap">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <Bold className={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <Italic className={iconSize} />
          </ToolbarButton>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading">
            <Heading2 className={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <List className={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
            <ListOrdered className={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist">
            <CheckSquare className={iconSize} />
          </ToolbarButton>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
            <Quote className={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code">
            <Code className={iconSize} />
          </ToolbarButton>
          <div className="flex-1" />
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
            <Undo className={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
            <Redo className={iconSize} />
          </ToolbarButton>
        </div>
      )}
      <div className={clsx('px-3 py-2', compact ? 'max-h-[200px] overflow-y-auto' : 'max-h-[400px] overflow-y-auto')}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
