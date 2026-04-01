import { useEffect, useState, useMemo } from 'react'
import { X, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { useRenewalHealthInsight } from '../hooks/useAccounts'

interface RenewalHealthInsightDrawerProps {
  accountId: string
  accountName: string
  isOpen: boolean
  onClose: () => void
}

function formatEur(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`
  return `€${value.toFixed(0)}`
}

function formatDay(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function RenewalHealthInsightDrawer({
  accountId,
  accountName,
  isOpen,
  onClose,
}: RenewalHealthInsightDrawerProps) {
  const [withLlm, setWithLlm] = useState(false)

  useEffect(() => {
    if (isOpen) setWithLlm(false)
  }, [isOpen])

  const { data, isLoading, isError, error, refetch, isFetching } = useRenewalHealthInsight(accountId, {
    withLlm,
    enabled: isOpen,
  })

  const sortedContracts = useMemo(() => {
    if (!data?.contracts?.length) return []
    return [...data.contracts].sort((a, b) => b.arr_eur - a.arr_eur)
  }, [data?.contracts])

  const maxArr = useMemo(() => {
    if (!sortedContracts.length) return 1
    return Math.max(...sortedContracts.map((c) => c.arr_eur), 1)
  }, [sortedContracts])

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden
        />
      )}

      <div
        className={clsx(
          'fixed top-0 right-0 h-full w-[420px] max-w-[94vw] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Renewals &amp; health score</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{accountName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {isLoading && !data && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading renewal context…</p>
            </div>
          )}

          {isError && !data && !isLoading && (
            <div className="flex flex-col items-center py-10 gap-2 px-2">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <p className="text-xs text-rose-600 text-center">
                {(error as Error)?.message || 'Failed to load renewal insight'}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-xs text-primary-600 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {data && (
            <>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
                  <p className="text-slate-500">Nearest renewal</p>
                  <p className="font-semibold text-slate-800 tabular-nums">
                    {data.nearest_renewal_days != null ? `${data.nearest_renewal_days}d` : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
                  <p className="text-slate-500">Score impact (renewal)</p>
                  <p className="font-semibold text-slate-800 tabular-nums">
                    −{data.adjusted_renewal_deduction}
                    {data.base_renewal_deduction !== data.adjusted_renewal_deduction && (
                      <span className="text-slate-400 font-normal">
                        {' '}
                        (raw −{data.base_renewal_deduction})
                      </span>
                    )}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2 col-span-2">
                  <p className="text-slate-500">Near-term renewal ARR (≤365d)</p>
                  <p className="font-semibold text-slate-800">
                    {formatEur(data.near_term_arr_eur)}
                    {data.share_of_near_term > 0 && (
                      <span className="text-slate-500 font-normal">
                        {' '}
                        · nearest line {(data.share_of_near_term * 100).toFixed(0)}% of that book
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-amber-50/50 px-3 py-2.5">
                <p className="text-[11px] font-medium text-amber-900/90 mb-1">How we weight renewals</p>
                <p className="text-xs text-slate-700 leading-relaxed">{data.deterministic_explanation}</p>
                <p className="text-[10px] text-slate-400 mt-2">Model: {data.scoring_version}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-700 mb-2">Open renewal lines (ARR)</p>
                {sortedContracts.length === 0 ? (
                  <p className="text-xs text-slate-400">No open renewal contract lines in scope.</p>
                ) : (
                  <ul className="space-y-2">
                    {sortedContracts.map((c, i) => (
                      <li key={i} className="text-xs">
                        <div className="flex justify-between gap-2 mb-0.5">
                          <span className="text-slate-700 truncate" title={c.revenue_type}>
                            {c.revenue_type || '—'}
                          </span>
                          <span className="text-slate-600 tabular-nums flex-shrink-0">
                            {formatEur(c.arr_eur)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary-400/90"
                            style={{ width: `${Math.min(100, (c.arr_eur / maxArr) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>{c.renewal_days != null ? `${c.renewal_days}d` : '—'}</span>
                          <span>{formatDay(c.renewal_date)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3">
                {!withLlm && (
                  <button
                    type="button"
                    onClick={() => setWithLlm(true)}
                    disabled={isFetching}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {isFetching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isFetching ? 'Generating…' : 'Generate AI summary'}
                  </button>
                )}
                {withLlm && isFetching && !data.llm_narrative && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Asking the model…
                  </div>
                )}
                {data.llm_narrative && (
                  <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-indigo-900/90 mb-1">AI summary</p>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {data.llm_narrative}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 flex-shrink-0">
          <p className="text-[10px] text-slate-400 text-center">
            Renewal ARR from contracts · Deduction capped with materiality for small tails
          </p>
        </div>
      </div>
    </>
  )
}
