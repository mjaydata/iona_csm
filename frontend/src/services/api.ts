import axios from 'axios'
import type { 
  AccountFullDetail, 
  AccountListResponse, 
  AccountWithCSMListResponse,
  ARRAnalysisResponse,
  ARRCustomerSummary,
  CSMListResponse, 
  CSMStats, 
  CustomerGrowthResponse,
  CustomerGrowthBreakdownResponse,
  MetricsSummary, 
  Task, 
  TaskCreate,
  SupportTicketsResponse 
} from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Metrics
export async function getMetricsSummary(accountType?: string, renewalPeriod?: number): Promise<MetricsSummary> {
  const params: Record<string, string | number> = {}
  if (accountType) params.account_type = accountType
  if (renewalPeriod) params.renewal_period = renewalPeriod
  const { data } = await api.get<MetricsSummary>('/metrics/summary', { params })
  return data
}

export async function getAccountTypeCounts(): Promise<Record<string, number>> {
  const { data } = await api.get<Record<string, number>>('/metrics/account-type-counts')
  return data
}

export async function getCustomerGrowth(accountType?: string): Promise<CustomerGrowthResponse> {
  const params = accountType ? { account_type: accountType } : undefined
  const { data } = await api.get<CustomerGrowthResponse>('/metrics/customer-growth', { params })
  return data
}

export async function getCustomerGrowthBreakdown(dimension: string, accountType?: string): Promise<CustomerGrowthBreakdownResponse> {
  const params: Record<string, string> = { dimension }
  if (accountType) params.account_type = accountType
  const { data } = await api.get<CustomerGrowthBreakdownResponse>('/metrics/customer-growth-breakdown', { params })
  return data
}

// Accounts
export interface GetAccountsParams {
  page?: number
  page_size?: number
  health?: string
  status?: string
  owner?: string
  search?: string
  sort_by?: string
  account_type?: string
}

export async function getAccounts(params: GetAccountsParams = {}): Promise<AccountListResponse> {
  const { data } = await api.get<AccountListResponse>('/accounts', { params })
  return data
}

export async function getAccountById(id: string) {
  const { data } = await api.get(`/accounts/${id}`)
  return data
}

export async function getAccountFullDetail(id: string): Promise<AccountFullDetail> {
  const { data } = await api.get<AccountFullDetail>(`/accounts/${id}/full-detail`)
  return data
}

export interface HealthScoreDetail {
  score: number
  category: string
  factors: Array<{
    name: string
    points: number
    max_points: number
    detail: string
    icon: string
  }>
  has_pendo: boolean
  has_freshdesk: boolean
  scoring_version: string
}

export async function getHealthScoreDetail(accountId: string): Promise<HealthScoreDetail> {
  const { data } = await api.get<HealthScoreDetail>(`/accounts/${accountId}/health-score`)
  return data
}

export interface HealthScoreHistoryPoint {
  score_date: string
  health_score: number
  health_category: string
}

export interface HealthScoreHistoryResponse {
  account_id: string
  account_name: string
  history: HealthScoreHistoryPoint[]
}

export async function getHealthScoreHistory(accountId: string): Promise<HealthScoreHistoryResponse> {
  const { data } = await api.get<HealthScoreHistoryResponse>(`/accounts/${accountId}/health-score/history`)
  return data
}

export interface WeeklySummaryItem {
  account_id: string
  account_name: string
  week_start: string
  week_end: string
  narrative: string
  generated_at: string | null
}

export interface WeeklySummaryResponse {
  account_id: string
  account_name: string
  weeks: WeeklySummaryItem[]
  total_weeks: number
}

export async function getWeeklySummary(
  accountId: string,
  weeks: number = 12,
  offset: number = 0
): Promise<WeeklySummaryResponse> {
  const { data } = await api.get<WeeklySummaryResponse>(
    `/accounts/${accountId}/weekly-summary`,
    { params: { weeks, offset } }
  )
  return data
}

export interface AccountMovement {
  account_id: string
  account_name: string
  prev_score: number
  curr_score: number
  prev_category: string
  curr_category: string
  explanation: string
  recent_scores: number[]
}

export interface HealthChangeDay {
  date: string
  prev_date: string | null
  good: number
  at_risk: number
  critical: number
  improved: AccountMovement[]
  worsened: AccountMovement[]
}

export interface HealthChangesResponse {
  days: HealthChangeDay[]
  today_delta: { good: number; at_risk: number; critical: number } | null
}

export async function getHealthChanges(
  days: number = 30,
  accountType?: string
): Promise<HealthChangesResponse> {
  const params: Record<string, any> = { days }
  if (accountType && accountType !== 'all') params.account_type = accountType
  const { data } = await api.get<HealthChangesResponse>('/metrics/health-changes', { params })
  return data
}

export interface GetSupportTicketsParams {
  page?: number
  page_size?: number
  status?: string
  severity?: string
}

export async function getSupportTickets(
  accountId: string, 
  params: GetSupportTicketsParams = {}
): Promise<SupportTicketsResponse> {
  const { data } = await api.get<SupportTicketsResponse>(
    `/accounts/${accountId}/support-tickets`, 
    { params }
  )
  return data
}

export async function updateAccountStatus(id: string, status: string) {
  const { data } = await api.patch(`/accounts/${id}/status`, null, {
    params: { status },
  })
  return data
}

// Tasks
export async function createTask(task: TaskCreate): Promise<Task> {
  const { data } = await api.post<Task>('/tasks', task)
  return data
}

// CSM Management
export async function getCSMStats(): Promise<CSMStats> {
  const { data } = await api.get<CSMStats>('/csm/stats')
  return data
}

export interface GetCSMsParams {
  status?: string  // active, inactive, departed
}

export async function getCSMs(params: GetCSMsParams = {}): Promise<CSMListResponse> {
  const { data } = await api.get<CSMListResponse>('/csm/list', { params })
  return data
}

export interface GetAccountsWithCSMParams {
  page?: number
  page_size?: number
  csm_id?: string
  unassigned_only?: boolean
  search?: string
}

export async function getAccountsWithCSM(params: GetAccountsWithCSMParams = {}): Promise<AccountWithCSMListResponse> {
  const { data } = await api.get<AccountWithCSMListResponse>('/csm/accounts', { params })
  return data
}

// ARR Analysis
export interface GetARRAnalysisParams {
  page?: number
  page_size?: number
  revenue_type?: string
  region?: string
  search?: string
  currency?: 'CAD' | 'native'
  renewal_period?: number
  account_type?: string
}

export async function getARRAnalysis(params: GetARRAnalysisParams = {}): Promise<ARRAnalysisResponse> {
  const { data } = await api.get<ARRAnalysisResponse>('/arr/analysis', { params })
  return data
}

export async function getARRCustomerDetail(account: string): Promise<ARRCustomerSummary> {
  const { data } = await api.get<ARRCustomerSummary>(`/arr/customer/${encodeURIComponent(account)}`)
  return data
}

// User Preferences
export async function getUserPreference(key: string): Promise<{ value: string | null; updated_at: string | null }> {
  const { data } = await api.get(`/preferences/${key}`)
  return { value: data.value || null, updated_at: data.updated_at || null }
}

export async function saveUserPreference(key: string, value: string): Promise<boolean> {
  const { data } = await api.put(`/preferences/${key}`, { value })
  return data.success
}

export default api
