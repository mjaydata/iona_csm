import { useState } from 'react'
import { StickyNote, Plus, Tag } from 'lucide-react'
import { BaseWidget } from './BaseWidget'
import type { HumanNote } from '../../types'

interface HumanNotesWidgetProps {
  data: HumanNote[] | undefined
  isLoading?: boolean
  onHide?: () => void
  onAddNote?: (content: string, tags: string[]) => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

export function HumanNotesWidget({ data, isLoading, onHide, onAddNote, collapsed, onCollapsedChange }: HumanNotesWidgetProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newTags, setNewTags] = useState('')

  const handleSave = () => {
    if (newNote.trim() && onAddNote) {
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean)
      onAddNote(newNote.trim(), tags)
      setNewNote('')
      setNewTags('')
      setIsAdding(false)
    }
  }

  return (
    <BaseWidget
      title="CSM Notes"
      icon={<StickyNote className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      headerActions={
        <button
          onClick={() => setIsAdding(true)}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Add note"
        >
          <Plus className="w-4 h-4" />
        </button>
      }
    >
      <div className="p-4">
        {/* Add New Note Form */}
        {isAdding && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write your note..."
              className="w-full text-xs text-slate-700 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 placeholder:text-slate-400"
              rows={3}
              autoFocus
            />
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="w-full mt-2 text-[10px] text-slate-600 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-slate-400"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setIsAdding(false); setNewNote(''); setNewTags('') }}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!newNote.trim()}
                className="px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {data && data.length > 0 ? (
          <div className="space-y-3">
            {data.map((note) => (
              <div key={note.id} className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{note.content}</p>
                
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.tags.map((tag, idx) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px]"
                      >
                        <Tag className="w-2 h-2" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500">
                    {note.author} • {formatDate(note.created_at)}
                  </span>
                  {note.updated_at !== note.created_at && (
                    <span className="text-[10px] text-slate-400">
                      (edited)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <StickyNote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No notes yet</p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-2 text-xs text-primary-600 hover:text-primary-700"
            >
              Add the first note
            </button>
          </div>
        )}
      </div>
    </BaseWidget>
  )
}
