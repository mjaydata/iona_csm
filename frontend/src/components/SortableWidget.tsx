import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { clsx } from 'clsx'
import { GripVertical, Maximize2, Minimize2, ChevronsUpDown } from 'lucide-react'
import type { WidgetSize, WidgetHeightSize } from '../types'

interface SortableWidgetProps {
  id: string
  children: React.ReactNode
  size: WidgetSize
  heightSize?: WidgetHeightSize
  onSizeChange?: (size: WidgetSize) => void
  onHeightChange?: (h: WidgetHeightSize) => void
  disabled?: boolean
  isUnderDevelopment?: boolean
}

export function SortableWidget({ 
  id, 
  children, 
  size, 
  heightSize = 2,
  onSizeChange,
  onHeightChange,
  disabled = false,
  isUnderDevelopment = false
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const getColSpan = (s: WidgetSize) => {
    switch (s) {
      case 1: return 'col-span-12 sm:col-span-6 lg:col-span-3'
      case 2: return 'col-span-12 md:col-span-6'
      case 3: return 'col-span-12 lg:col-span-9'
      case 4: return 'col-span-12'
      default: return 'col-span-12 md:col-span-6 lg:col-span-4'
    }
  }

  const getHeightStyle = (h: WidgetHeightSize): React.CSSProperties => {
    switch (h) {
      case 1: return { maxHeight: '280px', overflow: 'auto' }
      case 2: return {}
      case 3: return { minHeight: '500px' }
      default: return {}
    }
  }

  const handleIncreaseSize = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (size < 4 && onSizeChange) {
      onSizeChange((size + 1) as WidgetSize)
    }
  }

  const handleDecreaseSize = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (size > 1 && onSizeChange) {
      onSizeChange((size - 1) as WidgetSize)
    }
  }

  const handleTaller = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (heightSize < 3 && onHeightChange) onHeightChange((heightSize + 1) as WidgetHeightSize)
  }

  const handleShorter = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (heightSize > 1 && onHeightChange) onHeightChange((heightSize - 1) as WidgetHeightSize)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...getHeightStyle(heightSize) }}
      className={clsx(
        getColSpan(size),
        'relative group transition-all duration-200',
        isDragging && 'opacity-50 scale-[1.02] shadow-2xl rounded-xl'
      )}
    >
      {/* Drag Handle - appears on hover */}
      <div
        {...attributes}
        {...listeners}
        className={clsx(
          'absolute -top-1 left-1/2 -translate-x-1/2 z-20',
          'flex items-center gap-1 px-2 py-1',
          'bg-slate-700 text-white text-[10px] font-medium rounded-b-lg',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
          'cursor-grab active:cursor-grabbing',
          'shadow-lg'
        )}
      >
        <GripVertical className="w-3 h-3" />
        <span>Drag</span>
      </div>

      {/* Resize Controls - appears on hover */}
      {(onSizeChange || onHeightChange) && (
        <div
          className={clsx(
            'absolute -bottom-1 right-2 z-20',
            'flex items-center gap-0.5',
            'bg-slate-700 text-white rounded-t-lg',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            'shadow-lg overflow-hidden'
          )}
        >
          {onSizeChange && (
            <>
              <button
                onClick={handleDecreaseSize}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={size <= 1}
                className={clsx(
                  'p-1.5 hover:bg-slate-600 transition-colors',
                  size <= 1 && 'opacity-40 cursor-not-allowed'
                )}
                title="Narrower"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
              <div className="w-px h-4 bg-slate-600" />
              <button
                onClick={handleIncreaseSize}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={size >= 4}
                className={clsx(
                  'p-1.5 hover:bg-slate-600 transition-colors',
                  size >= 4 && 'opacity-40 cursor-not-allowed'
                )}
                title="Wider"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </>
          )}
          {onHeightChange && (
            <>
              <div className="w-px h-4 bg-slate-600" />
              <button
                onClick={handleShorter}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={heightSize <= 1}
                className={clsx(
                  'p-1.5 hover:bg-slate-600 transition-colors',
                  heightSize <= 1 && 'opacity-40 cursor-not-allowed'
                )}
                title="Shorter"
              >
                <ChevronsUpDown className="w-3 h-3 rotate-180" />
              </button>
              <div className="w-px h-4 bg-slate-600" />
              <button
                onClick={handleTaller}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={heightSize >= 3}
                className={clsx(
                  'p-1.5 hover:bg-slate-600 transition-colors',
                  heightSize >= 3 && 'opacity-40 cursor-not-allowed'
                )}
                title="Taller"
              >
                <ChevronsUpDown className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Size Indicator Badge */}
      <div
        className={clsx(
          'absolute top-2 right-2 z-10',
          'px-1.5 py-0.5 text-[9px] font-medium rounded',
          'bg-slate-100 text-slate-500',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
        )}
      >
        {size === 1 && 'S'}
        {size === 2 && 'M'}
        {size === 3 && 'L'}
        {size === 4 && 'Full'}
      </div>

      {/* Mock Data Banner for Dev Widgets */}
      {isUnderDevelopment && (
        <div
          className={clsx(
            'absolute top-2 left-2 z-10',
            'px-2 py-1 text-[10px] font-bold rounded',
            'bg-amber-100 text-amber-700 border border-amber-200',
            'flex items-center gap-1'
          )}
        >
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          MOCK DATA
        </div>
      )}

      {children}
    </div>
  )
}

// Widget preview component for DragOverlay
interface WidgetPreviewProps {
  title: string
  icon?: React.ReactNode
}

export function WidgetPreview({ title, icon }: WidgetPreviewProps) {
  return (
    <div className="bg-white rounded-xl shadow-2xl border border-primary-200 p-4 opacity-90 min-w-[200px]">
      <div className="flex items-center gap-2">
        {icon && <div className="text-primary-500">{icon}</div>}
        <span className="text-sm font-semibold text-slate-700">{title}</span>
      </div>
      <div className="mt-2 h-16 bg-slate-50 rounded-lg animate-pulse" />
    </div>
  )
}
