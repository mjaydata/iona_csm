import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Headphones, Clock, TrendingUp, TrendingDown, Minus, AlertTriangle, ChevronRight, Loader, Filter, BarChart3, ChevronLeft } from 'lucide-react'
import { BaseWidget, Badge } from './BaseWidget'
import { clsx } from 'clsx'
import type { SupportAnalysis, ResolutionStats, WorstSentimentTicket } from '../../types'
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
  const maxPct = Math.max(...stats.distribution.map(b => b.percentage), 1)

  const getBarColor = (index: number) => {
    if (index <= 1) return 'bg-emerald-400'
    if (index <= 3) return 'bg-amber-400'
    return 'bg-rose-400'
  }

  return (
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
                className={clsx('h-full rounded-sm transition-all duration-300', getBarColor(index), hoveredBucket === index && 'opacity-80')}
                style={{ width: `${(bucket.percentage / maxPct) * 100}%` }}
              />
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
          {hoveredBucket === index && (
            <div className="absolute left-20 -top-8 z-10 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg whitespace-nowrap">
              {bucket.count} tickets ({bucket.percentage.toFixed(1)}%)
              <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function AgingBar({ data }: { data: SupportAnalysis }) {
  const buckets = useMemo(() => [
    { label: '<7d', count: data.open_age_lt_7d ?? 0, color: 'bg-emerald-400' },
    { label: '7-14d', count: data.open_age_7_14d ?? 0, color: 'bg-sky-400' },
    { label: '14-30d', count: data.open_age_14_30d ?? 0, color: 'bg-amber-400' },
    { label: '30-60d', count: data.open_age_30_60d ?? 0, color: 'bg-orange-400' },
    { label: '60d+', count: data.open_age_60plus ?? 0, color: 'bg-rose-500' },
  ], [data])

  const total = buckets.reduce((s, b) => s + b.count, 0)
  if (total === 0) return <p className="text-xs text-slate-400 italic">No open tickets to age</p>

  return (
    <div>
      <div className="flex h-5 rounded overflow-hidden">
        {buckets.map(b => b.count > 0 && (
          <div
            key={b.label}
            className={clsx(b.color, 'relative group')}
            style={{ width: `${(b.count / total) * 100}%` }}
            title={`${b.label}: ${b.count} tickets`}
          >
            {b.count / total > 0.12 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">{b.count}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {buckets.map(b => (
          <div key={b.label} className="flex items-center gap-1 text-[10px] text-slate-500">
            <div className={clsx('w-2 h-2 rounded-sm', b.color)} />
            <span>{b.label} ({b.count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WorstSentimentCard({ ticket }: { ticket: WorstSentimentTicket }) {
  return (
    <div className="p-2 bg-white border border-rose-200 rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-slate-700 font-medium line-clamp-1 flex-1">{ticket.subject}</span>
        <span className={clsx(
          'shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded',
          ticket.net_sentiment_score < -2 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
        )}>
          {ticket.net_sentiment_score}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
        <span>{ticket.priority}</span>
        <span className="text-slate-300">|</span>
        <span>{ticket.days_open}d open</span>
      </div>
      {ticket.summary && (
        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{ticket.summary}</p>
      )}
    </div>
  )
}

export function SupportRiskWidget({ data, isLoading, onHide, collapsed, onCollapsedChange, accountId }: SupportRiskWidgetProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

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

  useEffect(() => { setCurrentPage(1) }, [statusFilter, severityFilter])

  const tickets = ticketsData?.tickets || data?.recent_tickets || []
  const totalTickets = ticketsData?.total || data?.total_tickets || 0
  const totalPages = ticketsData?.total_pages || 1

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

  const getSentimentLabel = (avg: number) => {
    if (avg > 0.1) return { label: 'Positive', color: 'text-emerald-600', bg: 'bg-emerald-100' }
    if (avg < -0.1) return { label: 'Negative', color: 'text-rose-600', bg: 'bg-rose-100' }
    return { label: 'Neutral', color: 'text-slate-600', bg: 'bg-slate-100' }
  }

  const sentimentTrendDir = useMemo(() => {
    if (data?.sentiment_last_30d == null || data?.sentiment_prev_30d == null) return null
    const diff = data.sentiment_last_30d - data.sentiment_prev_30d
    if (diff > 0.3) return 'up'
    if (diff < -0.3) return 'down'
    return 'flat'
  }, [data])

  const getSeverityVariant = (severity: string): 'critical' | 'high' | 'medium' | 'low' => {
    switch (severity) {
      case 'critical': return 'critical'
      case 'high': return 'high'
      case 'medium': return 'medium'
      default: return 'low'
    }
  }

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

          {/* ── Section 1: Immediate Risk ── */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleStatClick('open')}
              title="Open tickets (excludes internal). Click to filter."
              className={clsx(
                'text-center p-2.5 rounded-lg transition-all',
                statusFilter === 'open' ? 'bg-slate-200 ring-2 ring-slate-400' : 'bg-slate-50 hover:bg-slate-100'
              )}
            >
              <p className="text-xl font-bold text-slate-800">{data.open_tickets}</p>
              <p className="text-[10px] text-slate-500 uppercase">Open</p>
            </button>
            <button
              onClick={() => handleStatClick('critical')}
              title="Open Urgent-priority tickets. Click to filter."
              className={clsx(
                'text-center p-2.5 rounded-lg transition-all',
                severityFilter === 'critical' ? 'bg-rose-200 ring-2 ring-rose-400' : 'bg-rose-50 hover:bg-rose-100'
              )}
            >
              <p className="text-xl font-bold text-rose-600">{data.critical_tickets}</p>
              <p className="text-[10px] text-rose-500 uppercase">Critical</p>
            </button>
            <button
              onClick={() => handleStatClick('high')}
              title="Open High-priority tickets. Click to filter."
              className={clsx(
                'text-center p-2.5 rounded-lg transition-all',
                severityFilter === 'high' ? 'bg-amber-200 ring-2 ring-amber-400' : 'bg-amber-50 hover:bg-amber-100'
              )}
            >
              <p className="text-xl font-bold text-amber-600">{data.high_tickets}</p>
              <p className="text-[10px] text-amber-500 uppercase">High</p>
            </button>
            <div
              className="text-center p-2.5 rounded-lg bg-indigo-50"
              title={data.oldest_open_ticket_days != null ? `Oldest open ticket is ${data.oldest_open_ticket_days} days old` : 'No open tickets'}
            >
              <p className={clsx('text-xl font-bold', (data.oldest_open_ticket_days ?? 0) > 60 ? 'text-rose-600' : 'text-indigo-700')}>
                {data.oldest_open_ticket_days ?? '—'}
              </p>
              <p className="text-[10px] text-indigo-500 uppercase">Oldest (d)</p>
            </div>
          </div>

          {/* ── Section 2: Volume & Trend ── */}
          <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{data.tickets_last_30d ?? 0}</span> tickets last 30d
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {data.pct_change_30d && (
                <span className={clsx(
                  'px-1.5 py-0.5 text-[10px] font-semibold rounded',
                  data.ticket_trend === 'increasing' ? 'bg-rose-100 text-rose-700' :
                  data.ticket_trend === 'decreasing' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-600'
                )}>
                  {data.pct_change_30d}
                </span>
              )}
              {data.ticket_trend === 'increasing' && <TrendingUp className="w-3.5 h-3.5 text-rose-500" />}
              {data.ticket_trend === 'decreasing' && <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />}
              {data.ticket_trend !== 'increasing' && data.ticket_trend !== 'decreasing' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
            </div>
          </div>

          {/* ── Section 3: Resolution Performance ── */}
          {data.resolution_stats && data.resolution_stats.total_resolved > 0 ? (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">Resolution Performance</span>
                </div>
                <span className="text-[10px] text-slate-400">{data.resolution_stats.total_resolved} resolved</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 p-2 bg-white rounded border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 block">Median</span>
                  <span className="text-sm font-bold text-slate-800">{data.resolution_stats.median_days}d</span>
                </div>
                <div className="flex-1 p-2 bg-white rounded border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 block">P90</span>
                  <span className="text-sm font-bold text-slate-800">{data.resolution_stats.p90_days}d</span>
                </div>
                <div className="flex-1 p-2 bg-white rounded border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 block">&lt; 3d</span>
                  <span className={clsx(
                    'text-sm font-bold',
                    (data.resolution_stats.pct_resolved_under_3d ?? 0) >= 50 ? 'text-emerald-600' : 'text-amber-600'
                  )}>
                    {data.resolution_stats.pct_resolved_under_3d ?? 0}%
                  </span>
                </div>
              </div>
              <ResolutionDistributionChart stats={data.resolution_stats} />
            </div>
          ) : (
            <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-600">Avg Resolution</span>
              </div>
              <span className="text-sm font-semibold text-slate-700">
                {(data.avg_resolution_hours / 24).toFixed(1)} days
              </span>
            </div>
          )}

          {/* ── Section 4: Open Ticket Aging ── */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Open Ticket Aging</span>
            </div>
            <AgingBar data={data} />
          </div>

          {/* ── Section 5: Sentiment ── */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Sentiment</span>
              {data.avg_sentiment !== undefined && (
                <span className={clsx(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  getSentimentLabel(data.avg_sentiment).bg,
                  getSentimentLabel(data.avg_sentiment).color,
                )}>
                  {getSentimentLabel(data.avg_sentiment).label} ({data.avg_sentiment.toFixed(2)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              {data.sentiment_last_30d != null && (
                <span className="text-slate-600">
                  Last 30d: <span className="font-semibold">{data.sentiment_last_30d.toFixed(2)}</span>
                </span>
              )}
              {data.sentiment_prev_30d != null && (
                <span className="text-slate-500">
                  Prior 30d: {data.sentiment_prev_30d.toFixed(2)}
                </span>
              )}
              {sentimentTrendDir === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
              {sentimentTrendDir === 'down' && <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
              {sentimentTrendDir === 'flat' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
            </div>

            {(data.negative_open_tickets ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {data.negative_open_tickets} negative-sentiment open ticket{data.negative_open_tickets !== 1 ? 's' : ''}
              </div>
            )}

            {data.worst_sentiment_tickets && data.worst_sentiment_tickets.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Worst Sentiment Open</span>
                {data.worst_sentiment_tickets.map(t => (
                  <WorstSentimentCard key={t.id} ticket={t} />
                ))}
              </div>
            )}
          </div>

          {/* ── Section 6: Conversation Activity ── */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2.5 bg-slate-50 rounded-lg">
              <p className="text-sm font-bold text-slate-800">
                {data.customer_to_support_ratio != null ? `${data.customer_to_support_ratio}:1` : '—'}
              </p>
              <p className="text-[10px] text-slate-500">Cust:Support</p>
            </div>
            <div className={clsx('text-center p-2.5 rounded-lg', (data.open_no_response ?? 0) > 0 ? 'bg-rose-50' : 'bg-slate-50')}>
              <p className={clsx('text-sm font-bold', (data.open_no_response ?? 0) > 0 ? 'text-rose-600' : 'text-slate-800')}>
                {data.open_no_response ?? 0}
              </p>
              <p className="text-[10px] text-slate-500">Unanswered</p>
            </div>
            <div className="text-center p-2.5 bg-slate-50 rounded-lg">
              <p className="text-sm font-bold text-slate-800">
                {data.avg_messages_per_ticket != null ? data.avg_messages_per_ticket : '—'}
              </p>
              <p className="text-[10px] text-slate-500">Avg Msgs/Tkt</p>
            </div>
          </div>

          {/* ── Section 7: Top Themes ── */}
          {data.themes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Top Themes</h4>
              <div className="flex flex-wrap gap-1.5">
                {data.themes.slice(0, 5).map((theme, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md"
                    title={`${theme.count} total / ${theme.open_count ?? 0} open, max severity: ${theme.severity}`}
                  >
                    <span className="text-xs text-slate-600">{theme.name}</span>
                    <Badge variant={getSeverityVariant(theme.severity)} size="sm">
                      {theme.count}
                    </Badge>
                    {(theme.open_count ?? 0) > 0 && (
                      <span className="text-[10px] text-rose-500 font-medium">{theme.open_count} open</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ Ticket List + Pagination (unchanged) ═══════ */}

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
              <button onClick={clearFilters} className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 underline">
                Clear filters
              </button>
            )}
          </div>

          {/* Ticket List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {hasActiveFilters ? `Filtered Tickets (${totalTickets})` : `All Tickets (${totalTickets})`}
              </h4>
              {ticketsLoading && <Loader className="w-3 h-3 animate-spin text-slate-400" />}
            </div>
            {tickets.length > 0 ? (
              <>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {tickets.map((ticket) => (
                    <SupportTicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-500">Page {currentPage} of {totalPages}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || ticketsLoading}
                        className={clsx(
                          'p-1 rounded transition-colors',
                          currentPage === 1 || ticketsLoading ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        )}
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
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
                                currentPage === pageNum ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-100'
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
                          currentPage === totalPages || ticketsLoading ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
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
