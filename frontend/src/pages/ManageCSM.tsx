import { useState, useMemo } from 'react'
import { 
  Users, 
  UserPlus, 
  BarChart3, 
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Clock,
  UserX,
  User,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useCSMStats, useCSMs, useAccountsWithCSM } from '../hooks/useCSM'
import { CSMProfilePanel } from '../components/CSMProfilePanel'
import type { CSM, AccountWithCSM, CSMStatus, RenewalInfo } from '../types'

// Utility to format currency
function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

// Health badge component
function HealthBadge({ health }: { health: string }) {
  const config = {
    Critical: { bg: 'bg-rose-100', text: 'text-rose-700', icon: XCircle },
    'At Risk': { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
    Good: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
    Unknown: { bg: 'bg-slate-100', text: 'text-slate-500', icon: null },
  }[health] || { bg: 'bg-slate-100', text: 'text-slate-500', icon: null }

  const Icon = config.icon

  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.bg, config.text)}>
      {Icon && <Icon className="w-3 h-3" />}
      {health}
    </span>
  )
}

// CSM Status badge component
function CSMStatusBadge({ status }: { status: CSMStatus }) {
  const config = {
    active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active', icon: CheckCircle },
    inactive: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Inactive', icon: Clock },
    departed: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Departed', icon: UserX },
  }[status]

  const Icon = config.icon

  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.bg, config.text)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

