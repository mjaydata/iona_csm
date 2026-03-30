import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Headphones, Clock, TrendingUp, TrendingDown, Minus, MessageSquare, ChevronRight, Loader, Filter, BarChart3, ChevronLeft } from 'lucide-react'
import { BaseWidget, Badge } from './BaseWidget'
import { clsx } from 'clsx'
import type { SupportAnalysis, ResolutionStats } from '../../types'
import { getSupportTickets } from '../../services/api'
import { SupportTicketCard } from '../SupportTicketCard'

interface SupportRiskWidgetProps {
  data: SupportAnalysis | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  accountId?: string
}

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low'
type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved'

function ResolutionDistributionChart({ stats }: { stats: ResolutionStats }) {
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null)
  
  // Find max percentage for scaling
  const maxPct = Math.max(...stats.distribution.map(b => b.percentage), 1)
  
  // Color based on resolution speed
  const getBarColor = (index: number) => {
    if (index <= 1) return 'bg-emerald-400' // Fast (< 3 days)
    if (index <= 3) return 'bg-amber-400'   // Medium (3-14 days)
    return 'bg-rose-400'                     // Slow (14+ days)
  }

  const formatDays = (days: number) => {
    if (days < 1) return `${Math.round(days * 24)}h`
    if (days < 7) return `${days.toFixed(1)}d`
    return `${Math.round(days)}d`
  }

  return (
    <div className="bg-slate-50 rounded-lg p-3">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Resolution Time Distribution</span>
        </div>
        <span className="text-[10px] text-slate-400">{stats.total_resolved} resolved tickets</span>
      </div>

      {/* Mean vs Median comparison */}
      <div className="flex items-center gap-4 mb-3 p-2 bg-white rounded border border-slate-200">
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[10px] text-slate-500">Median</span>
          </div>
          <span className="text-sm font-bold text-slate-800">{formatDays(stats.median_days)}</span>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-[10px] text-slate-500">Mean</span>
          </div>
          <span className="text-sm font-bold text-slate-800">{formatDays(stats.mean_days)}</span>
          {stats.mean_days > stats.median_days * 2 && (
            <span className="text-[9px] text-amber-600 ml-1" title="Mean is significantly higher than median due to outliers">
              (outliers)
            </span>
          )}
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="flex-1 text-right">
          <span className="text-[10px] text-slate-500">P75</span>
          <span className="text-xs font-medium text-slate-600 ml-1">{formatDays(stats.p75_days)}</span>
        </div>
      </div>

      {/* Distribution bars */}
      <div className="space-y-1.5">
        {stats.distribution.map((bucket, index) => (
          <div 
            key={bucket.label}
            className="relative"
            onMouseEnter={() => setHoveredBucket(index)}
            onMouseLeave={() => setHoveredBucket(null)}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-16 text-right">{bucket.label}</span>
              <div className="flex-1 h-5 bg-slate-200 rounded-sm overflow-hidden relative">
                <div 
                  className={clsx(
                    'h-full rounded-sm transition-all duration-300',
                    getBarColor(index),
                    hoveredBucket === index && 'opacity-80'
                  )}
                  style={{ width: `${(bucket.percentage / maxPct) * 100}%` }}
                />
                {/* Percentage label inside bar if wide enough */}
                {bucket.percentage > 15 && (
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium text-white">
                    {bucket.percentage.toFixed(0)}%
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-600 w-10 text-right">
                {bucket.percentage < 15 && `${bucket.percentage.toFixed(0)}%`}
              </span>
            </div>
            
            {/* Hover tooltip */}
            {hoveredBucket === index && (
              <div className="absolute left-20 -top-8 z-10 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg whitespace-nowrap">
                {bucket.count} tickets ({bucket.percentage.toFixed(1)}%)
                <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
        <span>Range: {formatDays(stats.min_days)} - {formatDays(stats.max_days)}</span>
        <span>
          {(() => {
            const fastPct = stats.distribution.slice(0, 2).reduce((sum, b) => sum + b.percentage, 0)
            return `${fastPct.toFixed(0)}% resolved in < 3 days`
          })()}
        </span>
      </div>
    </div>
  )
}

export function SupportRiskWidget({ data, isLoading, onHide, collapsed, onCollapsedChange, accountId }: SupportRiskWidgetProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  // Fetch paginated tickets
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['supportTickets', accountId, currentPage, statusFilter, severityFilter],
    queryFn: () => getSupportTickets(accountId!, {
      page: currentPage,
      page_size: pageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      severity: severityFilter !== 'all' ? severityFilter : undefined,
    }),
    enabled: !!accountId,
    staleTime: 30000,
  })

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, severityFilter])

  const tickets = ticketsData?.tickets || data?.recent_tickets || []
  const totalTickets = ticketsData?.total || data?.total_tickets || 0
  const totalPages = ticketsData?.total_pages || 1

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-3 h-3 text-rose-500" />
      case 'decreasing': return <TrendingDown className="w-3 h-3 text-emerald-500" />
      default: return <Minus className="w-3 h-3 text-slate-400" />
    }
  }

  const getTrendTooltip = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'Volume increasing vs previous period'
      case 'decreasing': return 'Volume decreasing vs previous period'
      default: return 'Volume stable'
    }
  }

  const getSeverityVariant = (severity: string): 'critical' | 'high' | 'medium' | 'low' => {
    switch (severity) {
      case 'critical': return 'critical'
      case 'high': return 'high'
      case 'medium': return 'medium'
      default: return 'low'
    }
  }

  const getSentimentLabel = (avg: number) => {
    if (avg > 0.5) return { label: 'Positive', color: 'text-emerald-600', bg: 'bg-emerald-100' }
    if (avg < -0.5) return { label: 'Negative', color: 'text-rose-600', bg: 'bg-rose-100' }
    return { label: 'Neutral', color: 'text-slate-600', bg: 'bg-slate-100' }
  }

  const handleStatClick = (type: 'open' | 'critical' | 'high') => {
    if (type === 'open') {
      setStatusFilter(statusFilter === 'open' ? 'all' : 'open')
      setSeverityFilter('all')
    } else {
      setSeverityFilter(severityFilter === type ? 'all' : type)
      setStatusFilter('all')
    }
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setSeverityFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters = statusFilter !== 'all' || severityFilter !== 'all'

  return (
    <BaseWidget
      title="Support Risk Analysis"
      icon={<Headphones className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      {data && (
        <div className="p-4 space-y-4">
          {/* Clickable Stats Row - shows all-time totals from backend */}
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => handleStatClick('open')}
              title="Open tickets (all time). Click to filter list below."
              className={clsx(
                'text-center p-3 rounded-lg transition-all',
                statusFilter === 'open' 
                  ? 'bg-slate-200 ring-2 ring-slate-400' 
                  : 'bg-slate-50 hover:bg-slate-100'
              )}
            >
              <p className="text-2xl font-bold text-slate-800">{data.open_tickets}</p>
              <p className="text-[10px] text-slate-500 uppercase">Open</p>
            </button>
            <button 
              onClick={() => handleStatClick('critical')}
              title="Critical priority tickets (all time). Click to filter list below."
              className={clsx(
                'text-center p-3 rounded-lg transition-all',
                severityFilter === 'critical' 
                  ? 'bg-rose-200 ring-2 ring-rose-400' 
                  : 'bg-rose-50 hover:bg-rose-100'
              )}
            >
              <p className="text-2xl font-bold text-rose-600">{data.critical_tickets}</p>
              <p className="text-[10px] text-rose-500 uppercase">Critical</p>
            </button>
            <button 
              onClick={() => handleStatClick('high')}
              title="High priority tickets (all time). Click to filter list below."
              className={clsx(
                'text-center p-3 rounded-lg transition-all',
                severityFilter === 'high' 
                  ? 'bg-amber-200 ring-2 ring-amber-400' 
                  : 'bg-amber-50 hover:bg-amber-100'
              )}
            >
              <p className="text-2xl font-bold text-amber-600">{data.high_tickets}</p>
              <p className="text-[10px] text-amber-500 uppercase">High</p>
            </button>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span title="Filter tickets">
              <Filter className="w-3 h-3 text-slate-400" />
            </span>
            <div className="flex gap-1">
              {(['all', 'open', 'in_progress', 'resolved'] as StatusFilter[]).map((sf) => (
                <button
                  key={sf}
                  onClick={() => { setStatusFilter(sf); setCurrentPage(1) }}
                  title={
                    sf === 'all' ? 'All statuses' :
                    sf === 'open' ? 'Open tickets' :
                    sf === 'in_progress' ? 'In progress' :
                    'Resolved tickets'
                  }
                  className={clsx(
                    'px-2 py-1 text-[10px] font-medium rounded transition-all',
                    statusFilter === sf
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}
                >
                  {sf === 'all' ? 'All' : sf === 'open' ? 'Open' : sf === 'in_progress' ? 'In Progress' : 'Resolved'}
                </button>
              ))}
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Resolution Time Distribution Chart */}
          {data.resolution_stats && data.resolution_stats.total_resolved > 0 ? (
            <ResolutionDistributionChart stats={data.resolution_stats} />
          ) : (
            <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-600">Avg Resolution</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">
                  {(data.avg_resolution_hours / 24).toFixed(1)} days
                </span>
                <span title={getTrendTooltip(data.ticket_trend)}>
                  {getTrendIcon(data.ticket_trend)}
                </span>
              </div>
            </div>
          )}

          {/* Sentiment Row */}
          {data.avg_sentiment !== undefined && (
            <div 
              className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg"
              title="Overall customer sentiment from message analysis"
            >
              <span className="text-xs text-slate-600">Sentiment</span>
              <div className={clsx(
                'px-2 py-0.5 rounded text-xs font-medium',
                getSentimentLabel(data.avg_sentiment).bg,
                getSentimentLabel(data.avg_sentiment).color
              )}>
                {getSentimentLabel(data.avg_sentiment).label}
              </div>
            </div>
          )}

          {/* Ticket Sentiment Distribution */}
          {(data.positive_ticket_count || data.negative_ticket_count || data.neutral_ticket_count) && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-slate-500 uppercase">Ticket Sentiment:</span>
              <div className="flex-1 flex items-center gap-1">
                <div 
                  className="h-2 bg-emerald-400 rounded-l"
                  style={{ width: `${(data.positive_ticket_count || 0) / (data.total_tickets || 1) * 100}%` }}
                  title={`${data.positive_ticket_count} positive tickets`}
                />
                <div 
                  className="h-2 bg-slate-300"
                  style={{ width: `${(data.neutral_ticket_count || 0) / (data.total_tickets || 1) * 100}%` }}
                  title={`${data.neutral_ticket_count} neutral tickets`}
                />
                <div 
                  className="h-2 bg-rose-400 rounded-r"
                  style={{ width: `${(data.negative_ticket_count || 0) / (data.total_tickets || 1) * 100}%` }}
                  title={`${data.negative_ticket_count} negative tickets`}
                />
              </div>
              <div className="flex gap-2 text-[10px]">
                <span className="text-emerald-600" title="Positive">{data.positive_ticket_count || 0}</span>
                <span className="text-slate-500" title="Neutral">{data.neutral_ticket_count || 0}</span>
                <span className="text-rose-600" title="Negative">{data.negative_ticket_count || 0}</span>
              </div>
            </div>
          )}

          {/* Message Stats */}
          {(data.total_customer_messages || data.total_support_messages) && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-slate-500" title="Total tickets">
                <MessageSquare className="w-3 h-3" />
                <span>{data.total_tickets || 0} tickets</span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500" title="Messages from customer">
                {data.total_customer_messages || 0} customer msgs
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500" title="Messages from support">
                {data.total_support_messages || 0} support msgs
              </span>
            </div>
          )}

          {/* Ticket Themes */}
          {data.themes.length > 0 && (
            <div>
              <h4 
                className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"
                title="Most common ticket categories"
              >
                Top Themes
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.themes.slice(0, 5).map((theme, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md"
                    title={`${theme.count} tickets, max severity: ${theme.severity}`}
                  >
                    <span className="text-xs text-slate-600">{theme.name}</span>
                    <Badge variant={getSeverityVariant(theme.severity)} size="sm">
                      {theme.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Tickets with Pagination */}
            <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {hasActiveFilters 
                  ? `Filtered Tickets (${totalTickets})` 
                  : `All Tickets (${totalTickets})`}
              </h4>
              {ticketsLoading && (
                <Loader className="w-3 h-3 animate-spin text-slate-400" />
              )}
            </div>
            {tickets.length > 0 ? (
              <>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {tickets.map((ticket) => (
                    <SupportTicketCard key={ticket.id} ticket={ticket} />
                  ))}
                    </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-500">
                      Page {currentPage} of {totalPages}
                      </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || ticketsLoading}
                        className={clsx(
                          'p-1 rounded transition-colors',
                          currentPage === 1 || ticketsLoading
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        )}
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      {/* Page numbers */}
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              disabled={ticketsLoading}
                              className={clsx(
                                'w-6 h-6 text-[10px] rounded transition-colors',
                                currentPage === pageNum
                                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                                  : 'text-slate-500 hover:bg-slate-100'
                              )}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || ticketsLoading}
                        className={clsx(
                          'p-1 rounded transition-colors',
                          currentPage === totalPages || ticketsLoading
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        )}
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-slate-400 text-xs">
                {ticketsLoading ? 'Loading tickets...' : 'No tickets match the current filters'}
              </div>
            )}
          </div>

          {/* Empty state */}
          {data.total_tickets === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Headphones className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No support tickets found</p>
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  )
}
