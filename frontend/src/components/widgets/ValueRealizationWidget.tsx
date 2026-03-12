import { Target, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { BaseWidget, ProgressBar } from './BaseWidget'
import { clsx } from 'clsx'
import type { ValueRealization } from '../../types'

interface ValueRealizationWidgetProps {
  data: ValueRealization | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function ValueRealizationWidget({ data, isLoading, onHide, collapsed, onCollapsedChange }: ValueRealizationWidgetProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'at_risk': return <AlertCircle className="w-4 h-4 text-amber-500" />
      case 'behind': return <XCircle className="w-4 h-4 text-rose-500" />
      default: return null
    }
  }

  const getStatusColor = (status: string): 'emerald' | 'amber' | 'rose' => {
    switch (status) {
      case 'on_track': return 'emerald'
      case 'at_risk': return 'amber'
      default: return 'rose'
    }
  }

  return (
    <BaseWidget
      title="Value Realization"
      icon={<Target className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      {data && (
        <div className="p-4">
          {/* Overall Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xl font-bold text-slate-800">
                {data.overall_realization_percent}%
              </p>
              <p className="text-[10px] text-slate-500 uppercase">Realized</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xl font-bold text-slate-800">
                {data.time_to_value_days}
              </p>
              <p className="text-[10px] text-slate-500 uppercase">Days to Value</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xl font-bold text-slate-800">
                {data.adoption_score}
              </p>
              <p className="text-[10px] text-slate-500 uppercase">Adoption</p>
            </div>
          </div>

          {/* Goals */}
          {data.goals.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Goals & Milestones
              </h4>
              <div className="space-y-3">
                {data.goals.map((goal) => {
                  const progress = (goal.current / goal.target) * 100
                  
                  return (
                    <div key={goal.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getStatusIcon(goal.status)}
                          <span className="text-xs font-medium text-slate-700 truncate">
                            {goal.name}
                          </span>
                        </div>
                        <span className={clsx(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded',
                          goal.status === 'on_track' ? 'bg-emerald-100 text-emerald-700' :
                          goal.status === 'at_risk' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        )}>
                          {goal.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800">
                          {goal.current} {goal.unit}
                        </span>
                        <span className="text-xs text-slate-400">/</span>
                        <span className="text-xs text-slate-500">
                          {goal.target} {goal.unit}
                        </span>
                      </div>
                      
                      <ProgressBar
                        value={Math.min(progress, 100)}
                        color={getStatusColor(goal.status)}
                        size="sm"
                      />
                      
                      <p className="text-[10px] text-slate-400 mt-1">
                        Due: {new Date(goal.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  )
}
