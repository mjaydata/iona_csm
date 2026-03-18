import { useState, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Loader2, Shield, AlertTriangle, XCircle, Search, X } from 'lucide-react'
import { getHealthChanges, type HealthChangeDay, type AccountMovement } from '../services/api'
import { healthLabel } from '../utils/healthLabels'
import { clsx } from 'clsx'

interface HealthDistributionProps {
  onBack: () => void
  onAccountClick?: (accountId: string) => void
  accountType?: string
}

type Period = 7 | 30 | 90 | 365

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function DeltaBadge({ value, invert = false }: { value: number; invert?: boolean }) {
  if (value === 0) return <span className="text-[10px] text-slate-400 font-medium">—</span>
  const isPositive = invert ? value < 0 : value > 0
  return (
    <span className={clsx(
      'text-[10px] font-bold',
      isPositive ? 'text-emerald-600' : 'text-rose-600'
    )}>
      {value > 0 ? '+' : ''}{value}
    </span>
  )
}

function StackedAreaChart({ days, period }: { days: HealthChangeDay[]; period: Period }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const filtered = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - period)
    return days.filter(d => new Date(d.date + 'T00:00:00') >= cutoff)
  }, [days, period])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || filtered.length < 2) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * 800
    const PAD_L = 40, PAD_R = 10
    const chartW = 800 - PAD_L - PAD_R
    const relX = mouseX - PAD_L
    if (relX < 0 || relX > chartW) { setHoverIdx(null); return }
    const idx = Math.round((relX / chartW) * (filtered.length - 1))
    setHoverIdx(Math.max(0, Math.min(filtered.length - 1, idx)))
  }, [filtered])

  if (filtered.length < 2) {
    return <div className="h-52 flex items-center justify-center text-sm text-slate-400">Not enough data for chart</div>
  }

  const W = 800, H = 220
  const PAD_L = 40, PAD_R = 10, PAD_T = 15, PAD_B = 30
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const maxTotal = Math.max(...filtered.map(d => d.good + d.at_risk + d.critical), 1)
  const yScale = (v: number) => PAD_T + chartH - (v / maxTotal) * chartH
  const xScale = (i: number) => PAD_L + (i / (filtered.length - 1)) * chartW

  const points = filtered.map((d, i) => ({
    x: xScale(i),
    critY: yScale(d.good + d.at_risk + d.critical),
    riskY: yScale(d.good + d.at_risk),
    goodY: yScale(d.good),
    baseY: yScale(0),
    hasMovements: (d.improved?.length || 0) + (d.worsened?.length || 0) > 0,
  }))

  const smoothPath = (pts: {x:number;y:number}[]) => {
    if (pts.length < 2) return ''
    let d = `M${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i]
      const cpx = (prev.x + curr.x) / 2
      d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
    }
    return d
  }

  const critTop = points.map(p => ({ x: p.x, y: p.critY }))
  const critBot = [...points].reverse().map(p => ({ x: p.x, y: p.riskY }))
  const riskTop = points.map(p => ({ x: p.x, y: p.riskY }))
  const riskBot = [...points].reverse().map(p => ({ x: p.x, y: p.goodY }))
  const goodTop = points.map(p => ({ x: p.x, y: p.goodY }))
  const goodBot = [...points].reverse().map(p => ({ x: p.x, y: p.baseY }))

  const makeFill = (top: {x:number;y:number}[], bot: {x:number;y:number}[]) =>
    smoothPath(top) + ` L${bot[0].x},${bot[0].y}` + smoothPath(bot).replace('M', ' L') + ' Z'

  const yTicks = [0, Math.round(maxTotal / 2), maxTotal]
  const labelInterval = Math.max(1, Math.floor(filtered.length / 6))

  const hd = hoverIdx !== null ? filtered[hoverIdx] : null

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yScale(v)} y2={yScale(v)} stroke="#f1f5f9" strokeWidth="0.8" />
            <text x={PAD_L - 6} y={yScale(v) + 3} textAnchor="end" className="fill-slate-400" fontSize="9">{v}</text>
          </g>
        ))}

        <path d={makeFill(critTop, critBot)} fill="#f43f5e" opacity="0.6" />
        <path d={makeFill(riskTop, riskBot)} fill="#fbbf24" opacity="0.6" />
        <path d={makeFill(goodTop, goodBot)} fill="#10b981" opacity="0.55" />

        <path d={smoothPath(critTop)} fill="none" stroke="#e11d48" strokeWidth="1.5" opacity="0.8" />
        <path d={smoothPath(riskTop)} fill="none" stroke="#d97706" strokeWidth="1" opacity="0.6" />
        <path d={smoothPath(goodTop)} fill="none" stroke="#059669" strokeWidth="1" opacity="0.6" />

        {points.map((p, i) => p.hasMovements && (
          <circle key={i} cx={p.x} cy={p.critY - 4} r="2.5" fill="#6366f1" opacity="0.7" />
        ))}

        {filtered.map((d, i) => {
          if (i % labelInterval !== 0 && i !== filtered.length - 1) return null
          return (
            <text key={d.date} x={xScale(i)} y={H - 6} textAnchor="middle" className="fill-slate-400" fontSize="8">
              {formatDate(d.date)}
            </text>
          )
        })}

        {hoverIdx !== null && (
          <>
            <line x1={points[hoverIdx].x} x2={points[hoverIdx].x} y1={PAD_T} y2={H - PAD_B} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3,2" />
            <circle cx={points[hoverIdx].x} cy={points[hoverIdx].critY} r="3" fill="#e11d48" stroke="white" strokeWidth="1.5" />
            <circle cx={points[hoverIdx].x} cy={points[hoverIdx].riskY} r="3" fill="#d97706" stroke="white" strokeWidth="1.5" />
            <circle cx={points[hoverIdx].x} cy={points[hoverIdx].goodY} r="3" fill="#059669" stroke="white" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {hd && hoverIdx !== null && (
        <div
          className="absolute bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 pointer-events-none z-10"
          style={{
            left: `${(points[hoverIdx].x / W) * 100}%`,
            top: '8px',
            transform: hoverIdx > filtered.length / 2 ? 'translateX(-110%)' : 'translateX(10%)',
          }}
        >
          <p className="text-[11px] font-semibold text-slate-700 mb-1">{formatDate(hd.date)}</p>
          <div className="space-y-0.5 text-[10px]">
            <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> Healthy: <span className="font-bold text-slate-700">{hd.good}</span></p>
            <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> Needs Attention: <span className="font-bold text-slate-700">{hd.at_risk}</span></p>
            <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" /> At Risk: <span className="font-bold text-slate-700">{hd.critical}</span></p>
          </div>
          {(hd.improved.length + hd.worsened.length) > 0 && (
            <p className="text-[9px] text-slate-400 mt-1 border-t border-slate-100 pt-1">
              {hd.improved.length > 0 && <span className="text-emerald-500">{hd.improved.length} improved</span>}
              {hd.improved.length > 0 && hd.worsened.length > 0 && ' · '}
              {hd.worsened.length > 0 && <span className="text-rose-500">{hd.worsened.length} worsened</span>}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function MiniSparkline({ scores, improved }: { scores: number[]; improved: boolean }) {
  if (scores.length < 2) return null
  const W = 64, H = 22, PAD = 2
  const min = Math.min(...scores) - 2
  const max = Math.max(...scores) + 2
  const range = max - min || 1
  const pts = scores.map((s, i) => ({
    x: PAD + (i / (scores.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (s - min) / range) * (H - PAD * 2),
  }))
  const pathD = pts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`
    const prev = pts[i - 1]
    const cpx = (prev.x + p.x) / 2
    return `C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`
  }).join(' ')
  const color = improved ? '#10b981' : '#f43f5e'
  const last = pts[pts.length - 1]
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <circle cx={last.x} cy={last.y} r="2" fill={color} />
    </svg>
  )
}

