import { useState, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  Briefcase,
  Building,
  Loader2,
  ArrowRightLeft,
  History,
  User,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { CSM } from '../types'
import type { CSMAssignmentRecord } from '../services/api'
import {
  updateCSMAssignmentHistory,
  deleteCSMAssignmentHistory,
  createCSMAssignmentHistory,
  getDistinctCsmNamesFromHistory,
  getCSMs,
} from '../services/api'
import { useCSMProfile, useCSMAssignmentHistory } from '../hooks/useCSM'

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso || iso === '-') return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

function fromDatetimeLocal(s: string): string {
  return new Date(s).toISOString()
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr || '—'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return dateStr || '—' }
}

function formatTenure(months: number): string {
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years === 0) return `${remainingMonths} months`
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`
  return `${years}y ${remainingMonths}m`
}

function formatDays(days: number | null): string {
  if (days == null || days <= 0) return '—'
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30.44)}mo`
  const y = Math.floor(days / 365)
  const m = Math.round((days % 365) / 30.44)
  return m > 0 ? `${y}y ${m}mo` : `${y}y`
}

function ProfileStatCard({ 
  icon: Icon, label, value, subValue, color = 'slate'
}: { 
  icon: typeof Users; label: string; value: string | number; subValue?: string
  color?: 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'violet'
}) {
  const colorClasses = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
    blue: 'bg-blue-100 text-blue-600',
    violet: 'bg-violet-100 text-violet-600',
  }
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={clsx('w-6 h-6 rounded flex items-center justify-center', colorClasses[color])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-slate-800">{value}</span>
        {subValue && <span className="text-xs text-slate-500">{subValue}</span>}
      </div>
    </div>
  )
}

// ── Monthly data point for the chart ──
interface MonthlyPoint {
  label: string
  year: number
  month: number
  cumulative: number
  received: number
  handedOff: number
  net: number
}

function buildMonthlyTimeline(records: CSMAssignmentRecord[]): MonthlyPoint[] {
  if (!records.length) return []

  const parseMonth = (dateStr: string | null): { y: number; m: number } | null => {
    if (!dateStr || dateStr === '-' || dateStr === 'null' || dateStr === 'None') return null
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return null
      return { y: d.getFullYear(), m: d.getMonth() + 1 }
    } catch { return null }
  }

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  let minDate: { y: number; m: number } | null = null
  const maxDate: { y: number; m: number } = { y: new Date().getFullYear(), m: new Date().getMonth() + 1 }

  for (const r of records) {
    const d = parseMonth(r.assigned_from)
    if (d && (!minDate || d.y < minDate.y || (d.y === minDate.y && d.m < minDate.m))) {
      minDate = d
    }
  }
  if (!minDate) minDate = { y: maxDate.y - 1, m: maxDate.m }

  // Ensure at least 6 months of range so the chart is meaningful
  const minTotal = minDate.y * 12 + minDate.m
  const maxTotal = maxDate.y * 12 + maxDate.m
  if (maxTotal - minTotal < 6) {
    const adjusted = minTotal - (6 - (maxTotal - minTotal))
    minDate = { y: Math.floor((adjusted - 1) / 12), m: ((adjusted - 1) % 12) + 1 }
  }

  const key = (yr: number, mo: number) => `${yr}-${String(mo).padStart(2, '0')}`
  const received: Record<string, number> = {}
  const handedOff: Record<string, number> = {}

  for (const r of records) {
    const d = parseMonth(r.assigned_from)
    if (d) received[key(d.y, d.m)] = (received[key(d.y, d.m)] || 0) + 1

    if (r.status === 'Handed Off') {
      const u = parseMonth(r.assigned_until)
      if (u) handedOff[key(u.y, u.m)] = (handedOff[key(u.y, u.m)] || 0) + 1
    }
  }

  const points: MonthlyPoint[] = []
  let cumulative = 0
  let y = minDate.y, m = minDate.m
  while (y < maxDate.y || (y === maxDate.y && m <= maxDate.m)) {
    const k = key(y, m)
    const recv = received[k] || 0
    const left = handedOff[k] || 0
    cumulative += recv - left
    points.push({
      label: `${monthLabels[m - 1]} ${y}`,
      year: y, month: m,
      cumulative: Math.max(cumulative, 0),
      received: recv, handedOff: left,
      net: recv - left,
    })
    m++
    if (m > 12) { m = 1; y++ }
  }
  return points
}

