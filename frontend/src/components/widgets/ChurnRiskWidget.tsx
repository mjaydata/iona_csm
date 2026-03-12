import { AlertTriangle, TrendingDown, TrendingUp, Minus, CheckCircle } from 'lucide-react'
import { BaseWidget, ScoreGauge, Badge, ProgressBar } from './BaseWidget'
import { clsx } from 'clsx'
import type { RiskAssessment } from '../../types'

interface ChurnRiskWidgetProps {
  data: RiskAssessment | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function ChurnRiskWidget({ data, isLoading, onHide, collapsed, onCollapsedChange }: ChurnRiskWidgetProps) {
  const getRiskLevelVariant = (level: string): 'critical' | 'high' | 'medium' | 'low' => {
    switch (level) {
      case 'critical': return 'critical'
      case 'high': return 'high'
      case 'medium': return 'medium'
      default: return 'low'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'worsening': return <TrendingUp className="w-3 h-3 text-rose-500" />
      case 'improving': return <TrendingDown className="w-3 h-3 text-emerald-500" />
      default: return <Minus className="w-3 h-3 text-slate-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-rose-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-amber-500'
      default: return 'bg-slate-400'
    }
  }

  return (
    <BaseWidget
      title="Churn & Renewal Risk"
      icon={<AlertTriangle className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      badge={data && <Badge variant={getRiskLevelVariant(data.risk_level)}>{data.risk_level}</Badge>}
    >
      {data && (
        <div className="p-4">
          {/* Risk Scores */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <ScoreGauge score={data.churn_risk_score} size="sm" />
              <p className="text-[10px] text-slate-500 mt-1">Churn Risk</p>
            </div>
            <div className="text-center">
              <ScoreGauge score={data.renewal_risk_score} size="sm" />
              <p className="text-[10px] text-slate-500 mt-1">Renewal Risk</p>
            </div>
          </div>

          {/* Risk Factors */}
          {data.risk_factors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Risk Factors
              </h4>
              <div className="space-y-2">
                {data.risk_factors.map((factor, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{factor.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">{factor.impact}%</span>
                        {getTrendIcon(factor.trend)}
                      </div>
                    </div>
                    <ProgressBar 
                      value={factor.impact} 
                      color={factor.impact >= 70 ? 'rose' : factor.impact >= 40 ? 'amber' : 'primary'}
                      size="sm"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">{factor.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {data.recommended_actions.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Recommended Actions
              </h4>
              <div className="space-y-2">
                {data.recommended_actions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-primary-50 rounded-lg">
                    <div className={clsx(
                      'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                      getPriorityColor(action.priority)
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-slate-700">{action.title}</p>
                        <Badge 
                          variant={action.priority === 'urgent' ? 'critical' : action.priority === 'high' ? 'high' : 'medium'}
                          size="sm"
                        >
                          {action.priority}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{action.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  )
}
