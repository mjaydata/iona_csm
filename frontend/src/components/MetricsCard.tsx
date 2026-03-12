import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import React from 'react'

interface MetricsCardProps {
  icon: ReactNode
  iconBg: string
  value: number | string
  label: string
  trend?: {
    value: number
    isPositive: boolean
  }
  onClick?: () => void
  isActive?: boolean
}

export function MetricsCard({ icon, iconBg, value, label, onClick, isActive }: MetricsCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative flex items-center gap-3 px-5 py-4 flex-1 min-w-0 transition-all duration-200 text-left group',
        onClick && 'cursor-pointer',
        !isActive && onClick && 'hover:bg-slate-50/80',
        isActive && 'bg-gradient-to-br from-primary-50 to-primary-100/50'
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-400 rounded-full" />
      )}
      <div className={clsx(
        'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200',
        iconBg,
        isActive && 'scale-110 shadow-sm'
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={clsx(
          'text-2xl font-bold transition-colors duration-200',
          isActive ? 'text-primary-700' : 'text-slate-800'
        )}>{value}</p>
        <p className={clsx(
          'text-xs font-medium truncate transition-colors duration-200',
          isActive ? 'text-primary-600' : 'text-slate-500'
        )}>{label}</p>
      </div>
    </button>
  )
}

interface MetricsContainerProps {
  children: ReactNode
}

export function MetricsContainer({ children }: MetricsContainerProps) {
  // Convert children to array to add separators between items
  const childArray = React.Children.toArray(children)
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 flex items-center flex-wrap lg:flex-nowrap">
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {/* Elegant short separator line - not shown after last item */}
          {index < childArray.length - 1 && (
            <div className="hidden lg:flex h-10 w-px bg-gray-200 flex-shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
