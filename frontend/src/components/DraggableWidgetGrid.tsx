import { useState, useMemo, useCallback } from 'react'
import { clsx } from 'clsx'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { Settings, Plus, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WidgetType, AccountFullDetail, WidgetSize, WidgetLayout, WidgetHeightSize } from '../types'

// Widgets
import {
  HealthScoreWidget,
  SupportRiskWidget,
  UsageTrendWidget,
  WhitespaceWidget,
  ContractWidget,
  ConfluenceImplementationWidget,
  MeetingBriefWidget,
  ChangeDetectionWidget,
  HumanNotesWidget,
  ChurnRiskWidget,
  ValueRealizationWidget,
  SentimentWidget,
  BenchmarkWidget,
  AlertsWidget,
  RecentSignalsWidget,
  GongActivityWidget,
} from './widgets'
import { SortableWidget, WidgetPreview } from './SortableWidget'

// Widget icon imports for preview
import {
  Activity,
  Headphones,
  TrendingUp,
  Target,
  FileText,
  Sparkles,
  GitCompare,
  StickyNote,
  AlertTriangle,
  Award,
  Smile,
  BarChart3,
  Bell,
  Radio,
  BookOpen,
  PhoneCall,
} from 'lucide-react'

interface WidgetDefinition {
  id: string
  type: WidgetType
  title: string
  icon: React.ReactNode
  defaultSize: WidgetSize
  defaultHeightSize?: WidgetHeightSize
  defaultVisible?: boolean  // If false, hidden by default
  underDevelopment?: boolean  // If true, shows "Under Development" badge
}

// Default widget definitions
// Widgets with real data: contract, support, usage
// Widgets under development (mock data): all others
const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  { id: 'contract', type: 'contract', title: 'Contract & Renewal', icon: <FileText className="w-4 h-4" />, defaultSize: 1, defaultVisible: true },
  {
    id: 'implementation',
    type: 'implementation',
    title: 'Implementation context',
    icon: <BookOpen className="w-4 h-4" />,
    defaultSize: 2,
    defaultHeightSize: 3,
    defaultVisible: true,
  },
  { id: 'support', type: 'support', title: 'Support Risk', icon: <Headphones className="w-4 h-4" />, defaultSize: 1, defaultVisible: true },
  { id: 'usage', type: 'usage', title: 'Product Usage — Pendo', icon: <TrendingUp className="w-4 h-4" />, defaultSize: 1, defaultVisible: true },
  { id: 'health', type: 'health', title: 'Health Score', icon: <Activity className="w-4 h-4" />, defaultSize: 1, defaultVisible: false, underDevelopment: true },
  { id: 'alerts', type: 'alerts', title: 'Action Alerts', icon: <Bell className="w-4 h-4" />, defaultSize: 2, defaultVisible: false, underDevelopment: true },
  { id: 'risk', type: 'risk', title: 'Churn Risk', icon: <AlertTriangle className="w-4 h-4" />, defaultSize: 1, defaultVisible: false, underDevelopment: true },
  { id: 'brief', type: 'brief', title: 'Meeting Brief', icon: <Sparkles className="w-4 h-4" />, defaultSize: 1, defaultVisible: false, underDevelopment: true },
  { id: 'whitespace', type: 'whitespace', title: 'Whitespace', icon: <Target className="w-4 h-4" />, defaultSize: 1, defaultVisible: false, underDevelopment: true },
  { id: 'sentiment', type: 'sentiment', title: 'Sentiment', icon: <Smile className="w-4 h-4" />, defaultSize: 1, defaultVisible: false, underDevelopment: true },
  { id: 'benchmark', type: 'benchmark', title: 'Benchmarking', icon: <BarChart3 className="w-4 h-4" />, defaultSize: 1, defaultVisible: false, underDevelopment: true },
  { id: 'value', type: 'value', title: 'Value Realization', icon: <Award className="w-4 h-4" />, defaultSize: 1, defaultVisible: false, underDevelopment: true },
  { id: 'changes', type: 'changes', title: 'Changes Since Last Touch', icon: <GitCompare className="w-4 h-4" />, defaultSize: 2, defaultVisible: false, underDevelopment: true },
  { id: 'notes', type: 'notes', title: 'CSM Notes', icon: <StickyNote className="w-4 h-4" />, defaultSize: 1, defaultVisible: false, underDevelopment: true },
  { id: 'signals', type: 'signals', title: 'Recent Signals', icon: <Radio className="w-4 h-4" />, defaultSize: 1, defaultVisible: false, underDevelopment: true },
  { id: 'gong', type: 'gong', title: 'Gong Activity', icon: <PhoneCall className="w-4 h-4" />, defaultSize: 2, defaultVisible: true },
]

