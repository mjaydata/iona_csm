import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { BaseWidget, ScoreGauge, ProgressBar } from './BaseWidget'
import type { HealthBreakdown } from '../../types'

interface HealthScoreWidgetProps {
  data: HealthBreakdown | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function HealthScoreWidget({ data, isLoading, onHide, collapsed, onCollapsedChange }: HealthScoreWidgetProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-emerald-500" />
      case 'declining': return <TrendingDown className="w-4 h-4 text-rose-500" />
      default: return <Minus className="w-4 h-4 text-slate-400" />
    }
  }

  const getScoreColor = (score: number): 'emerald' | 'amber' | 'rose' => {
    if (score >= 70) return 'emerald'
    if (score >= 40) return 'amber'
    return 'rose'
  }

  return (
    <BaseWidget
      title="Health Score"
      icon={<Activity className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      badge={
        data && (
          <div className="flex items-center gap-1">
            {getTrendIcon(data.trend)}
            <span className="text-xs text-slate-500 capitalize">{data.trend}</span>
          </div>
        )
      }
    >
      {data && (
        <div className="p-4">
          {/* Main Score */}
          <div className="flex items-center justify-center mb-6">
            <ScoreGauge score={data.overall_score} size="lg" label="Overall Health" />
          </div>

          {/* Score Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Breakdown</h4>
            
            <div className="space-y-2">
              <div>
                <ProgressBar
                  value={data.usage_score}
                  color={getScoreColor(data.usage_score)}
                  label="Usage"
                  showLabel
                />
              </div>
              <div>
                <ProgressBar
                  value={data.support_score}
                  color={getScoreColor(data.support_score)}
                  label="Support"
                  showLabel
                />
              </div>
              <div>
                <ProgressBar
                  value={data.engagement_score}
                  color={getScoreColor(data.engagement_score)}
                  label="Engagement"
                  showLabel
                />
              </div>
              <div>
                <ProgressBar
                  value={data.renewal_score}
                  color={getScoreColor(data.renewal_score)}
                  label="Renewal"
                  showLabel
                />
              </div>
            </div>
          </div>

          {/* Contributing Factors */}
          {data.contributing_factors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Contributing Factors
              </h4>
              <div className="space-y-2">
                {data.contributing_factors.map((factor, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      factor.impact === 'positive' ? 'bg-emerald-500' :
                      factor.impact === 'negative' ? 'bg-rose-500' : 'bg-slate-400'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700">{factor.name}</p>
                      <p className="text-xs text-slate-500">{factor.description}</p>
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
