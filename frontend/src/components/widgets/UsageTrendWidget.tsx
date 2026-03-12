import { useState, useMemo, useCallback } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Users, Clock, MousePointerClick, Eye, Layers, Minus, Activity } from 'lucide-react'
import { BaseWidget } from './BaseWidget'
import { clsx } from 'clsx'
import type { UsageAnalysis, PendoDailyMetric, PendoTabData } from '../../types'

/* ── Types ── */
interface UsageTrendWidgetProps {
  data: UsageAnalysis | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

type PendoTab = 'account' | 'features' | 'visitors' | 'pages'
type ViewRange = '7d' | '30d' | '90d' | '365d'
type AccountMetric = 'active_visitors' | 'sum_minutes' | 'avg_minutes_per_user' | 'page_viewing_visitors' | 'features_clicked'
type VisitorMetric = 'unique_visitors' | 'sum_minutes' | 'pages_viewed' | 'features_clicked'

const TAB_CONFIG: { key: PendoTab; label: string; icon: typeof Activity; tooltip: string }[] = [
  { key: 'account', label: 'Account', icon: Activity, tooltip: 'Overall product health at a glance — active users, time spent, and engagement trends for this customer.' },
  { key: 'features', label: 'Features', icon: Layers, tooltip: 'Which product features are being used and how often. Helps identify adoption gaps and training opportunities.' },
  { key: 'visitors', label: 'Visitors', icon: Users, tooltip: 'Individual user engagement breakdown — who is active, how often, and how deeply they use the product.' },
  { key: 'pages', label: 'Pages', icon: Eye, tooltip: 'Which product pages are visited most. Shows navigation patterns and helps identify underused areas.' },
]

const VIEW_RANGES: { key: ViewRange; label: string; days: number }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '365d', label: '1Y', days: 365 },
]

const ACCOUNT_METRICS: { key: AccountMetric; label: string; unit?: string; color: string; lineColor: string; fillColor: string }[] = [
  { key: 'active_visitors', label: 'Active Users', color: 'text-blue-600', lineColor: '#3b82f6', fillColor: 'rgba(59,130,246,0.1)' },
  { key: 'sum_minutes', label: 'Time Spent', unit: 'min', color: 'text-violet-600', lineColor: '#7c3aed', fillColor: 'rgba(124,58,237,0.1)' },
  { key: 'avg_minutes_per_user', label: 'Avg Min/User', unit: 'min', color: 'text-emerald-600', lineColor: '#059669', fillColor: 'rgba(5,150,105,0.1)' },
  { key: 'page_viewing_visitors', label: 'Page Viewers', color: 'text-amber-600', lineColor: '#d97706', fillColor: 'rgba(217,119,6,0.1)' },
  { key: 'features_clicked', label: 'Features Used', color: 'text-rose-600', lineColor: '#e11d48', fillColor: 'rgba(225,29,72,0.1)' },
]

const VISITOR_METRICS: { key: VisitorMetric; label: string; unit?: string; color: string; lineColor: string; fillColor: string }[] = [
  { key: 'unique_visitors', label: 'Unique Visitors', color: 'text-blue-600', lineColor: '#3b82f6', fillColor: 'rgba(59,130,246,0.1)' },
  { key: 'sum_minutes', label: 'Time Spent', unit: 'min', color: 'text-violet-600', lineColor: '#7c3aed', fillColor: 'rgba(124,58,237,0.1)' },
  { key: 'pages_viewed', label: 'Pages Viewed', color: 'text-amber-600', lineColor: '#d97706', fillColor: 'rgba(217,119,6,0.1)' },
  { key: 'features_clicked', label: 'Features Clicked', color: 'text-rose-600', lineColor: '#e11d48', fillColor: 'rgba(225,29,72,0.1)' },
]

/* ── Helpers ── */
function filterByRange<T extends { date_day: string }>(items: T[], days: number): T[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return items.filter(d => new Date(d.date_day) >= cutoff)
}

function bucketWeekly(items: { date: string; value: number }[]): { date: string; value: number }[] {
  const map = new Map<string, number>()
  for (const d of items) {
    const dt = new Date(d.date)
    const weekStart = new Date(dt)
    weekStart.setDate(dt.getDate() - dt.getDay())
    const key = weekStart.toISOString().slice(0, 10)
    map.set(key, (map.get(key) || 0) + d.value)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }))
}

