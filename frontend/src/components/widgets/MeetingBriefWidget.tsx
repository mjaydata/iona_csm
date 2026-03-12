import { Sparkles, AlertTriangle, TrendingUp, MessageSquare, Copy, Check } from 'lucide-react'
import { BaseWidget, Badge } from './BaseWidget'
import { useState } from 'react'
import type { MeetingBrief } from '../../types'

interface MeetingBriefWidgetProps {
  data: MeetingBrief | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function MeetingBriefWidget({ data, isLoading, onHide, collapsed, onCollapsedChange }: MeetingBriefWidgetProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!data) return
    
    const text = `
Meeting Brief
Generated: ${new Date(data.generated_at).toLocaleString()}

SUMMARY
${data.summary}

KEY POINTS
${data.key_points.map(p => `• ${p}`).join('\n')}

TALKING POINTS
${data.talking_points.map(p => `• ${p}`).join('\n')}

RISKS TO ADDRESS
${data.risks_to_address.map(p => `• ${p}`).join('\n')}

OPPORTUNITIES
${data.opportunities.map(p => `• ${p}`).join('\n')}
    `.trim()
    
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <BaseWidget
      title="Meeting Brief"
      icon={<Sparkles className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      badge={<Badge variant="info">AI Generated</Badge>}
      headerActions={
        <button
          onClick={handleCopy}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      }
    >
      {data && (
        <div className="p-4">
          {/* Summary */}
          <div className="mb-4">
            <p className="text-sm text-slate-700 leading-relaxed">{data.summary}</p>
            <p className="text-[10px] text-slate-400 mt-2">
              Generated {new Date(data.generated_at).toLocaleString()}
            </p>
          </div>

          {/* Key Points */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Key Points
            </h4>
            <ul className="space-y-1">
              {data.key_points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-xs text-slate-600">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Talking Points */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Talking Points
            </h4>
            <ul className="space-y-1">
              {data.talking_points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary-500 text-xs">{idx + 1}.</span>
                  <span className="text-xs text-slate-600">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          {data.risks_to_address.length > 0 && (
            <div className="mb-4 p-3 bg-rose-50 rounded-lg">
              <h4 className="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Risks to Address
              </h4>
              <ul className="space-y-1">
                {data.risks_to_address.map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-rose-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-xs text-rose-600">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Opportunities */}
          {data.opportunities.length > 0 && (
            <div className="p-3 bg-emerald-50 rounded-lg">
              <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Opportunities
              </h4>
              <ul className="space-y-1">
                {data.opportunities.map((opp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-xs text-emerald-600">{opp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  )
}
