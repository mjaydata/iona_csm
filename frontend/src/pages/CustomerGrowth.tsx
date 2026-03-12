import { useState, useMemo, useCallback, useRef, useEffect, Component, type ReactNode } from 'react'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  UserPlus,
  UserMinus,
  Play,
  Pause,
  SkipBack,
  Building2,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'
import { useCustomerGrowth, useCustomerGrowthBreakdown } from '../hooks/useAccounts'
import type { MonthlyGrowthPoint, CustomerEvent, GroupSeries } from '../types'

interface CustomerGrowthProps {
  onBack: () => void
  onAccountClick?: (accountId: string) => void
  accountType?: string
}

// ── Error Boundary ──────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class CustomerGrowthErrorBoundary extends Component<
  { children: ReactNode; onBack: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onBack: () => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CustomerGrowth] Render error caught by boundary:', error)
    console.error('[CustomerGrowth] Component stack:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full overflow-auto">
          <div className="max-w-3xl mx-auto p-8 space-y-4">
            <button
              onClick={this.props.onBack}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Portfolio
            </button>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h2 className="text-lg font-bold text-rose-800">Customer Growth - Render Error</h2>
              </div>
              <p className="text-sm text-rose-700 mb-2">
                The component crashed during rendering. Error details:
              </p>
              <pre className="bg-white border border-rose-100 rounded-lg p-4 text-xs text-rose-900 overflow-auto max-h-64 whitespace-pre-wrap">
                {this.state.error?.message}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ── Safe date formatter ─────────────────────────────────────

function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr || '—'
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr || '—'
  }
}

// ── Helpers ──────────────────────────────────────────────────

