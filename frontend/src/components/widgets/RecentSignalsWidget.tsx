import { Radio, AlertTriangle, TrendingUp, TrendingDown, FileText, Users, BarChart3 } from 'lucide-react'
import { BaseWidget, Badge } from './BaseWidget'
import { useState } from 'react'
import { clsx } from 'clsx'
import type { Signal } from '../../types'

interface RecentSignalsWidgetProps {
  data: Signal[] | undefined
  isLoading?: boolean
  onHide?: () => void
  onSignalClick?: (signal: Signal) => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

function getSignalIcon(type: string) {
  switch (type) {
    case 'usage': return <BarChart3 className="w-4 h-4" />
    case 'contract': return <FileText className="w-4 h-4" />
    case 'stakeholder': return <Users className="w-4 h-4" />
    case 'churn': return <AlertTriangle className="w-4 h-4" />
    case 'expansion': return <TrendingUp className="w-4 h-4" />
    case 'decline': return <TrendingDown className="w-4 h-4" />
    default: return <Radio className="w-4 h-4" />
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RecentSignalsWidget({ data, isLoading, onHide, onSignalClick, collapsed, onCollapsedChange }: RecentSignalsWidgetProps) {
  const [filter, setFilter] = useState<string>('all')
  
  const signalTypes = data ? [...new Set(data.map(s => s.type))] : []
  
  const filteredSignals = data?.filter(s => filter === 'all' || s.type === filter) || []
  const unreadCount = data?.filter(s => !s.is_read).length || 0

  return (
    <BaseWidget
      title="Recent Signals"
      icon={<Radio className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      badge={
        unreadCount > 0 && (
          <span className="px-1.5 py-0.5 bg-primary-500 text-white text-[10px] font-medium rounded-full">
            {unreadCount} new
          </span>
        )
      }
    >
      <div className="p-4">
        {/* Filter Pills */}
        {signalTypes.length > 1 && (
          <div className="flex flex-wrap gap-1 mb-3">
            <button
              onClick={() => setFilter('all')}
              className={clsx(
                'px-2 py-1 text-[10px] font-medium rounded-full transition-colors',
                filter === 'all' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              All
            </button>
            {signalTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={clsx(
                  'px-2 py-1 text-[10px] font-medium rounded-full transition-colors capitalize',
                  filter === type 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Signals List */}
        {filteredSignals.length > 0 ? (
          <div className="space-y-2">
            {filteredSignals.map((signal) => (
              <button
                key={signal.id}
                onClick={() => onSignalClick?.(signal)}
                className={clsx(
                  'w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm',
                  signal.is_read 
                    ? 'bg-slate-50 border-slate-100' 
                    : 'bg-white border-primary-200 ring-1 ring-primary-100'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    signal.severity === 'critical' ? 'bg-rose-100 text-rose-600' :
                    signal.severity === 'high' ? 'bg-orange-100 text-orange-600' :
                    signal.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-500'
                  )}>
                    {getSignalIcon(signal.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={clsx(
                        'text-xs font-medium',
                        signal.is_read ? 'text-slate-600' : 'text-slate-800'
                      )}>
                        {signal.title}
                      </h4>
                      {!signal.is_read && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                      {signal.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant={
                          signal.severity === 'critical' ? 'critical' :
                          signal.severity === 'high' ? 'high' :
                          signal.severity === 'medium' ? 'medium' : 'low'
                        }
                        size="sm"
                      >
                        {signal.severity}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        {formatRelativeTime(signal.timestamp)}
                      </span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400">
                        {signal.source}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No signals detected</p>
          </div>
        )}
      </div>
    </BaseWidget>
  )
}
