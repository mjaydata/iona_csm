import { useState } from 'react'
import { PhoneCall, ChevronRight } from 'lucide-react'
import { BaseWidget, WidgetEmptyState, Badge, TrendIndicator } from './BaseWidget'
import { GongMeetingDetailDrawer } from '../GongMeetingDetailDrawer'
import type { GongActivityAnalysis } from '../../types'

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
  const [drawerOpen, setDrawerOpen] = useState(false)

  const riskSignals = data?.tracker_signals.filter((t) => t.category === 'risk') ?? []
  const engagementSignals = data?.tracker_signals.filter((t) => t.category === 'engagement') ?? []

  return (
    <>
      <BaseWidget
        title="Gong Activity"
        icon={<PhoneCall className="w-4 h-4" />}
        isLoading={isLoading}
        onHide={onHide}
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
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
              onClick={() => setDrawerOpen(true)}
              className="w-full flex items-center justify-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium py-1 hover:bg-primary-50 rounded-lg transition-colors"
            >
              View all meetings
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </BaseWidget>

      {drawerOpen && (
        <GongMeetingDetailDrawer
          data={data}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  )
}
