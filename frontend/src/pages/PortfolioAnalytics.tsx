import { useState, Component, type ReactNode } from 'react'
import { ArrowLeft, Activity, TrendingUp } from 'lucide-react'
import { clsx } from 'clsx'
import HealthDistribution from './HealthDistribution'
import CustomerGrowth from './CustomerGrowth'

interface PortfolioAnalyticsProps {
  onBack: () => void
  onAccountClick?: (accountId: string) => void
  accountType?: string
  initialTab?: 'health' | 'growth'
}

type TabId = 'health' | 'growth'

const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: 'health', label: 'Health Distribution', icon: Activity },
  { id: 'growth', label: 'Customer Growth', icon: TrendingUp },
]

interface ErrorBoundaryState { hasError: boolean }
class PortfolioAnalyticsErrorBoundary extends Component<
  { children: ReactNode; onBack: () => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-rose-600">Something went wrong loading this page.</p>
          <button onClick={this.props.onBack} className="text-xs text-primary-600 hover:underline">Go back</button>
        </div>
      )
    }
    return this.props.children
  }
}

function PortfolioAnalyticsInner({ onBack, onAccountClick, accountType, initialTab = 'health' }: PortfolioAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Portfolio Analytics</h1>
            <p className="text-xs text-slate-400">Health trends, account movements & customer growth</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'health' && (
          <HealthDistribution
            onBack={onBack}
            onAccountClick={onAccountClick}
            accountType={accountType}
          />
        )}
        {activeTab === 'growth' && (
          <CustomerGrowth
            onBack={onBack}
            onAccountClick={onAccountClick}
            accountType={accountType}
            hideHeader
          />
        )}
      </div>
    </div>
  )
}

export default function PortfolioAnalytics(props: PortfolioAnalyticsProps) {
  return (
    <PortfolioAnalyticsErrorBoundary onBack={props.onBack}>
      <PortfolioAnalyticsInner {...props} />
    </PortfolioAnalyticsErrorBoundary>
  )
}
