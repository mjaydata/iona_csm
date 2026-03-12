import { clsx } from 'clsx'
import { AlertTriangle, RefreshCcw, TrendingDown, TrendingUp, X, Info } from 'lucide-react'
import type { MetricsSummary } from '../types'

type KpiFilter = 'all' | 'at_risk' | 'renewals' | 'usage_decline' | 'expansion'

interface ActionableInsightsProps {
  metrics: MetricsSummary | undefined
  isLoading: boolean
  activeKpi: KpiFilter
  onKpiClick: (kpi: KpiFilter) => void
  filteredAtRiskCount?: number
}

interface InsightCardProps {
  icon: React.ReactNode
  accentColor: string
  cardBg: string
  iconColor: string
  title: string
  description: string
  actionLabel: string
  actionColor: string
  onClick: () => void
  isActive: boolean
  tooltip?: string
  dimmed?: boolean
}

function InsightCard({
  icon,
  accentColor,
  cardBg,
  iconColor,
  title,
  description,
  actionLabel,
  actionColor,
  onClick,
  isActive,
  tooltip,
  dimmed,
}: InsightCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-start gap-3 p-3 rounded-lg border-l-4 border border-slate-100/80 transition-all duration-200 text-left w-full',
        accentColor,
        cardBg,
        isActive && 'ring-2 ring-primary ring-offset-1 shadow-md',
        !isActive && 'hover:shadow-sm',
        dimmed && 'opacity-50'
      )}
    >
      <div className={clsx('mt-0.5 flex-shrink-0', iconColor)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-slate-900 leading-tight">{title}</p>
            {tooltip && (
              <div className="group relative">
                <Info className="w-3 h-3 text-slate-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[11px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-60 z-50 shadow-lg leading-relaxed">
                  {tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
              </div>
            )}
          </div>
          {isActive && <X className="w-3 h-3 text-slate-400" />}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{description}</p>
        <span className={clsx('mt-1.5 text-[10px] font-bold uppercase tracking-wider inline-block', actionColor)}>
          {actionLabel}
        </span>
      </div>
    </button>
  )
}

/**
 * Actionable Insights - Border-left accent cards
 */
export function ActionableInsights({ metrics, isLoading, activeKpi, onKpiClick, filteredAtRiskCount }: ActionableInsightsProps) {
  const atRiskCount = filteredAtRiskCount !== undefined ? filteredAtRiskCount : (metrics?.at_risk_count ?? 0)
  const renewalsCount = metrics?.renewals_90_days ?? 0
  const usageDecline = metrics?.usage_decline_count ?? 0
  const expansion = metrics?.expansion_signals ?? 0

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-slate-900">Actionable Insights</h2>
        {activeKpi !== 'all' && (
          <button
            onClick={() => onKpiClick('all')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <InsightCard
          icon={<AlertTriangle className="w-4 h-4" />}
          accentColor="border-l-rose-500"
          cardBg="bg-rose-50/40"
          iconColor="text-rose-500"
          title={isLoading ? '...' : `${atRiskCount} Accounts at Risk`}
          description="Significant health score drops detected. Review and intervene."
          actionLabel="Start Recovery"
          actionColor="text-rose-600"
          onClick={() => onKpiClick(activeKpi === 'at_risk' ? 'all' : 'at_risk')}
          isActive={activeKpi === 'at_risk'}
        />

        <InsightCard
          icon={<RefreshCcw className="w-4 h-4" />}
          accentColor="border-l-blue-500"
          cardBg="bg-blue-50/40"
          iconColor="text-blue-500"
          title={isLoading ? '...' : `${renewalsCount} Upcoming Renewals`}
          description="Contracts due within 90 days. Ensure retention readiness."
          actionLabel="Audit Pipeline"
          actionColor="text-blue-600"
          onClick={() => onKpiClick(activeKpi === 'renewals' ? 'all' : 'renewals')}
          isActive={activeKpi === 'renewals'}
        />

        <InsightCard
          icon={<TrendingDown className="w-4 h-4" />}
          accentColor="border-l-amber-500"
          cardBg="bg-amber-50/40"
          iconColor="text-amber-500"
          title={isLoading ? '...' : `${usageDecline} Product Usage Declining`}
          description="Pendo active visitors dropped 20%+ vs prior month."
          actionLabel="Review Accounts"
          actionColor="text-amber-600"
          onClick={() => onKpiClick(activeKpi === 'usage_decline' ? 'all' : 'usage_decline')}
          isActive={activeKpi === 'usage_decline'}
          tooltip="Based on Pendo visitor data. Counts accounts where active users dropped 20% or more compared to the previous 30-day period. Not all accounts have Pendo integrated."
        />

        <InsightCard
          icon={<TrendingUp className="w-4 h-4" />}
          accentColor="border-l-emerald-400"
          cardBg="bg-emerald-50/30"
          iconColor="text-emerald-500"
          title={isLoading ? '...' : `${expansion} Expansion Signals`}
          description="High product usage detected. Prep upsell opportunities."
          actionLabel="Review Signals"
          actionColor="text-emerald-600"
          onClick={() => onKpiClick(activeKpi === 'expansion' ? 'all' : 'expansion')}
          isActive={activeKpi === 'expansion'}
          dimmed={expansion === 0}
        />
      </div>
    </section>
  )
}