function SummaryCard({
  title,
  value,
  subValue,
  icon: Icon,
  color = 'primary',
  trend,
}: {
  title: string
  value: string
  subValue?: string
  icon: React.ElementType
  color?: 'primary' | 'emerald' | 'amber' | 'rose' | 'blue'
  trend?: { value: number; label: string; type: 'positive' | 'negative' | 'neutral' }
}) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    blue: 'bg-blue-50 text-blue-600',
  }

  const TrendIcon = trend?.type === 'positive' ? TrendingUp : trend?.type === 'negative' ? TrendingDown : Minus

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', colorClasses[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 font-medium">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold text-slate-800">{value}</p>
            {subValue && <p className="text-xs text-slate-400">{subValue}</p>}
            {trend && (
              <span className={clsx(
                'flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded',
                trend.type === 'positive' && 'text-emerald-600 bg-emerald-50',
                trend.type === 'negative' && 'text-rose-600 bg-rose-50',
                trend.type === 'neutral' && 'text-amber-600 bg-amber-50',
              )}>
                <TrendIcon className="w-2.5 h-2.5" />
                {trend.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Combined Chart: Line + Bar + Tooltip ──────────────────────

// Color palette for multi-line breakdown
const GROUP_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48',
]

type ViewMode = 'all' | 'industry' | 'region'

function CombinedChart({
  data,
  rangeStart,
  rangeEnd,
  hoveredIndex,
  onHover,
  labels,
  onRangeChange,
  isPlaying,
  onPlayPause,
  onReset,
  events,
  viewMode,
  onViewModeChange,
  breakdownGroups,
  breakdownLoading,
}: {
  data: MonthlyGrowthPoint[]
  rangeStart: number
  rangeEnd: number
  hoveredIndex: number | null
  onHover: (idx: number | null) => void
  labels: string[]
  onRangeChange: (start: number, end: number) => void
  isPlaying: boolean
  onPlayPause: () => void
  onReset: () => void
  events: CustomerEvent[]
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  breakdownGroups?: GroupSeries[]
  breakdownLoading?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const filtered = data.slice(rangeStart, rangeEnd + 1)
  const total = data.length
  if (filtered.length < 2) return null

  // ── Dimensions ──
  const W = 900
  const lineH = 220          // top area: cumulative line
  const barH = 70            // bottom area: new/churned bars
  const gapY = 12            // space between line and bars
  const totalH = lineH + gapY + barH
  const padX = 30
  const padYTop = 14
  const padYBot = 4

  // ── Line chart data ──
  const values = filtered.map((d) => d.cumulative_total)
  const minVal = Math.min(...values) * 0.97
  const maxVal = Math.max(...values) * 1.03
  const valRange = maxVal - minVal || 1

  const linePoints = filtered.map((_, i) => ({
    x: padX + (i / (filtered.length - 1)) * (W - 2 * padX),
    y: padYTop + (1 - (values[i] - minVal) / valRange) * (lineH - padYTop - padYBot),
  }))

  // Smooth bezier path
  let linePath = `M ${linePoints[0].x} ${linePoints[0].y}`
  for (let i = 1; i < linePoints.length; i++) {
    const prev = linePoints[i - 1]
    const curr = linePoints[i]
    const cpx = (prev.x + curr.x) / 2
    linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  const areaPath = `${linePath} L ${linePoints[linePoints.length - 1].x} ${lineH} L ${linePoints[0].x} ${lineH} Z`

  // Colour segments
  const segments: { path: string; color: string }[] = []
  for (let i = 0; i < linePoints.length - 1; i++) {
    const prev = linePoints[i]
    const curr = linePoints[i + 1]
    const cpx = (prev.x + curr.x) / 2
    const isUp = filtered[i + 1].net_change >= 0
    segments.push({
      path: `M ${prev.x} ${prev.y} C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`,
      color: isUp ? '#10b981' : '#f43f5e',
    })
  }

  // Y-axis ticks (4-5 nice values)
  const yTicks = useMemo(() => {
    const step = Math.ceil(valRange / 4 / 10) * 10
    const ticks: number[] = []
    let v = Math.floor(minVal / step) * step
    while (v <= maxVal + step) {
      if (v >= minVal && v <= maxVal) ticks.push(v)
      v += step
    }
    return ticks.length ? ticks : [Math.round(minVal), Math.round(maxVal)]
  }, [minVal, maxVal, valRange])

  // ── Bar chart data ──
  const barTop = lineH + gapY
  const maxBarVal = Math.max(...filtered.map((d) => Math.max(d.new_count, d.churn_count)), 1)
  const barMid = barTop + barH / 2
  const maxBarH = barH / 2 - 4
  const barGap = (W - 2 * padX) / filtered.length
  const barW = Math.min(14, barGap * 0.55)

  // Alternating shades for stacked bars
  const greenShades = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5']
  const greenShadesHov = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0']
  const redShades = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#ffe4e6']
  const redShadesHov = ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3']

  // ── Mouse handling ──
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || !containerRef.current) return
      const svgRect = svgRef.current.getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()
      const relX = e.clientX - svgRect.left
      const ratio = (relX - (padX / W) * svgRect.width) / (svgRect.width * (1 - 2 * padX / W))
      const idx = Math.round(Math.max(0, Math.min(filtered.length - 1, ratio * (filtered.length - 1))))
      if (idx >= 0 && idx < filtered.length) {
        onHover(rangeStart + idx)
        setTooltipPos({
          x: e.clientX - containerRect.left,
          y: e.clientY - containerRect.top,
        })
      }
    },
    [filtered.length, onHover, rangeStart]
  )

  const handleMouseLeave = useCallback(() => {
    onHover(null)
    setTooltipPos(null)
  }, [onHover])

  const localIdx = hoveredIndex !== null ? hoveredIndex - rangeStart : null
  const hovPt = localIdx !== null && localIdx >= 0 && localIdx < filtered.length ? filtered[localIdx] : null

  // Find events matching the hovered month
  const hovEvents = useMemo(() => {
    if (!hovPt) return []
    const y = hovPt.year
    const m = String(hovPt.month).padStart(2, '0')
    const prefix = `${y}-${m}`
    return events.filter((e) => e.date.startsWith(prefix))
  }, [hovPt, events])

  // ── Multi-line mode data ──
  const isBreakdown = viewMode !== 'all' && breakdownGroups && breakdownGroups.length > 0

  // For breakdown mode: compute multi-line paths
  const multiLineData = useMemo(() => {
    if (!isBreakdown || !breakdownGroups) return []

    return breakdownGroups.map((group, gIdx) => {
      const gFiltered = group.series.slice(rangeStart, rangeEnd + 1)
      if (gFiltered.length < 2) return null

      const gValues = gFiltered.map((d) => d.cumulative_total)
      const gMin = Math.min(...gValues) * 0.97
      const gMax = Math.max(...gValues) * 1.03

      return {
        name: group.group_name,
        color: GROUP_COLORS[gIdx % GROUP_COLORS.length],
        values: gValues,
        filtered: gFiltered,
        min: gMin,
        max: gMax,
      }
    }).filter(Boolean) as {
      name: string; color: string; values: number[];
      filtered: { year: number; month: number; label: string; cumulative_total: number }[];
      min: number; max: number;
    }[]
  }, [isBreakdown, breakdownGroups, rangeStart, rangeEnd])

  // Global min/max for breakdown mode
  const globalMin = isBreakdown && multiLineData.length > 0
    ? Math.min(...multiLineData.map((g) => Math.min(...g.values))) * 0.95
    : minVal
  const globalMax = isBreakdown && multiLineData.length > 0
    ? Math.max(...multiLineData.map((g) => Math.max(...g.values))) * 1.05
    : maxVal
  const globalRange = (isBreakdown ? globalMax - globalMin : valRange) || 1

  // Build multi-line paths
  const multiLinePaths = useMemo(() => {
    if (!isBreakdown) return []

    return multiLineData.map((group) => {
      const pts = group.values.map((v, i) => ({
        x: padX + (i / (group.values.length - 1)) * (W - 2 * padX),
        y: padYTop + (1 - (v - globalMin) / globalRange) * (lineH - padYTop - padYBot),
      }))

      let path = `M ${pts[0].x} ${pts[0].y}`
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1]
        const curr = pts[i]
        const cpx = (prev.x + curr.x) / 2
        path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
      }

      return { ...group, path, points: pts }
    })
  }, [isBreakdown, multiLineData, globalMin, globalRange, W, padX, padYTop, padYBot, lineH])

  // Y-axis ticks for breakdown mode
  const breakdownYTicks = useMemo(() => {
    if (!isBreakdown) return []
    const step = Math.ceil(globalRange / 4 / 5) * 5 || 1
    const ticks: number[] = []
    let v = Math.floor(globalMin / step) * step
    while (v <= globalMax + step) {
      if (v >= globalMin && v <= globalMax) ticks.push(v)
      v += step
    }
    return ticks.length ? ticks : [Math.round(globalMin), Math.round(globalMax)]
  }, [isBreakdown, globalMin, globalMax, globalRange])

  return (
    <div ref={containerRef} className="relative bg-white rounded-xl border border-slate-200 p-5">
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-700">Customer Growth</h3>
          {/* View mode tabs */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {(['all', 'industry', 'region'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={clsx(
                  'px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all',
                  viewMode === mode
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                {mode === 'all' ? 'All' : mode === 'industry' ? 'Industry' : 'Region'}
              </button>
            ))}
          </div>
          {breakdownLoading && (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          )}
        </div>
        {/* Legend */}
        {viewMode === 'all' ? (
          <div className="flex items-center gap-4 text-[10px] font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded bg-emerald-500 inline-block" />
              Growth
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded bg-rose-500 inline-block" />
              Decline
            </span>
            <span className="mx-1 text-slate-300">|</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              New
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
              Churned
            </span>
          </div>
        ) : isBreakdown ? (
          <div className="flex items-center gap-2 flex-wrap justify-end max-w-[50%]">
            {multiLinePaths.slice(0, 8).map((g) => (
              <span key={g.name} className="flex items-center gap-1 text-[9px] font-medium text-slate-600">
                <span className="w-3 h-0.5 rounded inline-block" style={{ backgroundColor: g.color }} />
                {g.name}
              </span>
            ))}
            {multiLinePaths.length > 8 && (
              <span className="text-[9px] text-slate-400">+{multiLinePaths.length - 8} more</span>
            )}
          </div>
        ) : null}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${isBreakdown ? lineH : totalH}`}
        className="w-full"
        style={{ height: isBreakdown ? 300 : 340 }}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {isBreakdown ? (
          <>
            {/* ── Breakdown multi-line mode ── */}
            {breakdownYTicks.map((v) => {
              const y = padYTop + (1 - (v - globalMin) / globalRange) * (lineH - padYTop - padYBot)
              return (
                <g key={v}>
                  <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={padX - 6} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="9">{v}</text>
                </g>
              )
            })}
            {/* Multi-line paths */}
            {multiLinePaths.map((g) => (
              <path
                key={g.name}
                d={g.path}
                fill="none"
                stroke={g.color}
                strokeWidth="2"
                strokeLinecap="round"
                opacity={0.85}
              />
            ))}
            {/* Hover vertical line + dots */}
            {localIdx !== null && multiLinePaths.length > 0 && multiLinePaths[0].points[localIdx] && (
              <>
                <line
                  x1={multiLinePaths[0].points[localIdx].x}
                  y1={0}
                  x2={multiLinePaths[0].points[localIdx].x}
                  y2={lineH}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                {multiLinePaths.map((g) => g.points[localIdx] && (
                  <circle
                    key={g.name}
                    cx={g.points[localIdx].x}
                    cy={g.points[localIdx].y}
                    r="4"
                    fill="white"
                    stroke={g.color}
                    strokeWidth="2"
                  />
                ))}
              </>
            )}
          </>
        ) : (
          <>
            {/* ── All mode (original) ── */}
            <defs>
              <linearGradient id="comboAreaGrad" x1="0" y1="0" x2="0" y2={lineH}>
                <stop offset="0%" stopColor="#3c83f6" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#3c83f6" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Y-axis ticks */}
            {yTicks.map((v) => {
              const y = padYTop + (1 - (v - minVal) / valRange) * (lineH - padYTop - padYBot)
              return (
                <g key={v}>
                  <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={padX - 6} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="9">{v}</text>
                </g>
              )
            })}

            {/* Cumulative line area */}
            <path d={areaPath} fill="url(#comboAreaGrad)" />
            {segments.map((seg, i) => (
              <path key={i} d={seg.path} stroke={seg.color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            ))}

            {/* Separator between line and bars */}
            <line x1={padX} y1={lineH + gapY / 2} x2={W - padX} y2={lineH + gapY / 2} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4 3" />

        {/* ─ New/Churned stacked bars ─ */}
        <line x1={padX} y1={barMid} x2={W - padX} y2={barMid} stroke="#f1f5f9" strokeWidth="1" />
        {filtered.map((pt, i) => {
          const cx = padX + (i / (filtered.length - 1)) * (W - 2 * padX)
          const isHov = localIdx === i
          const newCount = pt.new_count || 0
          const churnCount = pt.churn_count || 0

          const segGap = 1 // px gap between segments

          // New segments (stacked upward from barMid)
          const newSegs: React.ReactNode[] = []
          if (newCount > 0) {
            const scale = maxBarVal > 0 ? (newCount / maxBarVal) : 1
            const actualTotalH = scale * maxBarH
            const eachH = newCount > 1 ? (actualTotalH - (newCount - 1) * segGap) / newCount : actualTotalH

            for (let s = 0; s < newCount; s++) {
              const yBottom = barMid - s * (eachH + segGap)
              newSegs.push(
                <rect
                  key={`new-${s}`}
                  x={cx - barW / 2}
                  y={yBottom - eachH}
                  width={barW}
                  height={Math.max(2, eachH)}
                  rx={1.5}
                  fill={isHov ? greenShadesHov[s % greenShadesHov.length] : greenShades[s % greenShades.length]}
                  opacity={isHov ? 1 : 0.8}
                />
              )
            }
          }

          // Churn segments (stacked downward from barMid)
          const churnSegs: React.ReactNode[] = []
          if (churnCount > 0) {
            const scale = maxBarVal > 0 ? (churnCount / maxBarVal) : 1
            const actualTotalH = scale * maxBarH
            const eachH = churnCount > 1 ? (actualTotalH - (churnCount - 1) * segGap) / churnCount : actualTotalH

            for (let s = 0; s < churnCount; s++) {
              const yTop = barMid + s * (eachH + segGap)
              churnSegs.push(
                <rect
                  key={`churn-${s}`}
                  x={cx - barW / 2}
                  y={yTop}
                  width={barW}
                  height={Math.max(2, eachH)}
                  rx={1.5}
                  fill={isHov ? redShadesHov[s % redShadesHov.length] : redShades[s % redShades.length]}
                  opacity={isHov ? 1 : 0.8}
                />
              )
            }
          }

          return (
            <g key={i}>
              {newSegs}
              {churnSegs}
            </g>
          )
        })}

            {/* ─ Hover column + dot ─ */}
            {localIdx !== null && linePoints[localIdx] && (
              <>
                <line
                  x1={linePoints[localIdx].x}
                  y1={0}
                  x2={linePoints[localIdx].x}
                  y2={totalH}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                <circle
                  cx={linePoints[localIdx].x}
                  cy={linePoints[localIdx].y}
                  r="5"
                  fill="white"
                  stroke="#3c83f6"
                  strokeWidth="2.5"
                />
              </>
            )}
          </>
        )}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-1" style={{ paddingLeft: `${(padX / W) * 100}%`, paddingRight: `${(padX / W) * 100}%` }}>
        {filtered.filter((_, i) => i % Math.max(1, Math.floor(filtered.length / 8)) === 0 || i === filtered.length - 1).map((pt) => (
          <span key={`${pt.year}-${pt.month}`} className="text-[9px] text-slate-400 font-medium">
            {pt.label}
          </span>
        ))}
      </div>

      {/* ─ Floating tooltip ─ */}
      {tooltipPos && localIdx !== null && (() => {
        if (isBreakdown) {
          // Breakdown tooltip: show each group's value
          const monthLabel = filtered[localIdx]?.label ?? ''
          const total = filtered[localIdx]?.cumulative_total ?? 0
          return (
            <div
              className="absolute z-50 pointer-events-none"
              style={{
                left: tooltipPos.x,
                top: Math.max(8, tooltipPos.y - 120),
                transform: 'translateX(-50%)',
              }}
            >
              <div className="bg-slate-900/95 backdrop-blur-sm text-white rounded-xl px-4 py-3 shadow-2xl text-xs min-w-[180px] max-w-[260px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[12px] text-white">{monthLabel}</span>
                  <span className="text-[11px] font-bold text-blue-300">{total.toLocaleString()} total</span>
                </div>
                <div className="space-y-1.5">
                  {multiLinePaths.map((g) => {
                    const val = g.filtered[localIdx]?.cumulative_total ?? 0
                    return (
                      <div key={g.name} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                          <span className="text-[10px] text-slate-300 truncate">{g.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-white flex-shrink-0">{val.toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        }

        // All-mode tooltip
        if (!hovPt) return null
        const newEvts = hovEvents.filter((e) => e.event_type === 'new')
        const churnEvts = hovEvents.filter((e) => e.event_type === 'churned')
        return (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: tooltipPos.x,
              top: Math.max(8, tooltipPos.y - 120),
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-slate-900/95 backdrop-blur-sm text-white rounded-xl px-4 py-3 shadow-2xl text-xs min-w-[200px] max-w-[280px]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[12px] text-white">{hovPt.label}</span>
                <span className="text-[11px] font-bold text-blue-300">{hovPt.cumulative_total.toLocaleString()} total</span>
              </div>

              {hovPt.new_count > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-emerald-400 text-[11px]">+{hovPt.new_count} Added</span>
                  </div>
                  {newEvts.length > 0 && (
                    <div className="ml-3 space-y-1">
                      {newEvts.slice(0, 6).map((e, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: greenShades[i % greenShades.length] }} />
                          <span className="text-[10px] text-slate-200 truncate">{e.account_name}</span>
                        </div>
                      ))}
                      {newEvts.length > 6 && <div className="text-[10px] text-slate-500 ml-4">+{newEvts.length - 6} more</div>}
                    </div>
                  )}
                </div>
              )}

              {hovPt.churn_count > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span className="font-semibold text-rose-400 text-[11px]">-{hovPt.churn_count} Churned</span>
                  </div>
                  {churnEvts.length > 0 && (
                    <div className="ml-3 space-y-1">
                      {churnEvts.slice(0, 6).map((e, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: redShades[i % redShades.length] }} />
                          <span className="text-[10px] text-slate-200 truncate">{e.account_name}</span>
                        </div>
                      ))}
                      {churnEvts.length > 6 && <div className="text-[10px] text-slate-500 ml-4">+{churnEvts.length - 6} more</div>}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Net change</span>
                <span className={clsx(
                  'font-bold text-[12px]',
                  hovPt.net_change > 0 ? 'text-emerald-400' : hovPt.net_change < 0 ? 'text-rose-400' : 'text-slate-400'
                )}>
                  {hovPt.net_change > 0 ? '+' : ''}{hovPt.net_change}
                </span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ─ Inline Timeline Controller ─ */}
      {total > 1 && (
        <InlineSlider
          total={total}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          labels={labels}
          onRangeChange={onRangeChange}
          isPlaying={isPlaying}
          onPlayPause={onPlayPause}
          onReset={onReset}
        />
      )}
    </div>
  )
}

// ── Inline Slider (inside chart card) ────────────────────────

function InlineSlider({
  total,
  rangeStart,
  rangeEnd,
  labels,
  onRangeChange,
  isPlaying,
  onPlayPause,
  onReset,
}: {
  total: number
  rangeStart: number
  rangeEnd: number
  labels: string[]
  onRangeChange: (start: number, end: number) => void
  isPlaying: boolean
  onPlayPause: () => void
  onReset: () => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  const leftPct = total > 1 ? (rangeStart / (total - 1)) * 100 : 0
  const rightPct = total > 1 ? (rangeEnd / (total - 1)) * 100 : 100

  const handleDrag = useCallback(
    (handle: 'start' | 'end', clientX: number) => {
      if (!trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const idx = Math.round(ratio * (total - 1))
      if (handle === 'start') {
        onRangeChange(Math.min(idx, rangeEnd - 1), rangeEnd)
      } else {
        onRangeChange(rangeStart, Math.max(idx, rangeStart + 1))
      }
    },
    [total, rangeStart, rangeEnd, onRangeChange]
  )

  const startDrag = useCallback(
    (handle: 'start' | 'end') => {
      const onMove = (e: MouseEvent) => handleDrag(handle, e.clientX)
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [handleDrag]
  )

  return (
    <div className="mt-4 pt-3 border-t border-slate-100">
      <div className="flex items-center gap-2.5 mb-2">
        <button
          onClick={onReset}
          className="w-6 h-6 rounded-md bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
          title="Reset to full range"
        >
          <SkipBack className="w-3 h-3 text-slate-500" />
        </button>
        <button
          onClick={onPlayPause}
          className={clsx(
            'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
            isPlaying ? 'bg-primary text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-500'
          )}
          title={isPlaying ? 'Pause' : 'Play timeline'}
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-px" />}
        </button>
        <span className="text-[11px] text-slate-500 font-medium">
          {labels[rangeStart]} — {labels[rangeEnd]}
        </span>
        <span className="text-[10px] text-slate-400 ml-auto">
          {rangeEnd - rangeStart + 1} months
        </span>
      </div>
      {/* Slider track */}
      <div ref={trackRef} className="relative h-5 select-none">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-slate-100 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary/30 rounded-full"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-primary rounded-full cursor-grab active:cursor-grabbing shadow-sm hover:scale-110 transition-transform z-10"
          style={{ left: `calc(${leftPct}% - 7px)` }}
          onMouseDown={() => startDrag('start')}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full cursor-grab active:cursor-grabbing shadow-sm hover:scale-110 transition-transform z-10"
          style={{ left: `calc(${rightPct}% - 7px)` }}
          onMouseDown={() => startDrag('end')}
        />
      </div>
    </div>
  )
}

// ── Event Timeline List ──────────────────────────────────────

function EventTimeline({
  events,
  onAccountClick,
}: {
  events: CustomerEvent[]
  onAccountClick?: (id: string) => void
}) {
  const [industryFilter, setIndustryFilter] = useState<string | null>(null)
  const [regionFilter, setRegionFilter] = useState<string | null>(null)

  // Derive unique values
  const industries = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => { if (e.industry) set.add(e.industry) })
    return Array.from(set).sort()
  }, [events])

  const regions = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => { if (e.region) set.add(e.region) })
    return Array.from(set).sort()
  }, [events])

  // Filtered events
  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (industryFilter && e.industry !== industryFilter) return false
      if (regionFilter && e.region !== regionFilter) return false
      return true
    })
  }, [events, industryFilter, regionFilter])

  const hasActiveFilter = industryFilter || regionFilter

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-400">
        No events in this date range
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700">Customer Events</h3>
          <span className="text-[10px] text-slate-400 font-medium">
            {hasActiveFilter ? `${filtered.length} of ${events.length}` : `${events.length}`} events
          </span>
        </div>
        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Industry filter */}
          <div className="relative group">
            <button
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all',
                industryFilter
                  ? 'bg-primary/5 border-primary/20 text-primary'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
              )}
            >
              <Building2 className="w-3 h-3" />
              {industryFilter || 'Industry'}
              {industryFilter && (
                <span
                  onClick={(e) => { e.stopPropagation(); setIndustryFilter(null) }}
                  className="ml-0.5 w-3.5 h-3.5 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center cursor-pointer"
                >
                  <span className="text-[8px] leading-none">&times;</span>
                </span>
              )}
            </button>
            {/* Dropdown */}
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px] max-h-48 overflow-y-auto">
              {industryFilter && (
                <button
                  onClick={() => setIndustryFilter(null)}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-slate-400 hover:bg-slate-50 font-medium"
                >
                  All Industries
                </button>
              )}
              {industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setIndustryFilter(ind)}
                  className={clsx(
                    'w-full text-left px-3 py-1.5 text-[10px] hover:bg-slate-50 transition-colors',
                    industryFilter === ind ? 'text-primary font-bold bg-primary/5' : 'text-slate-600 font-medium'
                  )}
                >
                  {ind}
                </button>
              ))}
              {industries.length === 0 && (
                <div className="px-3 py-2 text-[10px] text-slate-400">No industries</div>
              )}
            </div>
          </div>

          {/* Region filter */}
          <div className="relative group">
            <button
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all',
                regionFilter
                  ? 'bg-primary/5 border-primary/20 text-primary'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
              )}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              {regionFilter || 'Region'}
              {regionFilter && (
                <span
                  onClick={(e) => { e.stopPropagation(); setRegionFilter(null) }}
                  className="ml-0.5 w-3.5 h-3.5 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center cursor-pointer"
                >
                  <span className="text-[8px] leading-none">&times;</span>
                </span>
              )}
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px] max-h-48 overflow-y-auto">
              {regionFilter && (
                <button
                  onClick={() => setRegionFilter(null)}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-slate-400 hover:bg-slate-50 font-medium"
                >
                  All Regions
                </button>
              )}
              {regions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegionFilter(r)}
                  className={clsx(
                    'w-full text-left px-3 py-1.5 text-[10px] hover:bg-slate-50 transition-colors',
                    regionFilter === r ? 'text-primary font-bold bg-primary/5' : 'text-slate-600 font-medium'
                  )}
                >
                  {r}
                </button>
              ))}
              {regions.length === 0 && (
                <div className="px-3 py-2 text-[10px] text-slate-400">No regions</div>
              )}
            </div>
          </div>

          {/* Clear all filters */}
          {hasActiveFilter && (
            <button
              onClick={() => { setIndustryFilter(null); setRegionFilter(null) }}
              className="text-[10px] text-slate-400 hover:text-primary font-medium transition-colors px-1.5"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[auto_28px_100px_1fr_120px_120px_100px] items-center gap-2 px-5 py-2 bg-slate-50/80 border-b border-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-400">
        <span></span>
        <span></span>
        <span>Date</span>
        <span>Company</span>
        <span>Industry</span>
        <span>Region</span>
        <span className="text-right">Status</span>
      </div>

      {/* Rows */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
        {filtered.map((event, i) => (
          <div
            key={`${event.account_id}-${i}`}
            className="grid grid-cols-[auto_28px_100px_1fr_120px_120px_100px] items-center gap-2 px-5 py-2.5 hover:bg-slate-50/50 transition-colors"
          >
            {/* Row num */}
            <span className="text-[9px] text-slate-300 font-medium w-5 text-right">{i + 1}</span>
            {/* Dot */}
            <div className="flex justify-center">
              <div className={clsx(
                'w-2 h-2 rounded-full flex-shrink-0',
                event.event_type === 'new' ? 'bg-emerald-500' : 'bg-rose-500'
              )} />
            </div>
            {/* Date */}
            <span className="text-[11px] text-slate-400 font-medium">
              {formatEventDate(event.date)}
            </span>
            {/* Name */}
            <button
              onClick={() => event.account_id && event.event_type === 'new' && onAccountClick?.(event.account_id)}
              className={clsx(
                'text-[12px] font-medium truncate text-left',
                event.event_type === 'new' && event.account_id
                  ? 'text-slate-800 hover:text-primary transition-colors cursor-pointer'
                  : 'text-slate-500 cursor-default'
              )}
            >
              {event.account_name}
            </button>
            {/* Industry */}
            <span className="text-[10px] text-slate-500 truncate" title={event.industry || '—'}>
              {event.industry || '—'}
            </span>
            {/* Region */}
            <span className="text-[10px] text-slate-500 truncate" title={event.region || '—'}>
              {event.region || '—'}
            </span>
            {/* Badge */}
            <div className="flex justify-end">
              <span className={clsx(
                'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                event.event_type === 'new'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-600'
              )}>
                {event.event_type === 'new' ? 'New' : 'Churned'}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-5 py-6 text-center text-[11px] text-slate-400">
            No events match the selected filters
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────

function CustomerGrowthInner({ onBack, onAccountClick, accountType }: CustomerGrowthProps) {
  const acctTypeParam = accountType && accountType !== 'all' ? accountType : undefined
  const { data, isLoading } = useCustomerGrowth(acctTypeParam)

  // View mode: all / industry / region
  const [viewMode, setViewMode] = useState<ViewMode>('all')

  // Fetch breakdown data when a dimension tab is active
  const { data: breakdownData, isLoading: breakdownLoading } = useCustomerGrowthBreakdown(
    viewMode === 'industry' ? 'industry' : 'region',
    acctTypeParam,
    viewMode !== 'all',
  )

  const series = data?.monthly_series ?? []
  const events = data?.events ?? []
  const summary = data?.summary
  const seriesLen = series.length

  // User-driven slider state (no useEffect sync from data)
  const [userRangeStart, setRangeStart] = useState(0)
  const [userRangeEnd, setRangeEnd] = useState<number | null>(null) // null = "show full range"
  const [isPlaying, setIsPlaying] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Derive effective range: if user hasn't set an end, show full range
  const rangeStart = Math.min(userRangeStart, Math.max(0, seriesLen - 1))
  const rangeEnd = userRangeEnd !== null
    ? Math.min(userRangeEnd, Math.max(0, seriesLen - 1))
    : Math.max(0, seriesLen - 1)

  // Play animation
  useEffect(() => {
    if (isPlaying && seriesLen > 0) {
      playIntervalRef.current = setInterval(() => {
        setRangeEnd((prev) => {
          const current = prev ?? seriesLen - 1
          const next = current + 1
          if (next >= seriesLen) {
            setIsPlaying(false)
            return seriesLen - 1
          }
          return next
        })
      }, 400)
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [isPlaying, seriesLen])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      // If at end, restart from beginning
      if (rangeEnd >= seriesLen - 1) {
        setRangeEnd(rangeStart + 1)
      }
      setIsPlaying(true)
    }
  }, [isPlaying, rangeEnd, rangeStart, seriesLen])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setRangeStart(0)
    setRangeEnd(null) // null = full range
  }, [])

  const handleRangeChange = useCallback((start: number, end: number) => {
    setRangeStart(Math.max(0, start))
    setRangeEnd(end)
  }, [])

  const labels = useMemo(() => series.map((p) => p.label), [series])

  // Filter events by selected range
  const filteredEvents = useMemo(() => {
    if (seriesLen === 0 || rangeEnd >= seriesLen) return events
    const startPt = series[rangeStart]
    const endPt = series[rangeEnd]
    if (!startPt || !endPt) return events
    const startDate = `${startPt.year}-${String(startPt.month).padStart(2, '0')}-01`
    const endYear = endPt.month === 12 ? endPt.year + 1 : endPt.year
    const endMonth = endPt.month === 12 ? 1 : endPt.month + 1
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
    return events.filter((e) => e.date >= startDate && e.date < endDate)
  }, [events, series, seriesLen, rangeStart, rangeEnd])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-slate-500">Loading customer growth data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 pb-12 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Customer Growth</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Portfolio acquisition trends &amp; YoY analysis
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            title="Total Customers"
            value={summary?.total_customers_now?.toLocaleString() ?? '—'}
            icon={Building2}
            color="primary"
          />
          <SummaryCard
            title="New (12 months)"
            value={summary?.new_last_12m?.toLocaleString() ?? '—'}
            subValue={`${summary?.avg_per_month ?? 0}/mo avg`}
            icon={UserPlus}
            color="emerald"
            trend={
              summary
                ? {
                    value: summary.yoy_growth_pct,
                    label: `${summary.yoy_growth_pct > 0 ? '+' : ''}${summary.yoy_growth_pct}% YoY`,
                    type: summary.yoy_growth_pct > 0 ? 'positive' : summary.yoy_growth_pct < 0 ? 'negative' : 'neutral',
                  }
                : undefined
            }
          />
          <SummaryCard
            title="Churned (12m)"
            value={summary?.churn_last_12m?.toLocaleString() ?? '—'}
            icon={UserMinus}
            color="rose"
          />
        </div>

        {/* Combined Chart with integrated timeline controller */}
        <CombinedChart
          data={series}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          hoveredIndex={hoveredIndex}
          onHover={setHoveredIndex}
          labels={labels}
          onRangeChange={handleRangeChange}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onReset={handleReset}
          events={events}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          breakdownGroups={breakdownData?.groups}
          breakdownLoading={breakdownLoading}
        />

        {/* Event Timeline */}
        <EventTimeline events={filteredEvents} onAccountClick={onAccountClick} />
      </div>
    </div>
  )
}

// ── Default export with Error Boundary wrapper ──────────────

export default function CustomerGrowth(props: CustomerGrowthProps) {
  return (
    <CustomerGrowthErrorBoundary onBack={props.onBack}>
      <CustomerGrowthInner {...props} />
    </CustomerGrowthErrorBoundary>
  )
}
