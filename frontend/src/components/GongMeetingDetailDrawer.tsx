import { useState } from 'react'
import { X, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { clsx } from 'clsx'
import type { GongActivityAnalysis, GongCallSummary } from '../types'

interface GongMeetingDetailDrawerProps {
  data: GongActivityAnalysis | null | undefined
  isOpen: boolean
  onClose: () => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function CallRow({ call }: { call: GongCallSummary }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetail =
    (call.brief_excerpt && call.brief_excerpt.length > 0) ||
    call.customer_attendees.length > 0 ||
    call.csm_attendees.length > 0

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => hasDetail && setExpanded((v) => !v)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
          hasDetail ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-800 truncate">{call.title}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {formatDate(call.started_at)} · {formatDuration(call.duration_minutes)}
          </p>
        </div>
        {hasDetail && (
          <div className="flex-shrink-0 text-slate-400">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        )}
      </button>

      {expanded && hasDetail && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-2">
          {call.brief_excerpt && (
            <p className="text-[11px] text-slate-600 leading-relaxed">{call.brief_excerpt}</p>
          )}
          {(call.customer_attendees.length > 0 || call.csm_attendees.length > 0) && (
            <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
              <Users className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
              <span>
                {[...call.customer_attendees, ...call.csm_attendees].join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function GongMeetingDetailDrawer({ data, isOpen, onClose }: GongMeetingDetailDrawerProps) {
  if (!isOpen) return null

  const riskSignals = data?.tracker_signals.filter((t) => t.category === 'risk') ?? []
  const engagementSignals = data?.tracker_signals.filter((t) => t.category === 'engagement') ?? []

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      <div className="fixed top-0 right-0 h-full w-[440px] max-w-[94vw] bg-white z-50 flex flex-col shadow-xl shadow-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Gong meetings</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Call history &amp; topic signals</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {!data ? (
            <p className="text-xs text-slate-400 text-center py-10">No Gong data available.</p>
          ) : (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
                  <p className="text-slate-500">Calls (30d)</p>
                  <p className="font-semibold text-slate-800 tabular-nums text-sm">
                    {data.meetings_30d}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
                  <p className="text-slate-500">Calls (90d)</p>
                  <p className="font-semibold text-slate-800 tabular-nums text-sm">
                    {data.meetings_90d}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
                  <p className="text-slate-500">Last call</p>
                  <p className="font-semibold text-slate-800 tabular-nums text-sm">
                    {data.days_since_last_meeting != null
                      ? `${data.days_since_last_meeting}d ago`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Topic signals */}
              {(riskSignals.length > 0 || engagementSignals.length > 0) && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-600">Topic signals (last 90d)</p>
                  {riskSignals.length > 0 && (
                    <div>
                      <p className="text-[11px] text-slate-500 mb-1.5">Risk</p>
                      <div className="flex flex-wrap gap-1.5">
                        {riskSignals.map((t) => (
                          <span
                            key={t.tracker_name}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-700 border border-rose-100"
                          >
                            {t.tracker_name.replace(' (tracker)', '').replace(' (beta)', '')}
                            <span className="font-semibold">{t.call_count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {engagementSignals.length > 0 && (
                    <div>
                      <p className="text-[11px] text-slate-500 mb-1.5">Positive</p>
                      <div className="flex flex-wrap gap-1.5">
                        {engagementSignals.map((t) => (
                          <span
                            key={t.tracker_name}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-100"
                          >
                            {t.tracker_name.replace(' (tracker)', '').replace(' (beta)', '')}
                            <span className="font-semibold">{t.call_count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Latest key points */}
              {data.latest_key_points.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    Key points — most recent call
                  </p>
                  <ul className="space-y-1.5">
                    {data.latest_key_points.map((kp, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
                        <span className="text-slate-300 flex-shrink-0 mt-0.5">•</span>
                        <span className="leading-relaxed">{kp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Call list */}
              {data.recent_calls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Recent calls</p>
                  <div className="space-y-2">
                    {data.recent_calls.map((call) => (
                      <CallRow key={call.call_id} call={call} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 flex-shrink-0">
          <p className="text-[10px] text-slate-400">Source: Gong · silver.silver_layer</p>
        </div>
      </div>
    </>
  )
}
