import { useState } from 'react'
import { clsx } from 'clsx'
import {
  Home,
  Users,
  Bell,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  Sun,
  Coins,
} from 'lucide-react'

export type NavItem = 'home' | 'csm-management' | 'actions' | 'nps-satisfaction' | 'sun-token-dashboard' | 'chat'

interface SidebarProps {
  activeItem: NavItem
  onNavigate: (item: NavItem) => void
  userEmail?: string
  userInitials?: string
  onOpenChat?: () => void
  isExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

interface NavItemConfig {
  id: NavItem
  icon: React.ReactNode
  label: string
}

const navItems: NavItemConfig[] = [
  { id: 'home', icon: <Home className="w-5 h-5" />, label: 'Portfolio' },
  { id: 'csm-management', icon: <Users className="w-5 h-5" />, label: 'CSM Assignments' },
  { id: 'actions', icon: <Bell className="w-5 h-5" />, label: 'Actions' },
  { id: 'nps-satisfaction', icon: <ThumbsUp className="w-5 h-5" />, label: 'NPS & Satisfaction' },
  {
    id: 'sun-token-dashboard',
    icon: (
      <span
        className="flex flex-col items-center justify-center w-5 h-5 gap-0 leading-none"
        aria-hidden
        title="SUN Token"
      >
        <Sun className="w-[15px] h-[15px] shrink-0 -mb-px" strokeWidth={2.35} />
        <Coins className="w-[13px] h-[13px] shrink-0" strokeWidth={2.35} />
      </span>
    ),
    label: 'SUN Token Dashboard',
  },
  { id: 'chat', icon: <MessageCircle className="w-5 h-5" />, label: 'Ask Genie' },
]

export function Sidebar({ 
  activeItem, 
  onNavigate, 
  userEmail = 'user@example.com', 
  userInitials = 'JD', 
  onOpenChat,
  isExpanded: controlledExpanded,
  onExpandedChange 
}: SidebarProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  
  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded
  const setIsExpanded = (value: boolean) => {
    if (onExpandedChange) {
      onExpandedChange(value)
    } else {
      setInternalExpanded(value)
    }
  }

  const handleNavClick = (itemId: NavItem) => {
    if (itemId === 'chat' && onOpenChat) {
      onOpenChat()
    } else {
      onNavigate(itemId)
    }
  }

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out z-50',
        isExpanded ? 'w-56' : 'w-20'
      )}
    >
      {/* Logo / Brand */}
      <div className={clsx(
        'flex items-center flex-shrink-0 border-b border-slate-100 transition-all duration-300',
        isExpanded ? 'h-16 px-5 justify-start gap-3' : 'h-16 justify-center'
      )}>
        <img 
          src="/logo.png" 
          alt="IONA" 
          className={clsx(
            'flex-shrink-0 transition-all duration-300',
            isExpanded ? 'w-10 h-10' : 'w-9 h-9'
          )} 
        />
        {isExpanded && (
          <div className="flex flex-col min-w-0 -mt-0.5">
            <span className="text-base font-bold text-slate-900 leading-none whitespace-nowrap">IONA CX</span>
            <span className="text-xs font-semibold text-primary leading-none whitespace-nowrap mt-1">PathIQ</span>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-6">
        <ul className="space-y-2 px-3">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item.id)}
                className={clsx(
                  'group relative w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                  isExpanded ? 'justify-start' : 'justify-center',
                  item.id === 'chat'
                    ? 'text-slate-500 hover:text-primary hover:bg-primary/5'
                    : activeItem === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-500 hover:text-primary hover:bg-slate-50'
                )}
                title={!isExpanded ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {isExpanded && (
                  <span className="text-sm font-medium whitespace-nowrap text-left">
                    {item.label}
                  </span>
                )}
                {/* Tooltip for collapsed state */}
                {!isExpanded && (
                  <span className="absolute left-16 bg-navy-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {item.label}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section - User */}
      <div className="border-t border-slate-100 py-4 px-3">
        {/* User Profile & Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx(
            'w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-all duration-200',
            isExpanded ? 'justify-start' : 'justify-center'
          )}
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {/* User Avatar */}
          <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden ring-2 ring-primary/20 flex items-center justify-center text-slate-600 text-sm font-bold flex-shrink-0">
            {userInitials}
          </div>
          
          {/* Email and collapse indicator */}
          {isExpanded && (
            <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
              <span className="text-xs text-slate-500 truncate">
                {userEmail}
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </div>
          )}
          
          {/* Expand indicator when collapsed */}
          {!isExpanded && (
            <ChevronRight className="absolute right-1 w-3 h-3 text-slate-300" />
          )}
        </button>
      </div>
    </aside>
  )
}
