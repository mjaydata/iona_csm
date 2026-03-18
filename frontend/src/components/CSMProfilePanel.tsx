import { useMemo } from 'react'
import { 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Award,
  Target,
  MessageSquare,
  Star,
  Briefcase,
  Building,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { CSM, CSMProfile, CSMAssignmentHistoryItem } from '../types'

// Utility to format currency
function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Format tenure
function formatTenure(months: number): string {
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years === 0) return `${remainingMonths} months`
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`
  return `${years}y ${remainingMonths}m`
}

// Mock data generator for CSM profile
function getMockCSMProfile(csm: CSM): CSMProfile {
  const isActive = csm.status === 'active'
  const tenure = isActive ? Math.floor(Math.random() * 48) + 12 : Math.floor(Math.random() * 36) + 6
  
  return {
    id: csm.id,
    name: csm.name,
    email: csm.email,
    status: csm.status,
    avatar_url: null,
    title: 'Customer Success Manager',
    department: 'Customer Success',
    manager_name: 'Sarah Johnson',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    
    hire_date: new Date(Date.now() - tenure * 30 * 24 * 60 * 60 * 1000).toISOString(),
    tenure_months: tenure,
    last_active: isActive ? new Date().toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    
    current_accounts: csm.account_count,
    current_arr: csm.total_arr,
    at_risk_accounts: csm.at_risk_count,
    renewals_next_90_days: Math.floor(csm.account_count * 0.2),
    
    total_accounts_managed: csm.account_count + Math.floor(Math.random() * 20) + 5,
    total_arr_managed_lifetime: csm.total_arr * 1.5 + Math.random() * 10000000,
    accounts_successfully_renewed: Math.floor(Math.random() * 40) + 20,
    accounts_churned: Math.floor(Math.random() * 5),
    renewal_rate: 85 + Math.random() * 12,
    avg_health_score: 70 + Math.random() * 20,
    
    nps_score: Math.floor(Math.random() * 30) + 60,
    csat_score: 4.2 + Math.random() * 0.6,
    avg_response_time_hours: 2 + Math.random() * 6,
  }
}

// Mock assignment history
function getMockAssignmentHistory(csmName: string): CSMAssignmentHistoryItem[] {
  const actions: Array<'assigned' | 'removed' | 'transferred_in' | 'transferred_out'> = [
    'assigned', 'transferred_in', 'assigned', 'transferred_out', 'removed', 'assigned', 'transferred_in'
  ]
  
  const accounts = [
    { name: 'Acme Corporation', type: 'Enterprise', arr: 2500000 },
    { name: 'TechStart Inc', type: 'Mid-Market', arr: 450000 },
    { name: 'Global Systems', type: 'Enterprise', arr: 3200000 },
    { name: 'DataFlow Analytics', type: 'SMB', arr: 120000 },
    { name: 'CloudNet Services', type: 'Mid-Market', arr: 680000 },
    { name: 'Innovate Labs', type: 'Enterprise', arr: 1800000 },
    { name: 'SecureBase', type: 'Mid-Market', arr: 520000 },
    { name: 'FinanceHub', type: 'Enterprise', arr: 4100000 },
  ]
  
  const reasons = [
    'New customer onboarding',
    'Territory realignment',
    'CSM capacity balancing',
    'Customer request',
    'Account churn',
    'CSM departure coverage',
    'Strategic account assignment',
  ]
  
  const otherCSMs = ['Anna Perez', 'Thomas Nguyen', 'Priya Patel', 'Alex Chen', 'Sarah Robinson']
  
  return accounts.slice(0, 7).map((account, i) => {
    const action = actions[i % actions.length]
    const daysAgo = (i + 1) * 30 + Math.floor(Math.random() * 30)
    
    return {
      id: `hist-${i}`,
      account_id: `acc-${i}`,
      account_name: account.name,
      account_type: account.type,
      arr: account.arr,
      action,
      action_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      reason: reasons[i % reasons.length],
      previous_csm_name: action === 'transferred_in' || action === 'assigned' ? otherCSMs[i % otherCSMs.length] : csmName,
      new_csm_name: action === 'transferred_out' || action === 'removed' ? otherCSMs[(i + 1) % otherCSMs.length] : csmName,
      notes: i % 3 === 0 ? 'Priority account - requires extra attention' : null,
    }
  })
}

// Action icon component
function ActionIcon({ action }: { action: CSMAssignmentHistoryItem['action'] }) {
  const config = {
    assigned: { icon: ArrowRight, bg: 'bg-emerald-100', color: 'text-emerald-600' },
    removed: { icon: XCircle, bg: 'bg-rose-100', color: 'text-rose-600' },
    transferred_in: { icon: ArrowLeft, bg: 'bg-blue-100', color: 'text-blue-600' },
    transferred_out: { icon: RefreshCw, bg: 'bg-amber-100', color: 'text-amber-600' },
  }[action]
  
  const Icon = config.icon
  
  return (
    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center', config.bg)}>
      <Icon className={clsx('w-4 h-4', config.color)} />
    </div>
  )
}

// Action label
function getActionLabel(action: CSMAssignmentHistoryItem['action']): string {
  return {
    assigned: 'Assigned',
    removed: 'Removed',
    transferred_in: 'Transferred In',
    transferred_out: 'Transferred Out',
  }[action]
}

// Stat Card for profile
function ProfileStatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  trend,
  color = 'slate'
}: { 
  icon: typeof Users
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'violet'
}) {
  const colorClasses = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
    blue: 'bg-blue-100 text-blue-600',
    violet: 'bg-violet-100 text-violet-600',
  }
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={clsx('w-6 h-6 rounded flex items-center justify-center', colorClasses[color])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-slate-800">{value}</span>
        {subValue && <span className="text-xs text-slate-500">{subValue}</span>}
        {trend && (
          trend === 'up' ? <TrendingUp className="w-3 h-3 text-emerald-500" /> :
          trend === 'down' ? <TrendingDown className="w-3 h-3 text-rose-500" /> : null
        )}
      </div>
    </div>
  )
}

// Main component
interface CSMProfilePanelProps {
  csm: CSM
  isOpen: boolean
  onClose: () => void
}

export function CSMProfilePanel({ csm, isOpen, onClose }: CSMProfilePanelProps) {
  // Generate mock data
  const profile = useMemo(() => getMockCSMProfile(csm), [csm])
  const history = useMemo(() => getMockAssignmentHistory(csm.name), [csm.name])
  
  if (!isOpen) return null
  
  const isInactive = csm.status === 'inactive'
  const isDeparted = csm.status === 'departed'
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className={clsx(
          'px-6 py-4 border-b flex items-start justify-between',
          isDeparted ? 'bg-rose-50 border-rose-200' :
          isInactive ? 'bg-slate-50 border-slate-200' :
          'bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200'
        )}>
          <div className="flex items-center gap-4">
            <div className={clsx(
              'w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold',
              isDeparted ? 'bg-slate-400' :
              isInactive ? 'bg-slate-400' :
              'bg-gradient-to-br from-primary-500 to-primary-700'
            )}>
              {csm.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={clsx(
                  'text-xl font-bold',
                  isDeparted ? 'text-slate-500 line-through' : 'text-slate-800'
                )}>
                  {csm.name}
                </h2>
                {isDeparted && (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">
                    Departed
                  </span>
                )}
                {isInactive && (
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{profile.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {profile.department}
                </span>
                {profile.tenure_months && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTenure(profile.tenure_months)} tenure
                  </span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Contact Info */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-3">
              {profile.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 truncate">{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{profile.phone}</span>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{profile.location}</span>
                </div>
              )}
              {profile.manager_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Reports to {profile.manager_name}</span>
                </div>
              )}
              {profile.hire_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Joined {formatDate(profile.hire_date)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Current Portfolio Stats */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {isDeparted ? 'Final Portfolio' : 'Current Portfolio'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <ProfileStatCard
                icon={Users}
                label="Accounts"
                value={profile.current_accounts}
                color="blue"
              />
              <ProfileStatCard
                icon={DollarSign}
                label="ARR Managed"
                value={formatCurrency(profile.current_arr)}
                color="emerald"
              />
              <ProfileStatCard
                icon={AlertTriangle}
                label="Needs Attention"
                value={profile.at_risk_accounts}
                color={profile.at_risk_accounts > 2 ? 'rose' : 'amber'}
              />
              <ProfileStatCard
                icon={Calendar}
                label="Renewals (90d)"
                value={profile.renewals_next_90_days}
                color="violet"
              />
            </div>
          </div>
          
          {/* Lifetime Performance */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Lifetime Performance</h3>
            <div className="grid grid-cols-2 gap-3">
              <ProfileStatCard
                icon={Briefcase}
                label="Total Accounts Managed"
                value={profile.total_accounts_managed}
                color="slate"
              />
              <ProfileStatCard
                icon={DollarSign}
                label="Total ARR Managed"
                value={formatCurrency(profile.total_arr_managed_lifetime)}
                color="emerald"
              />
              <ProfileStatCard
                icon={CheckCircle}
                label="Renewals Won"
                value={profile.accounts_successfully_renewed}
                trend="up"
                color="emerald"
              />
              <ProfileStatCard
                icon={XCircle}
                label="Accounts Churned"
                value={profile.accounts_churned}
                color={profile.accounts_churned > 3 ? 'rose' : 'slate'}
              />
              {profile.renewal_rate && (
                <ProfileStatCard
                  icon={Target}
                  label="Renewal Rate"
                  value={`${profile.renewal_rate.toFixed(0)}%`}
                  trend={profile.renewal_rate > 90 ? 'up' : profile.renewal_rate < 80 ? 'down' : 'neutral'}
                  color={profile.renewal_rate > 85 ? 'emerald' : 'amber'}
                />
              )}
              {profile.avg_health_score && (
                <ProfileStatCard
                  icon={Award}
                  label="Avg Health Score"
                  value={profile.avg_health_score.toFixed(0)}
                  subValue="/ 100"
                  color={profile.avg_health_score > 75 ? 'emerald' : profile.avg_health_score > 60 ? 'amber' : 'rose'}
                />
              )}
            </div>
          </div>
          
          {/* Customer Satisfaction */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Customer Satisfaction</h3>
            <div className="grid grid-cols-3 gap-3">
              {profile.nps_score !== null && (
                <ProfileStatCard
                  icon={TrendingUp}
                  label="NPS Score"
                  value={profile.nps_score}
                  color={profile.nps_score > 70 ? 'emerald' : profile.nps_score > 50 ? 'amber' : 'rose'}
                />
              )}
              {profile.csat_score !== null && (
                <ProfileStatCard
                  icon={Star}
                  label="CSAT"
                  value={profile.csat_score.toFixed(1)}
                  subValue="/ 5"
                  color={profile.csat_score > 4.5 ? 'emerald' : profile.csat_score > 4 ? 'amber' : 'rose'}
                />
              )}
              {profile.avg_response_time_hours !== null && (
                <ProfileStatCard
                  icon={MessageSquare}
                  label="Avg Response"
                  value={`${profile.avg_response_time_hours.toFixed(1)}h`}
                  color={profile.avg_response_time_hours < 4 ? 'emerald' : 'amber'}
                />
              )}
            </div>
          </div>
          
          {/* Assignment History Timeline */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Assignment History</h3>
            <div className="space-y-3">
              {history.map((item) => (
                <div 
                  key={item.id}
                  className={clsx(
                    'flex gap-3 p-3 rounded-lg border transition-colors',
                    item.action === 'removed' ? 'bg-rose-50/50 border-rose-100' :
                    item.action === 'transferred_out' ? 'bg-amber-50/50 border-amber-100' :
                    'bg-slate-50 border-slate-100 hover:bg-slate-100'
                  )}
                >
                  <ActionIcon action={item.action} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-800 truncate">{item.account_name}</p>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(item.action_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx(
                        'text-xs font-medium px-1.5 py-0.5 rounded',
                        item.action === 'assigned' ? 'bg-emerald-100 text-emerald-700' :
                        item.action === 'removed' ? 'bg-rose-100 text-rose-700' :
                        item.action === 'transferred_in' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      )}>
                        {getActionLabel(item.action)}
                      </span>
                      <span className="text-xs text-slate-500">{item.account_type}</span>
                      <span className="text-xs font-medium text-slate-600">{formatCurrency(item.arr)}</span>
                    </div>
                    {item.reason && (
                      <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                    )}
                    {(item.action === 'transferred_in' || item.action === 'transferred_out') && (
                      <p className="text-xs text-slate-500 mt-1">
                        {item.action === 'transferred_in' 
                          ? `From ${item.previous_csm_name}` 
                          : `To ${item.new_csm_name}`
                        }
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-amber-600 mt-1 italic">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Data availability notice */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> This is sample data. Actual history requires Salesforce field history tracking 
                on the CSM field or a custom assignment log table.
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
