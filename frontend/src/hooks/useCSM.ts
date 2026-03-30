import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { getCSMStats, getCSMs, getAccountsWithCSM, getCSMProfile, getCSMAssignmentHistory, getCSMFeedback, getCSMSupportTickets, type GetAccountsWithCSMParams, type GetCSMsParams, type GetCSMStatsParams, type GetCSMSupportTicketsParams } from '../services/api'

export function useCSMStats(params: GetCSMStatsParams = {}) {
  return useQuery({
    queryKey: ['csm-stats', params],
    queryFn: () => getCSMStats(params),
  })
}

export function useCSMs(params: GetCSMsParams = {}) {
  return useQuery({
    queryKey: ['csms', params],
    queryFn: () => getCSMs(params),
  })
}

export function useAccountsWithCSM(params: GetAccountsWithCSMParams = {}) {
  return useQuery({
    queryKey: ['accounts-with-csm', params],
    queryFn: () => getAccountsWithCSM(params),
  })
}

export function useCSMProfile(csmId: string | null) {
  return useQuery({
    queryKey: ['csm-profile', csmId],
    queryFn: () => getCSMProfile(csmId!),
    enabled: !!csmId,
  })
}

export function useCSMAssignmentHistory(csmId: string | null) {
  return useQuery({
    queryKey: ['csm-assignment-history', csmId],
    queryFn: () => getCSMAssignmentHistory(csmId!),
    enabled: !!csmId,
  })
}

export function useCSMFeedback(csmId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['csm-feedback', csmId],
    queryFn: () => getCSMFeedback(csmId!),
    enabled: !!csmId && enabled,
    staleTime: 60 * 1000,
  })
}

export function useCSMSupportTickets(
  csmId: string | null,
  enabled: boolean,
  params: GetCSMSupportTicketsParams = {}
) {
  const limit = params.limit ?? 40
  const accountType = params.account_type
  return useQuery({
    queryKey: ['csm-support-tickets', csmId, limit, accountType ?? ''],
    queryFn: () =>
      getCSMSupportTickets(csmId!, {
        limit,
        ...(accountType ? { account_type: accountType } : {}),
      }),
    enabled: !!csmId && enabled,
    staleTime: 60 * 1000,
  })
}

export function useInfiniteAccountsWithCSM(params: Omit<GetAccountsWithCSMParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: ['accounts-with-csm-infinite', params],
    queryFn: ({ pageParam = 1 }) => getAccountsWithCSM({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, page) => sum + page.accounts.length, 0)
      if (totalLoaded >= lastPage.total) {
        return undefined // No more pages
      }
      return allPages.length + 1
    },
  })
}
