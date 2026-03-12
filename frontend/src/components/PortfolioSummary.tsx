import { TrendingUp, TrendingDown, Minus, ExternalLink, Calendar, Info } from 'lucide-react'
import clsx from 'clsx'
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { MetricsSummary, CustomerGrowthSummary, MonthlyGrowthPoint } from '../types'

const RENEWAL_PERIODS = [
  { value: 30, label: '30 Days' },
  { value: 60, label: '60 Days' },
  { value: 90, label: '90 Days' },
  { value: 180, label: '6 Months' },
  { value: 365, label: '1 Year' },
]

interface PortfolioSummaryProps {
  metrics: MetricsSummary | undefined
  isLoading: boolean
  onOpenARR?: () => void
  onOpenCustomerGrowth?: () => void
  growthSummary?: CustomerGrowthSummary
  growthSeries?: MonthlyGrowthPoint[]
  renewalPeriod: number
  onRenewalPeriodChange: (period: number) => void
}

/**
 * Formats a number as currency (e.g., $146.17M, $24.5K)
 */

function formatEUR(value: number): string {
  if (value >= 1_000_000_000) {
    return `€${(value / 1_000_000_000).toFixed(1)}B`
  } else if (value >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}M`
  } else if (value >= 1_000) {
    return `€${(value / 1_000).toFixed(1)}K`
  }
  return `€${value.toFixed(0)}`
}

/**
 * Mini sparkline SVG component - static fallback
 */
function Sparkline({ trend = 'up' }: { trend?: 'up' | 'down' | 'flat' }) {
  const paths = {
    up: 'M0 28 Q 20 28, 35 20 T 65 15 T 100 5',
    down: 'M0 5 Q 20 10, 35 18 T 65 24 T 100 30',
    flat: 'M0 16 Q 30 14, 50 16 T 80 15 T 100 16',
  }
  
  return (
    <svg className="w-full h-full opacity-20" viewBox="0 0 100 32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3c83f6', stopOpacity: 0.5 }} />
          <stop offset="100%" style={{ stopColor: '#3c83f6', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path 
        d={paths[trend]} 
        fill="none" 
        stroke="#3c83f6" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      <path 
        d={`${paths[trend]} V 32 H 0 Z`}
        fill="url(#sparkGrad)"
      />
    </svg>
  )
}

/**
 * Data-driven sparkline from monthly growth data (last 12 months)
 */
function DataSparkline({ series }: { series: MonthlyGrowthPoint[] }) {
  // Use last 12 data points
  const recent = series.slice(-12)
  if (recent.length < 2) return <Sparkline trend="up" />

  const values = recent.map((p) => p.cumulative_total)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const W = 100
  const H = 32
  const pad = 2

  const pts = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * (W - 2 * pad),
    y: pad + (1 - (v - minVal) / range) * (H - 2 * pad),
  }))

  // Build smooth cubic bezier path
  let linePath = `M ${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cpx = (prev.x + curr.x) / 2
    linePath += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
  }
  const lastPt = pts[pts.length - 1]
  const firstPt = pts[0]
  const areaPath = `${linePath} L ${lastPt.x},${H} L ${firstPt.x},${H} Z`

  return (
    <svg className="w-full h-full opacity-25" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="dataSparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.5 }} />
          <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#dataSparkGrad)" />
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Trend badge component
 */
function TrendBadge({ value, type }: { value: string; type: 'positive' | 'negative' | 'neutral' }) {
  const Icon = type === 'positive' ? TrendingUp : type === 'negative' ? TrendingDown : Minus
  
  return (
    <span className={clsx(
      'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold',
      type === 'positive' && 'text-emerald-600 bg-emerald-50',
      type === 'negative' && 'text-rose-600 bg-rose-50',
      type === 'neutral' && 'text-amber-600 bg-amber-50'
    )}>
      <Icon className="w-2.5 h-2.5" />
      {value}
    </span>
  )
}


/**
 * Health Distribution Bar - Green/Yellow/Red
 */
function HealthDistributionBar({ 
  good, 
  atRisk, 
  critical,
  isLoading = false 
}: { 
  good: number
  atRisk: number
  critical: number
  isLoading?: boolean
}) {
  const total = good + atRisk + critical
  const goodPct = total > 0 ? (good / total) * 100 : 0
  const atRiskPct = total > 0 ? (atRisk / total) * 100 : 0
  const criticalPct = total > 0 ? (critical / total) * 100 : 0

  if (isLoading) {
    return <div className="h-2.5 bg-slate-100 rounded-full animate-pulse" />
  }

  return (
    <div className="space-y-1.5">
      {/* Bar */}
      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
        <div 
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${goodPct}%` }}
          title={`Good: ${good} (${goodPct.toFixed(0)}%)`}
        />
        <div 
          className="h-full bg-amber-400 transition-all duration-500"
          style={{ width: `${atRiskPct}%` }}
          title={`At Risk: ${atRisk} (${atRiskPct.toFixed(0)}%)`}
        />
        <div 
          className="h-full bg-rose-500 transition-all duration-500"
          style={{ width: `${criticalPct}%` }}
          title={`Critical: ${critical} (${criticalPct.toFixed(0)}%)`}
        />
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] font-medium">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          <span className="text-slate-500">{good}</span>
          <span className="text-emerald-600">Good</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-amber-400 rounded-full" />
          <span className="text-slate-500">{atRisk}</span>
          <span className="text-amber-600">At Risk</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-rose-500 rounded-full" />
          <span className="text-slate-500">{critical}</span>
          <span className="text-rose-600">Critical</span>
        </span>
      </div>
    </div>
  )
}

/* ── Renewal info tooltip ── */
function RenewalInfoLabel() {
  const [show, setShow] = useState(false)
  const iconRef = useRef<HTMLSpanElement>(null)
  const ttRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (show && iconRef.current && ttRef.current) {
      requestAnimationFrame(() => {
        if (!iconRef.current || !ttRef.current) return
        const anchor = iconRef.current.getBoundingClientRect()
        const tt = ttRef.current.getBoundingClientRect()
        const vh = window.innerHeight
        const vw = window.innerWidth
        let top = anchor.bottom + 6
        if (top + tt.height > vh - 8) top = Math.max(8, anchor.top - 6 - tt.height)
        let left = anchor.left - tt.width / 2 + anchor.width / 2
        if (left + tt.width > vw - 8) left = vw - tt.width - 8
        if (left < 8) left = 8
        setPos({ top, left, visibility: 'visible' })
      })
    }
  }, [show])

  return (
    <div className="flex items-center gap-1.5">
      <p className="text-sm font-semibold text-slate-500">Renewals Due</p>
      <span
        ref={iconRef}
        className="cursor-help text-slate-400 hover:text-slate-600 transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => { setShow(false); setPos({}) }}
      >
        <Info className="w-3.5 h-3.5" />
      </span>
      {show && createPortal(
        <div
          ref={ttRef}
          className="fixed z-[9999] bg-slate-800 text-white rounded-lg shadow-xl p-3 max-w-[260px] text-[11px] leading-relaxed"
          style={{ visibility: 'hidden', ...pos }}
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => { setShow(false); setPos({}) }}
        >
          <p className="font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1.5">Calculation Notes</p>
          <ul className="space-y-1 text-slate-200">
            <li className="flex gap-1.5"><span className="text-slate-500">•</span> Renewal ARR in EUR</li>
            <li className="flex gap-1.5"><span className="text-slate-500">•</span> Excludes <span className="font-semibold text-amber-300">Services</span> &amp; <span className="font-semibold text-amber-300">Perpetual</span></li>
            <li className="flex gap-1.5"><span className="text-slate-500">•</span> Churned contracts removed</li>
            <li className="flex gap-1.5"><span className="text-slate-500">•</span> Past contracts excluded</li>
            <li className="flex gap-1.5"><span className="text-slate-500">•</span> Only &quot;Not Yet Contracted&quot; renewals</li>
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}


/**
 * Portfolio Summary - Compact Executive Style
 */
export function PortfolioSummary({ metrics, isLoading, onOpenARR, onOpenCustomerGrowth, growthSummary, growthSeries, renewalPeriod, onRenewalPeriodChange }: PortfolioSummaryProps) {
  const totalAccounts = metrics?.total_accounts ?? 0
  const renewalsArr = metrics?.renewals_arr ?? 0
  const renewalsCount = metrics?.renewals_count ?? 0
  const healthDist = metrics?.health_distribution ?? { good: 0, at_risk: 0, critical: 0 }

  // YoY trend from real data
  const yoyPct = growthSummary?.yoy_growth_pct ?? 0
  const newLast12 = growthSummary?.new_last_12m ?? 0

  // Determine what to show: prefer YoY %, fall back to raw new count
  let yoyLabel = ''
  let yoyTrendType: 'positive' | 'negative' | 'neutral' = 'neutral'

  if (growthSummary) {
    if (yoyPct !== 0) {
      // Real YoY comparison available
      yoyLabel = `${yoyPct > 0 ? '+' : ''}${yoyPct}% YoY`
      yoyTrendType = yoyPct > 0 ? 'positive' : 'negative'
    } else if (newLast12 > 0) {
      // No prior-year data to compare, show raw new count
      yoyLabel = `+${newLast12} new`
      yoyTrendType = 'positive'
    }
  }

  const isClickable = !!onOpenCustomerGrowth

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Companies - matches ARR card style + health bar */}
      <button
        onClick={onOpenCustomerGrowth}
        className={clsx(
          'bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left transition-shadow',
          isClickable && 'hover:shadow-md cursor-pointer group'
        )}
      >
        <div className="flex justify-between items-start mb-3">
          <p className="text-sm font-semibold text-slate-500">Companies</p>
          <div className="flex items-center gap-2">
            {yoyLabel && <TrendBadge value={yoyLabel} type={yoyTrendType} />}
            {isClickable && (
              <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary transition-colors" />
            )}
          </div>
        </div>
        <div className="flex items-end gap-4 mb-3">
          {isLoading ? (
            <div className="h-9 w-28 bg-slate-100 rounded animate-pulse" />
          ) : (
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              {totalAccounts.toLocaleString()}
            </h3>
          )}
          <div className="flex-1 h-10 mb-1">
            {growthSeries && growthSeries.length > 2 ? (
              <DataSparkline series={growthSeries} />
            ) : (
              <Sparkline trend="up" />
            )}
          </div>
        </div>
        {/* Health Distribution Bar */}
        <HealthDistributionBar 
          good={healthDist.good}
          atRisk={healthDist.at_risk}
          critical={healthDist.critical}
          isLoading={isLoading}
        />
      </button>
      
      {/* Renewals Due - clickable, opens ARR Analysis */}
      <button
        onClick={onOpenARR}
        className={clsx(
          'bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left transition-shadow',
          onOpenARR && 'hover:shadow-md cursor-pointer group'
        )}
      >
        <div className="flex justify-between items-start mb-3">
          <RenewalInfoLabel />
          <div className="flex items-center gap-2">
            {/* Period Selector */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <select
                value={renewalPeriod}
                onChange={(e) => { e.stopPropagation(); onRenewalPeriodChange(Number(e.target.value)) }}
                className="appearance-none bg-primary/10 text-primary text-[11px] font-bold pl-1.5 pr-5 py-0.5 rounded-full border-none cursor-pointer focus:ring-2 focus:ring-primary/20"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%233c83f6' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
              >
                {RENEWAL_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {onOpenARR && (
              <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary transition-colors" />
            )}
          </div>
        </div>
        <div className="flex items-end gap-4">
          {isLoading ? (
            <div className="h-9 w-28 bg-slate-100 rounded animate-pulse" />
          ) : (
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              {formatEUR(renewalsArr)}
            </h3>
          )}
          <p className="text-sm text-slate-400 font-medium mb-1">
            {renewalsCount} account{renewalsCount !== 1 ? 's' : ''}
          </p>
        </div>
      </button>
    </div>
  )
}
