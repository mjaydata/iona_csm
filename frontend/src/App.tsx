import { useState, useCallback, useMemo } from 'react'
import { Dashboard } from './pages/Dashboard'
import { ManageCSM } from './pages/ManageCSM'
import { Actions } from './pages/Actions'
import { AccountDetail } from './pages/AccountDetail'
import ARRAnalysis from './pages/ARRAnalysis'
import PortfolioAnalytics from './pages/PortfolioAnalytics'
import { Header } from './components/Header'
import { Sidebar, type NavItem } from './components/Sidebar'
import { useAccountTypeCounts } from './hooks/useAccounts'

// TODO: Replace with actual authenticated user info
const CURRENT_USER = {
  email: 'misagh.jebeli@ifs.com',
  initials: 'MJ',
}

const GENIE_URL = 'https://dbc-97a2feb3-3e52.cloud.databricks.com/genie/rooms/01f099415bb81fdca08095d22b5c146a?o=1057997375544232'
const NPS_DASHBOARD_URL = 'https://dbc-97a2feb3-3e52.cloud.databricks.com/embed/dashboardsv3/01f122cf0fcd1a4fa2ad740905887fa2?o=1057997375544232'

// Base account type options
const BASE_ACCOUNT_TYPES = [
  { value: 'all', label: 'All Accounts', key: 'all' },
  { value: 'Customer', label: 'Customers', key: 'Customer' },
  { value: 'Prospect', label: 'Prospects', key: 'Prospect' },
  { value: 'Consultant', label: 'Consultants', key: 'Consultant' },
  { value: 'Integrator', label: 'Integrators', key: 'Integrator' },
  { value: 'Association', label: 'Associations', key: 'Association' },
]

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeNav, setActiveNav] = useState<NavItem>('home')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [showARRAnalysis, setShowARRAnalysis] = useState(false)
  const [showCustomerGrowth, setShowCustomerGrowth] = useState(false)
  const [accountTypeFilter, setAccountTypeFilter] = useState('Customer') // Default to Customers for CSMs
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const { data: accountTypeCounts } = useAccountTypeCounts()

  // Build account type options with counts
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
    if (item !== 'chat') {
      setActiveNav(item)
      // Clear search and selected account when navigating away from home
      if (item !== 'home') {
        setSearchTerm('')
        setSelectedAccountId(null)
        setShowARRAnalysis(false)
        setShowCustomerGrowth(false)
      }
    }
  }, [])

  const handleOpenARR = useCallback(() => {
    setShowARRAnalysis(true)
    setShowCustomerGrowth(false)
  }, [])

  const handleCloseARR = useCallback(() => {
    setShowARRAnalysis(false)
  }, [])

  const handleOpenCustomerGrowth = useCallback(() => {
    setShowCustomerGrowth(true)
    setShowARRAnalysis(false)
  }, [])

  const handleCloseCustomerGrowth = useCallback(() => {
    setShowCustomerGrowth(false)
  }, [])

  const handleAccountClick = useCallback((accountId: string) => {
    setSelectedAccountId(accountId)
  }, [])

  const handleBackToPortfolio = useCallback(() => {
    setSelectedAccountId(null)
  }, [])

  const handleOpenChat = useCallback(() => {
    // Wide popup - 55% of screen width, nearly full height
    const width = Math.max(900, Math.floor(window.screen.availWidth * 0.55))
    const height = Math.floor(window.screen.availHeight * 0.92)
    // Position on right side of screen, vertically centered
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
    'chat': 'Ask Genie',
  }

  const isHome = activeNav === 'home'
  const homeSubPage = isHome && selectedAccountId ? 'account'
    : isHome && showARRAnalysis ? 'arr'
    : isHome && showCustomerGrowth ? 'growth'
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
          onAccountTypeChange={setAccountTypeFilter}
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
