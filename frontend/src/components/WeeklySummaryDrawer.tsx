import { useState, useEffect, useCallback } from 'react'
import { X, ChevronDown, ChevronRight, Loader2, AlertCircle, BarChart3, Headphones, FileText, Heart, Phone, RefreshCw } from 'lucide-react'
import { getWeeklySummary, type WeeklySummaryItem } from '../services/api'
import { clsx } from 'clsx'

interface WeeklySummaryDrawerProps {
  accountId: string
  accountName: string
  isOpen: boolean
  onClose: () => void
}

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(weekEnd + 'T00:00:00')
  const now = new Date()
  const currentMonday = new Date(now)
  currentMonday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
  currentMonday.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((currentMonday.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'This Week'
  if (diffDays === 7) return 'Last Week'
  if (diffDays === 14) return '2 Weeks Ago'

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

type BulletCategory = 'pendo' | 'freshdesk' | 'contract' | 'health' | 'gong' | 'general'

interface ParsedBullet {
  text: string
  category: BulletCategory
}

function categorizeBullet(text: string): BulletCategory {
  const lower = text.toLowerCase()
  if (lower.includes('visitor') || lower.includes('pendo') || lower.includes('usage') || lower.includes('event')) return 'pendo'
  if (lower.includes('ticket') || lower.includes('support') || lower.includes('freshdesk') || lower.includes('critical') || lower.includes('resolved')) return 'freshdesk'
  if (lower.includes('contract') || lower.includes('renewal') || lower.includes('arr')) return 'contract'
  if (lower.includes('health') || lower.includes('score')) return 'health'
  return 'general'
}

function parseBullets(narrative: string): ParsedBullet[] {
  return narrative
    .split('\n')
    .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
    .filter(line => line.length > 0)
    .map(text => ({ text, category: categorizeBullet(text) }))
}

const categoryConfig: Record<BulletCategory, { icon: typeof BarChart3; color: string; bg: string }> = {
  pendo: { icon: BarChart3, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  freshdesk: { icon: Headphones, color: 'text-amber-500', bg: 'bg-amber-50' },
  contract: { icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  health: { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
  gong: { icon: Phone, color: 'text-violet-500', bg: 'bg-violet-50' },
  general: { icon: BarChart3, color: 'text-slate-500', bg: 'bg-slate-50' },
}

function WeekSection({ week, index }: { week: WeeklySummaryItem; index: number }) {
  const [expanded, setExpanded] = useState(index === 0)
  const label = formatWeekLabel(week.week_start, week.week_end)
  const bullets = parseBullets(week.narrative)

  const hasConcern = bullets.some(b => {
    const l = b.text.toLowerCase()
    return l.includes('drop') || l.includes('decline') || l.includes('critical') || l.includes('concern') || l.includes('down') || l.includes('decreased')
  })

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        }
        <span className="text-sm font-medium text-slate-700 flex-1">{label}</span>
        {hasConcern && (
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Contains alerts" />
        )}
        {index === 0 && (
          <span className="text-[10px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">Latest</span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {bullets.length === 0 && !week.gong_summary ? (
            <p className="text-xs text-slate-400 italic pl-5">No activity data for this week.</p>
          ) : (
            <>
              {bullets.map((bullet, i) => {
                const config = categoryConfig[bullet.category]
                const Icon = config.icon
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={clsx('w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5', config.bg)}>
                      <Icon className={clsx('w-3 h-3', config.color)} />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{bullet.text}</p>
                  </div>
                )
              })}
              {week.gong_summary && (
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 bg-violet-50">
                    <Phone className="w-3 h-3 text-violet-500" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{week.gong_summary}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function WeeklySummaryDrawer({ accountId, accountName, isOpen, onClose }: WeeklySummaryDrawerProps) {
  const [weeks, setWeeks] = useState<WeeklySummaryItem[]>([])
  const [totalWeeks, setTotalWeeks] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummaries = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)
    setError(null)

    try {
      const resp = await getWeeklySummary(accountId, 12, offset)
      if (append) {
        setWeeks(prev => [...prev, ...resp.weeks])
      } else {
        setWeeks(resp.weeks)
      }
      setTotalWeeks(resp.total_weeks)
    } catch (e: any) {
      setError(e?.message || 'Failed to load summaries')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [accountId])

  useEffect(() => {
    if (isOpen) fetchSummaries(0, false)
  }, [isOpen, fetchSummaries])

  const hasMore = weeks.length < totalWeeks

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={clsx(
          'fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Activity Summary</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{accountName}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchSummaries(0, false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5 text-slate-400', loading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading summaries...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 px-6">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <p className="text-xs text-rose-500 text-center">{error}</p>
              <button
                onClick={() => fetchSummaries(0, false)}
                className="text-xs text-primary-600 hover:underline mt-1"
              >
                Try again
              </button>
            </div>
          ) : weeks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 px-6">
              <BarChart3 className="w-5 h-5 text-slate-300" />
              <p className="text-xs text-slate-400 text-center">
                No weekly summaries available yet.<br />
                Run the weekly summary notebook to generate them.
              </p>
            </div>
          ) : (
            <>
              {weeks.map((week, i) => (
                <WeekSection key={week.week_start} week={week} index={i} />
              ))}

              {hasMore && (
                <div className="px-4 py-3">
                  <button
                    onClick={() => fetchSummaries(weeks.length, true)}
                    disabled={loadingMore}
                    className="w-full py-2 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      `Load More (${totalWeeks - weeks.length} remaining)`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {weeks.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 flex-shrink-0">
            <p className="text-[10px] text-slate-300 text-center">
              Summaries generated by AI · Updated daily
            </p>
          </div>
        )}
      </div>
    </>
  )
}
