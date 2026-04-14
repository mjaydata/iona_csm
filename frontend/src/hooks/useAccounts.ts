import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { getAccounts, getAccountFullDetail, getConfluenceImplementation, getMetricsSummary, getAccountTypeCounts, getCustomerGrowth, getCustomerGrowthBreakdown, updateAccountStatus, createTask, getARRAnalysis, getRenewalHealthInsight, type GetAccountsParams, type GetARRAnalysisParams } from '../services/api'
import type { TaskCreate } from '../types'

export function useMetrics(accountType?: string, renewalPeriod?: number) {
  return useQuery({
    queryKey: ['metrics', accountType, renewalPeriod],
    queryFn: ({ signal }) => getMetricsSummary(accountType, renewalPeriod, signal),
    staleTime: 2 * 60 * 1000,
  })
}

export function useAccountTypeCounts(enabled = true) {
  return useQuery({
    queryKey: ['account-type-counts'],
    queryFn: () => getAccountTypeCounts(),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useAccounts(params: GetAccountsParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: ({ signal }) => getAccounts(params, signal),
    enabled,
  })
}

export function useAccountFullDetail(accountId: string | null) {
  return useQuery({
    queryKey: ['account-detail', accountId],
    queryFn: () => getAccountFullDetail(accountId!),
    enabled: !!accountId,
  })
}

export function useRenewalHealthInsight(
  accountId: string | null,
  options: { withLlm?: boolean; enabled?: boolean } = {}
) {
  const { withLlm = false, enabled = true } = options
  return useQuery({
    queryKey: ['renewal-health-insight', accountId, withLlm],
    queryFn: () => getRenewalHealthInsight(accountId!, withLlm),
    enabled: !!accountId && enabled,
    placeholderData: keepPreviousData,
  })
}

export function useConfluenceImplementation(accountId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['confluence-implementation', accountId],
    queryFn: () => getConfluenceImplementation(accountId!),
    enabled: !!accountId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useInfiniteAccounts(params: Omit<GetAccountsParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: ['accounts-infinite', params],
    queryFn: ({ pageParam = 1, signal }) => getAccounts({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, page) => sum + page.accounts.length, 0)
      if (totalLoaded >= lastPage.total) {
        return undefined // No more pages
      }
      return allPages.length + 1
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useUpdateAccountStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateAccountStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['accounts-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (task: TaskCreate) => createTask(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['accounts-infinite'] })
    },
  })
}

// Customer Growth hooks
export function useCustomerGrowth(accountType?: string, enabled = true) {
  return useQuery({
    queryKey: ['customer-growth', accountType],
    queryFn: ({ signal }) => getCustomerGrowth(accountType, signal),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useCustomerGrowthBreakdown(dimension: string, accountType?: string, enabled = true) {
  return useQuery({
    queryKey: ['customer-growth-breakdown', dimension, accountType],
    queryFn: () => getCustomerGrowthBreakdown(dimension, accountType),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

// ARR Analysis hooks
export function useARRAnalysis(params: GetARRAnalysisParams = {}) {
  return useQuery({
    queryKey: ['arr-analysis', params],
    queryFn: () => getARRAnalysis(params),
    staleTime: 60000, // 1 minute
  })
}

export function useInfiniteARRCustomers(params: Omit<GetARRAnalysisParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: ['arr-customers-infinite', params],
    queryFn: ({ pageParam = 1 }) => getARRAnalysis({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, page) => sum + page.customers.length, 0)
      if (totalLoaded >= lastPage.total_customers) {
        return undefined // No more pages
      }
      return allPages.length + 1
    },
    staleTime: 60000,
  })
}