// ── Assignment Chart (SVG, Customer Growth style) ──
function AssignmentChart({ data, hoveredIndex, onHover }: {
  data: MonthlyPoint[]
  hoveredIndex: number | null
  onHover: (idx: number | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  if (data.length < 1) return null

  // Pad single-point data so we can still draw a line
  const chartData = data.length === 1 ? [{ ...data[0], cumulative: 0, received: 0, handedOff: 0, net: 0 }, data[0]] : data

  const W = 900
  const lineH = 180
  const barH = 55
  const gapY = 10
  const totalH = lineH + gapY + barH
  const padX = 30
  const padYTop = 14
  const padYBot = 4

  const values = chartData.map(d => d.cumulative)
  const minVal = Math.min(...values) * 0.95
  const maxVal = Math.max(...values) * 1.05
  const valRange = maxVal - minVal || 1

  const linePoints = chartData.map((_, i) => ({
    x: padX + (i / Math.max(chartData.length - 1, 1)) * (W - 2 * padX),
    y: padYTop + (1 - (values[i] - minVal) / valRange) * (lineH - padYTop - padYBot),
  }))

  let linePath = `M ${linePoints[0].x} ${linePoints[0].y}`
  for (let i = 1; i < linePoints.length; i++) {
    const prev = linePoints[i - 1]
    const curr = linePoints[i]
    const cpx = (prev.x + curr.x) / 2
    linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  const areaPath = `${linePath} L ${linePoints[linePoints.length - 1].x} ${lineH} L ${linePoints[0].x} ${lineH} Z`

  const segments: { path: string; color: string }[] = []
  for (let i = 0; i < linePoints.length - 1; i++) {
    const prev = linePoints[i]
    const curr = linePoints[i + 1]
    const cpx = (prev.x + curr.x) / 2
    const isUp = chartData[i + 1].net >= 0
    segments.push({
      path: `M ${prev.x} ${prev.y} C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`,
      color: isUp ? '#10b981' : '#f43f5e',
    })
  }

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const step = Math.ceil(valRange / 4 / 5) * 5 || 1
    const ticks: number[] = []
    let v = Math.floor(minVal / step) * step
    while (v <= maxVal + step) {
      if (v >= minVal && v <= maxVal) ticks.push(v)
      v += step
    }
    return ticks.length ? ticks : [Math.round(minVal), Math.round(maxVal)]
  }, [minVal, maxVal, valRange])

  // Bar data
  const barTop = lineH + gapY
  const maxBarVal = Math.max(...chartData.map(d => Math.max(d.received, d.handedOff)), 1)
  const barMid = barTop + barH / 2
  const maxBarH = barH / 2 - 4
  const barGap = (W - 2 * padX) / Math.max(chartData.length, 1)
  const barW = Math.min(10, barGap * 0.55)

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !containerRef.current) return
    const svgRect = svgRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    const relX = e.clientX - svgRect.left
    const ratio = (relX - (padX / W) * svgRect.width) / (svgRect.width * (1 - 2 * padX / W))
    const idx = Math.round(Math.max(0, Math.min(chartData.length - 1, ratio * (chartData.length - 1))))
    if (idx >= 0 && idx < chartData.length) {
      onHover(idx)
      setTooltipPos({ x: e.clientX - containerRect.left, y: e.clientY - containerRect.top })
    }
  }, [chartData.length, onHover])

  const handleMouseLeave = useCallback(() => { onHover(null); setTooltipPos(null) }, [onHover])

  const hovPt = hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < chartData.length ? chartData[hoveredIndex] : null

  return (
    <div ref={containerRef} className="relative bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Portfolio Over Time</h3>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${totalH}`}
        className="w-full"
        style={{ height: 'auto', maxHeight: 260 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Y-axis */}
        {yTicks.map(v => {
          const y = padYTop + (1 - (v - minVal) / valRange) * (lineH - padYTop - padYBot)
          return (
            <g key={v}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padX - 6} y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-medium">{v}</text>
            </g>
          )
        })}

        {/* Area + line */}
        <defs>
          <linearGradient id="areaGradCSM" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGradCSM)" />
        {segments.map((seg, i) => (
          <path key={i} d={seg.path} fill="none" stroke={seg.color} strokeWidth="2.5" strokeLinecap="round" />
        ))}

        {/* Bars */}
        {chartData.map((pt, i) => {
          const cx = padX + (i / Math.max(chartData.length - 1, 1)) * (W - 2 * padX)
          const isHov = hoveredIndex === i
          const recvH = (pt.received / maxBarVal) * maxBarH
          const leftH = (pt.handedOff / maxBarVal) * maxBarH
          return (
            <g key={i}>
              {pt.received > 0 && (
                <rect x={cx - barW / 2} y={barMid - recvH} width={barW} height={recvH} rx={2}
                  fill={isHov ? '#059669' : '#10b981'} opacity={isHov ? 1 : 0.7} />
              )}
              {pt.handedOff > 0 && (
                <rect x={cx - barW / 2} y={barMid} width={barW} height={leftH} rx={2}
                  fill={isHov ? '#e11d48' : '#f43f5e'} opacity={isHov ? 1 : 0.7} />
              )}
            </g>
          )
        })}

        {/* Hover crosshair + dot */}
        {hoveredIndex !== null && linePoints[hoveredIndex] && (
          <>
            <line x1={linePoints[hoveredIndex].x} y1={0} x2={linePoints[hoveredIndex].x} y2={totalH}
              stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx={linePoints[hoveredIndex].x} cy={linePoints[hoveredIndex].y} r="5"
              fill="white" stroke="#3c83f6" strokeWidth="2.5" />
          </>
        )}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-1" style={{ paddingLeft: `${(padX / W) * 100}%`, paddingRight: `${(padX / W) * 100}%` }}>
        {chartData.filter((_, i) => i % Math.max(1, Math.floor(chartData.length / 7)) === 0 || i === chartData.length - 1).map(pt => (
          <span key={`${pt.year}-${pt.month}`} className="text-[9px] text-slate-400 font-medium">{pt.label}</span>
        ))}
      </div>

      {/* Tooltip */}
      {tooltipPos && hovPt && (
        <div className="absolute z-50 pointer-events-none"
          style={{ left: tooltipPos.x, top: Math.max(8, tooltipPos.y - 100), transform: 'translateX(-50%)' }}>
          <div className="bg-slate-900/95 backdrop-blur-sm text-white rounded-xl px-4 py-3 shadow-2xl text-xs min-w-[170px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[12px]">{hovPt.label}</span>
              <span className="text-[11px] font-bold text-blue-300">{hovPt.cumulative} accounts</span>
            </div>
            {hovPt.received > 0 && (
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 text-[11px]">+{hovPt.received} received</span>
              </div>
            )}
            {hovPt.handedOff > 0 && (
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span className="text-rose-400 text-[11px]">-{hovPt.handedOff} handed off</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/60 mt-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Net</span>
              <span className={clsx('font-bold text-[12px]',
                hovPt.net > 0 ? 'text-emerald-400' : hovPt.net < 0 ? 'text-rose-400' : 'text-slate-400'
              )}>{hovPt.net > 0 ? '+' : ''}{hovPt.net}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type AssignmentDialogState =
  | null
  | { mode: 'add' }
  | { mode: 'edit'; record: CSMAssignmentRecord }

function resolveHandoffIdFromName(name: string, csms: { id: string; name: string }[]): string | null {
  const t = name.trim().toLowerCase()
  if (!t) return null
  const m = csms.find(c => c.name.trim().toLowerCase() === t)
  return m?.id ?? null
}

// ── Events Table ──
function AssignmentEventsTable({ records, statusFilter, onStatusFilter, csmId, csmName }: {
  records: CSMAssignmentRecord[]
  statusFilter: string | null
  onStatusFilter: (f: string | null) => void
  csmId: string
  csmName: string
}) {
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<AssignmentDialogState>(null)
  const [form, setForm] = useState({
    account_name: '',
    handed_off_from: '',
    assigned_from: '',
    assigned_until: '',
    openEnded: true,
    status: 'Current' as string,
  })

  const { data: distinctNames = [] } = useQuery({
    queryKey: ['csm-assignment-history-distinct-names'],
    queryFn: getDistinctCsmNamesFromHistory,
    staleTime: 5 * 60 * 1000,
  })

  const { data: csmsResponse } = useQuery({
    queryKey: ['csms', 'handoff-lookup'],
    queryFn: () => getCSMs({}),
    staleTime: 5 * 60 * 1000,
  })
  const csms = csmsResponse?.csms ?? []

  const nameOptions = useMemo(() => {
    const s = new Set<string>(distinctNames)
    for (const r of records) {
      if (r.handed_off_from?.trim()) s.add(r.handed_off_from.trim())
      if (r.csm_name?.trim()) s.add(r.csm_name.trim())
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [distinctNames, records])

  const closeDialog = useCallback(() => setDialog(null), [])

  const updateMut = useMutation({
    mutationFn: updateCSMAssignmentHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csm-assignment-history', csmId] })
      queryClient.invalidateQueries({ queryKey: ['csm-assignment-history-distinct-names'] })
      closeDialog()
    },
  })

  const createMut = useMutation({
    mutationFn: createCSMAssignmentHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csm-assignment-history', csmId] })
      queryClient.invalidateQueries({ queryKey: ['csm-assignment-history-distinct-names'] })
      closeDialog()
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteCSMAssignmentHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csm-assignment-history', csmId] })
    },
  })

  const openAdd = useCallback(() => {
    setForm({
      account_name: '',
      handed_off_from: '',
      assigned_from: toDatetimeLocalValue(new Date().toISOString()),
      assigned_until: '',
      openEnded: true,
      status: 'Current',
    })
    setDialog({ mode: 'add' })
  }, [])

  const openEdit = useCallback((r: CSMAssignmentRecord) => {
    const open = !r.assigned_until || r.assigned_until === '-' || String(r.assigned_until).trim() === ''
    const isHanded = r.status === 'Handed Off'
    setForm({
      account_name: r.account_name,
      handed_off_from: r.handed_off_from && r.handed_off_from !== 'null' ? r.handed_off_from : '',
      assigned_from: toDatetimeLocalValue(r.assigned_from),
      assigned_until: !open ? toDatetimeLocalValue(r.assigned_until) : '',
      openEnded: open && !isHanded,
      status: isHanded ? 'Handed Off' : 'Current',
    })
    setDialog({ mode: 'edit', record: r })
  }, [])

  const payloadUntilIso = useCallback((): string | null => {
    if (form.status === 'Handed Off') {
      return form.assigned_until.trim() ? fromDatetimeLocal(form.assigned_until) : null
    }
    if (form.status === 'Current') {
      if (form.openEnded) return null
      return form.assigned_until.trim() ? fromDatetimeLocal(form.assigned_until) : null
    }
    return null
  }, [form])

  const save = useCallback(() => {
    const ho = form.handed_off_from.trim()
    const hoId = ho ? resolveHandoffIdFromName(ho, csms) : null
    const untilIso = payloadUntilIso()

    if (form.status === 'Handed Off' && !form.assigned_until.trim()) {
      window.alert('Enter the handoff date when status is Handed Off.')
      return
    }
    if (form.status === 'Current' && !form.openEnded && !form.assigned_until.trim()) {
      window.alert('Enter an end date, or check “still active”.')
      return
    }
    if (!form.assigned_from.trim()) return

    if (dialog?.mode === 'add') {
      const acc = form.account_name.trim()
      if (!acc) {
        window.alert('Enter an account name.')
        return
      }
      createMut.mutate({
        csm_id: csmId,
        csm_name: csmName,
        account_name: acc,
        assigned_from: fromDatetimeLocal(form.assigned_from),
        assigned_until: untilIso,
        handed_off_from: ho || null,
        handed_off_from_id: hoId,
        status: form.status,
      })
      return
    }
    if (dialog?.mode === 'edit' && dialog.record.assigned_from) {
      updateMut.mutate({
        csm_id: csmId,
        account_name: dialog.record.account_name,
        assigned_from_key: dialog.record.assigned_from,
        handed_off_from: ho || null,
        handed_off_from_id: hoId,
        assigned_from: fromDatetimeLocal(form.assigned_from),
        assigned_until: untilIso,
        status: form.status,
      })
    }
  }, [form, dialog, csmId, csmName, csms, payloadUntilIso, createMut, updateMut])

  const confirmDelete = useCallback((r: CSMAssignmentRecord) => {
    if (!r.assigned_from) return
    if (!window.confirm(`Remove assignment history for "${r.account_name}"? This cannot be undone.`)) return
    deleteMut.mutate({ csm_id: csmId, account_name: r.account_name, assigned_from: r.assigned_from })
  }, [csmId, deleteMut])

  const filtered = useMemo(() => {
    if (!statusFilter) return records
    return records.filter(r => r.status === statusFilter)
  }, [records, statusFilter])

  const pending = updateMut.isPending || createMut.isPending

  const modal = dialog && (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40"
      onClick={closeDialog}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal
        className="bg-white rounded-xl shadow-2xl border border-slate-200 p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-sm font-semibold text-slate-800 mb-1 truncate">
          {dialog.mode === 'add' ? 'Add assignment' : dialog.record.account_name}
        </h4>
        <p className="text-[10px] text-slate-400 mb-4">
          {dialog.mode === 'add'
            ? 'Create a row in assignment history for this CSM.'
            : 'Update this row in the assignment history table.'}
        </p>
        <div className="space-y-3 text-left">
          {dialog.mode === 'add' && (
            <label className="block">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Account</span>
              <input
                type="text"
                value={form.account_name}
                onChange={(e) => setForm(f => ({ ...f, account_name: e.target.value }))}
                className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
                placeholder="Account name"
              />
            </label>
          )}
          <label className="block">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Handed off from</span>
            <select
              value={form.handed_off_from}
              onChange={(e) => setForm(f => ({ ...f, handed_off_from: e.target.value }))}
              className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="">— None —</option>
              {nameOptions.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Assigned from</span>
            <input
              type="datetime-local"
              value={form.assigned_from}
              onChange={(e) => setForm(f => ({ ...f, assigned_from: e.target.value }))}
              className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Status</span>
            <select
              value={form.status}
              onChange={(e) => {
                const v = e.target.value
                setForm(f => ({
                  ...f,
                  status: v,
                  openEnded: v === 'Handed Off' ? false : f.openEnded,
                  assigned_until: v === 'Handed Off' && !f.assigned_until
                    ? toDatetimeLocalValue(new Date().toISOString())
                    : f.assigned_until,
                }))
              }}
              className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="Current">Current</option>
              <option value="Handed Off">Handed Off</option>
            </select>
          </label>
          {form.status === 'Current' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.openEnded}
                onChange={(e) =>
                  setForm(f => ({ ...f, openEnded: e.target.checked, assigned_until: e.target.checked ? '' : f.assigned_until }))
                }
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-600">No end date (still active / present)</span>
            </label>
          )}
          {form.status === 'Handed Off' && (
            <label className="block">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Handoff date</span>
              <input
                type="datetime-local"
                value={form.assigned_until}
                onChange={(e) => setForm(f => ({ ...f, assigned_until: e.target.value }))}
                className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-1">When this assignment ended (required for Handed Off).</p>
            </label>
          )}
          {form.status === 'Current' && !form.openEnded && (
            <label className="block">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Assigned until</span>
              <input
                type="datetime-local"
                value={form.assigned_until}
                onChange={(e) => setForm(f => ({ ...f, assigned_until: e.target.value }))}
                className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
              />
            </label>
          )}
        </div>
        {(updateMut.isError || createMut.isError) && (
          <p className="text-xs text-rose-600 mt-2">Save failed. Check permissions or duplicate row.</p>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={closeDialog} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !form.assigned_from}
            className="px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {typeof document !== 'undefined' && modal && createPortal(modal, document.body)}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignment Events</h3>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-400 font-medium">
              {statusFilter ? `${filtered.length} of ${records.length}` : `${records.length}`} events
            </span>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {['Current', 'Handed Off'].map(s => (
            <button key={s} onClick={() => onStatusFilter(statusFilter === s ? null : s)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all',
                statusFilter === s
                  ? s === 'Current' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-300 text-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
              )}>
              {s}
            </button>
          ))}
          {statusFilter && (
            <button onClick={() => onStatusFilter(null)}
              className="text-[10px] text-slate-400 hover:text-primary-600 font-medium px-1.5">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[auto_24px_1fr_90px_70px_90px_76px] items-center gap-2 px-4 py-2 bg-slate-50/80 border-b border-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-400">
        <span className="w-5"></span>
        <span></span>
        <span>Account</span>
        <span>Status</span>
        <span className="text-right">Duration</span>
        <span className="text-right">Handed From</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
        {filtered.map((r, i) => {
          const isCurrent = r.status === 'Current'
          return (
            <div key={`${r.account_name}-${r.assigned_from}-${i}`}
              className="grid grid-cols-[auto_24px_1fr_90px_70px_90px_76px] items-center gap-2 px-4 py-2 hover:bg-slate-50/50 transition-colors">
              <span className="text-[9px] text-slate-300 font-medium w-5 text-right">{i + 1}</span>
              <div className="flex justify-center">
                <div className={clsx('w-2 h-2 rounded-full', isCurrent ? 'bg-emerald-500' : 'bg-slate-400')} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-slate-800 truncate">{r.account_name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {r.assigned_from ? formatDate(r.assigned_from) : '—'}
                  {r.assigned_until && r.assigned_until !== '-' ? ` → ${formatDate(r.assigned_until)}` : ' → present'}
                </p>
              </div>
              <div>
                <span className={clsx(
                  'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                  isCurrent ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                )}>
                  {r.status}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium text-right">{formatDays(r.days_held)}</span>
              <span className="text-[10px] text-slate-400 text-right truncate" title={r.handed_off_from || ''}>
                {r.handed_off_from || '—'}
              </span>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-primary-50 hover:text-primary-600"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => confirmDelete(r)}
                  disabled={deleteMut.isPending}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {filtered.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-slate-400">
          {records.length === 0
            ? 'No assignment history yet. Use Add to create a row.'
            : 'No rows match this filter.'}
        </div>
      )}
    </div>
    </>
  )
}

// ── Main Panel ──
type PanelTab = 'profile' | 'history'

interface CSMProfilePanelProps {
  csm: CSM
  isOpen: boolean
  onClose: () => void
}

export function CSMProfilePanel({ csm, isOpen, onClose }: CSMProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('profile')
  const [hoveredChartIdx, setHoveredChartIdx] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const { data: profile, isLoading: profileLoading, isError: profileError } = useCSMProfile(isOpen ? csm.id : null)
  const { data: historyData, isLoading: historyLoading } = useCSMAssignmentHistory(isOpen ? csm.id : null)

  const isDeparted = csm.status === 'departed'
  const isInactive = csm.status === 'inactive'

  const displayProfile = useMemo(() => {
    if (!profile) return null
    return {
      title: profile.title || 'Customer Success Manager',
      department: profile.department || 'Customer Success',
      phone: profile.phone || profile.mobile_phone,
      location: profile.location,
      reports_to: profile.reports_to,
      joined_date: profile.joined_date,
      tenure_months: profile.tenure_months,
      email: profile.email || csm.email,
      region: profile.region,
      timezone: profile.timezone,
    }
  }, [profile, csm.email])

  const timeline = useMemo(() => buildMonthlyTimeline(historyData || []), [historyData])

  const historySummary = useMemo(() => {
    if (!historyData || !historyData.length) return null
    const current = historyData.filter(r => r.status === 'Current').length
    const totalManaged = new Set(historyData.map(r => r.account_name)).size
    const handedOff = historyData.filter(r => r.status === 'Handed Off').length
    const received = historyData.filter(r => r.handed_off_from && r.handed_off_from !== 'null').length
    const daysArr = historyData.filter(r => r.days_held != null && r.days_held > 0).map(r => r.days_held!)
    const avgDays = daysArr.length ? Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length) : 0
    return { current, totalManaged, handedOff, received, avgDays }
  }, [historyData])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 top-[57px] bg-black/20 z-40 transition-opacity" onClick={onClose} />

      <div className="fixed right-0 top-[57px] bottom-0 w-full max-w-5xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className={clsx(
          'px-6 py-4 border-b flex items-start justify-between',
          isDeparted ? 'bg-rose-50 border-rose-200' :
          isInactive ? 'bg-slate-50 border-slate-200' :
          'bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200'
        )}>
          <div className="flex items-center gap-4">
            <div className={clsx(
              'w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold',
              isDeparted ? 'bg-slate-400' : isInactive ? 'bg-slate-400' : 'bg-gradient-to-br from-primary-500 to-primary-700'
            )}>
              {csm.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={clsx('text-xl font-bold', isDeparted ? 'text-slate-500 line-through' : 'text-slate-800')}>
                  {csm.name}
                </h2>
                {isDeparted && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">Departed</span>}
                {isInactive && <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">Inactive</span>}
              </div>
              {profileLoading ? (
                <div className="h-4 w-40 bg-slate-200 rounded animate-pulse mt-1" />
              ) : (
                <>
                  <p className="text-sm text-slate-500">{displayProfile?.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{displayProfile?.department}</span>
                    {displayProfile?.tenure_months != null && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTenure(displayProfile.tenure_months)} tenure</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === 'profile'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}>
            <User className="w-3.5 h-3.5" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === 'history'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}>
            <History className="w-3.5 h-3.5" />
            Assignment History
            {historyData && historyData.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                {historyData.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'profile' ? (
            /* ── Profile Tab ── */
            profileLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                <span className="ml-2 text-sm text-slate-500">Loading profile...</span>
              </div>
            ) : profileError ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-500">Could not load profile data.</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {displayProfile?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600 truncate">{displayProfile.email}</span>
                      </div>
                    )}
                    {displayProfile?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600">{displayProfile.phone}</span>
                      </div>
                    )}
                    {displayProfile?.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600">{displayProfile.location}</span>
                      </div>
                    )}
                    {displayProfile?.reports_to && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600">Reports to {displayProfile.reports_to}</span>
                      </div>
                    )}
                    {displayProfile?.joined_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600">Joined {formatDate(displayProfile.joined_date)}</span>
                      </div>
                    )}
                    {displayProfile?.region && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600">{displayProfile.region}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    {isDeparted ? 'Final Portfolio' : 'Current Portfolio'}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <ProfileStatCard icon={Users} label="Accounts" value={csm.account_count} color="blue" />
                    <ProfileStatCard icon={DollarSign} label="ARR Managed" value={formatCurrency(csm.total_arr)} color="emerald" />
                    <ProfileStatCard icon={AlertTriangle} label="Needs Attention" value={csm.at_risk_count} color={csm.at_risk_count > 2 ? 'rose' : 'amber'} />
                    <ProfileStatCard icon={Calendar} label="Renewals (90d)" value={Math.floor(csm.account_count * 0.2)} color="violet" />
                  </div>
                </div>
              </>
            )
          ) : (
            /* ── Assignment History Tab ── */
            historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                <span className="ml-2 text-sm text-slate-500">Loading history...</span>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Summary cards */}
                {historySummary && (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Current</p>
                          <p className="text-base font-bold text-slate-800">{historySummary.current}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">All-Time</p>
                          <p className="text-base font-bold text-slate-800">{historySummary.totalManaged}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Avg Tenure</p>
                          <p className="text-base font-bold text-slate-800">{formatDays(historySummary.avgDays)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-50 text-violet-600">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Transfers</p>
                          <p className="text-base font-bold text-slate-800">
                            <span className="text-emerald-600">{historySummary.received}</span>
                            <span className="text-slate-400 mx-0.5">/</span>
                            <span className="text-slate-500">{historySummary.handedOff}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chart */}
                {timeline.length >= 1 && (
                  <AssignmentChart data={timeline} hoveredIndex={hoveredChartIdx} onHover={setHoveredChartIdx} />
                )}

                {/* Events table */}
                <AssignmentEventsTable
                  records={historyData || []}
                  statusFilter={statusFilter}
                  onStatusFilter={setStatusFilter}
                  csmId={csm.id}
                  csmName={csm.name}
                />
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </>
  )
}