function formatYLabel(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  if (v % 1 !== 0) return v.toFixed(1)
  return String(Math.round(v))
}

function formatDate(d: string, short = false): string {
  const dt = new Date(d)
  if (short) return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

/* ── SVG Line/Area Chart ── */
function LineAreaChart({
  data,
  lineColor,
  fillColor,
  yLabel,
  unit,
  height = 140,
}: {
  data: { date: string; value: number }[]
  lineColor: string
  fillColor: string
  yLabel?: string
  unit?: string
  height?: number
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const { points, yTicks, xLabels } = useMemo(() => {
    if (!data.length) return { points: [], yTicks: [], xLabels: [] }
    const values = data.map(d => d.value)
    const rawMax = Math.max(...values)
    const rawMin = Math.min(...values, 0)
    const maxVal = rawMax <= 0 ? 10 : rawMax * 1.1
    const minVal = rawMin < 0 ? rawMin * 1.1 : 0

    const padL = 48, padR = 12, padT = 16, padB = 24
    const w = 100 // SVG viewbox percentage
    const chartW = w - padL - padR
    const chartH = height - padT - padB

    const points = data.map((d, i) => ({
      x: padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
      y: padT + chartH - ((d.value - minVal) / (maxVal - minVal || 1)) * chartH,
      date: d.date,
      value: d.value,
    }))

    const range = maxVal - minVal
    const step = range / 4
    const yTicks = Array.from({ length: 5 }, (_, i) => ({
      value: minVal + step * i,
      y: padT + chartH - (step * i / (maxVal - minVal || 1)) * chartH,
    }))

    const maxLabels = Math.min(data.length, 6)
    const xLabels: { label: string; x: number }[] = []
    if (data.length <= maxLabels) {
      data.forEach((d, i) => {
        xLabels.push({
          label: formatDate(d.date, true),
          x: padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
        })
      })
    } else {
      const step = (data.length - 1) / (maxLabels - 1)
      for (let i = 0; i < maxLabels; i++) {
        const idx = Math.round(i * step)
        xLabels.push({
          label: formatDate(data[idx].date, true),
          x: padL + (idx / (data.length - 1)) * chartW,
        })
      }
    }

    return { points, yTicks, xLabels }
  }, [data, height])

  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-xs text-slate-400" style={{ height }}>
        No data for selected period
      </div>
    )
  }

  const padL = 48, padT = 16, padB = 24
  const viewW = 100
  const chartH = height - padT - padB

  // Build smooth path (cubic bezier)
  const buildPath = () => {
    if (points.length < 2) return `M ${points[0].x} ${points[0].y}`
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]
      const tension = 0.3
      const cp1x = p1.x + (p2.x - p0.x) * tension
      const cp1y = p1.y + (p2.y - p0.y) * tension
      const cp2x = p2.x - (p3.x - p1.x) * tension
      const cp2y = p2.y - (p3.y - p1.y) * tension
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    return path
  }

  const linePath = buildPath()
  const lastPoint = points[points.length - 1]
  const firstPoint = points[0]
  const fillPath = `${linePath} L ${lastPoint.x} ${padT + chartH} L ${firstPoint.x} ${padT + chartH} Z`

  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox={`0 0 ${viewW} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={i} x1={padL} y1={t.y} x2={viewW - 12} y2={t.y}
            stroke="#e2e8f0" strokeWidth="0.2" strokeDasharray="1,1" />
        ))}

        {/* Fill */}
        <path d={fillPath} fill={fillColor} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="0.6" strokeLinecap="round" />

        {/* Hover dots + hit areas */}
        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - (viewW / points.length) / 2}
              y={padT}
              width={viewW / points.length}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
            />
            {hoveredIdx === i && (
              <>
                <line x1={p.x} y1={padT} x2={p.x} y2={padT + chartH}
                  stroke={lineColor} strokeWidth="0.2" strokeDasharray="0.5,0.5" />
                <circle cx={p.x} cy={p.y} r="1" fill={lineColor} stroke="white" strokeWidth="0.4" />
              </>
            )}
          </g>
        ))}
      </svg>

      {/* Y-axis labels (HTML overlay for crisp text) */}
      <div className="absolute left-0 top-0 bottom-0 w-12 pointer-events-none">
        {yTicks.map((t, i) => (
          <div key={i} className="absolute text-[9px] text-slate-400 text-right w-10 pr-1"
            style={{ top: `${(t.y / height) * 100}%`, transform: 'translateY(-50%)' }}>
            {formatYLabel(t.value)}
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-12 right-3 flex justify-between pointer-events-none">
        {xLabels.map((lbl, i) => (
          <span key={i} className="text-[8px] text-slate-400">{lbl.label}</span>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${(points[hoveredIdx].x / viewW) * 100}%`,
            top: `${(points[hoveredIdx].y / height) * 100}%`,
            transform: 'translate(-50%, -120%)',
          }}
        >
          <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
            <div className="font-medium">{formatDate(points[hoveredIdx].date)}</div>
            <div>{yLabel ? `${yLabel}: ` : ''}{formatYLabel(points[hoveredIdx].value)}{unit ? ` ${unit}` : ''}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Top Items List ── */
