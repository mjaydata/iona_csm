import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Info,
  Loader,
  MessageSquare,
  Minus,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { SupportTicket } from '../types'

function SentimentIndicator({ sentiment }: { sentiment: number }) {
  const tooltipText =
    sentiment > 0
      ? `Positive: ${sentiment} more positive than negative messages`
      : sentiment < 0
        ? `Negative: ${Math.abs(sentiment)} more negative than positive`
        : 'Neutral: equal positive and negative'

  if (sentiment > 0) {
    return (
      <div className="flex items-center gap-1 text-emerald-600" title={tooltipText}>
        <ThumbsUp className="w-3 h-3" />
        <span className="text-[10px] font-medium">+{sentiment}</span>
      </div>
    )
  }
  if (sentiment < 0) {
    return (
      <div className="flex items-center gap-1 text-rose-600" title={tooltipText}>
        <ThumbsDown className="w-3 h-3" />
        <span className="text-[10px] font-medium">{sentiment}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-slate-400" title={tooltipText}>
      <Minus className="w-3 h-3" />
      <span className="text-[10px] font-medium">0</span>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    critical: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
    high: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    low: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  }[severity] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }

  return (
    <span
      className={clsx(
        'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border',
        config.bg,
        config.text,
        config.border
      )}
      title={`${severity.charAt(0).toUpperCase() + severity.slice(1)} priority ticket`}
    >
      {severity}
    </span>
  )
}

export function SupportTicketCard({ ticket }: { ticket: SupportTicket }) {
  const [expanded, setExpanded] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-3 h-3 text-amber-500" />
      case 'in_progress':
        return <Loader className="w-3 h-3 text-blue-500" />
      case 'resolved':
        return <CheckCircle className="w-3 h-3 text-emerald-500" />
      default:
        return null
    }
  }

  const getStatusTooltip = (status: string) => {
    switch (status) {
      case 'open':
        return 'Open - awaiting response'
      case 'in_progress':
        return 'In Progress - being worked on'
      case 'resolved':
        return 'Resolved - ticket closed'
      default:
        return status
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-rose-500 bg-rose-50/50'
      case 'high':
        return 'border-l-amber-500 bg-amber-50/50'
      case 'medium':
        return 'border-l-blue-500 bg-blue-50/50'
      default:
        return 'border-l-slate-300 bg-slate-50/50'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  }

  const getTimeToClose = () => {
    if (ticket.status !== 'resolved' || !ticket.last_message_at) return null
    const created = new Date(ticket.created_at)
    const closed = new Date(ticket.last_message_at)
    const diffHours = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60))
    if (diffHours < 24) return { display: `${diffHours}h`, hours: diffHours }
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return { display: `${diffDays}d`, hours: diffHours }
    return { display: `${Math.floor(diffDays / 30)}mo`, hours: diffHours }
  }

  const timeToClose = getTimeToClose()
  const hasSentimentBreakdown = !!(
    ticket.positive_messages ||
    ticket.negative_messages ||
    ticket.neutral_messages
  )
  const showExpandedPanel = expanded && (ticket.summary || hasSentimentBreakdown)

  return (
    <div
      className={clsx('border-l-2 rounded-r-lg p-2 transition-all', getSeverityColor(ticket.severity))}
    >
      <div
        className="flex items-start justify-between gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="flex items-center gap-1" title={getStatusTooltip(ticket.status)}>
              {getStatusIcon(ticket.status)}
              <span
                className={clsx(
                  'text-[10px] font-medium uppercase',
                  ticket.status === 'open'
                    ? 'text-amber-600'
                    : ticket.status === 'in_progress'
                      ? 'text-blue-600'
                      : 'text-emerald-600'
                )}
              >
                {ticket.status.replace('_', ' ')}
              </span>
            </span>
            <SeverityBadge severity={ticket.severity} />
            {ticket.ticket_type && (
              <span
                className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-white/60 rounded"
                title={`Category: ${ticket.ticket_type}`}
              >
                {ticket.ticket_type}
              </span>
            )}
            {timeToClose && (
              <span
                className="text-[10px] text-slate-500 flex items-center gap-0.5"
                title={`Time to resolve: ${timeToClose.hours} hours`}
              >
                <Clock className="w-2.5 h-2.5" />
                {timeToClose.display}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-700 line-clamp-2">{ticket.title}</p>
          {ticket.account_name && (
            <p className="text-[10px] text-slate-500 truncate mt-0.5" title={ticket.account_name}>
              {ticket.account_name}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <SentimentIndicator sentiment={ticket.net_sentiment || 0} />
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-400" />
          )}
        </div>
      </div>

      {ticket.total_messages !== undefined && ticket.total_messages > 0 && (
        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
          <div className="flex items-center gap-1" title="Total messages in conversation">
            <MessageSquare className="w-3 h-3" />
            <span>{ticket.total_messages} msgs</span>
          </div>
          <span>•</span>
          <span title={new Date(ticket.created_at).toLocaleDateString()}>
            Created: {formatDate(ticket.created_at)}
          </span>
          {ticket.last_message_at && ticket.last_message_at !== ticket.created_at && (
            <>
              <span>•</span>
              <span title={new Date(ticket.last_message_at).toLocaleDateString()}>
                Last: {formatDate(ticket.last_message_at)}
              </span>
            </>
          )}
        </div>
      )}

      {showExpandedPanel && (
        <div className="mt-2 p-2 bg-white/80 rounded border border-slate-200">
          {ticket.summary && (
            <>
              <div className="flex items-start gap-1 mb-1">
                <Info className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-[10px] text-slate-400 uppercase font-medium">AI Summary</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{ticket.summary}</p>
            </>
          )}
          {hasSentimentBreakdown && (
            <div
              className={clsx(
                'flex items-center gap-3 text-[10px]',
                ticket.summary ? 'mt-2 pt-2 border-t border-slate-100' : ''
              )}
            >
              <span className="text-emerald-600" title="Positive sentiment messages">
                👍 {ticket.positive_messages || 0}
              </span>
              <span className="text-rose-600" title="Negative sentiment messages">
                👎 {ticket.negative_messages || 0}
              </span>
              <span className="text-slate-500" title="Neutral messages">
                😐 {ticket.neutral_messages || 0}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
