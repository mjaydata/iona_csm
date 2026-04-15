import { useState, useMemo } from 'react'
import { KeyRound, CheckCircle2, XCircle, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { BaseWidget, Badge } from './BaseWidget'
import type { SalesforceLicensing } from '../../types'
import { clsx } from 'clsx'

type LicenseFilter = 'all' | 'licensed' | 'not_licensed'

interface LicensingWidgetProps {
  data: SalesforceLicensing | undefined
  isLoading?: boolean
  onHide?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

const FILTER_OPTIONS: { value: LicenseFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'licensed', label: 'Licensed' },
  { value: 'not_licensed', label: 'Not Licensed' },
]

export function LicensingWidget({ data, isLoading, onHide, collapsed, onCollapsedChange }: LicensingWidgetProps) {
  const [search, setSearch] = useState('')
  const [licenseFilter, setLicenseFilter] = useState<LicenseFilter>('all')
  const [expandedCats, setExpandedCats] = useState<Set<string>>(() => new Set())

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const q = search.trim().toLowerCase()
  const isFiltering = licenseFilter !== 'all' || !!q

  const filtered = useMemo(() => {
    if (!data?.features) return []
    let list = data.features

    if (licenseFilter === 'licensed') list = list.filter(f => f.is_enabled)
    else if (licenseFilter === 'not_licensed') list = list.filter(f => !f.is_enabled)

    if (q) {
      list = list.filter(f =>
        f.display_name.toLowerCase().includes(q) ||
        (f.category?.toLowerCase().includes(q)) ||
        (f.description?.toLowerCase().includes(q))
      )
    }
    return list
  }, [data?.features, q, licenseFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const f of filtered) {
      const cat = f.category || 'Other'
      const arr = map.get(cat) || []
      arr.push(f)
      map.set(cat, arr)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const allEnabled = data?.features?.filter(f => f.is_enabled).length ?? 0
  const allTotal = data?.features?.length ?? 0
  const shownEnabled = filtered.filter(f => f.is_enabled).length
  const shownCount = filtered.length

  const summaryText = licenseFilter === 'licensed'
    ? `${shownCount} licensed`
    : licenseFilter === 'not_licensed'
      ? `${shownCount} not licensed`
      : <><span className="font-semibold text-primary-600">{shownEnabled}</span> / {shownCount} features</>

  const barPercent = licenseFilter === 'not_licensed'
    ? 0
    : licenseFilter === 'licensed'
      ? 100
      : shownCount ? (shownEnabled / shownCount) * 100 : 0

  return (
    <BaseWidget
      title="Licensing"
      icon={<KeyRound className="w-4 h-4" />}
      isLoading={isLoading}
      onHide={onHide}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      badge={data?.has_license_row
        ? <Badge variant="info" size="sm">{allEnabled} / {allTotal} licensed</Badge>
        : undefined
      }
    >
      {data && (
        <div className="p-4 space-y-3">
          {!data.has_license_row && !data.load_error && (
            <p className="text-xs text-slate-400 italic text-center py-4">
              No Salesforce license record found for this account.
            </p>
          )}

          {data.load_error && (
            <p className="text-xs text-rose-500 italic text-center py-4">
              Failed to load licensing data.
            </p>
          )}

          {data.has_license_row && (
            <>
              {/* Header meta */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                {data.license_type && (
                  <span>Type: <span className="font-medium text-slate-700">{data.license_type}</span></span>
                )}
                {data.account_region && (
                  <span>Region: <span className="font-medium text-slate-700">{data.account_region}</span></span>
                )}
                {data.account_industry && (
                  <span>Industry: <span className="font-medium text-slate-700">{data.account_industry}</span></span>
                )}
              </div>

              {/* Filter toggle */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                {FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setLicenseFilter(opt.value)}
                    className={clsx(
                      'flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md transition-colors text-center',
                      licenseFilter === opt.value
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Summary bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      licenseFilter === 'not_licensed' ? 'bg-slate-300' : 'bg-primary-500'
                    )}
                    style={{ width: `${barPercent}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                  {summaryText}
                </span>
              </div>

              {/* Search */}
              {allTotal > 8 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter features..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-7 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 placeholder:text-slate-300"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                    </button>
                  )}
                </div>
              )}

              {/* Grouped feature list */}
              {grouped.length > 0 && (
                <div className="space-y-1">
                  {grouped.map(([cat, features]) => {
                    const catEnabled = features.filter(f => f.is_enabled).length
                    const isOpen = expandedCats.has(cat) || isFiltering
                    return (
                      <div key={cat} className="border border-slate-100 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCat(cat)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50/50 transition-colors"
                        >
                          {isOpen
                            ? <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            : <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          }
                          <span className="text-xs font-medium text-slate-700 flex-1 truncate">{cat}</span>
                          <span className="text-[10px] text-slate-400">
                            {catEnabled}/{features.length}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="border-t border-slate-50 divide-y divide-slate-50">
                            {features.map(f => (
                              <div
                                key={f.feature_key}
                                className={clsx(
                                  'flex items-start gap-2 px-3 py-2',
                                  f.is_enabled ? 'bg-white' : 'bg-slate-50/60'
                                )}
                              >
                                {f.is_enabled
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                  : <XCircle className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                                }
                                <div className="min-w-0 flex-1">
                                  <p className={clsx(
                                    'text-xs leading-snug',
                                    f.is_enabled ? 'text-slate-700 font-medium' : 'text-slate-400'
                                  )}>
                                    {f.display_name}
                                  </p>
                                  {f.description && (
                                    <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5 line-clamp-2">
                                      {f.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Empty states */}
              {filtered.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  {q
                    ? `No features match "${search}"`
                    : licenseFilter === 'licensed'
                      ? 'No licensed features found.'
                      : licenseFilter === 'not_licensed'
                        ? 'This account has all available features.'
                        : 'No features available.'
                  }
                </p>
              )}
            </>
          )}
        </div>
      )}
    </BaseWidget>
  )
}