// Renewal cell with tooltip (same pattern as homepage)
function RenewalCell({ renewals, fallbackDays }: { renewals?: RenewalInfo[]; fallbackDays: number | null }) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (!renewals || renewals.length === 0) {
    if (fallbackDays === null || fallbackDays === undefined) return <span className="text-sm text-slate-400">-</span>
    if (fallbackDays >= 999) return <span className="text-sm text-slate-400">—</span>
    return <span className="text-sm text-slate-600">{fallbackDays}d</span>
  }

  const sorted = [...renewals].sort((a, b) => (a.renewal_days ?? 9999) - (b.renewal_days ?? 9999))
  const primary = sorted[0]
  const hasMultiple = sorted.length > 1

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return d }
  }

  const typeBadgeColor = (t: string) =>
    t === 'SaaS' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'

  const daysColor = (days: number | null) =>
    days !== null && days <= 30 ? 'text-rose-600' :
    days !== null && days <= 90 ? 'text-amber-600' : 'text-slate-700'

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-1.5">
        <span className={clsx('text-sm font-medium', daysColor(primary.renewal_days))}>
          {primary.renewal_days != null ? `${primary.renewal_days}d` : '—'}
        </span>
        <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold', typeBadgeColor(primary.revenue_type))}>
          {primary.revenue_type}
        </span>
        {hasMultiple && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
            +{sorted.length - 1}
          </span>
        )}
      </div>

      {showTooltip && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-slate-800 text-white rounded-lg shadow-lg px-3 py-2.5 min-w-[200px]">
          <div className="absolute left-4 -top-1 w-2 h-2 bg-slate-800 rotate-45" />
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Renewal Dates</div>
          <div className="space-y-1.5">
            {sorted.map((r) => (
              <div key={r.revenue_type} className="flex items-center justify-between gap-4">
                <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
                  r.revenue_type === 'SaaS' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                )}>
                  {r.revenue_type}
                </span>
                <div className="text-right">
                  <div className="text-xs font-medium">{formatDate(r.renewal_date)}</div>
                  <div className="text-[10px] text-slate-400">
                    {r.renewal_days != null ? `${r.renewal_days} days` : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Clickable Stat Card component
function StatCard({ 
  icon: Icon, 
  iconBg, 
  iconColor, 
  value, 
  label, 
  isLoading,
  isActive,
  onClick,
  clickable = false,
}: { 
  icon: typeof Users
  iconBg: string
  iconColor: string
  value: string | number
  label: string
  isLoading?: boolean
  isActive?: boolean
  onClick?: () => void
  clickable?: boolean
}) {
  return (
    <div 
      className={clsx(
        'bg-white rounded-xl shadow-sm border p-5 transition-all',
        clickable && 'cursor-pointer hover:shadow-md',
        isActive 
          ? 'border-primary-500 ring-2 ring-primary-100 bg-primary-50/30' 
          : 'border-gray-200 hover:border-gray-300'
      )}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-center gap-4">
        <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className={clsx('w-5 h-5', iconColor)} />
        </div>
        <div className="flex-1">
          {isLoading ? (
            <div className="h-7 w-16 bg-slate-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-slate-800">{value}</p>
          )}
          <p className="text-sm text-slate-500">{label}</p>
        </div>
        {isActive && (
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-primary-500" />
          </div>
        )}
      </div>
    </div>
  )
}

// CSM Row with expandable accounts
function CSMRow({ 
  csm, 
  isExpanded, 
  onToggle,
  onViewProfile,
  avgAccounts,
}: { 
  csm: CSM
  isExpanded: boolean
  onToggle: () => void
  onViewProfile: () => void
  avgAccounts: number
}) {
  // Fetch accounts for this CSM when expanded
  const { data: accountsData, isLoading: accountsLoading } = useAccountsWithCSM({
    csm_id: csm.id,
    page_size: 100,
  })

  const workloadPercent = avgAccounts > 0 ? (csm.account_count / avgAccounts) * 100 : 100
  const workloadLevel = workloadPercent > 120 ? 'high' : workloadPercent < 80 ? 'low' : 'normal'

  const isInactive = csm.status === 'inactive'
  const isDeparted = csm.status === 'departed'

  return (
    <>
      {/* CSM Main Row */}
      <tr 
        className={clsx(
          'transition-colors cursor-pointer',
          isExpanded && 'bg-slate-50',
          isDeparted ? 'bg-rose-50/30 hover:bg-rose-50/50' :
          isInactive ? 'bg-slate-50/50 hover:bg-slate-100/50' :
          'hover:bg-slate-50'
        )}
        onClick={onToggle}
      >
        <td className="py-3 px-4">
          <button className="p-1 text-slate-400 hover:text-slate-600">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0',
              isDeparted ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
              isInactive ? 'bg-gradient-to-br from-slate-300 to-slate-400' :
              'bg-gradient-to-br from-primary-400 to-primary-600'
            )}>
              {csm.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className={clsx(
                  'font-medium',
                  isDeparted ? 'text-slate-500 line-through' :
                  isInactive ? 'text-slate-600' :
                  'text-slate-800'
                )}>
                  {csm.name}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); onViewProfile(); }}
                  className="p-1 text-slate-300 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                  title="View CSM Profile"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
                {(isInactive || isDeparted) && (
                  <CSMStatusBadge status={csm.status} />
                )}
              </div>
              <p className="text-xs text-slate-500">{csm.email}</p>
            </div>
          </div>
        </td>
        <td className="py-3 px-4 text-center">
          <span className={clsx(
            'text-sm font-semibold',
            isDeparted ? 'text-rose-600' : 'text-slate-800'
          )}>
            {csm.account_count}
            {isDeparted && csm.account_count > 0 && (
              <span className="ml-1 text-xs font-normal text-rose-500">(reassign)</span>
            )}
          </span>
        </td>
        <td className="py-3 px-4 text-right">
          <span className={clsx(
            'text-sm font-medium',
            isDeparted ? 'text-slate-500' : 'text-slate-800'
          )}>
            {formatCurrency(csm.total_arr)}
          </span>
        </td>
        <td className="py-3 px-4 text-center">
          {csm.at_risk_count > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              {csm.at_risk_count}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              <CheckCircle className="w-3 h-3" />
              0
            </span>
          )}
        </td>
        <td className="py-3 px-4">
          {isDeparted ? (
            <span className="text-xs text-rose-600 font-medium">N/A</span>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={clsx(
                    'h-full rounded-full transition-all',
                    workloadLevel === 'high' ? 'bg-rose-500' :
                    workloadLevel === 'low' ? 'bg-amber-500' :
                    'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(workloadPercent, 100)}%` }}
                />
              </div>
              <span className={clsx(
                'text-xs font-medium w-10',
                workloadLevel === 'high' ? 'text-rose-600' :
                workloadLevel === 'low' ? 'text-amber-600' :
                'text-emerald-600'
              )}>
                {workloadPercent.toFixed(0)}%
              </span>
            </div>
          )}
        </td>
      </tr>

      {/* Expanded Accounts */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className={clsx(
              'border-t',
              isDeparted ? 'bg-rose-50/30' : 'bg-gradient-to-b from-slate-50/80 to-white'
            )}>
              {accountsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                  <span className="ml-2 text-sm text-slate-500">Loading accounts...</span>
                </div>
              ) : accountsData?.accounts && accountsData.accounts.length > 0 ? (
                <div className="px-6 py-4">
                  {isDeparted && (
                    <div className="mb-3 px-4 py-2.5 bg-rose-100/80 rounded-lg text-sm text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      These accounts need to be reassigned to an active CSM
                    </div>
                  )}
                  {/* Summary strip */}
                  <div className="flex items-center gap-4 mb-3 px-1">
                    <span className="text-xs font-medium text-slate-500">
                      {accountsData.accounts.length} account{accountsData.accounts.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                    {(() => {
                      const atRisk = accountsData.accounts.filter(a => a.health === 'At Risk' || a.health === 'Critical').length
                      return atRisk > 0 ? (
                        <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {atRisk} at risk
                        </span>
                      ) : null
                    })()}
                  </div>
                  {/* Account cards grid */}
                  <div className="grid gap-2">
                    {accountsData.accounts.map((account) => (
                      <div
                        key={account.id}
                        className="group flex items-center gap-4 px-4 py-3 rounded-lg bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
                      >
                        {/* Account name + avatar */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                            account.health === 'Critical' ? 'bg-rose-100 text-rose-700' :
                            account.health === 'At Risk' ? 'bg-amber-100 text-amber-700' :
                            'bg-primary-50 text-primary-600'
                          )}>
                            {account.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate group-hover:text-primary-700 transition-colors">
                              {account.name}
                            </p>
                            <p className="text-[11px] text-slate-400">{account.account_type || 'Unknown'}</p>
                          </div>
                        </div>

                        {/* ARR */}
                        <div className="w-24 text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-slate-800">{formatCurrency(account.arr)}</p>
                          <p className="text-[11px] text-slate-400">ARR</p>
                        </div>

                        {/* Health */}
                        <div className="w-20 text-center flex-shrink-0">
                          <HealthBadge health={account.health} />
                        </div>

                        {/* Renewal */}
                        <div className="w-28 text-right flex-shrink-0">
                          <RenewalCell renewals={account.renewals} fallbackDays={account.renewal_days} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No accounts assigned
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// Unassigned Accounts Section (as a table section)
function UnassignedAccountsTable({ 
  accounts, 
  isLoading 
}: { 
  accounts: AccountWithCSM[]
  isLoading: boolean 
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
        <p className="text-lg font-medium text-emerald-700">All accounts assigned</p>
        <p className="text-sm mt-1">No unassigned accounts at this time</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-amber-50 sticky top-0">
          <tr className="border-b border-amber-200">
            <th className="text-left py-3 px-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">Account</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">Type</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">ARR</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">Health</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-amber-700 uppercase tracking-wider">Renewal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-100 bg-amber-50/30">
          {accounts.map((account) => (
            <tr key={account.id} className="hover:bg-amber-50 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-xs font-semibold">
                    {account.name.charAt(0)}
                  </div>
                  <span className="font-medium text-slate-800">{account.name}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-slate-600">{account.account_type || '-'}</span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-sm font-medium text-slate-800">{formatCurrency(account.arr)}</span>
              </td>
              <td className="py-3 px-4 text-center">
                <HealthBadge health={account.health} />
              </td>
              <td className="py-3 px-4 text-center">
                <RenewalCell renewals={account.renewals} fallbackDays={account.renewal_days} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Main component
export function ManageCSM() {
  const [expandedCSMs, setExpandedCSMs] = useState<Set<string>>(new Set())
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false)
  const [csmStatusFilter, setCsmStatusFilter] = useState<string>('')
  const [selectedCSM, setSelectedCSM] = useState<CSM | null>(null)

  // CSM filter dropdown (like homepage)
  const [csmFilter, setCsmFilter] = useState<string | null>(null)
  const [csmDropdownOpen, setCsmDropdownOpen] = useState(false)
  const [csmSearch, setCsmSearch] = useState('')

  // Queries
  const { data: stats, isLoading: statsLoading } = useCSMStats()
  const { data: csmsData, isLoading: csmsLoading } = useCSMs({ status: csmStatusFilter || undefined })
  const { data: allCSMsData } = useCSMs({ status: 'active' })
  const { data: unassignedData, isLoading: unassignedLoading } = useAccountsWithCSM({
    unassigned_only: true,
    page_size: 100,
  })

  // Full CSM name list for the filter dropdown (independent of status filter)
  const allCSMNames = useMemo(() => {
    if (!allCSMsData?.csms) return []
    return allCSMsData.csms.map(c => c.name).sort()
  }, [allCSMsData])

  // Filter dropdown list by search input
  const dropdownCSMs = useMemo(() => {
    if (!csmSearch.trim()) return allCSMNames
    const q = csmSearch.toLowerCase()
    return allCSMNames.filter(name => name.toLowerCase().includes(q))
  }, [allCSMNames, csmSearch])

  // Filter CSMs by selected CSM name
  const filteredCSMs = useMemo(() => {
    if (!csmsData?.csms) return []
    if (!csmFilter) return csmsData.csms
    return csmsData.csms.filter(csm => csm.name === csmFilter)
  }, [csmsData, csmFilter])

  // Calculate average accounts for workload (only from active CSMs)
  const avgAccounts = useMemo(() => {
    if (!csmsData?.csms || csmsData.csms.length === 0) return 0
    const activeCSMs = csmsData.csms.filter(c => c.status === 'active')
    if (activeCSMs.length === 0) return 0
    return activeCSMs.reduce((sum, c) => sum + c.account_count, 0) / activeCSMs.length
  }, [csmsData])

  // Toggle CSM expansion
  const toggleCSM = (csmId: string) => {
    setExpandedCSMs(prev => {
      const next = new Set(prev)
      if (next.has(csmId)) {
        next.delete(csmId)
      } else {
        next.add(csmId)
      }
      return next
    })
  }

  // Handle clicking on Unassigned stat card
  const handleUnassignedClick = () => {
    setShowUnassignedOnly(!showUnassignedOnly)
  }

  // Clear all filters
  const clearFilters = () => {
    setCsmFilter(null)
    setCsmSearch('')
    setShowUnassignedOnly(false)
    setCsmStatusFilter('')
  }

  const hasActiveFilters = csmFilter || showUnassignedOnly || csmStatusFilter

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">CSM Assignments</h1>
        <p className="text-slate-500 mt-1">Manage Customer Success Manager assignments and workload distribution</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Users}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
          value={stats?.active_csms ?? '-'}
          label="Active CSMs"
          isLoading={statsLoading}
        />
        <StatCard
          icon={BarChart3}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          value={stats?.avg_accounts_per_csm?.toFixed(1) ?? '-'}
          label="Avg Accounts/CSM"
          isLoading={statsLoading}
        />
        <StatCard
          icon={UserPlus}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          value={stats?.unassigned_accounts ?? '-'}
          label="Unassigned Accounts"
          isLoading={statsLoading}
          clickable
          isActive={showUnassignedOnly}
          onClick={handleUnassignedClick}
        />
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filter Bar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800">
              {showUnassignedOnly ? 'Unassigned Accounts' : 'CSMs'}
            </h2>
            {!showUnassignedOnly && csmsData && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                {filteredCSMs.length}
              </span>
            )}
            {showUnassignedOnly && unassignedData && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {unassignedData.accounts.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* CSM Filter Dropdown (combined search + select, like homepage) */}
            {!showUnassignedOnly && (
              <div className="relative">
                <button
                  onClick={() => { setCsmDropdownOpen(!csmDropdownOpen); setCsmSearch('') }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    csmFilter
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  CSM: <span className="font-bold">{csmFilter || 'All'}</span>
                  {csmFilter ? (
                    <X
                      className="w-3 h-3 hover:text-primary-900"
                      onClick={(e) => { e.stopPropagation(); setCsmFilter(null); setCsmDropdownOpen(false) }}
                    />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {csmDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setCsmDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg w-[220px] overflow-hidden">
                      <div className="p-2 border-b border-slate-100">
                        <input
                          type="text"
                          value={csmSearch}
                          onChange={(e) => setCsmSearch(e.target.value)}
                          placeholder="Search CSM..."
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300 placeholder-slate-400"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-[240px] overflow-y-auto py-1">
                        {!csmSearch.trim() && (
                          <button
                            onClick={() => { setCsmFilter(null); setCsmDropdownOpen(false) }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${!csmFilter ? 'font-bold text-primary-600 bg-primary-50/50' : 'text-slate-600'}`}
                          >
                            All CSMs
                          </button>
                        )}
                        {dropdownCSMs.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-slate-400 text-center">No CSMs found</div>
                        ) : (
                          dropdownCSMs.map(csm => (
                            <button
                              key={csm}
                              onClick={() => { setCsmFilter(csm); setCsmDropdownOpen(false); setCsmSearch('') }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${csmFilter === csm ? 'font-bold text-primary-600 bg-primary-50/50' : 'text-slate-600'}`}
                            >
                              {csm}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* CSM Status Filter */}
            {!showUnassignedOnly && (
              <select
                value={csmStatusFilter}
                onChange={(e) => setCsmStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="departed">Departed</option>
              </select>
            )}

            {/* Unassigned Toggle */}
            <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={showUnassignedOnly}
                onChange={(e) => setShowUnassignedOnly(e.target.checked)}
                className="w-3.5 h-3.5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
              />
              <span className="text-xs text-slate-600">Unassigned only</span>
            </label>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="min-h-[400px]">
          {showUnassignedOnly ? (
            // Unassigned Accounts View
            <UnassignedAccountsTable
              accounts={unassignedData?.accounts || []}
              isLoading={unassignedLoading}
            />
          ) : (
            // CSMs View
            csmsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            ) : filteredCSMs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">No CSMs found</p>
                <p className="text-sm mt-1">
                  {csmStatusFilter 
                    ? `No ${csmStatusFilter} CSMs found. Try a different filter.`
                    : 'Try adjusting your search or filters'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="border-b border-slate-200">
                      <th className="w-12 py-3 px-4"></th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">CSM</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Accounts</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total ARR</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">At Risk</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Workload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCSMs.map((csm) => (
                      <CSMRow
                        key={csm.id}
                        csm={csm}
                        isExpanded={expandedCSMs.has(csm.id)}
                        onToggle={() => toggleCSM(csm.id)}
                        onViewProfile={() => setSelectedCSM(csm)}
                        avgAccounts={avgAccounts}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* CSM Profile Panel */}
      {selectedCSM && (
        <CSMProfilePanel
          csm={selectedCSM}
          isOpen={!!selectedCSM}
          onClose={() => setSelectedCSM(null)}
        />
      )}
    </div>
  )
}
