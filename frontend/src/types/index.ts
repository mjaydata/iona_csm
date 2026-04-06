// API Types

export type HealthScore = 'Critical' | 'At Risk' | 'Good'

export type AccountStatus = 'Needs Attention' | 'In Progress' | 'Stable'

export interface HealthScoreFactor {
  name: string
  points: number
  max_points: number
  detail: string
  icon: string
}

export interface HealthScoreDetail {
  score: number
  category: HealthScore
  factors: HealthScoreFactor[]
  has_pendo: boolean
  has_freshdesk: boolean
  scoring_version: string
}

export interface RenewalContractLine {
  revenue_type: string
  arr_eur: number
  renewal_date: string | null
  renewal_days: number | null
  contract_group?: string | null
}

export interface RenewalHealthInsightResponse {
  account_id: string
  account_name: string
  contracts: RenewalContractLine[]
  nearest_renewal_days: number | null
  base_renewal_deduction: number
  adjusted_renewal_deduction: number
  materiality_weight: number
  near_term_arr_eur: number
  nearest_line_arr_eur: number
  share_of_near_term: number
  deterministic_explanation: string
  llm_narrative: string | null
  scoring_version: string
}

export interface RenewalInfo {
  revenue_type: string
  renewal_date: string | null
  renewal_days: number | null
  contract_group?: string | null
  arr_cad?: number | null
}

export interface Account {
  id: string
  name: string
  health: HealthScore
  health_score_detail?: HealthScoreDetail
  primary_signal: string | null
  primary_signal_type: string | null
  renewal_days: number
  renewal_date: string
  owner_id: string
  owner_name: string
  owner_avatar: string | null
  status: AccountStatus
  csm_name: string | null
  ae_name: string | null
  search_score?: number  // Present when search is applied, higher = better match
  parent_id: string | null  // Parent account ID for grouping
  parent_name: string | null  // Parent account name for display
  renewals?: RenewalInfo[]  // Per-revenue-type renewal dates from fct_contracts
}

export interface AccountListResponse {
  accounts: Account[]
  total: number
  page: number
  page_size: number
  total_pages: number
  at_risk_count: number
}

export interface HealthDistribution {
  good: number
  at_risk: number
  critical: number
}

export interface MetricsSummary {
  // Portfolio Summary metrics
  total_accounts: number
  total_arr: number
  renewals_arr: number
  renewals_count: number
  health_distribution: HealthDistribution
  
  // Action KPIs
  at_risk_count: number
  renewals_90_days: number
  usage_decline_count: number
  expansion_signals: number

  // Day-over-day deltas
  at_risk_delta?: number | null
  usage_decline_delta?: number | null
}

export interface Task {
  id: string
  account_id: string
  title: string
  description: string | null
  due_date: string | null
  priority: string
  status: string
  created_at: string
  created_by: string
}

export interface TaskCreate {
  account_id: string
  title: string
  description?: string
  due_date?: string
  priority?: string
}

// Filter types
export type TabFilter = 'all' | 'needs_attention' | 'renewals' | 'growth'

export interface AccountFilters {
  tab: TabFilter
  health?: HealthScore
  status?: AccountStatus
  owner?: string
  search?: string
  sortBy: string
}

// ============================================
// CSM Management Types
// ============================================

export type CSMStatus = 'active' | 'inactive' | 'departed'

export interface CSM {
  id: string
  name: string
  email: string | null
  status: CSMStatus
  account_count: number
  total_arr: number
  at_risk_count: number
}

export interface CSMListResponse {
  csms: CSM[]
  total: number
}

export interface CSMStats {
  active_csms: number
  avg_accounts_per_csm: number
  unassigned_accounts: number
  total_arr_managed: number
}

export interface AccountWithCSM {
  id: string
  name: string
  account_type: string | null
  csm_id: string | null
  csm_name: string | null
  arr: number
  health: string
  renewal_date: string | null
  renewal_days: number | null
  renewals?: RenewalInfo[]
}

