import { BookOpen } from 'lucide-react'
import { BaseWidget } from './BaseWidget'
import { useConfluenceImplementation } from '../../hooks/useAccounts'

interface ConfluenceImplementationWidgetProps {
  accountId: string | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function ConfluenceImplementationWidget({
  accountId,
  isLoading: pageLoading,
  onHide,
  collapsed,
  onCollapsedChange,
}: ConfluenceImplementationWidgetProps) {
  const { data, isLoading, isError } = useConfluenceImplementation(accountId ?? null, !!accountId)
  const loading = !!pageLoading || (isLoading && !!accountId)

  return (
    <BaseWidget
      title="Implementation context"
      icon={<BookOpen className="w-4 h-4" />}
      isLoading={loading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      badge={
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Confluence</span>
      }
    >
      <div className="p-4">
        {isError && (
          <p className="text-sm text-rose-600">Could not load Confluence implementation context.</p>
        )}
        {!isError && data && !data.has_content && (
          <p className="text-sm text-slate-500 leading-relaxed">
            No client implementation summary is linked for this account in the knowledge base. Pages are
            matched using Salesforce account id or Navigate account name against Confluence metadata.
          </p>
        )}
        {!isError && data?.has_content && (
          <div className="space-y-3">
            <div>
              {data.root_page_name && (
                <p className="text-[11px] text-slate-400 mb-1">{data.root_page_name}</p>
              )}
              {data.page_title && (
                <h3 className="text-sm font-semibold text-slate-800 leading-snug">{data.page_title}</h3>
              )}
            </div>
            {data.page_text && (
              <div
                className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans max-h-[min(55vh,520px)] overflow-y-auto pr-1 border border-slate-100 rounded-lg bg-slate-50/80 p-3"
              >
                {data.page_text}
              </div>
            )}
            {(data.page_id || data.space_id) && (
              <p className="text-[10px] text-slate-400">
                {data.space_id != null && data.space_id !== '' && (
                  <span>Space {data.space_id}</span>
                )}
                {data.space_id && data.page_id && ' · '}
                {data.page_id != null && data.page_id !== '' && <span>Page {data.page_id}</span>}
              </p>
            )}
          </div>
        )}
      </div>
    </BaseWidget>
  )
}
