import { useState, useCallback, useEffect, useMemo } from 'react'
import { 
  ChevronDown,
  X
} from 'lucide-react'
import { PortfolioSummary } from '../components/PortfolioSummary'
import { ActionableInsights } from '../components/ActionableInsights'
import { AccountTable } from '../components/AccountTable'
import { TabFilters } from '../components/TabFilters'
import { useMetrics, useAccounts, useInfiniteAccounts, useCustomerGrowth } from '../hooks/useAccounts'
import { useCSMs } from '../hooks/useCSM'
import type { TabFilter } from '../types'

type KpiFilter = 'all' | 'at_risk' | 'renewals' | 'usage_decline' | 'expansion'

interface DashboardProps {
  searchTerm: string
  onAccountClick?: (accountId: string) => void
  onOpenARR?: () => void
  onOpenCustomerGrowth?: () => void
  accountTypeFilter?: string
}

export function Dashboard({ searchTerm, onAccountClick, onOpenARR, onOpenCustomerGrowth, accountTypeFilter = 'all' }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [activeKpi, setActiveKpi] = useState<KpiFilter>('all')
  const [sortBy] = useState('attention_first')
  const [groupByParent, setGroupByParent] = useState(false)
  const [csmFilter, setCsmFilter] = useState<string | null>(null)
  const [csmDropdownOpen, setCsmDropdownOpen] = useState(false)
  const [csmSearch, setCsmSearch] = useState('')
  const [renewalPeriod, setRenewalPeriod] = useState(90)
  const pageSize = 20

  // Fetch metrics with account type filter and renewal period
  const { data: metrics, isLoading: metricsLoading } = useMetrics(
    accountTypeFilter !== 'all' ? accountTypeFilter : undefined,
    renewalPeriod
  )

  // Fetch customer growth data for the Companies card
  const { data: growthData } = useCustomerGrowth(
    accountTypeFilter !== 'all' ? accountTypeFilter : undefined
  )

  // Build query params based on active tab, KPI filter, search, and account type
  const filterParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page_size: pageSize,
      sort_by: sortBy,
    }

    // Add account type filter
    if (accountTypeFilter && accountTypeFilter !== 'all') {
      params.account_type = accountTypeFilter
    }

    // Add search if present
    if (searchTerm.trim()) {
      params.search = searchTerm.trim()
    }

    // Add KPI filter
    if (activeKpi !== 'all') {
      params.kpi_filter = activeKpi
    }

    // Add tab filters (only when not searching and no KPI filter)
    if (!searchTerm.trim() && activeKpi === 'all') {
      switch (activeTab) {
        case 'needs_attention':
          // Use the same filter as 'at_risk' KPI (health score < 70)
          params.kpi_filter = 'at_risk'
          break
        case 'renewals':
          params.kpi_filter = 'renewals'
          break
        case 'growth':
          params.health = 'Good'
          break
      }
    }

    return params
  }, [pageSize, sortBy, searchTerm, activeTab, activeKpi, accountTypeFilter])

  // Fetch accounts with infinite scroll (normal mode)
  const {
    data: accountsData,
    isLoading: accountsLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteAccounts(filterParams)

  // Fetch ALL accounts at once when grouping is enabled
  const allAccountsParams = useMemo(() => {
    return { ...filterParams, page_size: 1000, page: 1 }
  }, [filterParams])

  const needsAllAccounts = groupByParent || !!csmFilter
  const {
    data: allAccountsData,
    isLoading: allAccountsLoading,
  } = useAccounts(allAccountsParams, needsAllAccounts)

  // Reset filters when search changes
  useEffect(() => {
    if (searchTerm.trim()) {
      setActiveTab('all')
      setActiveKpi('all')
    }
  }, [searchTerm])

  // Handle KPI click
  const handleKpiClick = useCallback((kpi: KpiFilter) => {
    setActiveKpi(prev => prev === kpi ? 'all' : kpi)
    // Reset tab when KPI is selected
    if (kpi !== 'all') {
      setActiveTab('all')
    }
  }, [])

  // Flatten all pages of accounts into a single array
  const paginatedAccounts = useMemo(() => {
    if (!accountsData?.pages) return []
    return accountsData.pages.flatMap((page) => page.accounts)
  }, [accountsData])

  // Use all-accounts data when grouping or CSM filter is active, paginated data otherwise
  const rawAccounts = needsAllAccounts
    ? (allAccountsData?.accounts ?? [])
    : paginatedAccounts

  // Fetch full CSM list from API (independent of lazy-loaded accounts)
  const { data: csmListData } = useCSMs({ status: 'active' })
  const allCSMNames = useMemo(() => {
    if (!csmListData?.csms) return []
    return csmListData.csms.map(c => c.name).sort()
  }, [csmListData])

  // Filter CSM list by search input
  const filteredCSMs = useMemo(() => {
    if (!csmSearch.trim()) return allCSMNames
    const q = csmSearch.toLowerCase()
    return allCSMNames.filter(name => name.toLowerCase().includes(q))
  }, [allCSMNames, csmSearch])

  // Apply CSM filter client-side
  const allAccounts = useMemo(() => {
    if (!csmFilter) return rawAccounts
    return rawAccounts.filter(a => a.csm_name === csmFilter)
  }, [rawAccounts, csmFilter])

  const totalAccounts = needsAllAccounts
    ? (allAccountsData?.total ?? 0)
    : (accountsData?.pages[0]?.total ?? 0)

  // Get the actual at_risk_count from accounts API (accurate, calculated per account)
  const accountsAtRiskCount = needsAllAccounts
    ? (allAccountsData?.at_risk_count ?? 0)
    : (accountsData?.pages[0]?.at_risk_count ?? 0)

  const handleTabChange = useCallback((tab: TabFilter) => {
    setActiveTab(tab)
  }, [])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-y-auto">
      <div className="p-8 space-y-6 flex flex-col min-h-0 flex-1">
        {/* Search Results Indicator */}
        {searchTerm && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">{totalAccounts}</span>
            <span>results for</span>
            <span className="font-medium text-primary">"{searchTerm}"</span>
          </div>
        )}

        {/* KPI Cards Row */}
        <PortfolioSummary 
          metrics={metrics} 
          isLoading={metricsLoading} 
          onOpenARR={onOpenARR}
          onOpenCustomerGrowth={onOpenCustomerGrowth}
          growthSummary={growthData?.summary}
          growthSeries={growthData?.monthly_series}
          renewalPeriod={renewalPeriod}
          onRenewalPeriodChange={setRenewalPeriod}
        />

        {/* Actionable Insights */}
        <ActionableInsights 
          metrics={metrics} 
          isLoading={metricsLoading || accountsLoading}
          activeKpi={activeKpi}
          onKpiClick={handleKpiClick}
          filteredAtRiskCount={accountsAtRiskCount > 0 ? accountsAtRiskCount : undefined}
        />

        {/* Priority Accounts Table */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px] flex-1">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TabFilters
                activeTab={activeTab}
                onTabChange={handleTabChange}
                needsAttentionCount={
                  // Use actual at_risk_count from accounts API when available
                  accountsAtRiskCount > 0 ? accountsAtRiskCount : (metrics?.at_risk_count ?? 0)
                }
              />
            </div>
            
            <div className="flex items-center gap-2">
              {/* Group by Parent */}
              <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={groupByParent}
                  onChange={(e) => setGroupByParent(e.target.checked)}
                  className="w-3.5 h-3.5 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                />
                Group by Parent
              </label>

              {/* CSM Filter Dropdown */}
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
                      {/* Search input */}
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
                      {/* CSM list */}
                      <div className="max-h-[240px] overflow-y-auto py-1">
                        {!csmSearch.trim() && (
                          <button
                            onClick={() => { setCsmFilter(null); setCsmDropdownOpen(false) }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${!csmFilter ? 'font-bold text-primary-600 bg-primary-50/50' : 'text-slate-600'}`}
                          >
                            All CSMs
                          </button>
                        )}
                        {filteredCSMs.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-slate-400 text-center">No CSMs found</div>
                        ) : (
                          filteredCSMs.map(csm => (
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
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {(needsAllAccounts ? allAccountsLoading : accountsLoading) ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <AccountTable
                accounts={allAccounts}
                total={totalAccounts}
                searchTerm={searchTerm}
                hasNextPage={needsAllAccounts ? false : hasNextPage}
                isFetchingNextPage={needsAllAccounts ? false : isFetchingNextPage}
                onLoadMore={needsAllAccounts ? undefined : handleLoadMore}
                groupByParent={groupByParent}
                onAccountClick={onAccountClick}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