function TopItemsList({ items, valueKey, label }: { items: Record<string, unknown>[]; valueKey: string; label: string }) {
  if (!items.length) return <div className="text-xs text-slate-400 text-center py-3">No data</div>
  const maxVal = Math.max(...items.map(it => Number(it[valueKey]) || 0), 1)

  return (
    <div className="space-y-1.5">
      <h4 className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
        Top {label}
      </h4>
      {items.slice(0, 8).map((item, idx) => {
        const val = Number(item[valueKey]) || 0
        const pct = (val / maxVal) * 100
        return (
          <div key={idx} className="group">
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-slate-600 truncate max-w-[70%]" title={String(item.name || '')}>
                {String(item.name || 'Unknown')}
              </span>
              <span className="text-slate-800 font-semibold tabular-nums">{formatYLabel(val)}</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Trim leading zero-value entries so chart doesn't have left whitespace ── */
function trimLeadingZeros(items: { date: string; value: number }[]): { date: string; value: number }[] {
  const firstNonZero = items.findIndex(d => d.value > 0)
  if (firstNonZero <= 0) return items
  return items.slice(Math.max(0, firstNonZero - 1))
}

/* ── Aggregators for each tab ── */
function getAccountChartData(daily: PendoDailyMetric[], metric: AccountMetric, range: ViewRange): { date: string; value: number }[] {
  const rangeDays = VIEW_RANGES.find(r => r.key === range)?.days || 90
  const filtered = filterByRange(daily, rangeDays)
  const raw = filtered.map(d => ({ date: d.date_day, value: d[metric] }))
  if (range === '7d') return trimLeadingZeros(raw)
  return trimLeadingZeros(bucketWeekly(raw))
}

function getTabChartData(tabData: PendoTabData | undefined, valueKey: string, range: ViewRange): { date: string; value: number }[] {
  if (!tabData?.daily?.length) return []
  const rangeDays = VIEW_RANGES.find(r => r.key === range)?.days || 90
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - rangeDays)
  const filtered = tabData.daily.filter(d => new Date(String(d.date_day)) >= cutoff)

  // Aggregate by date
  const map = new Map<string, number>()
  for (const d of filtered) {
    const day = String(d.date_day)
    map.set(day, (map.get(day) || 0) + (Number(d[valueKey]) || 0))
  }
  const raw = Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }))
  if (range === '7d') return trimLeadingZeros(raw)
  return trimLeadingZeros(bucketWeekly(raw))
}

/* ── Main Widget ── */
export function UsageTrendWidget({ data, isLoading, onHide, collapsed, onCollapsedChange }: UsageTrendWidgetProps) {
  const [activeTab, setActiveTab] = useState<PendoTab>('account')
  const [viewRange, setViewRange] = useState<ViewRange>('90d')
  const [accountMetric, setAccountMetric] = useState<AccountMetric>('active_visitors')
  const [visitorMetric, setVisitorMetric] = useState<VisitorMetric>('unique_visitors')

  const hasPendo = data?.has_pendo_data && data.pendo_daily && data.pendo_daily.length > 0

  const summaryCards = useMemo(() => {
    if (!data?.pendo_summary) return []
    const s = data.pendo_summary
    return [
      { label: 'Active Users', value: s.current_active_visitors, change: s.visitors_change_pct, icon: Users, color: 'text-blue-600' },
      { label: 'Time Spent', value: s.current_minutes, change: s.minutes_change_pct, icon: Clock, color: 'text-violet-600', fmt: (v: number) => v >= 60 ? `${(v / 60).toFixed(1)}h` : `${Math.round(v)}m` },
      { label: 'Avg Min/User', value: s.current_active_visitors > 0 ? Math.round(s.current_minutes / s.current_active_visitors * 10) / 10 : 0, change: s.events_change_pct, icon: MousePointerClick, color: 'text-emerald-600', fmt: (v: number) => `${v.toFixed(1)}m` },
    ]
  }, [data?.pendo_summary])

  const accountChart = useMemo(
    () => getAccountChartData(data?.pendo_daily || [], accountMetric, viewRange),
    [data?.pendo_daily, accountMetric, viewRange]
  )
  const metricCfg = ACCOUNT_METRICS.find(m => m.key === accountMetric) || ACCOUNT_METRICS[0]

  const featureChart = useMemo(
    () => getTabChartData(data?.pendo_features, 'clicks', viewRange),
    [data?.pendo_features, viewRange]
  )
  const visitorChart = useMemo(
    () => getTabChartData(data?.pendo_visitors, visitorMetric, viewRange),
    [data?.pendo_visitors, visitorMetric, viewRange]
  )
  const visitorMetricCfg = VISITOR_METRICS.find(m => m.key === visitorMetric) || VISITOR_METRICS[0]
  const pageChart = useMemo(
    () => getTabChartData(data?.pendo_pages, 'views', viewRange),
    [data?.pendo_pages, viewRange]
  )

  const renderAccountTab = useCallback(() => (
    <div className="space-y-3">
      {/* Metric pills */}
      <div className="flex flex-wrap gap-1">
        {ACCOUNT_METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setAccountMetric(m.key)}
            className={clsx(
              'px-2 py-0.5 rounded-full text-[10px] font-medium transition-all',
              accountMetric === m.key
                ? `bg-slate-800 text-white`
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <LineAreaChart
        data={accountChart}
        lineColor={metricCfg.lineColor}
        fillColor={metricCfg.fillColor}
        yLabel={metricCfg.label}
        unit={metricCfg.unit}
      />
    </div>
  ), [accountChart, accountMetric, metricCfg])

  const renderFeaturesTab = useCallback(() => (
    <div className="space-y-3">
      <LineAreaChart
        data={featureChart}
        lineColor="#e11d48"
        fillColor="rgba(225,29,72,0.08)"
        yLabel="Clicks"
      />
      {data?.pendo_features?.top_items && (
        <TopItemsList items={data.pendo_features.top_items} valueKey="clicks" label="Features" />
      )}
    </div>
  ), [featureChart, data?.pendo_features])

  const renderVisitorsTab = useCallback(() => {
    const visitors = data?.pendo_visitors?.top_items || []
    return (
      <div className="space-y-3">
        {/* Metric pills */}
        <div className="flex flex-wrap gap-1">
          {VISITOR_METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => setVisitorMetric(m.key)}
              className={clsx(
                'px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors',
                visitorMetric === m.key
                  ? `${m.color} bg-current/10 ring-1 ring-current/20`
                  : 'text-slate-400 hover:text-slate-600 bg-slate-50'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <LineAreaChart
          data={visitorChart}
          lineColor={visitorMetricCfg.lineColor}
          fillColor={visitorMetricCfg.fillColor}
          yLabel={visitorMetricCfg.label}
          unit={visitorMetricCfg.unit}
        />
        {/* Visitor breakdown table */}
        {visitors.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Top Visitors ({visitors.length})
            </div>
            <div className="max-h-[180px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-slate-400 font-semibold border-b border-slate-100">
                    <th className="py-1.5 pr-2">Visitor</th>
                    <th className="py-1.5 px-2 text-right">Last Active</th>
                    <th className="py-1.5 px-2 text-right">Time</th>
                    <th className="py-1.5 px-2 text-right">Days</th>
                    <th className="py-1.5 px-2 text-right">Pages</th>
                    <th className="py-1.5 pl-2 text-right">Features</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v: Record<string, unknown>, i: number) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-1.5 pr-2 text-slate-600 font-mono truncate max-w-[120px]" title={String(v.visitor_id || '')}>
                        User {i + 1}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-500">
                        {v.last_active ? new Date(String(v.last_active)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-700 font-medium">
                        {Number(v.total_minutes || 0) >= 60
                          ? `${(Number(v.total_minutes) / 60).toFixed(1)}h`
                          : `${Math.round(Number(v.total_minutes || 0))}m`}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-500">{String(v.active_days || 0)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-500">{String(v.total_pages || 0)}</td>
                      <td className="py-1.5 pl-2 text-right text-slate-500">{String(v.total_features || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }, [visitorChart, visitorMetric, visitorMetricCfg, data?.pendo_visitors])

  const renderPagesTab = useCallback(() => (
    <div className="space-y-3">
      <LineAreaChart
        data={pageChart}
        lineColor="#d97706"
        fillColor="rgba(217,119,6,0.08)"
        yLabel="Views"
      />
      {data?.pendo_pages?.top_items && (
        <TopItemsList items={data.pendo_pages.top_items} valueKey="views" label="Pages" />
      )}
    </div>
  ), [pageChart, data?.pendo_pages])

  return (
    <BaseWidget
      title="Product Usage — Pendo"
      icon={<BarChart3 className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      {data && (
        <div className="p-4 space-y-3">
          {!hasPendo ? (
            <div className="py-6 px-4">
              <div className="flex items-start gap-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Product Usage Data Available</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    This account does not have Pendo usage tracking linked. This could be due to:
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-500 mb-4">
                    <li className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                      <span><span className="font-medium text-slate-600">On-premise deployment</span> — The customer may be running an on-prem instance that does not send telemetry to Pendo.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                      <span><span className="font-medium text-slate-600">Opted out of tracking</span> — The customer may have opted out of product usage data collection.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                      <span><span className="font-medium text-slate-600">Account not mapped</span> — The Pendo account may not yet be linked to this customer record in our system.</span>
                    </li>
                  </ul>
                  <p className="text-[11px] text-slate-400">
                    Questions? Contact <a href="mailto:dan.crosley@ifs.com" className="text-primary hover:underline font-medium">dan.crosley@ifs.com</a>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards (30d vs prior 30d) */}
              <div className="grid grid-cols-3 gap-2">
                {summaryCards.map((card, i) => {
                  const Icon = card.icon
                  return (
                    <div key={i} className="p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Icon className={clsx('w-3 h-3', card.color)} />
                        <span className="text-[9px] text-slate-500 uppercase font-medium">{card.label}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {card.fmt ? card.fmt(card.value) : Math.round(card.value).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-0.5">
                        {card.change > 0 ? (
                          <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                        ) : card.change < 0 ? (
                          <TrendingDown className="w-2.5 h-2.5 text-rose-500" />
                        ) : (
                          <Minus className="w-2.5 h-2.5 text-slate-400" />
                        )}
                        <span className={clsx(
                          'text-[9px] font-semibold',
                          card.change > 0 ? 'text-emerald-600' : card.change < 0 ? 'text-rose-600' : 'text-slate-400'
                        )}>
                          {card.change > 0 ? '+' : ''}{card.change.toFixed(1)}%
                        </span>
                        <span className="text-[8px] text-slate-400">30d</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Tabs + Range */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-0">
                <div className="flex">
                  {TAB_CONFIG.map(tab => {
                    const Icon = tab.icon
                    return (
                      <div key={tab.key} className="relative group/tab">
                        <button
                          onClick={() => setActiveTab(tab.key)}
                          className={clsx(
                            'flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border-b-2 transition-all -mb-[1px]',
                            activeTab === tab.key
                              ? 'border-slate-800 text-slate-800'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {tab.label}
                        </button>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 w-56 px-3 py-2 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg shadow-xl opacity-0 pointer-events-none group-hover/tab:opacity-100 transition-opacity duration-150">
                          <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-slate-800 rotate-45" />
                          {tab.tooltip}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center bg-slate-100 rounded-md p-0.5">
                  {VIEW_RANGES.map(r => (
                    <button
                      key={r.key}
                      onClick={() => setViewRange(r.key)}
                      className={clsx(
                        'px-2 py-0.5 text-[10px] font-medium rounded transition-all',
                        viewRange === r.key
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="min-h-[160px]">
                {activeTab === 'account' && renderAccountTab()}
                {activeTab === 'features' && renderFeaturesTab()}
                {activeTab === 'visitors' && renderVisitorsTab()}
                {activeTab === 'pages' && renderPagesTab()}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[9px] text-slate-400">
                  {data.pendo_summary?.total_data_days || 0} days · {data.pendo_summary?.pendo_account_ids?.length || 0} Pendo account(s)
                </span>
                <span className="text-[9px] text-slate-400">Source: Pendo</span>
              </div>
            </>
          )}
        </div>
      )}
    </BaseWidget>
  )
}
