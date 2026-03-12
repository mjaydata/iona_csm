import { PieChart, TrendingUp } from 'lucide-react'
import { BaseWidget, ProgressBar, Badge } from './BaseWidget'
import type { WhitespaceAnalysis } from '../../types'

interface WhitespaceWidgetProps {
  data: WhitespaceAnalysis | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function WhitespaceWidget({ data, isLoading, onHide, collapsed, onCollapsedChange }: WhitespaceWidgetProps) {
  return (
    <BaseWidget
      title="License & Whitespace"
      icon={<PieChart className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      {data && (
        <div className="p-4">
          {/* Overall Utilization */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Overall Utilization</p>
              <p className="text-xl font-bold text-slate-800">
                {data.utilization_percent.toFixed(0)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-600">
                {data.used_licenses} / {data.total_licenses}
              </p>
              <p className="text-[10px] text-slate-500">licenses used</p>
            </div>
          </div>

          {/* Product Breakdown */}
          {data.products.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                By Product
              </h4>
              <div className="space-y-3">
                {data.products.map((product, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">{product.name}</span>
                      <span className="text-xs text-slate-500">
                        {product.used} / {product.licensed}
                      </span>
                    </div>
                    <ProgressBar
                      value={product.utilization_percent}
                      color={
                        product.utilization_percent >= 90 ? 'rose' :
                        product.utilization_percent >= 70 ? 'amber' : 'emerald'
                      }
                      size="sm"
                    />
                    {product.utilization_percent >= 90 && (
                      <p className="text-[10px] text-rose-500 mt-0.5">Approaching limit</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expansion Opportunities */}
          {data.expansion_opportunities.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Expansion Opportunities
              </h4>
              <div className="space-y-2">
                {data.expansion_opportunities.map((opp, idx) => (
                  <div key={idx} className="p-2 bg-emerald-50 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-700">{opp.product}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{opp.reason}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-semibold text-emerald-600">
                          {formatCurrency(opp.potential_value)}
                        </span>
                        <Badge 
                          variant={opp.confidence === 'high' ? 'success' : opp.confidence === 'medium' ? 'warning' : 'info'}
                          size="sm"
                        >
                          {opp.confidence}
                        </Badge>
                      </div>
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
