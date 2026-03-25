import { useState } from 'react'
import { FileText, Calendar, ChevronDown, ChevronRight, AlertTriangle, Clock, DollarSign, ExternalLink } from 'lucide-react'
import { BaseWidget, Badge } from './BaseWidget'
import { clsx } from 'clsx'
import type { ContractContext, ContractGroupDetail, LuminanceDocument } from '../../types'

interface ContractWidgetProps {
  data: ContractContext | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function getUrgencyColor(days: number | null | undefined) {
  if (days == null) return { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' }
  if (days <= 30) return { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' }
  if (days <= 90) return { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' }
  if (days <= 180) return { bg: 'bg-sky-50', text: 'text-sky-600', dot: 'bg-sky-500' }
  return { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' }
}

function RevTypeBadge({ type }: { type: string }) {
  const colors = type === 'SaaS'
    ? 'bg-violet-100 text-violet-700'
    : type === 'eSMA'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-slate-100 text-slate-600'
  return (
    <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded', colors)}>
      {type}
    </span>
  )
}

function ContractRow({ contract }: { contract: ContractGroupDetail }) {
  const [expanded, setExpanded] = useState(false)
  const urgency = getUrgencyColor(contract.days_until_end)
  const isActive = contract.renewal_not_yet_contracted

  return (
    <div className={clsx(
      'border rounded-lg transition-all',
      isActive ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/50'
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-slate-50/80 rounded-lg transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 truncate">
              {contract.contract_group}
            </span>
            <RevTypeBadge type={contract.revenue_type} />
            {isActive && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-slate-500">
              ARR: <span className="font-medium text-slate-700">{formatCurrency(contract.arr_cad)}</span>
            </span>
            {contract.days_until_end != null && (
              <span className={clsx('text-[10px] font-medium', urgency.text)}>
                {contract.days_until_end > 0
                  ? `${contract.days_until_end}d left`
                  : contract.days_until_end === 0 ? 'Expires today' : `Expired ${Math.abs(contract.days_until_end)}d ago`}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-semibold text-slate-800">{formatCurrency(contract.tcv_cad)}</p>
          <p className="text-[10px] text-slate-400">TCV</p>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-100 mx-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2.5">
            <DetailRow label="Currency" value={contract.currency} />
            <DetailRow label="ARR (Local)" value={formatCurrency(contract.arr)} />
            <DetailRow label="ARR (CAD)" value={formatCurrency(contract.arr_cad)} />
            <DetailRow label="TCV (Local)" value={formatCurrency(contract.tcv)} />
            <DetailRow label="TCV (CAD)" value={formatCurrency(contract.tcv_cad)} />
            <DetailRow label="Start" value={formatDate(contract.contract_start)} />
            <DetailRow label="End" value={formatDate(contract.contract_end)} />
            <DetailRow
              label="Status"
              value={isActive ? 'Renewal Pending' : 'Contracted'}
              valueClass={isActive ? 'text-amber-600' : 'text-slate-600'}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center text-[11px]">
      <span className="text-slate-400">{label}</span>
      <span className={clsx('font-medium', valueClass || 'text-slate-700')}>{value}</span>
    </div>
  )
}

function LuminanceSection({ documents }: { documents: LuminanceDocument[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? documents : documents.slice(0, 3)

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <FileText className="w-3 h-3 text-indigo-500" />
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Luminance ({documents.length})
        </h4>
      </div>
      <div className="space-y-1.5">
        {visible.map((doc) => (
          <a
            key={doc.document_id}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100/60 transition-colors group"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-700 truncate block">
                {doc.title}
              </span>
              {doc.document_type && (
                <span className="text-[10px] text-slate-400">{doc.document_type}</span>
              )}
            </div>
            <ExternalLink className="w-3 h-3 text-indigo-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors" />
          </a>
        ))}
      </div>
      {documents.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[10px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${documents.length} documents`}
        </button>
      )}
    </div>
  )
}

export function ContractWidget({ data, isLoading, onHide, collapsed, onCollapsedChange }: ContractWidgetProps) {
  const hasContracts = data && data.contracts && data.contracts.length > 0
  const isUrgent = data && data.days_until_renewal > 0 && data.days_until_renewal <= 30
  const isWarning = data && data.days_until_renewal > 0 && data.days_until_renewal <= 90
  const urgency = getUrgencyColor(data?.days_until_renewal)

  const activeContracts = data?.contracts?.filter(c => c.renewal_not_yet_contracted) || []
  const pastContracts = data?.contracts?.filter(c => !c.renewal_not_yet_contracted) || []

  return (
    <BaseWidget
      title="Contract & Renewal"
      icon={<FileText className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      badge={
        data && isUrgent ? (
          <Badge variant="critical">Urgent</Badge>
        ) : isWarning ? (
          <Badge variant="warning">Upcoming</Badge>
        ) : hasContracts ? (
          <Badge variant="info">{data.contract_count} contracts</Badge>
        ) : null
      }
    >
      {data && (
        <div className="p-4 space-y-4">
          {/* Summary Section */}
          {hasContracts ? (
            <>
              {/* Renewal Countdown */}
              {data.nearest_renewal_date && data.days_until_renewal > 0 && (
                <div className={clsx('p-3 rounded-lg text-center', urgency.bg)}>
                  <div className="flex items-center justify-center gap-2 mb-0.5">
                    <Calendar className={clsx('w-4 h-4', urgency.text)} />
                    <span className={clsx('text-2xl font-bold', urgency.text)}>
                      {data.days_until_renewal}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    days until nearest renewal &middot; {formatDate(data.nearest_renewal_date)}
                  </p>
                </div>
              )}

              {/* KPI Strip */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-slate-50 rounded-lg text-center">
                  <DollarSign className="w-3 h-3 text-slate-400 mx-auto mb-0.5" />
                  <p className="text-xs font-bold text-slate-800">{formatCurrency(data.total_arr_cad)}</p>
                  <p className="text-[9px] text-slate-400 uppercase">Total ARR</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg text-center">
                  <DollarSign className="w-3 h-3 text-slate-400 mx-auto mb-0.5" />
                  <p className="text-xs font-bold text-slate-800">{formatCurrency(data.total_tcv_cad)}</p>
                  <p className="text-[9px] text-slate-400 uppercase">Total TCV</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg text-center">
                  <FileText className="w-3 h-3 text-slate-400 mx-auto mb-0.5" />
                  <p className="text-xs font-bold text-slate-800">{data.contract_count}</p>
                  <p className="text-[9px] text-slate-400 uppercase">Contracts</p>
                </div>
              </div>

              {/* Revenue Type Tags */}
              {data.revenue_types.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Types:</span>
                  {data.revenue_types.map(rt => (
                    <RevTypeBadge key={rt} type={rt} />
                  ))}
                </div>
              )}

              {/* Active Contracts (Renewal Pending) */}
              {activeContracts.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Pending Renewal ({activeContracts.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activeContracts.map((c, i) => (
                      <ContractRow key={`active-${i}`} contract={c} />
                    ))}
                  </div>
                </div>
              )}

              {/* Past / Contracted */}
              {pastContracts.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Contracted ({pastContracts.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {pastContracts.map((c, i) => (
                      <ContractRow key={`past-${i}`} contract={c} />
                    ))}
                  </div>
                </div>
              )}

              {/* Luminance Documents */}
              {data.luminance_documents && data.luminance_documents.length > 0 && (
                <LuminanceSection documents={data.luminance_documents} />
              )}
            </>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No contract data available</p>
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  )
}