export interface AccountWithCSMListResponse {
  accounts: AccountWithCSM[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// CSM Profile and History Types
export interface CSMProfile {
  id: string
  name: string
  email: string | null
  status: CSMStatus
  avatar_url: string | null
  title: string | null
  department: string | null
  manager_name: string | null
  phone: string | null
  location: string | null
  
  // Dates
  hire_date: string | null
  tenure_months: number | null
  last_active: string | null
  
  // Current metrics
  current_accounts: number
  current_arr: number
  at_risk_accounts: number
  renewals_next_90_days: number
  
  // Historical metrics
  total_accounts_managed: number
  total_arr_managed_lifetime: number
  accounts_successfully_renewed: number
  accounts_churned: number
  renewal_rate: number | null  // percentage
  avg_health_score: number | null
  
  // Performance
  nps_score: number | null
  csat_score: number | null
  avg_response_time_hours: number | null
}

export interface CSMAssignmentHistoryItem {
  id: string
  account_id: string
  account_name: string
  account_type: string | null
  arr: number
  action: 'assigned' | 'removed' | 'transferred_in' | 'transferred_out'
  action_date: string
  reason: string | null
  previous_csm_name: string | null
  new_csm_name: string | null
  notes: string | null
}

export interface CSMProfileResponse {
  profile: CSMProfile
  assignment_history: CSMAssignmentHistoryItem[]
  current_accounts: AccountWithCSM[]
}

// ============================================
// Account Detail Page Types
// ============================================

// Widget configuration for drag-and-drop
export type WidgetType = 
  | 'health' 
  | 'support' 
  | 'usage' 
  | 'whitespace' 
  | 'contract' 
  | 'implementation'
  | 'brief' 
  | 'changes' 
  | 'notes' 
  | 'risk' 
  | 'value' 
  | 'sentiment'
  | 'benchmark'
  | 'alerts'
  | 'signals'
  | 'gong'

export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  visible: boolean
  position: { x: number; y: number; w: number; h: number }
}

// Widget size options (grid columns)
export type WidgetSize = 1 | 2 | 3 | 4
export type WidgetHeightSize = 1 | 2 | 3

// Layout state for persistence
export interface WidgetLayout {
  id: string
  order: number
  size: WidgetSize  // Number of grid columns (1=Small, 2=Medium, 3=Large, 4=Full)
  heightSize: WidgetHeightSize // 1=compact, 2=default, 3=tall
  collapsed: boolean
  visible: boolean
}

// Health Score Breakdown
export interface HealthBreakdown {
  overall_score: number  // 0-100
  usage_score: number
  support_score: number
  engagement_score: number
  renewal_score: number
  trend: 'improving' | 'stable' | 'declining'
  contributing_factors: ContributingFactor[]
}

export interface ContributingFactor {
  name: string
  impact: 'positive' | 'negative' | 'neutral'
  description: string
}

// Resolution time distribution
export interface ResolutionBucket {
  label: string
  min_days: number
  max_days: number
  count: number
  percentage: number
}

export interface ResolutionStats {
  mean_days: number
  median_days: number
  p25_days: number
  p75_days: number
  p90_days: number
  min_days: number
  max_days: number
  total_resolved: number
  distribution: ResolutionBucket[]
}

// Support Analysis
export interface SupportAnalysis {
  open_tickets: number
  critical_tickets: number
  high_tickets: number
  avg_resolution_hours: number
  ticket_trend: 'increasing' | 'stable' | 'decreasing'
  themes: TicketTheme[]
  recent_tickets: SupportTicket[]
  // Aggregate sentiment metrics
  avg_sentiment?: number
  total_tickets?: number
  total_customer_messages?: number
  total_support_messages?: number
  positive_ticket_count?: number
  negative_ticket_count?: number
  neutral_ticket_count?: number
  // Resolution time distribution
  resolution_stats?: ResolutionStats
}

export interface TicketTheme {
  name: string
  count: number
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface SupportTicketsResponse {
  tickets: SupportTicket[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CSMSupportTicketsResponse {
  tickets: SupportTicket[]
}

export interface SupportTicket {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
  updated_at: string
  // Conversation summary fields
  summary?: string
  net_sentiment?: number
  total_messages?: number
  customer_messages?: number
  support_messages?: number
  positive_messages?: number
  negative_messages?: number
  neutral_messages?: number
  last_message_at?: string
  ticket_type?: string
  account_name?: string
}

// Usage Trends
export interface UsageTrend {
  date: string
  value: number
  metric: string
}

export interface PendoDailyMetric {
  date_day: string
  active_visitors: number
  sum_minutes: number
  sum_events: number
  pages_viewed: number
  features_clicked: number
  page_viewing_visitors: number
  feature_clicking_visitors: number
  avg_minutes_per_user: number
}

export interface PendoUsageSummary {
  current_active_visitors: number
  previous_active_visitors: number
  visitors_change_pct: number
  current_minutes: number
  previous_minutes: number
  minutes_change_pct: number
  current_events: number
  previous_events: number
  events_change_pct: number
  total_data_days: number
  pendo_account_ids: string[]
}

export interface PendoTabData {
  daily: Record<string, unknown>[]
  top_items: Record<string, unknown>[]
  total_data_days: number
}

export interface UsageAnalysis {
  current_usage: number
  previous_usage: number
  change_percent: number
  trend: 'increasing' | 'stable' | 'declining'
  usage_history: UsageTrend[]
  features_adopted: FeatureAdoption[]
  pendo_summary?: PendoUsageSummary
  pendo_daily?: PendoDailyMetric[]
  pendo_features?: PendoTabData
  pendo_visitors?: PendoTabData
  pendo_pages?: PendoTabData
  has_pendo_data?: boolean
}

export interface FeatureAdoption {
  name: string
  adoption_percent: number
  trend: 'increasing' | 'stable' | 'declining'
}

// Whitespace / License Analysis
export interface WhitespaceAnalysis {
  total_licenses: number
  used_licenses: number
  utilization_percent: number
  products: ProductWhitespace[]
  expansion_opportunities: ExpansionOpportunity[]
}

export interface ProductWhitespace {
  name: string
  licensed: number
  used: number
  utilization_percent: number
}

export interface ExpansionOpportunity {
  product: string
  potential_value: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

// Contract Group (individual contract within an account)
export interface ContractGroupDetail {
  contract_group: string
  revenue_type: string
  currency: string
  arr: number
  arr_cad: number
  tcv: number
  tcv_cad: number
  contract_start: string | null
  contract_end: string | null
  days_until_end: number | null
  renewal_not_yet_contracted: boolean
}

export interface LuminanceDocument {
  document_id: string
  title: string
  url: string
  state: string
  document_type: string | null
}

// Contract Context
export interface ContractContext {
  // Summary
  total_arr_cad: number
  total_tcv_cad: number
  nearest_renewal_date: string | null
  days_until_renewal: number
  contract_count: number
  revenue_types: string[]
  contracts: ContractGroupDetail[]
  luminance_documents: LuminanceDocument[]
  // Legacy
  contract_type: string
  start_date: string
  end_date: string
  renewal_date: string
  contract_value: number
  arr: number
  mrr: number
  payment_terms: string
  auto_renewal: boolean
  contract_history: ContractEvent[]
}

export interface ContractEvent {
  date: string
  type: 'new' | 'renewal' | 'expansion' | 'contraction' | 'amendment'
  description: string
  value_change: number
}

// Change Detection
export interface ChangeEvent {
  id: string
  date: string
  type: 'meeting' | 'email' | 'call' | 'support' | 'usage' | 'contract' | 'stakeholder'
  source: string
  title: string
  description: string
  importance: 'high' | 'medium' | 'low'
}

// Churn/Renewal Risk
export interface RiskAssessment {
  churn_risk_score: number  // 0-100
  renewal_risk_score: number  // 0-100
  risk_level: 'critical' | 'high' | 'medium' | 'low'
  risk_factors: RiskFactor[]
  recommended_actions: RecommendedAction[]
}

export interface RiskFactor {
  name: string
  impact: number  // 0-100
  description: string
  trend: 'worsening' | 'stable' | 'improving'
}

export interface RecommendedAction {
  title: string
  description: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  action_type: string
}

// Sentiment Analysis
export interface SentimentAnalysis {
  overall_sentiment: number  // -100 to 100
  sentiment_label: 'positive' | 'neutral' | 'negative'
  trend: 'improving' | 'stable' | 'declining'
  sources: SentimentSource[]
  recent_interactions: SentimentInteraction[]
}

export interface SentimentSource {
  type: 'email' | 'meeting' | 'support' | 'survey'
  sentiment: number
  count: number
}

export interface SentimentInteraction {
  date: string
  type: string
  sentiment: number
  summary: string
}

// Benchmark Data
export interface BenchmarkData {
  peer_group: string
  metrics: BenchmarkMetric[]
}

export interface BenchmarkMetric {
  name: string
  account_value: number
  peer_average: number
  peer_median: number
  percentile: number
}

// Action Alerts
export interface ActionAlert {
  id: string
  type: 'renewal_risk' | 'churn_risk' | 'upsell' | 'support_escalation' | 'usage_drop' | 'engagement_drop'
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  timestamp: string
  suggested_action: string
  action_url?: string
  is_read: boolean
}

// Human Notes
export interface HumanNote {
  id: string
  author: string
  author_email: string
  content: string
  created_at: string
  updated_at: string
  tags: string[]
}

// Meeting Brief
export interface MeetingBrief {
  generated_at: string
  snapshot_id: string
  summary: string
  key_points: string[]
  talking_points: string[]
  risks_to_address: string[]
  opportunities: string[]
  recent_activity_summary: string
  recommended_topics: string[]
}

// Value Realization
export interface ValueRealization {
  goals: ValueGoal[]
  overall_realization_percent: number
  time_to_value_days: number
  adoption_score: number
}

export interface ValueGoal {
  id: string
  name: string
  target: number
  current: number
  unit: string
  status: 'on_track' | 'at_risk' | 'behind'
  due_date: string
}

// Signal (extended for detail page)
export interface Signal {
  id: string
  type: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  timestamp: string
  source: string
  is_read: boolean
}

/** Confluence KB client implementation summary for account detail widget */
export interface ConfluenceImplementationResponse {
  has_content: boolean
  page_title?: string | null
  page_text?: string | null
  page_id?: string | null
  space_id?: string | null
  root_page_name?: string | null
}

// Full Account Detail Response
export interface AccountFullDetail {
  // Basic account info
  account: AccountDetail
  
  // Use case data
  health_breakdown: HealthBreakdown
  support_analysis: SupportAnalysis
  usage_analysis: UsageAnalysis
  whitespace: WhitespaceAnalysis
  contract: ContractContext
  changes_since_last_touch: ChangeEvent[]
  risk_assessment: RiskAssessment
  sentiment: SentimentAnalysis
  benchmark: BenchmarkData
  alerts: ActionAlert[]
  signals: Signal[]
  notes: HumanNote[]
  meeting_brief: MeetingBrief
  value_realization: ValueRealization
  gong_activity: GongActivityAnalysis | null

  // Metadata
  last_updated: string
  last_touch_date: string
}

// ============================================
// Gong Activity Types
// ============================================

export interface GongTrackerSignal {
  tracker_name: string
  call_count: number
  mention_count: number
  category: 'risk' | 'engagement' | 'general'
}

export interface GongCallSummary {
  call_id: string
  title: string
  started_at: string
  duration_minutes: number
  brief_excerpt: string | null
  customer_attendees: string[]
  csm_attendees: string[]
}

export interface GongActivityAnalysis {
  meetings_30d: number
  meetings_90d: number
  last_meeting_date: string | null
  days_since_last_meeting: number | null
  tracker_signals: GongTrackerSignal[]
  risk_signal_calls: number
  engagement_signal_calls: number
  engagement_label: string
  engagement_trend: string
  engagement_score: number
  recent_calls: GongCallSummary[]
  latest_key_points: string[]
}

// Extended Account Detail
export interface AccountDetail extends Account {
  arr: number
  mrr: number
  contract_start_date: string
  contract_end_date: string
  industry: string
  employees: number
  website: string
  logo_url?: string
}

// ============================================
// ARR Analysis Types
// ============================================

export interface ARRRevenueMonth {
  month: string  // Format: "2025-01"
  native_currency: number
  cad: number
}

export interface ARRContractGroup {
  contract_group: string
  revenue_type: string
  currency: string
  arr_native: number
  arr_cad: number
  tcv_native: number
  tcv_cad: number
  acv_native: number
  acv_cad: number
  contract_start: string | null
  contract_end: string | null
  contract_years: number | null
  performance_obligation_count: number
  revenue_schedule: ARRRevenueMonth[]
}

export interface ARRCustomerSummary {
  account: string
  account_id: string | null
  region: string
  industry: string | null
  total_arr_cad: number
  total_arr_native: number
  total_tcv_cad: number
  total_acv_cad: number
  contract_count: number
  contract_groups: ARRContractGroup[]
  primary_currency: string
  renewal_next_90_days: number
}

export interface ARRByRevenueType {
  revenue_type: string
  arr_cad: number
  tcv_cad: number
  contract_count: number
  customer_count: number
}

export interface ARRByRegion {
  region: string
  arr_cad: number
  tcv_cad: number
  customer_count: number
}

export interface ARRByIndustry {
  industry: string
  arr_cad: number
  tcv_cad: number
  customer_count: number
}

export interface ARRByAccountType {
  account_type: string
  arr_cad: number
  customer_count: number
}

export interface ARRPortfolioSummary {
  total_arr_cad: number
  total_tcv_cad: number
  total_acv_cad: number
  total_contracts: number
  total_customers: number
  renewals_next_90_days_arr: number
  renewals_next_90_days_count: number
  by_revenue_type: ARRByRevenueType[]
  by_region: ARRByRegion[]
  by_industry: ARRByIndustry[]
  by_account_type?: ARRByAccountType[]
}

export interface ARRAnalysisResponse {
  summary: ARRPortfolioSummary
  customers: ARRCustomerSummary[]
  total_customers: number
  page: number
  page_size: number
}

// ============================================
// Customer Growth Types
// ============================================

export interface MonthlyGrowthPoint {
  year: number
  month: number
  label: string
  new_count: number
  churn_count: number
  net_change: number
  cumulative_total: number
}

export interface CustomerEvent {
  account_id: string
  account_name: string
  date: string
  event_type: 'new' | 'churned'
  industry?: string | null
  region?: string | null
}

export interface CustomerGrowthSummary {
  new_last_12m: number
  new_prior_12m: number
  yoy_growth_pct: number
  total_customers_now: number
  net_change_12m: number
  churn_last_12m: number
  avg_per_month: number
}

export interface CustomerGrowthResponse {
  summary: CustomerGrowthSummary
  monthly_series: MonthlyGrowthPoint[]
  events: CustomerEvent[]
}

export interface GroupMonthlyPoint {
  year: number
  month: number
  label: string
  cumulative_total: number
}

export interface GroupSeries {
  group_name: string
  series: GroupMonthlyPoint[]
}

export interface CustomerGrowthBreakdownResponse {
  dimension: string
  groups: GroupSeries[]
}
