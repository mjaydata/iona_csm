import { Smile, Frown, Meh, TrendingUp, TrendingDown, Minus, Mail, Calendar, Headphones, ClipboardCheck } from 'lucide-react'
import { BaseWidget } from './BaseWidget'
import { clsx } from 'clsx'
import type { SentimentAnalysis } from '../../types'

interface SentimentWidgetProps {
  data: SentimentAnalysis | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

function getSentimentIcon(sentiment: number, size: 'sm' | 'md' | 'lg' = 'md') {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
  
  if (sentiment >= 30) {
    return <Smile className={clsx(sizeClass, 'text-emerald-500')} />
  } else if (sentiment <= -30) {
    return <Frown className={clsx(sizeClass, 'text-rose-500')} />
  }
  return <Meh className={clsx(sizeClass, 'text-amber-500')} />
}

function getSourceIcon(type: string) {
  switch (type) {
    case 'email': return <Mail className="w-3 h-3" />
    case 'meeting': return <Calendar className="w-3 h-3" />
    case 'support': return <Headphones className="w-3 h-3" />
    case 'survey': return <ClipboardCheck className="w-3 h-3" />
    default: return null
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SentimentWidget({ data, isLoading, onHide, collapsed, onCollapsedChange }: SentimentWidgetProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-emerald-500" />
      case 'declining': return <TrendingDown className="w-4 h-4 text-rose-500" />
      default: return <Minus className="w-4 h-4 text-slate-400" />
    }
  }

  // Calculate sentiment bar position (-100 to 100 mapped to 0-100%)
  const sentimentPosition = data ? ((data.overall_sentiment + 100) / 200) * 100 : 50

  return (
    <BaseWidget
      title="Customer Sentiment"
      icon={<Smile className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      {data && (
        <div className="p-4">
          {/* Overall Sentiment */}
          <div className="flex items-center justify-center gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
            {getSentimentIcon(data.overall_sentiment, 'lg')}
            <div className="text-center">
              <p className={clsx(
                'text-2xl font-bold',
                data.overall_sentiment >= 30 ? 'text-emerald-600' :
                data.overall_sentiment <= -30 ? 'text-rose-600' : 'text-amber-600'
              )}>
                {data.overall_sentiment > 0 ? '+' : ''}{data.overall_sentiment}
              </p>
              <p className="text-xs text-slate-500 capitalize">{data.sentiment_label}</p>
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(data.trend)}
              <span className="text-xs text-slate-500 capitalize">{data.trend}</span>
            </div>
          </div>

          {/* Sentiment Scale */}
          <div className="mb-4">
            <div className="relative h-3 bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400 rounded-full">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-800 rounded-full shadow-sm"
                style={{ left: `calc(${sentimentPosition}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-400">Negative</span>
              <span className="text-[10px] text-slate-400">Neutral</span>
              <span className="text-[10px] text-slate-400">Positive</span>
            </div>
          </div>

          {/* Sentiment by Source */}
          {data.sources.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                By Source
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {data.sources.map((source, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <div className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center',
                      source.sentiment >= 30 ? 'bg-emerald-100 text-emerald-600' :
                      source.sentiment <= -30 ? 'bg-rose-100 text-rose-600' : 
                      'bg-amber-100 text-amber-600'
                    )}>
                      {getSourceIcon(source.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 capitalize">{source.type}</p>
                      <p className="text-[10px] text-slate-500">{source.count} interactions</p>
                    </div>
                    {getSentimentIcon(source.sentiment, 'sm')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Interactions */}
          {data.recent_interactions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Recent Interactions
              </h4>
              <div className="space-y-2">
                {data.recent_interactions.slice(0, 3).map((interaction, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 border border-slate-100 rounded-lg">
                    {getSentimentIcon(interaction.sentiment, 'sm')}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-700 line-clamp-2">{interaction.summary}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 capitalize">{interaction.type}</span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-400">
                          {formatRelativeTime(interaction.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  )
}
