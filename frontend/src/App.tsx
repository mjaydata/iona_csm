import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dashboard } from './pages/Dashboard'
import { ManageCSM } from './pages/ManageCSM'
import { Actions } from './pages/Actions'
import { AccountDetail } from './pages/AccountDetail'
import ARRAnalysis from './pages/ARRAnalysis'
import PortfolioAnalytics from './pages/PortfolioAnalytics'
import { Header } from './components/Header'
import { Sidebar, type NavItem } from './components/Sidebar'
import { useAccountTypeCounts } from './hooks/useAccounts'
import { useHashRoute } from './hooks/useHashRoute'

const CURRENT_USER = {
  email: 'misagh.jebeli@ifs.com',
  initials: 'MJ',
}

const GENIE_URL = 'https://dbc-97a2feb3-3e52.cloud.databricks.com/genie/rooms/01f099415bb81fdca08095d22b5c146a?o=1057997375544232'
const NPS_DASHBOARD_URL = 'https://dbc-97a2feb3-3e52.cloud.databricks.com/embed/dashboardsv3/01f122cf0fcd1a4fa2ad740905887fa2?o=1057997375544232'
const SUN_TOKEN_DASHBOARD_URL = 'https://dbc-97a2feb3-3e52.cloud.databricks.com/embed/dashboardsv3/01f1344b530f1afd9f30e82215301fbf?o=1057997375544232'

const BASE_ACCOUNT_TYPES = [
  { value: 'all', label: 'All Accounts', key: 'all' },
  { value: 'Customer', label: 'Customers', key: 'Customer' },
  { value: 'Prospect', label: 'Prospects', key: 'Prospect' },
  { value: 'Consultant', label: 'Consultants', key: 'Consultant' },
  { value: 'Integrator', label: 'Integrators', key: 'Integrator' },
  { value: 'Association', label: 'Associations', key: 'Association' },
]

