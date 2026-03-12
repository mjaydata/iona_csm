import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronRight, 
  DollarSign, 
  FileText,
  Globe,
  Search,
  X,
  RefreshCw,
  Calendar,
  Loader2,
  Building2,
  Zap,
  Flame,
  Droplets,
  Truck,
  Fuel,
  Phone,
  Mountain,
  Landmark,
  Factory,
  Layers,
  Cloud,
  Wrench,
  Briefcase,
  KeyRound,
  Rocket,
  Server,
  HeadphonesIcon,
  Infinity,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { useInfiniteARRCustomers } from '../hooks/useAccounts'
import type { ARRCustomerSummary, ARRContractGroup, ARRByRevenueType, ARRByRegion, ARRByIndustry, ARRByAccountType } from '../types'

interface ARRAnalysisProps {
  onBack: () => void
  accountTypeFilter?: string
}

const RENEWAL_PERIODS = [
  { value: 30, label: '30 Days' },
  { value: 60, label: '60 Days' },
  { value: 90, label: '90 Days' },
  { value: 180, label: '6 Months' },
  { value: 365, label: '1 Year' },
]

// Format currency in EUR
function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000_000) return `€${(value / 1_000_000_000).toFixed(1)}B`
    if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`
    return `€${value.toFixed(0)}`
  }
  return `€${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/* ── Icon maps ── */
const INDUSTRY_ICONS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  'Electrical':       { icon: Zap,       color: 'text-amber-600',  bg: 'bg-amber-50' },
  'Gas Utility':      { icon: Flame,     color: 'text-red-500',    bg: 'bg-red-50' },
  'Water':            { icon: Droplets,  color: 'text-cyan-600',   bg: 'bg-cyan-50' },
  'Transportation':   { icon: Truck,     color: 'text-orange-500', bg: 'bg-orange-50' },
  'Oil & Gas':        { icon: Fuel,      color: 'text-slate-600',  bg: 'bg-slate-100' },
  'Telecommunications': { icon: Phone,   color: 'text-violet-500', bg: 'bg-violet-50' },
  'Mining':           { icon: Mountain,  color: 'text-stone-600',  bg: 'bg-stone-100' },
  'Government':       { icon: Landmark,  color: 'text-blue-600',   bg: 'bg-blue-50' },
}
const DEFAULT_INDUSTRY_ICON = { icon: Factory, color: 'text-slate-500', bg: 'bg-slate-50' }

const REVENUE_TYPE_ICONS: Record<string, { icon: LucideIcon; subtitle: string; color: string; bg: string }> = {
  'SaaS':                      { icon: Cloud,         subtitle: 'Cloud Revenue',          color: 'text-primary',    bg: 'bg-primary/10' },
  'eSaaS':                     { icon: Cloud,         subtitle: 'Cloud Revenue',          color: 'text-orange-500', bg: 'bg-orange-50' },
  'eSMA':                      { icon: Wrench,        subtitle: 'Maintenance Agreement',  color: 'text-blue-600',   bg: 'bg-blue-50' },
  'SMA':                       { icon: Wrench,        subtitle: 'Maintenance Agreement',  color: 'text-blue-500',   bg: 'bg-blue-50' },
  'SMA (Term License)':        { icon: Wrench,        subtitle: 'Maintenance (TL)',       color: 'text-blue-400',   bg: 'bg-blue-50' },
  'eSMA (Term License)':       { icon: Wrench,        subtitle: 'Maintenance (TL)',       color: 'text-blue-500',   bg: 'bg-blue-50' },
  'Term License':              { icon: KeyRound,      subtitle: 'Fixed Duration',         color: 'text-slate-600',  bg: 'bg-slate-100' },
  'Term license (SFC)':        { icon: KeyRound,      subtitle: 'Fixed Duration (SFC)',   color: 'text-slate-500',  bg: 'bg-slate-100' },
  'Accelerate':                { icon: Rocket,        subtitle: 'Acceleration',           color: 'text-rose-500',   bg: 'bg-rose-50' },
  'Accelerate 2.0':            { icon: Rocket,        subtitle: 'Acceleration 2.0',       color: 'text-rose-600',   bg: 'bg-rose-50' },
  'Hosting':                   { icon: Server,        subtitle: 'Hosting',                color: 'text-purple-500', bg: 'bg-purple-50' },
  'Hosting (non-recurring)':   { icon: Server,        subtitle: 'Hosting (NR)',           color: 'text-purple-400', bg: 'bg-purple-50' },
  'Support':                   { icon: HeadphonesIcon,subtitle: 'Support',                color: 'text-green-600',  bg: 'bg-green-50' },
  'Services':                  { icon: Briefcase,     subtitle: 'Professional Services',  color: 'text-teal-600',   bg: 'bg-teal-50' },
  'Services (recurring)':      { icon: Briefcase,     subtitle: 'Services (Recurring)',   color: 'text-teal-500',   bg: 'bg-teal-50' },
  'Perpetual':                 { icon: Infinity,      subtitle: 'Perpetual License',      color: 'text-indigo-500', bg: 'bg-indigo-50' },
  'Material Right':            { icon: Layers,        subtitle: 'Material Right',         color: 'text-stone-500',  bg: 'bg-stone-100' },
}
const DEFAULT_REV_ICON = { icon: Layers, subtitle: 'Other', color: 'text-slate-500', bg: 'bg-slate-50' }

