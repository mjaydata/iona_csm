import { GitCommit, Mail, Phone, Headphones, BarChart3, FileText, Users, Calendar } from 'lucide-react'
import { BaseWidget, Badge } from './BaseWidget'
import { clsx } from 'clsx'
import type { ChangeEvent } from '../../types'

interface ChangeDetectionWidgetProps {
  data: ChangeEvent[] | undefined
  isLoading?: boolean
  onHide?: () => void
  lastTouchDate?: string
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

function getChangeIcon(type: string) {
  switch (type) {
    case 'meeting': return <Calendar className="w-4 h-4" />
    case 'email': return <Mail className="w-4 h-4" />
    case 'call': return <Phone className="w-4 h-4" />
    case 'support': return <Headphones className="w-4 h-4" />
    case 'usage': return <BarChart3 className="w-4 h-4" />
    case 'contract': return <FileText className="w-4 h-4" />
    case 'stakeholder': return <Users className="w-4 h-4" />
    default: return <GitCommit className="w-4 h-4" />
  }
}

function getImportanceColor(importance: string) {
  switch (importance) {
    case 'high': return 'border-rose-300 bg-rose-50'
    case 'medium': return 'border-amber-300 bg-amber-50'
    default: return 'border-slate-200 bg-slate-50'
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

export function ChangeDetectionWidget({ data, isLoading, onHide, lastTouchDate, collapsed, onCollapsedChange }: ChangeDetectionWidgetProps) {
  return (
    <BaseWidget
      title="Changes Since Last Touch"
      icon={<GitCommit className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      badge={
        lastTouchDate && (
          <span className="text-[10px] text-slate-400">
            Last: {formatRelativeTime(lastTouchDate)}
          </span>
        )
      }
    >
      {data && data.length > 0 ? (
        <div className="p-4">
          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-200" />
            
            <div className="space-y-4">
              {data.map((change) => (
                <div key={change.id} className="relative flex gap-3">
                  {/* Timeline dot */}
                  <div className={clsx(
                    'relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    change.importance === 'high' ? 'bg-rose-100 text-rose-600' :
                    change.importance === 'medium' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-500'
                  )}>
                    {getChangeIcon(change.type)}
                  </div>

                  {/* Content */}
                  <div className={clsx(
                    'flex-1 min-w-0 p-2 rounded-lg border',
                    getImportanceColor(change.importance)
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-700">{change.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                          {change.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-slate-400">
                          {formatRelativeTime(change.date)}
                        </span>
                        <Badge 
                          variant={change.importance === 'high' ? 'critical' : change.importance === 'medium' ? 'warning' : 'low'}
                          size="sm"
                        >
                          {change.importance}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Source: {change.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center">
          <GitCommit className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No changes since last touch</p>
        </div>
      )}
    </BaseWidget>
  )
}
