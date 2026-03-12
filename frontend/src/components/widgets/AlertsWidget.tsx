import { Bell, AlertTriangle, TrendingUp, Headphones, BarChart3, ChevronRight, Check, X } from 'lucide-react'
import { BaseWidget, Badge } from './BaseWidget'
import { clsx } from 'clsx'
import type { ActionAlert } from '../../types'

interface AlertsWidgetProps {
  data: ActionAlert[] | undefined
  isLoading?: boolean
  onHide?: () => void
  onActionClick?: (alert: ActionAlert) => void
  onDismiss?: (alertId: string) => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

function getAlertIcon(type: string) {
  switch (type) {
    case 'renewal_risk': return <AlertTriangle className="w-5 h-5" />
    case 'churn_risk': return <AlertTriangle className="w-5 h-5" />
    case 'upsell': return <TrendingUp className="w-5 h-5" />
    case 'support_escalation': return <Headphones className="w-5 h-5" />
    case 'usage_drop': return <BarChart3 className="w-5 h-5" />
    case 'engagement_drop': return <BarChart3 className="w-5 h-5" />
    default: return <Bell className="w-5 h-5" />
  }
}

function getAlertStyle(severity: string) {
  switch (severity) {
    case 'critical': return {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      actionBg: 'bg-rose-500 hover:bg-rose-600'
    }
    case 'high': return {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      actionBg: 'bg-orange-500 hover:bg-orange-600'
    }
    case 'medium': return {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      actionBg: 'bg-amber-500 hover:bg-amber-600'
    }
    default: return {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      actionBg: 'bg-slate-500 hover:bg-slate-600'
    }
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
  return `${diffDays}d ago`
}

export function AlertsWidget({ data, isLoading, onHide, onActionClick, onDismiss, collapsed, onCollapsedChange }: AlertsWidgetProps) {
  const unreadCount = data?.filter(a => !a.is_read).length || 0

  return (
    <BaseWidget
      title="Action Alerts"
      icon={<Bell className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      badge={
        unreadCount > 0 && (
          <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-medium rounded-full">
            {unreadCount}
          </span>
        )
      }
    >
      {data && data.length > 0 ? (
        <div className="p-4 space-y-3">
          {data.map((alert) => {
            const style = getAlertStyle(alert.severity)
            
            return (
              <div 
                key={alert.id}
                className={clsx(
                  'rounded-lg border p-3 transition-all',
                  style.bg,
                  style.border,
                  !alert.is_read && 'ring-1 ring-primary-200'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={clsx(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    style.iconBg,
                    style.iconColor
                  )}>
                    {getAlertIcon(alert.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{alert.title}</h4>
                        <p className="text-[10px] text-slate-500">{formatRelativeTime(alert.timestamp)}</p>
                      </div>
                      <Badge variant={alert.severity as any} size="sm">
                        {alert.severity}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {alert.description}
                    </p>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => onActionClick?.(alert)}
                        className={clsx(
                          'flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors',
                          style.actionBg
                        )}
                      >
                        {alert.suggested_action}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      
                      {onDismiss && (
                        <button
                          onClick={() => onDismiss(alert.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-8 text-center">
          <Check className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">All caught up!</p>
          <p className="text-xs text-slate-400 mt-1">No pending alerts</p>
        </div>
      )}
    </BaseWidget>
  )
}