const REGION_COLORS: Record<string, string> = {
  'AMER': '#ec5b13',
  'Europe': '#3b82f6',
  'APJMEA': '#22c55e',
}
const DEFAULT_REGION_COLOR = '#8b5cf6'

// Revenue Type Breakdown — compact with icons
function RevenueTypeBreakdown({ data, totalARR }: { data: ARRByRevenueType[]; totalARR: number }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? data : data.slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold text-slate-800 tracking-tight">ARR by License Type</h3>
        </div>
        <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full uppercase">
          {data.length} types
        </span>
      </div>
      <div className="px-4 py-3 space-y-2.5 flex-grow">
        {visible.map((item, idx) => {
          const percent = totalARR > 0 ? (item.arr_cad / totalARR) * 100 : 0
          const meta = REVENUE_TYPE_ICONS[item.revenue_type] || DEFAULT_REV_ICON
          const Icon = meta.icon
          const isTop = idx === 0
          return (
            <div key={item.revenue_type}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={clsx('w-6 h-6 rounded flex items-center justify-center flex-shrink-0', meta.bg)}>
                    <Icon className={clsx('w-3 h-3', meta.color)} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{item.revenue_type}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(item.arr_cad, true)}</span>
                  <span className="text-[10px] text-slate-400 w-8 text-right">{percent.toFixed(0)}%</span>
                </div>
              </div>
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(percent, 1)}%`, backgroundColor: isTop ? '#ec5b13' : '#94a3b8' }}
                />
              </div>
            </div>
          )
        })}
      </div>
      {data.length > 5 && (
        <div className="px-4 py-2 border-t border-slate-100 mt-auto">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 text-xs font-bold text-primary hover:text-primary/80 py-0.5 rounded hover:bg-primary/5 transition-all"
          >
            {expanded ? 'Show Less' : `View All ${data.length} Types`}
            <ArrowRight className={clsx('w-3 h-3 transition-transform', expanded && 'rotate-90')} />
          </button>
        </div>
      )}
    </div>
  )
}

// Region Breakdown — compact sidebar style
function RegionBreakdown({ data, totalARR }: { data: ARRByRegion[]; totalARR: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-full lg:w-52">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold text-slate-800 tracking-tight">ARR by Region</h3>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3 flex-grow">
        {data.map((item) => {
          const percent = totalARR > 0 ? (item.arr_cad / totalARR) * 100 : 0
          const barColor = REGION_COLORS[item.region] || DEFAULT_REGION_COLOR
          return (
            <div key={item.region}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
                  <span className="text-xs font-bold text-slate-700">{item.region}</span>
                </div>
                <span className="text-[10px] text-slate-400">{percent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-0.5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(percent, 1)}%`, backgroundColor: barColor }}
                />
              </div>
              <p className="text-xs font-bold text-slate-900">{formatCurrency(item.arr_cad, true)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Industry Breakdown — compact, all items shown with percentage
function IndustryBreakdown({ data, totalARR }: { data: ARRByIndustry[]; totalARR: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Factory className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold text-slate-800 tracking-tight">ARR by Industry</h3>
        </div>
        <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full uppercase">
          {data.length}
        </span>
      </div>
      <div className="px-4 py-3 space-y-2.5 flex-grow">
        {data.map((item, idx) => {
          const percent = totalARR > 0 ? (item.arr_cad / totalARR) * 100 : 0
          const meta = INDUSTRY_ICONS[item.industry] || DEFAULT_INDUSTRY_ICON
          const Icon = meta.icon
          const isTop = idx === 0
          return (
            <div key={item.industry}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <div className={clsx('w-6 h-6 rounded flex items-center justify-center flex-shrink-0', isTop ? 'bg-primary/10' : meta.bg)}>
                    <Icon className={clsx('w-3 h-3', isTop ? 'text-primary' : meta.color)} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{item.industry}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(item.arr_cad, true)}</span>
                  <span className="text-[10px] text-slate-400 w-8 text-right">{percent.toFixed(0)}%</span>
                </div>
              </div>
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(percent, 1)}%`, backgroundColor: isTop ? '#ec5b13' : '#94a3b8' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Account Type Breakdown — shows split by Customer vs Partner vs Other
function AccountTypeBreakdown({ data, totalARR }: { data: ARRByAccountType[]; totalARR: number }) {
  if (!data || data.length <= 1) return null
  
  const ACCOUNT_TYPE_COLORS: Record<string, string> = {
    'Customer': '#10b981',
    'Partner': '#6366f1',
    'Prospect': '#f59e0b',
  }
  const DEFAULT_COLOR = '#94a3b8'
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-full lg:w-52">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold text-slate-800 tracking-tight">By Account Type</h3>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3 flex-grow">
        {data.map((item) => {
          const percent = totalARR > 0 ? (item.arr_cad / totalARR) * 100 : 0
          const barColor = ACCOUNT_TYPE_COLORS[item.account_type] || DEFAULT_COLOR
          return (
            <div key={item.account_type}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
                  <span className="text-xs font-bold text-slate-700">{item.account_type}</span>
                  <span className="text-[10px] text-slate-400">({item.customer_count})</span>
                </div>
                <span className="text-[10px] text-slate-400">{percent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-0.5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(percent, 1)}%`, backgroundColor: barColor }}
                />
              </div>
              <p className="text-xs font-bold text-slate-900">{formatCurrency(item.arr_cad, true)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Contract Group Row Component - aligned with parent table columns
// Columns: Customer | Contracts | Industry | Currency | ARR | TCV | ACV | Renewals
function ContractGroupRow({ group, showNative }: { group: ARRContractGroup; showNative: boolean }) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  }
  
  return (
    <tr className="bg-slate-50/70 text-sm border-b border-slate-100/50">
      {/* Customer column - shows contract group name, indented */}
      <td className="py-2 px-4 pl-14">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-slate-600 truncate">{group.contract_group}</span>
        </div>
      </td>
      {/* Contracts column - shows revenue type */}
      <td className="py-2 px-4 text-center text-slate-500 text-xs">{group.revenue_type}</td>
      {/* Industry column - empty for contract rows */}
      <td className="py-2 px-4"></td>
      {/* Currency column */}
      <td className="py-2 px-4 text-slate-500 font-mono text-xs">{group.currency}</td>
      {/* ARR column */}
      <td className="py-2 px-4 text-right font-medium text-slate-700">
        {showNative && group.currency !== 'CAD' 
          ? formatCurrency(group.arr_native) 
          : formatCurrency(group.arr_cad)}
      </td>
      {/* TCV column */}
      <td className="py-2 px-4 text-right text-slate-600">
        {showNative && group.currency !== 'CAD'
          ? formatCurrency(group.tcv_native)
          : formatCurrency(group.tcv_cad)}
      </td>
      {/* ACV column - shows contract start date */}
      <td className="py-2 px-4 text-right text-slate-500 text-xs">
        {formatDate(group.contract_start)}
      </td>
      {/* Renewals column - shows contract end date */}
      <td className="py-2 px-4 text-left text-slate-500 text-xs">
        {formatDate(group.contract_end)}
      </td>
    </tr>
  )
}

// Customer Row Component
function CustomerRow({ 
  customer, 
  showNative, 
  isExpanded, 
  onToggle 
}: { 
  customer: ARRCustomerSummary
  showNative: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  const hasContractGroups = customer.contract_groups && customer.contract_groups.length > 0
  
  return (
    <>
      <tr 
        className={clsx(
          'border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer',
          isExpanded && 'bg-slate-50/50'
        )}
        onClick={onToggle}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            {hasContractGroups ? (
              <button 
                className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                onClick={(e) => { e.stopPropagation(); onToggle() }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-semibold">
              {customer.account.split(' ').slice(0, 2).map(n => n[0]).join('')}
            </div>
            <div>
              <p className="font-medium text-slate-800">{customer.account}</p>
              <p className="text-xs text-slate-500">
                {customer.region}
                {customer.industry && <span className="text-slate-400"> • {customer.industry}</span>}
              </p>
            </div>
          </div>
        </td>
        <td className="py-3 px-4 text-center text-slate-600">{customer.contract_count}</td>
        <td className="py-3 px-4 text-slate-500 text-xs">{customer.industry || '-'}</td>
        <td className="py-3 px-4 text-slate-500 font-mono text-xs">{customer.primary_currency}</td>
        <td className="py-3 px-4 text-right font-semibold text-slate-800">
          {formatCurrency(customer.total_arr_cad)}
        </td>
        <td className="py-3 px-4 text-right text-slate-600">
          {formatCurrency(customer.total_tcv_cad)}
        </td>
        <td className="py-3 px-4 text-right text-slate-600">
          {formatCurrency(customer.total_acv_cad)}
        </td>
        <td className="py-3 px-4">
          {customer.renewal_next_90_days > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
              <Calendar className="w-3 h-3" />
              {formatCurrency(customer.renewal_next_90_days, true)}
            </span>
          )}
        </td>
      </tr>
      {isExpanded && hasContractGroups && customer.contract_groups.map((group, idx) => (
        <ContractGroupRow key={idx} group={group} showNative={showNative} />
      ))}
    </>
  )
}

// Main ARR Analysis Component
export default function ARRAnalysis({ onBack, accountTypeFilter }: ARRAnalysisProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showNativeCurrency, _setShowNativeCurrency] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [selectedRevenueType, setSelectedRevenueType] = useState<string>('')
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())
  const [renewalPeriod, setRenewalPeriod] = useState(90)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const pageSize = 20

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Build filter params
  const filterParams = useMemo(() => {
    const params: Record<string, string | number> = { page_size: pageSize, renewal_period: renewalPeriod }
    if (debouncedSearch) params.search = debouncedSearch
    if (selectedRegion) params.region = selectedRegion
    if (selectedRevenueType) params.revenue_type = selectedRevenueType
    if (accountTypeFilter) params.account_type = accountTypeFilter
    return params
  }, [debouncedSearch, selectedRegion, selectedRevenueType, renewalPeriod, accountTypeFilter])

  // Fetch ARR analysis data with infinite scroll
  const {
    data: infiniteData,
    isLoading,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteARRCustomers(filterParams)

  // Flatten customers from all pages
  const customers = useMemo(() => {
    if (!infiniteData?.pages) return []
    return infiniteData.pages.flatMap(page => page.customers)
  }, [infiniteData])

  // Get summary from first page
  const summary = infiniteData?.pages[0]?.summary
  const totalCustomers = infiniteData?.pages[0]?.total_customers || 0

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Toggle customer expansion
  const toggleCustomer = useCallback((accountName: string) => {
    setExpandedCustomers(prev => {
      const next = new Set(prev)
      if (next.has(accountName)) {
        next.delete(accountName)
      } else {
        next.add(accountName)
      }
      return next
    })
  }, [])

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchTerm('')
    setSelectedRegion('')
    setSelectedRevenueType('')
  }, [])

  // Get unique regions and revenue types for filters
  const regions = useMemo(() => {
    return summary?.by_region.map(r => r.region) || []
  }, [summary])

  const revenueTypes = useMemo(() => {
    return summary?.by_revenue_type.map(r => r.revenue_type) || []
  }, [summary])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load ARR data</p>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Renewals Due</h1>
                <p className="text-sm text-slate-500">Renewal breakdown by customer, region, and type</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3" />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {isLoading && !summary ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : summary ? (
          <>
            {/* Summary Banner */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  {/* Renewal ARR */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Renewal ARR</p>
                      <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(summary.total_arr_cad, true)}</p>
                    </div>
                  </div>

                  <div className="w-px h-10 bg-slate-200" />

                  {/* Customers */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Customers</p>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{summary.total_customers}</p>
                  </div>

                  <div className="w-px h-10 bg-slate-200" />

                  {/* Contracts */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contracts</p>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{summary.total_contracts}</p>
                  </div>
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-1.5 bg-primary/5 rounded-lg px-3 py-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <select
                    value={renewalPeriod}
                    onChange={(e) => setRenewalPeriod(Number(e.target.value))}
                    className="appearance-none bg-transparent text-primary text-sm font-bold pr-5 border-none cursor-pointer focus:ring-0"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%233c83f6' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0px center' }}
                  >
                    {RENEWAL_PERIODS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Breakdown Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto_auto] gap-3 mb-4">
              <RevenueTypeBreakdown 
                data={summary.by_revenue_type} 
                totalARR={summary.total_arr_cad} 
              />
              <IndustryBreakdown 
                data={summary.by_industry || []} 
                totalARR={summary.total_arr_cad} 
              />
              <RegionBreakdown 
                data={summary.by_region} 
                totalARR={summary.total_arr_cad} 
              />
              <AccountTypeBreakdown 
                data={summary.by_account_type || []} 
                totalARR={summary.total_arr_cad} 
              />
            </div>

            {/* Drillable Table Header */}
            <div className="bg-white rounded-t-xl border border-slate-200 border-b-0 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-slate-700">Customer Revenue Details</h3>
                  <span className="text-xs text-slate-400">
                    {customers.length} of {totalCustomers} customers • Scroll for more
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Expand/Collapse All */}
                  <button
                    onClick={() => {
                      if (expandedCustomers.size > 0) {
                        setExpandedCustomers(new Set())
                      } else {
                        setExpandedCustomers(new Set(customers.map(c => c.account)))
                      }
                    }}
                    className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                  >
                    {expandedCustomers.size > 0 ? 'Collapse All' : 'Expand All'}
                  </button>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48 pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>
                  
                  {/* Region Filter */}
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="">All Regions</option>
                    {regions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                  
                  {/* Revenue Type Filter */}
                  <select
                    value={selectedRevenueType}
                    onChange={(e) => setSelectedRevenueType(e.target.value)}
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="">All Types</option>
                    {revenueTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  
                  {/* Clear Filters */}
                  {(searchTerm || selectedRegion || selectedRevenueType) && (
                    <button
                      onClick={resetFilters}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                      title="Clear filters"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Table */}
            <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Contracts
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Contracted Currency
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ARR
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      TCV
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ACV
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Renewals
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(customer => (
                    <CustomerRow
                      key={customer.account}
                      customer={customer}
                      showNative={showNativeCurrency}
                      isExpanded={expandedCustomers.has(customer.account)}
                      onToggle={() => toggleCustomer(customer.account)}
                    />
                  ))}
                </tbody>
              </table>
              
              {/* Infinite Scroll Sentinel */}
              <div ref={loadMoreRef} className="py-4 flex items-center justify-center border-t border-slate-100">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading more customers...</span>
                  </div>
                ) : hasNextPage ? (
                  <span className="text-sm text-slate-400">Scroll for more</span>
                ) : customers.length > 0 ? (
                  <span className="text-sm text-slate-400">
                    Showing all {totalCustomers} customers
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">No customers found</span>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
