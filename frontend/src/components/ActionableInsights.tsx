import { clsx } from 'clsx'
import { AlertTriangle, RefreshCcw, TrendingDown, TrendingUp, X } from 'lucide-react'
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
  iconBg: string
  cardBg: string
  cardBorder: string
  title: string
  description: string
  actionLabel: string
  actionColor: string
  onClick: () => void
  isActive: boolean
}

function InsightCard({
  icon,
  iconBg,
  cardBg,
  cardBorder,
  title,
  description,
  actionLabel,
  actionColor,
  onClick,
  isActive,
}: InsightCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 text-left w-full',
        cardBg,
        cardBorder,
        isActive && 'ring-2 ring-primary ring-offset-1 shadow-md',
        !isActive && 'hover:shadow-md'
      )}
    >
      <div className={clsx('p-2.5 rounded-lg flex-shrink-0', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          {isActive && <X className="w-3.5 h-3.5 text-slate-400" />}
        </div>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{description}</p>
        <span className={clsx('mt-2 text-[11px] font-bold uppercase tracking-wider inline-block', actionColor)}>
          {actionLabel}
        </span>
      </div>
    </button>
  )
}

/**
 * Actionable Insights - Descriptive cards with colored backgrounds
 */
export function ActionableInsights({ metrics, isLoading, activeKpi, onKpiClick, filteredAtRiskCount }: ActionableInsightsProps) {
  // Use filtered count when at_risk filter is active, otherwise use metrics count
  const atRiskCount = filteredAtRiskCount !== undefined ? filteredAtRiskCount : (metrics?.at_risk_count ?? 0)
  const renewalsCount = metrics?.renewals_90_days ?? 0
  const usageDecline = metrics?.usage_decline_count ?? 0
  const expansion = metrics?.expansion_signals ?? 0

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900">Actionable Insights</h2>
        {activeKpi !== 'all' && (
          <button
            onClick={() => onKpiClick('all')}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <InsightCard
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          iconBg="bg-rose-100"
          cardBg="bg-rose-50/50"
          cardBorder="border-rose-100"
          title={isLoading ? '...' : `${atRiskCount} Accounts at Risk`}
          description="Significant health score drops detected. Review and intervene."
          actionLabel="Start Recovery"
          actionColor="text-rose-600"
          onClick={() => onKpiClick(activeKpi === 'at_risk' ? 'all' : 'at_risk')}
          isActive={activeKpi === 'at_risk'}
        />

        <InsightCard
          icon={<RefreshCcw className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          cardBg="bg-primary/[0.03]"
          cardBorder="border-primary/10"
          title={isLoading ? '...' : `${renewalsCount} Upcoming Renewals`}
          description="Contracts due within 90 days. Ensure retention readiness."
          actionLabel="Audit Pipeline"
          actionColor="text-primary"
          onClick={() => onKpiClick(activeKpi === 'renewals' ? 'all' : 'renewals')}
          isActive={activeKpi === 'renewals'}
        />

        <InsightCard
          icon={<TrendingDown className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-100"
          cardBg="bg-amber-50/50"
          cardBorder="border-amber-100"
          title={isLoading ? '...' : `${usageDecline} Usage Declining`}
          description="Engagement metrics trending down. Proactive outreach needed."
          actionLabel="Review Accounts"
          actionColor="text-amber-600"
          onClick={() => onKpiClick(activeKpi === 'usage_decline' ? 'all' : 'usage_decline')}
          isActive={activeKpi === 'usage_decline'}
        />

        <InsightCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-100"
          cardBg="bg-emerald-50/50"
          cardBorder="border-emerald-100"
          title={isLoading ? '...' : `${expansion} Expansion Signals`}
          description="High product usage detected. Prep upsell opportunities."
          actionLabel="Review Signals"
          actionColor="text-emerald-600"
          onClick={() => onKpiClick(activeKpi === 'expansion' ? 'all' : 'expansion')}
          isActive={activeKpi === 'expansion'}
        />
      </div>
    </section>
  )
}
