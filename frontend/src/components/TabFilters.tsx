import { clsx } from 'clsx'
import React from 'react'
import type { TabFilter } from '../types'

interface TabFiltersProps {
  activeTab: TabFilter
  onTabChange: (tab: TabFilter) => void
  needsAttentionCount: number
}

const tabs: { id: TabFilter; label: string; showCount?: boolean }[] = [
  { id: 'all', label: 'All' },
  { id: 'needs_attention', label: 'Needs Attention', showCount: true },
  { id: 'renewals', label: 'Renewals' },
  { id: 'growth', label: 'Growth' },
]

export function TabFilters({ activeTab, onTabChange, needsAttentionCount }: TabFiltersProps) {
  return (
    <div className="flex items-center">
      {tabs.map((tab, index) => (
        <React.Fragment key={tab.id}>
          <button
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'px-4 py-3 text-sm font-medium border-b-2 -mb-[1px] transition-colors',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.showCount && (
                <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                  {needsAttentionCount}
                </span>
              )}
            </span>
          </button>
          {/* Elegant short separator - not after last tab */}
          {index < tabs.length - 1 && (
            <div className="h-4 w-px bg-gray-200 mx-1" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
