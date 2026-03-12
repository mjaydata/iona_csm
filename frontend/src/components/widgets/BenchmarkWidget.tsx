import { BarChart2, TrendingUp, TrendingDown } from 'lucide-react'
import { BaseWidget } from './BaseWidget'
import { clsx } from 'clsx'
import type { BenchmarkData } from '../../types'

interface BenchmarkWidgetProps {
  data: BenchmarkData | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function BenchmarkWidget({ data, isLoading, onHide, collapsed, onCollapsedChange }: BenchmarkWidgetProps) {
  return (
    <BaseWidget
      title="Peer Benchmarking"
      icon={<BarChart2 className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      {data && (
        <div className="p-4">
          {/* Peer Group */}
          <div className="p-2 bg-slate-50 rounded-lg mb-4 text-center">
            <p className="text-[10px] text-slate-500 uppercase">Peer Group</p>
            <p className="text-xs font-medium text-slate-700">{data.peer_group}</p>
          </div>

          {/* Metrics Comparison */}
          <div className="space-y-4">
            {data.metrics.map((metric, idx) => {
              const isAboveAverage = metric.account_value > metric.peer_average
              const diffPercent = ((metric.account_value - metric.peer_average) / metric.peer_average * 100)
              
              // Determine bar positions (scale from min to max of values)
              const allValues = [metric.account_value, metric.peer_average, metric.peer_median]
              const maxVal = Math.max(...allValues) * 1.1
              const minVal = 0
              const range = maxVal - minVal
              
              const accountPos = ((metric.account_value - minVal) / range) * 100
              const avgPos = ((metric.peer_average - minVal) / range) * 100
              const medianPos = ((metric.peer_median - minVal) / range) * 100

              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">{metric.name}</span>
                    <div className="flex items-center gap-1">
                      <span className={clsx(
                        'text-[10px] font-medium',
                        isAboveAverage ? 'text-emerald-600' : 'text-rose-600'
                      )}>
                        {isAboveAverage ? '+' : ''}{diffPercent.toFixed(0)}%
                      </span>
                      {isAboveAverage ? (
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-rose-500" />
                      )}
                    </div>
                  </div>

                  {/* Comparison Bar */}
                  <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                    {/* Peer Average Line */}
                    <div 
                      className="absolute top-0 bottom-0 w-px bg-slate-400 z-10"
                      style={{ left: `${avgPos}%` }}
                    >
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-slate-400 whitespace-nowrap">
                        Avg
                      </div>
                    </div>
                    
                    {/* Peer Median Line */}
                    <div 
                      className="absolute top-0 bottom-0 w-px bg-slate-300 z-10 border-dashed"
                      style={{ left: `${medianPos}%` }}
                    />
                    
                    {/* Account Value Bar */}
                    <div 
                      className={clsx(
                        'absolute top-1 bottom-1 rounded transition-all',
                        isAboveAverage ? 'bg-emerald-400' : 'bg-amber-400'
                      )}
                      style={{ 
                        left: 4,
                        width: `calc(${accountPos}% - 8px)`
                      }}
                    />
                    
                    {/* Account Value Label */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-700 z-20"
                      style={{ left: Math.max(accountPos + 2, 8) + '%' }}
                    >
                      {metric.account_value.toLocaleString()}
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500">
                        Avg: {metric.peer_average.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Med: {metric.peer_median.toLocaleString()}
                      </span>
                    </div>
                    <span className={clsx(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded',
                      metric.percentile >= 75 ? 'bg-emerald-100 text-emerald-700' :
                      metric.percentile >= 50 ? 'bg-slate-100 text-slate-600' :
                      metric.percentile >= 25 ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    )}>
                      {metric.percentile}th percentile
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </BaseWidget>
  )
}
