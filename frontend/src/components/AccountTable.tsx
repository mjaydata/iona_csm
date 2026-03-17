import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { ChevronDown, ChevronRight, Loader2, Info, X } from 'lucide-react'
import type { Account, RenewalInfo } from '../types'
import { getHealthScoreDetail, getHealthScoreHistory, type HealthScoreDetail, type HealthScoreHistoryPoint } from '../services/api'

interface AccountTableProps {
  accounts: Account[]
  total: number
  searchTerm?: string
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  groupByParent?: boolean
  onAccountClick?: (accountId: string) => void
}

interface GroupedAccount {
  parentId: string
  parentName: string
  children: Account[]
}

/* ── Helpers ── */
function HighlightedText({ text, searchTerm }: { text: string; searchTerm?: string }) {
  if (!searchTerm || !text) return <>{text}</>
  try {
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)
    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    )
  } catch {
    return <>{text}</>
  }
}

/* ── Health Score Trend Chart (SVG) ── */
type PeriodKey = '7D' | '30D' | '90D' | '6M' | '1Y' | 'All'
const PERIODS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: '7D', label: '7D', days: 7 },
  { key: '30D', label: '30D', days: 30 },
  { key: '90D', label: '90D', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'All', label: 'All', days: null },
]

function HealthScoreTrendChart({ accountId }: { accountId: string }) {
  const [history, setHistory] = useState<HealthScoreHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodKey>('All')

  useEffect(() => {
    getHealthScoreHistory(accountId)
      .then(res => setHistory(res.history))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId])

  const filtered = useMemo(() => {
    const p = PERIODS.find(pp => pp.key === period)
    if (!p || !p.days || history.length === 0) return history
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - p.days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return history.filter(h => h.score_date >= cutoffStr)
  }, [history, period])

  // Auto-select best period based on available data
  useEffect(() => {
    if (history.length === 0) return
    const days = history.length
    if (days <= 7) setPeriod('All')
    else if (days <= 30) setPeriod('30D')
    else if (days <= 90) setPeriod('90D')
    else setPeriod('6M')
  }, [history])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        <span className="ml-2 text-xs text-slate-400">Loading trend...</span>
      </div>
    )
  }

  if (filtered.length < 2) {
    return (
      <div className="text-center py-4 text-xs text-slate-400">
        {history.length === 0 ? 'No history available' : 'Not enough data for trend yet'}
      </div>
    )
  }

  const scores = filtered.map(h => h.health_score)
  const minScore = Math.max(0, Math.min(...scores) - 10)
  const maxScore = Math.min(100, Math.max(...scores) + 10)
  const range = maxScore - minScore || 1

  const W = 340
  const H = 90
  const padX = 0
  const padY = 8
  const chartW = W - padX * 2
  const chartH = H - padY * 2

  const points = filtered.map((h, i) => {
    const x = padX + (i / (filtered.length - 1)) * chartW
    const y = padY + chartH - ((h.health_score - minScore) / range) * chartH
    return { x, y, ...h }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaD = pathD + ` L${points[points.length - 1].x},${H} L${points[0].x},${H} Z`

  const first = filtered[0].health_score
  const last = filtered[filtered.length - 1].health_score
  const delta = last - first
  const lineColor = last >= 70 ? '#10b981' : last >= 40 ? '#f59e0b' : '#ef4444'

  const formatDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Score Trend</div>
        <div className="flex items-center gap-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={clsx(
                'px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors',
                period === p.key
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              )}
            >
              {p.label}
            </button>
          ))}
          {delta !== 0 && (
            <span className={clsx(
              'ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded',
              delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
            )}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
        {/* Grid lines at 40 and 70 thresholds */}
        <line x1={padX} y1={padY + chartH - ((70 - minScore) / range) * chartH} x2={W - padX} y2={padY + chartH - ((70 - minScore) / range) * chartH} stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="4 3" />
        <line x1={padX} y1={padY + chartH - ((40 - minScore) / range) * chartH} x2={W - padX} y2={padY + chartH - ((40 - minScore) / range) * chartH} stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="4 3" />
        {/* Area fill */}
        <path d={areaD} fill={lineColor} opacity={0.08} />
        {/* Line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={filtered.length <= 30 ? 3 : 1.5} fill="white" stroke={lineColor} strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 px-0.5">
        <span>{formatDate(filtered[0].score_date)}</span>
        <span>{formatDate(filtered[filtered.length - 1].score_date)}</span>
      </div>
    </div>
  )
}

/* ── Health Badge with Click-to-Open Modal (fetches details on-demand) ── */
function HealthBadgeWithSignal({
  health,
  signalType,
  signalDescription,
  healthScoreDetail: initialDetail,
  accountId,
}: {
  health: string
  signalType: string | null
  signalDescription: string | null
  healthScoreDetail?: {
    score: number
    category: string
    factors: Array<{
      name: string
      points: number
      max_points: number
      detail: string
      icon: string
    }>
    has_pendo: boolean
    has_freshdesk: boolean
    scoring_version: string
  }
  accountId: string
}) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchedDetail, setFetchedDetail] = useState<HealthScoreDetail | null>(null)
  
  // Use fetched detail if available, otherwise use initial (which may have empty factors)
  const healthScoreDetail = fetchedDetail || initialDetail
  const score = healthScoreDetail?.score ?? 0
  const needsDetailFetch = !healthScoreDetail?.factors || healthScoreDetail.factors.length === 0
  
  // Fetch detailed health score when modal opens and we don't have factors
  useEffect(() => {
    if (showModal && needsDetailFetch && accountId && !loading && !fetchedDetail) {
      setLoading(true)
      getHealthScoreDetail(accountId)
        .then(data => {
          setFetchedDetail(data)
        })
        .catch(err => {
          console.error('Failed to fetch health score detail:', err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [showModal, needsDetailFetch, accountId, loading, fetchedDetail])

  return (
    <>
      <div
        className="inline-flex items-center gap-1 cursor-pointer group"
        onClick={(e) => { e.stopPropagation(); setShowModal(true) }}
        title="Click to see health score details"
      >
        <span className={clsx(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide',
          score >= 70 ? 'bg-emerald-100 text-emerald-700' :
          score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
        )}>
          {health}
        </span>
        <Info className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>

      {/* Modal */}
      {showModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-[400px] max-h-[90vh] overflow-y-auto border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Score */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg',
                    score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  )}>
                    {score}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-800">{health}</div>
                    <div className="text-xs text-slate-500">Health Score</div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Score Bar */}
              <div className="mt-4">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={clsx(
                      'h-full rounded-full transition-all',
                      score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
                  <span>Critical</span>
                  <span>At Risk</span>
                  <span>Good</span>
                </div>
              </div>
            </div>

            {/* Score Trend */}
            <div className="px-5 pt-4 pb-2 border-b border-slate-100">
              <HealthScoreTrendChart accountId={accountId} />
            </div>

            {/* Factor Breakdown */}
            <div className="p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Score Factors</div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  <span className="ml-2 text-sm text-slate-500">Loading details...</span>
                </div>
              ) : healthScoreDetail?.factors && healthScoreDetail.factors.length > 0 ? (
                <div className="space-y-2">
                  {healthScoreDetail.factors.map((factor, idx) => {
                    const hasData = !factor.detail.includes('integration') && !factor.detail.includes('Requires');
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{factor.icon}</span>
                          <div>
                            <div className="text-sm font-medium text-slate-700">{factor.name}</div>
                            <div className={clsx(
                              'text-xs',
                              hasData ? 'text-slate-500' : 'text-slate-400 italic'
                            )}>
                              {factor.detail}
                            </div>
                          </div>
                        </div>
                        <div className={clsx(
                          'text-sm font-bold min-w-[40px] text-center py-1 px-2 rounded-lg',
                          factor.points >= 15 ? 'bg-red-100 text-red-600' :
                          factor.points >= 8 ? 'bg-amber-100 text-amber-600' :
                          factor.points > 0 ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-600'
                        )}>
                          {factor.points > 0 ? `-${factor.points}` : '✓'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-slate-400">
                  No factor details available
                </div>
              )}
            </div>

            {/* Primary Signal */}
            {signalDescription && (
              <div className="px-5 pb-4">
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className={clsx(
                    'w-2 h-2 rounded-full',
                    signalType === 'churn' || signalType === 'support' ? 'bg-red-500' :
                    signalType === 'renewal' || signalType === 'usage' ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />
                  <div>
                    <div className="text-xs font-medium text-amber-800">Primary Signal</div>
                    <div className="text-sm text-amber-700">{signalDescription}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Sources Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'flex items-center gap-1.5 text-xs px-2 py-1 rounded-md',
                    healthScoreDetail?.has_pendo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                  )}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', healthScoreDetail?.has_pendo ? 'bg-emerald-500' : 'bg-slate-400')} />
                    Pendo
                  </div>
                  <div className={clsx(
                    'flex items-center gap-1.5 text-xs px-2 py-1 rounded-md',
                    healthScoreDetail?.has_freshdesk ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                  )}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', healthScoreDetail?.has_freshdesk ? 'bg-emerald-500' : 'bg-slate-400')} />
                    Freshdesk
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  {healthScoreDetail?.scoring_version || 'v1.0'}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

/* ── Renewal Timeline Ribbon ── */
const REVENUE_TYPE_STYLES: Record<string, { shape: 'diamond' | 'circle' | 'square'; color: string; label: string }> = {
  SaaS:                      { shape: 'diamond', color: '#ec5b13', label: 'SaaS' },
  eSaaS:                     { shape: 'diamond', color: '#f97316', label: 'eSaaS' },
  eSMA:                      { shape: 'square',  color: '#7c3aed', label: 'eSMA' },
  SMA:                       { shape: 'square',  color: '#a855f7', label: 'SMA' },
  'SMA (Term License)':      { shape: 'square',  color: '#c084fc', label: 'SMA (TL)' },
  'eSMA (Term License)':     { shape: 'square',  color: '#9333ea', label: 'eSMA (TL)' },
  Services:                  { shape: 'circle',  color: '#059669', label: 'Services' },
  'Services (recurring)':    { shape: 'circle',  color: '#10b981', label: 'Services (R)' },
  Support:                   { shape: 'circle',  color: '#3b82f6', label: 'Support' },
  Perpetual:                 { shape: 'diamond', color: '#0ea5e9', label: 'Perpetual' },
  'Term License':            { shape: 'diamond', color: '#0284c7', label: 'Term License' },
  'Term license (SFC)':      { shape: 'diamond', color: '#0369a1', label: 'TL (SFC)' },
  Hosting:                   { shape: 'circle',  color: '#d946ef', label: 'Hosting' },
  'Hosting (non-recurring)': { shape: 'circle',  color: '#e879f9', label: 'Hosting (NR)' },
  Accelerate:                { shape: 'square',  color: '#f43f5e', label: 'Accelerate' },
  'Accelerate 2.0':          { shape: 'square',  color: '#e11d48', label: 'Accel 2.0' },
  'Material Right':          { shape: 'circle',  color: '#78716c', label: 'Material Right' },
}

function getRevStyle(revType: string) {
  return REVENUE_TYPE_STYLES[revType] || { shape: 'circle' as const, color: '#64748b', label: revType }
}

function MarkerShape({ shape, color, size = 'sm' }: { shape: string; color: string; size?: 'sm' | 'xs' }) {
  const s = size === 'sm' ? 'w-2.5 h-2.5' : 'w-2 h-2'
  if (shape === 'diamond') return <span className={clsx('inline-block rotate-45 flex-shrink-0', s)} style={{ backgroundColor: color }} />
  if (shape === 'square') return <span className={clsx('inline-block rounded-[2px] flex-shrink-0', s)} style={{ backgroundColor: color }} />
  return <span className={clsx('inline-block rounded-full flex-shrink-0', s)} style={{ backgroundColor: color }} />
}

function RenewalTimelineRibbon({ renewals }: { renewals?: RenewalInfo[] }) {
  const [hovered, setHovered] = useState(false)
  const ribbonRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})

  const TIMELINE_YEARS = 4
  const today = useMemo(() => new Date(), [])
  const totalDays = useMemo(() => TIMELINE_YEARS * 365, [])

  const yearMarkers = useMemo(() => {
    const markers: { label: string; pct: number }[] = [{ label: 'Now', pct: 0 }]
    for (let y = 1; y <= TIMELINE_YEARS; y++) {
      const d = new Date(today)
      d.setFullYear(d.getFullYear() + y)
      const daysDiff = Math.round((d.getTime() - today.getTime()) / 86400000)
      markers.push({ label: String(d.getFullYear()), pct: (daysDiff / totalDays) * 100 })
    }
    return markers
  }, [today, totalDays])

  const markers = useMemo(() => {
    if (!renewals?.length) return []
    return renewals
      .filter(r => r.renewal_date)
      .map(r => {
        const rd = new Date(r.renewal_date!)
        const daysDiff = Math.round((rd.getTime() - today.getTime()) / 86400000)
        const pct = Math.max(0, Math.min(100, (daysDiff / totalDays) * 100))
        const inWindow = daysDiff >= -30 && daysDiff <= totalDays + 30
        return { ...r, pct, daysDiff, inWindow }
      })
      .filter(m => m.inWindow)
      .sort((a, b) => a.daysDiff - b.daysDiff)
  }, [renewals, today, totalDays])

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) }
    catch { return d }
  }

  const formatCurrency = (v: number | null | undefined) => {
    if (v == null) return null
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
    return `$${Math.round(v).toLocaleString()}`
  }

  const positionTooltip = useCallback(() => {
    if (!ribbonRef.current || !tooltipRef.current) return
    const ribbon = ribbonRef.current.getBoundingClientRect()
    const tt = tooltipRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const GAP = 6

    let top: number
    let left: number

    const fitsBelow = ribbon.bottom + GAP + tt.height <= vh
    const fitsAbove = ribbon.top - GAP - tt.height >= 0

    if (fitsBelow) {
      top = ribbon.bottom + GAP
    } else if (fitsAbove) {
      top = ribbon.top - GAP - tt.height
    } else {
      top = Math.max(8, vh - tt.height - 8)
    }

    left = ribbon.left
    if (left + tt.width > vw - 8) {
      left = vw - tt.width - 8
    }
    if (left < 8) left = 8

    setTooltipStyle({ top, left, visibility: 'visible' })
  }, [])

  useEffect(() => {
    if (hovered && tooltipRef.current) {
      requestAnimationFrame(positionTooltip)
    }
  }, [hovered, positionTooltip])

  const handleMouseEnter = useCallback(() => {
    setHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHovered(false)
    setTooltipStyle({})
  }, [])

  if (!markers.length) {
    return (
      <div className="relative h-8 w-full flex items-center">
        <div className="absolute inset-x-0 h-[2px] bg-slate-100 rounded-full border border-dashed border-slate-200" />
        <span className="absolute left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap">
          No upcoming renewals
        </span>
      </div>
    )
  }

  return (
    <div
      ref={ribbonRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Timeline row */}
      <div className="relative h-8 w-full flex items-center">
        <div className="absolute inset-x-0 h-[2px] bg-slate-200 rounded-full" style={{ top: '50%' }} />

        {yearMarkers.map((ym, i) => (
          <div key={i} className="absolute" style={{ left: `${ym.pct}%`, top: '0', height: '100%' }}>
            <div className="absolute top-[calc(50%-4px)] w-[1px] h-2 bg-slate-300" />
            <span className="absolute top-[70%] -translate-x-1/2 text-[7px] font-bold text-slate-400 uppercase whitespace-nowrap">
              {ym.label}
            </span>
          </div>
        ))}

        {markers.map((m, idx) => {
          const style = getRevStyle(m.revenue_type)
          const isOverdue = m.daysDiff < 0
          const isUrgent = m.daysDiff <= 30 && m.daysDiff >= 0
          const markerColor = isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : style.color
          return (
            <div
              key={idx}
              className="absolute"
              style={{ left: `${m.pct}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
            >
              <MarkerShape shape={style.shape} color={markerColor} size="sm" />
            </div>
          )
        })}
      </div>

      {/* Portal tooltip — renders at body level, smart-positioned */}
      {hovered && markers.length > 0 && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] bg-slate-900 text-white rounded-lg shadow-2xl p-3 min-w-[300px] max-w-[400px]"
          style={{ visibility: 'hidden', ...tooltipStyle }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
            {markers.length} Contract{markers.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
            {markers.map((m, idx) => {
              const style = getRevStyle(m.revenue_type)
              const isOverdue = m.daysDiff < 0
              const isUrgent = m.daysDiff <= 30 && m.daysDiff >= 0
              const markerColor = isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : style.color
              const arrStr = formatCurrency(m.arr_cad)
              return (
                <div key={idx} className="flex items-center gap-2 py-0.5">
                  <MarkerShape shape={style.shape} color={markerColor} size="xs" />
                  <span className="text-[10px] font-semibold min-w-[52px]" style={{ color: markerColor }}>
                    {style.label}
                  </span>
                  <span className="text-[10px] text-slate-300 flex-1 truncate" title={m.contract_group || ''}>
                    {formatDate(m.renewal_date)}
                    {m.contract_group ? ` · ${m.contract_group}` : ''}
                  </span>
                  {arrStr && (
                    <span className="text-[10px] font-bold text-slate-200 tabular-nums">{arrStr}</span>
                  )}
                  <span className={clsx(
                    'text-[9px] font-semibold tabular-nums whitespace-nowrap',
                    isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-slate-500'
                  )}>
                    {isOverdue ? `${Math.abs(m.daysDiff)}d over` :
                     m.daysDiff === 0 ? 'Today' :
                     `${m.daysDiff}d`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

/* ── CSM/AE Cell ── */
function PersonCell({ name, variant = 'csm' }: { name: string | null; variant?: 'csm' | 'ae' }) {
  if (!name) return <span className="text-xs text-slate-400">{variant === 'csm' ? 'Unassigned' : '—'}</span>
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
  const colors = variant === 'csm'
    ? 'from-blue-400 to-blue-500'
    : 'from-slate-300 to-slate-400'
  return (
    <div className="flex items-center gap-2">
      <div className={clsx('w-6 h-6 bg-gradient-to-br rounded-full flex items-center justify-center text-white text-[10px] font-medium', colors)}>
        {initials}
      </div>
      <span className="text-sm text-slate-600">{name}</span>
    </div>
  )
}

/* ── Account Row ── */
function AccountRow({
  account,
  searchTerm,
  onAccountClick,
  indented = false,
}: {
  account: Account
  searchTerm?: string
  onAccountClick?: (id: string) => void
  indented?: boolean
}) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className={clsx('px-4 py-2 overflow-hidden', indented && 'pl-12')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0">
            <div className={clsx(
              'w-2 h-2 rounded-full',
              account.health === 'Critical' && 'bg-red-500',
              account.health === 'At Risk' && 'bg-amber-500',
              account.health === 'Good' && 'bg-green-500'
            )} />
          </div>
          <button
            onClick={() => onAccountClick?.(account.id)}
            className="font-medium text-sm text-slate-800 hover:text-primary-600 transition-colors text-left truncate max-w-full"
            title={account.name}
          >
            <HighlightedText text={account.name} searchTerm={searchTerm} />
          </button>
        </div>
      </td>
      <td className="px-2 py-2">
        <HealthBadgeWithSignal
          health={account.health}
          signalType={account.primary_signal_type}
          signalDescription={account.primary_signal}
          healthScoreDetail={account.health_score_detail}
          accountId={account.id}
        />
      </td>
      <td className="px-2 py-2">
        <PersonCell name={account.csm_name} variant="csm" />
      </td>
      <td className="px-2 py-2">
        <PersonCell name={account.ae_name} variant="ae" />
      </td>
      <td className="px-3 pr-6 py-2">
        <RenewalTimelineRibbon renewals={account.renewals} />
      </td>
    </tr>
  )
}

/* ── Timeline Legend (hover-triggered, portal) ── */
function TimelineLegendTooltip() {
  const [show, setShow] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const ttRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const allTypes = Object.values(REVENUE_TYPE_STYLES)

  useEffect(() => {
    if (show && anchorRef.current && ttRef.current) {
      requestAnimationFrame(() => {
        if (!anchorRef.current || !ttRef.current) return
        const anchor = anchorRef.current.getBoundingClientRect()
        const tt = ttRef.current.getBoundingClientRect()
        const vw = window.innerWidth
        const vh = window.innerHeight
        const GAP = 6

        let top = anchor.bottom + GAP
        if (top + tt.height > vh - 8) top = Math.max(8, anchor.top - GAP - tt.height)

        let left = anchor.left
        if (left + tt.width > vw - 8) left = vw - tt.width - 8
        if (left < 8) left = 8

        setStyle({ top, left, visibility: 'visible' })
      })
    }
  }, [show])

  return (
    <div
      ref={anchorRef}
      className="inline-flex items-center gap-1 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => { setShow(false); setStyle({}) }}
    >
      <span>Contract Timelines</span>
      <ChevronDown className="w-3 h-3" />

      {show && createPortal(
        <div
          ref={ttRef}
          className="fixed z-[9999] bg-slate-800 text-white rounded-lg shadow-xl p-3 min-w-[260px]"
          style={{ visibility: 'hidden', ...style }}
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => { setShow(false); setStyle({}) }}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2 font-bold">Contract Types</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {allTypes.map(t => (
              <span key={t.label} className="flex items-center gap-1.5 text-[11px] text-slate-200">
                <MarkerShape shape={t.shape} color={t.color} size="xs" />
                {t.label}
              </span>
            ))}
          </div>
          <div className="border-t border-slate-700 mt-2 pt-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">Urgency</div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-200">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" /> Overdue
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-200">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" /> ≤30 days
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

/* ── Main Table ── */
export function AccountTable({
  accounts,
  total,
  searchTerm,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  groupByParent = false,
  onAccountClick,
}: AccountTableProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const { groupedAccounts, standaloneAccounts } = useMemo(() => {
    if (!groupByParent) return { groupedAccounts: [], standaloneAccounts: accounts }

    const groups = new Map<string, GroupedAccount>()
    const standalone: Account[] = []
    const parentIdsWithChildren = new Set(
      accounts.filter(a => a.parent_id).map(a => a.parent_id as string)
    )
    const accountById = new Map(accounts.map(a => [a.id, a]))

    for (const account of accounts) {
      if (account.parent_id) {
        const parentId = account.parent_id
        if (!groups.has(parentId)) {
          const parentAccount = accountById.get(parentId)
          const parentName = account.parent_name || parentAccount?.name || 'Unknown Parent'
          groups.set(parentId, { parentId, parentName, children: [] })
          if (parentAccount) groups.get(parentId)!.children.push(parentAccount)
        }
        groups.get(parentId)!.children.push(account)
      } else if (!parentIdsWithChildren.has(account.id)) {
        standalone.push(account)
      }
    }

    const finalGroups: GroupedAccount[] = []
    for (const group of groups.values()) {
      if (group.children.length <= 1) {
        standalone.push(...group.children)
      } else {
        finalGroups.push(group)
      }
    }

    return { groupedAccounts: finalGroups, standaloneAccounts: standalone }
  }, [accounts, groupByParent])

  const toggleGroup = (parentId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(parentId)) next.delete(parentId)
      else next.add(parentId)
      return next
    })
  }

  useEffect(() => {
    if (!onLoadMore || !hasNextPage) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) onLoadMore()
      },
      { threshold: 0.1 }
    )
    const currentRef = loadMoreRef.current
    if (currentRef) observer.observe(currentRef)
    return () => { if (currentRef) observer.unobserve(currentRef) }
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  return (
    <div>
      <div>
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '46%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 bg-slate-50">
              <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                Account
              </th>
              <th className="px-2 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                Health
              </th>
              <th className="px-2 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                CSM
              </th>
              <th className="px-2 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                AE
              </th>
              <th className="px-3 pr-6 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                <TimelineLegendTooltip />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  {searchTerm ? (
                    <div>
                      <p className="text-lg font-medium">No accounts found</p>
                      <p className="text-sm mt-1">Try a different search term or pattern</p>
                    </div>
                  ) : (
                    <p>No accounts to display</p>
                  )}
                </td>
              </tr>
            ) : groupByParent ? (
              <>
                {groupedAccounts.map(group => (
                  <React.Fragment key={group.parentId}>
                    <tr
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100"
                      onClick={() => toggleGroup(group.parentId)}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex-shrink-0 text-slate-400">
                            {expandedGroups.has(group.parentId) ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span className="font-semibold text-sm text-slate-800 truncate">{group.parentName}</span>
                          <span className="flex-shrink-0 text-[11px] text-slate-400 font-medium">
                            {group.children.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2" />
                      <td className="px-3 pr-6 py-2" />
                    </tr>
                    {expandedGroups.has(group.parentId) &&
                      group.children.map(account => (
                        <AccountRow
                          key={account.id}
                          account={account}
                          searchTerm={searchTerm}
                          onAccountClick={onAccountClick}
                          indented
                        />
                      ))}
                  </React.Fragment>
                ))}
                {standaloneAccounts.map(account => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    searchTerm={searchTerm}
                    onAccountClick={onAccountClick}
                  />
                ))}
              </>
            ) : (
              accounts.map(account => (
                <AccountRow
                  key={account.id}
                  account={account}
                  searchTerm={searchTerm}
                  onAccountClick={onAccountClick}
                />
              ))
            )}
          </tbody>
        </table>

        {accounts.length > 0 && (
          <div ref={loadMoreRef} className="py-3 flex items-center justify-center">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            ) : hasNextPage ? (
              <span className="text-sm text-slate-400">Scroll for more</span>
            ) : (
              <span className="text-sm text-slate-400">Showing all {total} accounts</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
