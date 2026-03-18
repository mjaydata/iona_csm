import { useRef, useEffect, useState } from 'react'
import { Search, X, ChevronDown, Check } from 'lucide-react'

interface AccountTypeOption {
  value: string
  label: string
  count?: number
}

interface HeaderProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  showSearch?: boolean
  accountTypeFilter?: string
  onAccountTypeChange?: (value: string) => void
  accountTypeOptions?: AccountTypeOption[]
  pageTitle?: string
}

export function Header({ 
  searchTerm, 
  onSearchChange, 
  showSearch = true,
  accountTypeFilter,
  onAccountTypeChange,
  accountTypeOptions = [],
  pageTitle = 'Portfolio Summary'
}: HeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      // Escape to blur and clear search
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur()
        onSearchChange('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onSearchChange])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = accountTypeOptions.find((o) => o.value === accountTypeFilter)

  return (
    <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-3 flex items-center justify-between">
      {/* Left side - Page Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-900">{pageTitle}</h2>
      </div>

      {/* Center - Search */}
      <div className="flex items-center gap-4">
        {showSearch && (
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search accounts or CSMs..."
              className="w-full pl-10 pr-10 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right side - Account Type Filter (Custom Dropdown) */}
      <div className="flex items-center gap-4">
        {showSearch && accountTypeOptions.length > 0 && onAccountTypeChange && (
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Viewing</span>
            <div className="relative" ref={dropdownRef}>
              {/* Trigger button */}
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 bg-white text-slate-900 text-sm font-semibold pl-3 pr-2 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
              >
                <span>{selectedOption?.label ?? 'Select'}</span>
                {selectedOption?.count !== undefined && (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                    {selectedOption.count}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {accountTypeOptions.map((option) => {
                    const isSelected = option.value === accountTypeFilter
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          onAccountTypeChange(option.value)
                          setDropdownOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'bg-primary/5 text-primary font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          <span className={isSelected ? '' : 'ml-[22px]'}>{option.label}</span>
                        </div>
                        {option.count !== undefined && (
                          <span className={`inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                            isSelected 
                              ? 'bg-primary/15 text-primary' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {option.count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
