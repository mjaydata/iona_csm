import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import {
  StickyNote, Plus, Pin, PinOff, Search, X, Trash2, Pencil,
  Paperclip, Download, FileText, FileSpreadsheet, Image as ImageIcon,
  ChevronDown, ChevronUp, Upload,
} from 'lucide-react'
import { BaseWidget } from './BaseWidget'
import { TiptapNoteEditor } from '../TiptapNoteEditor'
import { clsx } from 'clsx'
import type { CSMNote, NoteType, NoteSentiment, CSMNoteUpdate } from '../../types'
import {
  getCSMNotes, createCSMNote, updateCSMNote, deleteCSMNote,
  uploadNoteAttachment, getNoteAttachmentDownloadUrl,
} from '../../services/api'

interface CSMNotesWidgetProps {
  accountId?: string
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

const NOTE_TYPES: { value: NoteType | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-slate-100 text-slate-600' },
  { value: 'general', label: 'General', color: 'bg-slate-100 text-slate-600' },
  { value: 'qbr', label: 'QBR', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'escalation', label: 'Escalation', color: 'bg-rose-100 text-rose-700' },
  { value: 'check_in', label: 'Check-in', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'handoff', label: 'Handoff', color: 'bg-amber-100 text-amber-700' },
  { value: 'internal', label: 'Internal', color: 'bg-purple-100 text-purple-700' },
]

const SENTIMENT_OPTIONS: { value: NoteSentiment | 'auto'; label: string; color: string }[] = [
  { value: 'positive', label: 'Positive', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'neutral', label: 'Neutral', color: 'bg-slate-100 text-slate-600' },
  { value: 'negative', label: 'Negative', color: 'bg-rose-100 text-rose-700' },
  { value: 'auto', label: 'Auto', color: 'bg-sky-100 text-sky-600' },
]

function getFileIcon(fileType: string) {
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv'))
    return <FileSpreadsheet className="w-3 h-3" />
  if (fileType.includes('image'))
    return <ImageIcon className="w-3 h-3" />
  return <FileText className="w-3 h-3" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getNoteTypeStyle(type: string) {
  return NOTE_TYPES.find(t => t.value === type)?.color ?? 'bg-slate-100 text-slate-600'
}

function getSentimentStyle(sentiment?: string) {
  if (sentiment === 'positive') return 'bg-emerald-100 text-emerald-700'
  if (sentiment === 'negative') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-600'
}

function NoteCard({
  note, accountId, onEdit,
}: {
  note: CSMNote; accountId: string; onEdit: (note: CSMNote) => void
}) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [showSentimentMenu, setShowSentimentMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const pinMutation = useMutation({
    mutationFn: () => updateCSMNote(accountId, note.id, { is_pinned: !note.is_pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['csmNotes', accountId] }),
  })

  const sentimentMutation = useMutation({
    mutationFn: (val: CSMNoteUpdate['manual_sentiment']) =>
      updateCSMNote(accountId, note.id, { manual_sentiment: val }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csmNotes', accountId] })
      setShowSentimentMenu(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCSMNote(accountId, note.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['csmNotes', accountId] }),
  })

  const plainPreview = note.content_plain.length > 200 ? note.content_plain.slice(0, 200) + '...' : note.content_plain

  return (
    <div className={clsx('p-3 rounded-lg border transition-colors', note.is_pinned ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200')}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex-1 flex items-center gap-1.5 flex-wrap">
          <span className={clsx('px-1.5 py-0.5 text-[10px] font-medium rounded', getNoteTypeStyle(note.note_type))}>
            {NOTE_TYPES.find(t => t.value === note.note_type)?.label ?? note.note_type}
          </span>
          {note.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
          {note.effective_sentiment && (
            <div className="relative">
              <button
                onClick={() => setShowSentimentMenu(!showSentimentMenu)}
                className={clsx('px-1.5 py-0.5 text-[10px] font-medium rounded cursor-pointer', getSentimentStyle(note.effective_sentiment))}
              >
                {note.effective_sentiment}
                {note.manual_sentiment && ' ✓'}
              </button>
              {showSentimentMenu && (
                <div className="absolute top-6 left-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-1 min-w-[100px]">
                  {SENTIMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => sentimentMutation.mutate(opt.value === 'auto' ? 'auto' : opt.value)}
                      className={clsx('block w-full text-left px-2 py-1 text-[10px] rounded hover:bg-slate-50', opt.color)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => pinMutation.mutate()} className="p-1 text-slate-400 hover:text-amber-500 rounded" title={note.is_pinned ? 'Unpin' : 'Pin'}>
            {note.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
          <button onClick={() => onEdit(note)} className="p-1 text-slate-400 hover:text-slate-600 rounded" title="Edit">
            <Pencil className="w-3 h-3" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => deleteMutation.mutate()} className="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white rounded">Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="px-1.5 py-0.5 text-[10px] text-slate-500">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1 text-slate-400 hover:text-rose-500 rounded" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-2">
        {expanded ? (
          <div className="text-xs text-slate-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: note.content_html }} />
        ) : (
          <p className="text-xs text-slate-700 whitespace-pre-wrap">{plainPreview}</p>
        )}
        {note.content_plain.length > 200 && (
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-0.5 mt-1 text-[10px] text-indigo-600 hover:text-indigo-700">
            {expanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
          </button>
        )}
      </div>

      {/* AI Summary */}
      {note.ai_summary && (
        <div className="mt-2 p-2 bg-sky-50 rounded text-[10px] text-sky-700 border border-sky-100">
          <span className="font-medium">AI Summary:</span> {note.ai_summary}
        </div>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {note.tags.map((tag, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">#{tag}</span>
          ))}
        </div>
      )}

      {/* Attachments */}
      {note.attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {note.attachments.map(att => (
            <a
              key={att.id}
              href={getNoteAttachmentDownloadUrl(accountId, att.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-[10px] text-slate-600 hover:bg-slate-200 transition-colors"
              title={`${att.file_name} (${formatFileSize(att.file_size_bytes)})`}
            >
              {getFileIcon(att.file_type)}
              <span className="max-w-[100px] truncate">{att.file_name}</span>
              <Download className="w-2.5 h-2.5" />
            </a>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
        <span>{note.author} • {formatDate(note.created_at)} {formatTime(note.created_at)}</span>
        {note.updated_by && note.updated_at !== note.created_at && (
          <span className="text-slate-400">edited by {note.updated_by}</span>
        )}
      </div>
    </div>
  )
}

export function CSMNotesWidget({ accountId, isLoading, onHide, collapsed, onCollapsedChange }: CSMNotesWidgetProps) {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [editingNote, setEditingNote] = useState<CSMNote | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<NoteType | 'all'>('all')
  const [noteHtml, setNoteHtml] = useState('')
  const [notePlain, setNotePlain] = useState('')
  const [noteType, setNoteType] = useState<NoteType>('general')
  const [tagsInput, setTagsInput] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['csmNotes', accountId, search, typeFilter],
    queryFn: () => getCSMNotes(accountId!, {
      search: search || undefined,
      note_type: typeFilter !== 'all' ? typeFilter : undefined,
    }),
    enabled: !!accountId,
    staleTime: 30000,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      const note = await createCSMNote(accountId!, {
        content_html: noteHtml,
        content_plain: notePlain,
        note_type: noteType,
        tags,
      })
      for (const file of pendingFiles) {
        await uploadNoteAttachment(accountId!, note.id, file)
      }
      return note
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csmNotes', accountId] })
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingNote) return
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      await updateCSMNote(accountId!, editingNote.id, {
        content_html: noteHtml,
        content_plain: notePlain,
        note_type: noteType,
        tags,
      })
      for (const file of pendingFiles) {
        await uploadNoteAttachment(accountId!, editingNote.id, file)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csmNotes', accountId] })
      resetForm()
    },
  })

  const resetForm = () => {
    setIsAdding(false)
    setEditingNote(null)
    setNoteHtml('')
    setNotePlain('')
    setNoteType('general')
    setTagsInput('')
    setPendingFiles([])
  }

  const startEdit = (note: CSMNote) => {
    setEditingNote(note)
    setIsAdding(true)
    setNoteHtml(note.content_html)
    setNotePlain(note.content_plain)
    setNoteType(note.note_type as NoteType)
    setTagsInput(note.tags.join(', '))
    setPendingFiles([])
  }

  const onDrop = useCallback((accepted: File[]) => {
    setPendingFiles(prev => [...prev, ...accepted])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/msword': ['.doc'],
      'application/vnd.ms-excel': ['.xls'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxSize: 10 * 1024 * 1024,
  })

  const notes = notesData?.notes ?? []
  const pinnedNotes = useMemo(() => notes.filter(n => n.is_pinned), [notes])
  const unpinnedNotes = useMemo(() => notes.filter(n => !n.is_pinned), [notes])

  const dateGroups = useMemo(() => {
    const groups: Record<string, CSMNote[]> = {}
    for (const n of unpinnedNotes) {
      const key = formatDate(n.created_at)
      if (!groups[key]) groups[key] = []
      groups[key].push(n)
    }
    return Object.entries(groups)
  }, [unpinnedNotes])

  const isFormBusy = createMutation.isPending || updateMutation.isPending

  return (
    <BaseWidget
      title="CSM Notes"
      icon={<StickyNote className="w-4 h-4" />}
      isLoading={isLoading || notesLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      headerActions={
        <button
          onClick={() => { resetForm(); setIsAdding(true) }}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Add note"
        >
          <Plus className="w-4 h-4" />
        </button>
      }
    >
      <div className="p-4 space-y-3">
        {/* Search + Filter */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-7 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as NoteType | 'all')}
            className="text-[10px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          >
            {NOTE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* New/Edit Note Form */}
        {isAdding && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                {editingNote ? 'Edit Note' : 'New Note'}
              </span>
              <select
                value={noteType}
                onChange={e => setNoteType(e.target.value as NoteType)}
                className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none"
              >
                {NOTE_TYPES.filter(t => t.value !== 'all').map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <TiptapNoteEditor
              key={editingNote?.id ?? 'new'}
              initialContent={editingNote ? editingNote.content_html : ''}
              onUpdate={(html, text) => { setNoteHtml(html); setNotePlain(text) }}
              compact
            />

            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="Tags (comma separated)"
              className="w-full text-[10px] px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />

            {/* File Upload Zone */}
            <div
              {...getRootProps()}
              className={clsx(
                'border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-4 h-4 mx-auto text-slate-400 mb-1" />
              <p className="text-[10px] text-slate-500">
                {isDragActive ? 'Drop files here' : 'Drag & drop files, or click to browse'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">txt, docx, xlsx, pdf, csv, images — max 10 MB</p>
            </div>

            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {pendingFiles.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600">
                    <Paperclip className="w-2.5 h-2.5" />
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}>
                      <X className="w-2.5 h-2.5 text-slate-400 hover:text-rose-500" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
              <button
                onClick={() => editingNote ? updateMutation.mutate() : createMutation.mutate()}
                disabled={!notePlain.trim() || isFormBusy}
                className="px-3 py-1.5 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFormBusy ? 'Saving...' : editingNote ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Pin className="w-3 h-3" /> Pinned
            </h4>
            <div className="space-y-2">
              {pinnedNotes.map(n => (
                <NoteCard key={n.id} note={n} accountId={accountId!} onEdit={startEdit} />
              ))}
            </div>
          </div>
        )}

        {/* Date-grouped Notes */}
        {dateGroups.length > 0 ? (
          <div className="space-y-3">
            {dateGroups.map(([dateLabel, groupNotes]) => (
              <div key={dateLabel}>
                <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{dateLabel}</h4>
                <div className="space-y-2">
                  {groupNotes.map(n => (
                    <NoteCard key={n.id} note={n} accountId={accountId!} onEdit={startEdit} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isAdding && !notesLoading && (
            <div className="text-center py-6">
              <StickyNote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                {search || typeFilter !== 'all' ? 'No notes match your search' : 'No notes yet'}
              </p>
              {!search && typeFilter === 'all' && (
                <button
                  onClick={() => { resetForm(); setIsAdding(true) }}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Add the first note
                </button>
              )}
            </div>
          )
        )}
      </div>
    </BaseWidget>
  )
}
