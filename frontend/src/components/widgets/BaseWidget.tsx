import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { ChevronDown, EyeOff, Maximize2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

interface BaseWidgetProps {
  title: string
  children: React.ReactNode
  isLoading?: boolean
  className?: string
  headerActions?: React.ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  collapsed?: boolean // External control
  onCollapsedChange?: (collapsed: boolean) => void
  onHide?: () => void
  icon?: React.ReactNode
  badge?: React.ReactNode
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  allowFullscreen?: boolean
}

export function BaseWidget({
  title,
  children,
  isLoading = false,
  className,
  headerActions,
  collapsible = true,
  defaultCollapsed = false,
  collapsed,
  onCollapsedChange,
  onHide,
  icon,
  badge,
  dragHandleProps,
  allowFullscreen = true,
}: BaseWidgetProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed

  useEffect(() => {
    if (collapsed !== undefined) {
      setInternalCollapsed(collapsed)
    }
  }, [collapsed])

  // Close fullscreen on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const newValue = !isCollapsed
    setInternalCollapsed(newValue)
    onCollapsedChange?.(newValue)
  }

  const handleHide = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onHide?.()
  }

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsFullscreen(true)
  }

  const handleCloseFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsFullscreen(false)
  }

  const widgetContent = (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading...</span>
          </div>
        </div>
      ) : (
        children
      )}
    </>
  )

  // Fullscreen modal
  const fullscreenModal = isFullscreen && createPortal(
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            {icon && <div className="text-slate-500">{icon}</div>}
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            {badge && <div>{badge}</div>}
          </div>
          <button
            onClick={handleCloseFullscreen}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close fullscreen (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Fullscreen Content */}
        <div className="flex-1 overflow-auto">
          {widgetContent}
        </div>
      </motion.div>
    </div>,
    document.body
  )

  return (
    <>
      <div
        className={clsx(
          'bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden flex flex-col',
          isCollapsed ? 'h-auto' : 'h-full',
          className
        )}
      >
        {/* Widget Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0"
          {...dragHandleProps}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <div className="flex-shrink-0 text-slate-400">
                {icon}
              </div>
            )}
            <h3 className="text-sm font-semibold text-slate-700 truncate">{title}</h3>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {headerActions}
            
            {allowFullscreen && (
              <button
                onClick={handleFullscreen}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
            
            {collapsible && (
              <button
                onClick={handleToggleCollapse}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                <motion.div
                  animate={{ rotate: isCollapsed ? 0 : 180 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </button>
            )}
            
            {onHide && (
              <button
                onClick={handleHide}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Hide widget"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Widget Content with Animation */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-1 overflow-hidden"
            >
              <div className="overflow-auto h-full">
                {widgetContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {fullscreenModal}
    </>
  )
}

// Loading skeleton for widgets
export function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-200/60 p-4', className)}>
      <div className="animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-3 bg-slate-200 rounded w-full" />
          <div className="h-3 bg-slate-200 rounded w-5/6" />
          <div className="h-3 bg-slate-200 rounded w-4/6" />
        </div>
      </div>
    </div>
  )
}

// Empty state for widgets
interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function WidgetEmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      {icon && <div className="text-slate-300 mb-3">{icon}</div>}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

// Progress bar component for widgets
interface ProgressBarProps {
  value: number
  max?: number
  color?: 'primary' | 'emerald' | 'amber' | 'rose'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
}

export function ProgressBar({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  showLabel = false,
  label,
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  
  const colorClasses = {
    primary: 'bg-primary-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }
  
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-slate-500">{label}</span>}
          {showLabel && <span className="text-xs font-medium text-slate-600">{percent.toFixed(0)}%</span>}
        </div>
      )}
      <div className={clsx('w-full bg-slate-100 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

// Score gauge component
interface ScoreGaugeProps {
  score: number
  maxScore?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
}

export function ScoreGauge({ score, maxScore = 100, size = 'md', showLabel = true, label }: ScoreGaugeProps) {
  const percent = (score / maxScore) * 100
  
  // Determine color based on score
  let color = 'text-emerald-500'
  let bgColor = 'stroke-emerald-500'
  if (percent < 40) {
    color = 'text-rose-500'
    bgColor = 'stroke-rose-500'
  } else if (percent < 70) {
    color = 'text-amber-500'
    bgColor = 'stroke-amber-500'
  }
  
  const sizeConfig = {
    sm: { size: 60, strokeWidth: 6, fontSize: 'text-lg' },
    md: { size: 80, strokeWidth: 8, fontSize: 'text-2xl' },
    lg: { size: 100, strokeWidth: 10, fontSize: 'text-3xl' },
  }
  
  const config = sizeConfig[size]
  const radius = (config.size - config.strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.size, height: config.size }}>
        <svg className="transform -rotate-90" width={config.size} height={config.size}>
          {/* Background circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-slate-100"
          />
          {/* Progress circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            className={bgColor}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={clsx('font-bold', config.fontSize, color)}>{score}</span>
          </div>
        )}
      </div>
      {label && <span className="text-xs text-slate-500 mt-2">{label}</span>}
    </div>
  )
}

// Badge component for severity/status
interface BadgeProps {
  variant: 'critical' | 'high' | 'medium' | 'low' | 'success' | 'warning' | 'info'
  children: React.ReactNode
  size?: 'sm' | 'md'
}

export function Badge({ variant, children, size = 'sm' }: BadgeProps) {
  const variantClasses = {
    critical: 'bg-rose-100 text-rose-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700',
  }
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  }

  return (
    <span className={clsx(
      'inline-flex items-center font-medium rounded-full',
      variantClasses[variant],
      sizeClasses[size]
    )}>
      {children}
    </span>
  )
}

// Trend indicator
interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable'
  value?: string
  positive?: 'up' | 'down' // Which direction is positive
}

export function TrendIndicator({ trend, value, positive = 'up' }: TrendIndicatorProps) {
  const isPositive = trend === positive || trend === 'stable'
  
  return (
    <span className={clsx(
      'inline-flex items-center gap-0.5 text-xs font-medium',
      isPositive ? 'text-emerald-600' : 'text-rose-600'
    )}>
      {trend === 'up' && '↑'}
      {trend === 'down' && '↓'}
      {trend === 'stable' && '→'}
      {value && <span>{value}</span>}
    </span>
  )
}