function MovementCard({ m, onClick }: { m: AccountMovement; onClick?: () => void }) {
  const delta = m.curr_score - m.prev_score
  const improved = delta > 0
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group"
    >
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5',
        m.curr_category === 'Good' ? 'bg-emerald-100 text-emerald-700' :
        m.curr_category === 'At Risk' ? 'bg-amber-100 text-amber-700' :
        'bg-rose-100 text-rose-700'
      )}>
        {m.curr_score}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700 truncate group-hover:text-primary-600 transition-colors">{m.account_name}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {m.recent_scores?.length >= 2 && (
              <MiniSparkline scores={m.recent_scores} improved={improved} />
            )}
            <div className="flex items-center gap-1">
              {improved ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-rose-500" />}
              <span className={clsx('text-xs font-bold', improved ? 'text-emerald-600' : 'text-rose-600')}>
                {delta > 0 ? '+' : ''}{delta}
              </span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          <span className="font-medium">{m.prev_score}</span> {healthLabel(m.prev_category)} → <span className="font-medium">{m.curr_score}</span> {healthLabel(m.curr_category)}
        </p>
        {m.explanation && (
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed italic">{m.explanation}</p>
        )}
      </div>
    </button>
  )
}

function DaySection({ day, index, onAccountClick, searchFilter }: { day: HealthChangeDay; index: number; onAccountClick?: (id: string) => void; searchFilter: string }) {
  const [expanded, setExpanded] = useState(index === 0)

  const filterMovements = (list: AccountMovement[]) => {
    if (!searchFilter) return list
    const q = searchFilter.toLowerCase()
    return list.filter(m => m.account_name.toLowerCase().includes(q))
  }

  const filteredImproved = filterMovements(day.improved)
  const filteredWorsened = filterMovements(day.worsened)
  const totalFiltered = filteredImproved.length + filteredWorsened.length
  const totalMovements = day.improved.length + day.worsened.length

  if (!day.prev_date) return null
  if (searchFilter && totalFiltered === 0) return null

  const summaryParts: string[] = []
  if (day.improved.length > 0) summaryParts.push(`${day.improved.length} improved`)
  if (day.worsened.length > 0) summaryParts.push(`${day.worsened.length} worsened`)
  if (totalMovements === 0) summaryParts.push('no changes')

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50/50 transition-colors text-left"
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        }
        <span className="text-sm font-medium text-slate-700">
          {formatDate(day.date)} vs {formatDate(day.prev_date!)}
        </span>
        <span className="text-[11px] text-slate-400 flex-1">{summaryParts.join(', ')}</span>
        {totalMovements > 0 && (
          <span className={clsx(
            'text-[10px] font-bold px-1.5 py-0.5 rounded',
            day.improved.length > day.worsened.length ? 'bg-emerald-50 text-emerald-600' :
            day.worsened.length > day.improved.length ? 'bg-rose-50 text-rose-600' :
            'bg-slate-50 text-slate-500'
          )}>
            {searchFilter ? `${totalFiltered}/${totalMovements}` : totalMovements}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {totalFiltered === 0 && totalMovements === 0 ? (
            <p className="text-xs text-slate-400 italic pl-6">No accounts changed health category this day.</p>
          ) : totalFiltered === 0 && searchFilter ? (
            <p className="text-xs text-slate-400 italic pl-6">No matches for "{searchFilter}" this day.</p>
          ) : (
            <>
              {filteredWorsened.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5 pl-1">
                    <TrendingDown className="w-3 h-3 text-rose-500" />
                    <span className="text-[11px] font-semibold text-rose-600">Worsened ({filteredWorsened.length})</span>
                  </div>
                  <div className="space-y-0.5 bg-rose-50/30 rounded-lg py-1">
                    {filteredWorsened.map(m => (
                      <MovementCard key={m.account_id} m={m} onClick={onAccountClick ? () => onAccountClick(m.account_id) : undefined} />
                    ))}
                  </div>
                </div>
              )}
              {filteredImproved.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5 pl-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-[11px] font-semibold text-emerald-600">Improved ({filteredImproved.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {filteredImproved.map(m => (
                      <MovementCard key={m.account_id} m={m} onClick={onAccountClick ? () => onAccountClick(m.account_id) : undefined} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function HealthDistribution({ onAccountClick, accountType }: HealthDistributionProps) {
  const [period, setPeriod] = useState<Period>(30)
  const [accountSearch, setAccountSearch] = useState('')

  const acctParam = accountType && accountType !== 'all' ? accountType : undefined
  const { data, isLoading } = useQuery({
    queryKey: ['health-changes', period, acctParam],
    queryFn: () => getHealthChanges(period, acctParam),
    staleTime: 5 * 60 * 1000,
  })

  const days = data?.days ?? []
  const todayDelta = data?.today_delta
  const today = days[0]

  const periods: { value: Period; label: string }[] = [
    { value: 7, label: '7D' },
    { value: 30, label: '30D' },
    { value: 90, label: '90D' },
    { value: 365, label: '1Y' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Healthy', value: today?.good ?? 0, delta: todayDelta?.good, icon: Shield, color: 'emerald', bg: 'bg-emerald-50' },
          { label: 'Needs Attention', value: today?.at_risk ?? 0, delta: todayDelta?.at_risk, icon: AlertTriangle, color: 'amber', bg: 'bg-amber-50', invertDelta: true },
          { label: 'At Risk', value: today?.critical ?? 0, delta: todayDelta?.critical, icon: XCircle, color: 'rose', bg: 'bg-rose-50', invertDelta: true },
        ].map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', card.bg)}>
                    <Icon className={clsx('w-4 h-4', `text-${card.color}-500`)} />
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</span>
                </div>
                {card.delta !== undefined && <DeltaBadge value={card.delta} invert={card.invertDelta} />}
              </div>
              {isLoading ? (
                <div className="h-8 w-16 bg-slate-100 rounded animate-pulse" />
              ) : (
                <h3 className={clsx('text-2xl font-bold', `text-${card.color}-600`)}>{card.value}</h3>
              )}
            </div>
          )
        })}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Health Distribution Over Time</h3>
          <div className="flex items-center gap-1">
            {periods.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={clsx(
                  'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                  period === p.value ? 'bg-primary-50 text-primary-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 mb-2">
          <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Healthy</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Needs Attention</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> At Risk</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-2"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> Movement day</span>
        </div>
        {isLoading ? (
          <div className="h-52 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        ) : (
          <StackedAreaChart days={days} period={period} />
        )}
      </div>

      {/* Daily Changes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Daily Changes</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Accounts that changed health category day-over-day</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by account..."
                value={accountSearch}
                onChange={e => setAccountSearch(e.target.value)}
                className="pl-7 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 placeholder:text-slate-300"
              />
              {accountSearch && (
                <button onClick={() => setAccountSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        ) : days.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No health history data available</div>
        ) : (
          <div>
            {days.filter(d => d.prev_date).map((day, i) => (
              <DaySection key={day.date} day={day} index={i} onAccountClick={onAccountClick} searchFilter={accountSearch} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
