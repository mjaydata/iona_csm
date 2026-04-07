import { useState } from 'react'
import { PhoneCall, ChevronRight, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { BaseWidget, WidgetEmptyState, Badge, TrendIndicator } from './BaseWidget'
import type { GongActivityAnalysis, GongCallSummary } from '../../types'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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
              <span>{[...call.customer_attendees, ...call.csm_attendees].join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface GongActivityWidgetProps {
  data: GongActivityAnalysis | null | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function engagementBadgeVariant(label: string): 'success' | 'warning' | 'critical' | 'low' {
  if (label === 'Healthy engagement') return 'success'
  if (label === 'Risk signals present') return 'warning'
  if (label === 'No recent meetings' || label === 'No meetings in 60+ days') return 'critical'
  return 'low'
}

export function GongActivityWidget({
  data,
  isLoading,
  onHide,
  collapsed,
  onCollapsedChange,
}: GongActivityWidgetProps) {
  const [fullscreen, setFullscreen] = useState(false)

  const riskSignals = data?.tracker_signals.filter((t) => t.category === 'risk') ?? []
  const engagementSignals = data?.tracker_signals.filter((t) => t.category === 'engagement') ?? []

  const fullscreenContent = !data ? null : (
    <div className="px-4 py-3 space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
          <p className="text-slate-500">Calls (30d)</p>
          <p className="font-semibold text-slate-800 tabular-nums text-sm">{data.meetings_30d}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
          <p className="text-slate-500">Calls (90d)</p>
          <p className="font-semibold text-slate-800 tabular-nums text-sm">{data.meetings_90d}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
          <p className="text-slate-500">Last call</p>
          <p className="font-semibold text-slate-800 tabular-nums text-sm">
            {data.days_since_last_meeting != null ? `${data.days_since_last_meeting}d ago` : '—'}
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
          <p className="text-xs font-semibold text-slate-600 mb-2">Key points — most recent call</p>
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

      <p className="text-[10px] text-slate-400">Source: Gong · silver.silver_layer</p>
    </div>
  )

  return (
    <BaseWidget
      title="Gong Activity"
      icon={<PhoneCall className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      fullscreen={fullscreen}
      onFullscreenChange={setFullscreen}
      fullscreenContent={fullscreenContent}
    >
        {!data ? (
          <WidgetEmptyState
            icon={<PhoneCall className="w-8 h-8" />}
            title="No Gong calls recorded"
            description="No meetings linked to this account in Gong."
          />
        ) : (
          <div className="p-4 space-y-4">
            {/* Cadence strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-slate-800">{data.meetings_30d}</p>
                <p className="text-xs text-slate-500 mt-0.5">calls / 30d</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-slate-800">{data.meetings_90d}</p>
                <p className="text-xs text-slate-500 mt-0.5">calls / 90d</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {formatRelativeDate(data.last_meeting_date)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">last call</p>
              </div>
            </div>

            {/* Engagement label + trend */}
            <div className="flex items-center gap-2">
              <Badge variant={engagementBadgeVariant(data.engagement_label)}>
                {data.engagement_label}
              </Badge>
              <TrendIndicator
                trend={
                  data.engagement_trend === 'improving'
                    ? 'up'
                    : data.engagement_trend === 'declining'
                    ? 'down'
                    : 'stable'
                }
                value={data.engagement_trend}
                positive="up"
              />
            </div>

            {/* Topic signals */}
            {(riskSignals.length > 0 || engagementSignals.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {riskSignals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Risk signals</p>
                    <div className="flex flex-wrap gap-1">
                      {riskSignals.slice(0, 4).map((t) => (
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
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Positive signals</p>
                    <div className="flex flex-wrap gap-1">
                      {engagementSignals.slice(0, 4).map((t) => (
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

            {/* Recent calls */}
            {data.recent_calls.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Recent calls</p>
                <div className="space-y-1.5">
                  {data.recent_calls.slice(0, 3).map((call) => (
                    <div
                      key={call.call_id}
                      className="flex items-start gap-2 text-xs text-slate-600"
                    >
                      <span className="text-slate-400 flex-shrink-0 mt-0.5">
                        {formatRelativeDate(call.started_at)}
                      </span>
                      <span className="font-medium truncate flex-1">{call.title}</span>
                      <span className="text-slate-400 flex-shrink-0">
                        {formatDuration(call.duration_minutes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <button
              onClick={() => setFullscreen(true)}
              className="w-full flex items-center justify-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium py-1 hover:bg-primary-50 rounded-lg transition-colors"
            >
              View all meetings
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
    </BaseWidget>
  )
}