function App() {
  const { route, navigateTo, openAccount, openSubPage, goHome } = useHashRoute()

  const [searchTerm, setSearchTerm] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState('Customer')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const queryClient = useQueryClient()

  const activeNav = route.nav
  const selectedAccountId = route.accountId

  const handleAccountTypeChange = useCallback((value: string) => {
    queryClient.cancelQueries({ queryKey: ['accounts-infinite'] })
    queryClient.cancelQueries({ queryKey: ['accounts'] })
    queryClient.cancelQueries({ queryKey: ['metrics'] })
    queryClient.cancelQueries({ queryKey: ['customer-growth'] })
    setAccountTypeFilter(value)
  }, [queryClient])
  const [countsReady, setCountsReady] = useState(false)
  useEffect(() => { setCountsReady(true) }, [])
  const { data: accountTypeCounts } = useAccountTypeCounts(countsReady)

  const accountTypeOptions = useMemo(() => {
    return BASE_ACCOUNT_TYPES.map((t) => {
      const count = accountTypeCounts?.[t.key]
      return {
        value: t.value,
        label: t.label,
        count: count ?? undefined,
      }
    })
  }, [accountTypeCounts])

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  const handleNavigate = useCallback((item: NavItem) => {
    if (item === 'chat') return
    navigateTo(item)
    if (item !== 'home') {
      setSearchTerm('')
    }
  }, [navigateTo])

  const handleOpenARR = useCallback(() => {
    openSubPage('arr')
  }, [openSubPage])

  const handleCloseARR = useCallback(() => {
    goHome()
  }, [goHome])

  const handleOpenCustomerGrowth = useCallback(() => {
    openSubPage('growth')
  }, [openSubPage])

  const handleCloseCustomerGrowth = useCallback(() => {
    goHome()
  }, [goHome])

  const handleAccountClick = useCallback((accountId: string) => {
    openAccount(accountId)
  }, [openAccount])

  const handleBackToPortfolio = useCallback(() => {
    goHome()
  }, [goHome])

  const handleOpenChat = useCallback(() => {
    const width = Math.max(900, Math.floor(window.screen.availWidth * 0.55))
    const height = Math.floor(window.screen.availHeight * 0.92)
    const left = window.screen.availWidth - width - 10
    const top = Math.floor((window.screen.availHeight - height) / 2)

    const popup = window.open(
      GENIE_URL,
      'genie-chat',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no`
    )
    popup?.focus()
  }, [])

  const PAGE_TITLES: Record<NavItem, string> = {
    'home': 'Portfolio Summary',
    'csm-management': 'CSM Assignments',
    'actions': 'Actions',
    'nps-satisfaction': 'NPS & Satisfaction',
    'sun-token-dashboard': 'SUN Token Dashboard',
    'chat': 'Ask Genie',
  }

  const isHome = activeNav === 'home'
  const homeSubPage = isHome && selectedAccountId ? 'account'
    : isHome && route.subPage === 'arr' ? 'arr'
    : isHome && route.subPage === 'growth' ? 'growth'
    : null
  const showDashboard = isHome && !homeSubPage

  const renderPage = () => {
    return (
      <>
        {/* Dashboard stays mounted while on home nav to preserve filter/scroll state */}
        {isHome && (
          <main className="flex-1 overflow-y-auto" style={{ display: showDashboard ? undefined : 'none' }}>
            <Dashboard 
              searchTerm={searchTerm} 
              onAccountClick={handleAccountClick} 
              onOpenARR={handleOpenARR}
              onOpenCustomerGrowth={handleOpenCustomerGrowth}
              accountTypeFilter={accountTypeFilter}
            />
          </main>
        )}

        {homeSubPage === 'arr' && (
          <main className="flex-1 overflow-auto">
            <ARRAnalysis 
              onBack={handleCloseARR} 
              accountTypeFilter={accountTypeFilter !== 'all' ? accountTypeFilter : undefined}
            />
          </main>
        )}

        {homeSubPage === 'growth' && (
          <main className="flex-1 overflow-auto">
            <PortfolioAnalytics 
              onBack={handleCloseCustomerGrowth} 
              onAccountClick={handleAccountClick}
              accountType={accountTypeFilter}
              initialTab="health"
            />
          </main>
        )}

        {homeSubPage === 'account' && selectedAccountId && (
          <AccountDetail 
            accountId={selectedAccountId} 
            onBack={handleBackToPortfolio} 
          />
        )}

        {activeNav === 'csm-management' && (
          <main className="flex-1 overflow-auto bg-slate-50">
            <ManageCSM accountTypeFilter={accountTypeFilter} />
          </main>
        )}

        {activeNav === 'actions' && (
          <main className="flex-1 overflow-auto bg-slate-50">
            <Actions />
          </main>
        )}

        {activeNav === 'nps-satisfaction' && (
          <main className="flex-1 overflow-hidden">
            <iframe
              src={NPS_DASHBOARD_URL}
              title="NPS & Satisfaction"
              className="w-full h-full border-0"
              allow="fullscreen"
            />
          </main>
        )}

        {activeNav === 'sun-token-dashboard' && (
          <main className="flex-1 overflow-hidden">
            <iframe
              src={SUN_TOKEN_DASHBOARD_URL}
              title="SUN Token Dashboard"
              className="w-full h-full border-0"
              allow="fullscreen"
            />
          </main>
        )}

      </>
    )
  }

  return (
    <div className="h-screen bg-background-light overflow-hidden">
      {/* Sidebar - Fixed position */}
      <Sidebar 
        activeItem={activeNav} 
        onNavigate={handleNavigate}
        userEmail={CURRENT_USER.email}
        userInitials={CURRENT_USER.initials}
        onOpenChat={handleOpenChat}
        isExpanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />

      {/* Main Content - Offset for sidebar */}
      <div className={`flex flex-col h-screen min-w-0 overflow-hidden transition-all duration-300 ${sidebarExpanded ? 'ml-56' : 'ml-16'}`}>
        <Header
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          showSearch={activeNav === 'home'}
          accountTypeFilter={accountTypeFilter}
          onAccountTypeChange={handleAccountTypeChange}
          accountTypeOptions={accountTypeOptions}
          pageTitle={PAGE_TITLES[activeNav]}
          showAccountTypeFilter={activeNav === 'home' || activeNav === 'csm-management'}
        />
        {renderPage()}
      </div>
    </div>
  )
}

export default App