// Helper to check if a widget is under development
export function isWidgetUnderDevelopment(widgetId: string): boolean {
  const def = WIDGET_DEFINITIONS.find(w => w.id === widgetId)
  return def?.underDevelopment ?? false
}

// Get default layout
export function getDefaultLayout(): WidgetLayout[] {
  return WIDGET_DEFINITIONS.map((w, index) => ({
    id: w.id,
    order: index,
    size: w.defaultSize,
    heightSize: (w.defaultHeightSize ?? 2) as WidgetHeightSize,
    collapsed: false,
    visible: w.defaultVisible !== false,  // Default to true unless explicitly set to false
  }))
}

interface DraggableWidgetGridProps {
  data: AccountFullDetail | undefined
  isLoading: boolean
  layout: WidgetLayout[]
  onLayoutChange: (layout: WidgetLayout[]) => void
}

export function DraggableWidgetGrid({
  data,
  isLoading,
  layout,
  onLayoutChange,
}: DraggableWidgetGridProps) {
  const [showWidgetPanel, setShowWidgetPanel] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Configure sensors for drag interactions
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Get visible widgets sorted by order
  const visibleWidgets = useMemo(() => {
    return layout
      .filter(l => l.visible)
      .sort((a, b) => a.order - b.order)
      .map(l => {
        const def = WIDGET_DEFINITIONS.find(w => w.id === l.id)
        return { ...l, ...def }
      })
      .filter(w => w.type) // Filter out any without definitions
  }, [layout])

  // Get hidden widgets
  const hiddenWidgets = useMemo(() => {
    return layout
      .filter(l => !l.visible)
      .map(l => WIDGET_DEFINITIONS.find(w => w.id === l.id))
      .filter(Boolean) as WidgetDefinition[]
  }, [layout])

  // Get widget IDs for sortable context
  const widgetIds = useMemo(() => visibleWidgets.map(w => w.id), [visibleWidgets])

  // Get active widget for drag overlay
  const activeWidget = useMemo(() => {
    if (!activeId) return null
    return WIDGET_DEFINITIONS.find(w => w.id === activeId)
  }, [activeId])

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = visibleWidgets.findIndex(w => w.id === active.id)
      const newIndex = visibleWidgets.findIndex(w => w.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder the visible widgets
        const reordered = arrayMove(visibleWidgets, oldIndex, newIndex)
        
        // Update the layout with new orders
        const newLayout = layout.map(l => {
          const newOrder = reordered.findIndex(w => w.id === l.id)
          if (newOrder !== -1) {
            return { ...l, order: newOrder }
          }
          return l
        })

        onLayoutChange(newLayout)
      }
    }
  }, [visibleWidgets, layout, onLayoutChange])

  // Toggle widget visibility
  const handleToggleWidget = useCallback((widgetId: string) => {
    const newLayout = layout.map(l => 
      l.id === widgetId ? { ...l, visible: !l.visible } : l
    )
    onLayoutChange(newLayout)
  }, [layout, onLayoutChange])

  // Toggle widget collapsed state
  const handleToggleCollapsed = useCallback((widgetId: string, collapsed: boolean) => {
    const newLayout = layout.map(l => 
      l.id === widgetId ? { ...l, collapsed } : l
    )
    onLayoutChange(newLayout)
  }, [layout, onLayoutChange])

  // Change widget width
  const handleSizeChange = useCallback((widgetId: string, size: WidgetSize) => {
    const newLayout = layout.map(l => 
      l.id === widgetId ? { ...l, size } : l
    )
    onLayoutChange(newLayout)
  }, [layout, onLayoutChange])

  // Change widget height
  const handleHeightChange = useCallback((widgetId: string, heightSize: 1 | 2 | 3) => {
    const newLayout = layout.map(l =>
      l.id === widgetId ? { ...l, heightSize } : l
    )
    onLayoutChange(newLayout)
  }, [layout, onLayoutChange])

  // Reset layout to defaults
  const handleResetLayout = useCallback(() => {
    onLayoutChange(getDefaultLayout())
  }, [onLayoutChange])

  // Restore a hidden widget
  const handleRestoreWidget = useCallback((widgetId: string) => {
    const maxOrder = Math.max(...layout.map(l => l.order), -1)
    const newLayout = layout.map(l => 
      l.id === widgetId ? { ...l, visible: true, order: maxOrder + 1 } : l
    )
    onLayoutChange(newLayout)
  }, [layout, onLayoutChange])

  // Render a widget by type
  const renderWidget = (widgetId: string, collapsed: boolean, onCollapsedChange: (c: boolean) => void, onHide: () => void) => {
    const widgetDef = WIDGET_DEFINITIONS.find(w => w.id === widgetId)
    if (!widgetDef) return null

    const commonProps = {
      isLoading,
      collapsed,
      onCollapsedChange,
      onHide,
    }

    switch (widgetDef.type) {
      case 'health':
        return <HealthScoreWidget data={data?.health_breakdown} {...commonProps} />
      case 'support':
        return <SupportRiskWidget data={data?.support_analysis} accountId={data?.account.id} {...commonProps} />
      case 'usage':
        return <UsageTrendWidget data={data?.usage_analysis} {...commonProps} />
      case 'whitespace':
        return <WhitespaceWidget data={data?.whitespace} {...commonProps} />
      case 'contract':
        return <ContractWidget data={data?.contract} {...commonProps} />
      case 'implementation':
        return (
          <ConfluenceImplementationWidget accountId={data?.account.id} {...commonProps} />
        )
      case 'brief':
        return <MeetingBriefWidget data={data?.meeting_brief} {...commonProps} />
      case 'changes':
        return <ChangeDetectionWidget data={data?.changes_since_last_touch} lastTouchDate={data?.last_touch_date} {...commonProps} />
      case 'notes':
        return <HumanNotesWidget data={data?.notes} {...commonProps} />
      case 'risk':
        return <ChurnRiskWidget data={data?.risk_assessment} {...commonProps} />
      case 'value':
        return <ValueRealizationWidget data={data?.value_realization} {...commonProps} />
      case 'sentiment':
        return <SentimentWidget data={data?.sentiment} {...commonProps} />
      case 'benchmark':
        return <BenchmarkWidget data={data?.benchmark} {...commonProps} />
      case 'alerts':
        return <AlertsWidget data={data?.alerts} {...commonProps} />
      case 'signals':
        return <RecentSignalsWidget data={data?.signals} {...commonProps} />
      case 'gong':
        return <GongActivityWidget data={data?.gong_activity} {...commonProps} />
      default:
        return null
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {visibleWidgets.length} widgets
          </span>
          <button
            onClick={handleResetLayout}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Widget Button (when there are hidden widgets) */}
          {hiddenWidgets.length > 0 && (
            <button
              onClick={() => setShowWidgetPanel(!showWidgetPanel)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                showWidgetPanel 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Widget ({hiddenWidgets.length})
            </button>
          )}

          <button
            onClick={() => setShowWidgetPanel(!showWidgetPanel)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              showWidgetPanel 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            Customize
          </button>
        </div>
      </div>

      {/* Widget Visibility Panel */}
      <AnimatePresence>
        {showWidgetPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <p className="text-xs text-slate-500 mb-2">
                Drag widgets to reorder. Click eye to hide/show. Use resize controls on hover.
              </p>
              
              {hiddenWidgets.length > 0 && (
                <>
                  <p className="text-xs font-medium text-slate-600 mt-3 mb-2">Hidden widgets:</p>
                  <div className="flex flex-wrap gap-2">
                    {hiddenWidgets.map(widget => {
                      const isDevWidget = widget.underDevelopment
                      return (
                        <button
                          key={widget.id}
                          onClick={() => handleRestoreWidget(widget.id)}
                          className={clsx(
                            'flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-white border rounded-lg transition-colors',
                            isDevWidget 
                              ? 'text-amber-700 border-amber-200 hover:border-amber-300 hover:bg-amber-50'
                              : 'text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                          )}
                        >
                          <Plus className="w-3 h-3" />
                          {widget.title}
                          {isDevWidget && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded">
                              DEV
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget Grid with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
          <div className="p-4 pb-32">
            <div className="grid grid-cols-12 gap-4 auto-rows-min">
              {visibleWidgets.map((widget) => {
                const layoutItem = layout.find(l => l.id === widget.id)
                if (!layoutItem) return null

                return (
                  <SortableWidget
                    key={widget.id}
                    id={widget.id}
                    size={layoutItem.size}
                    heightSize={layoutItem.heightSize || 2}
                    onSizeChange={(size) => handleSizeChange(widget.id, size)}
                    onHeightChange={(h) => handleHeightChange(widget.id, h)}
                    isUnderDevelopment={widget.underDevelopment}
                  >
                    {renderWidget(
                      widget.id,
                      layoutItem.collapsed,
                      (c) => handleToggleCollapsed(widget.id, c),
                      () => handleToggleWidget(widget.id)
                    )}
                  </SortableWidget>
                )
              })}
            </div>
          </div>
        </SortableContext>

        {/* Drag Overlay - shows preview while dragging */}
        <DragOverlay>
          {activeWidget && (
            <WidgetPreview title={activeWidget.title} icon={activeWidget.icon} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

// Export for use elsewhere
export { WIDGET_DEFINITIONS }
export type { WidgetDefinition }
