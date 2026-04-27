// ─── Types ──────────────────────────────────────────────────────
export type DateRange = '7d' | '14d' | '30d' | '90d';

export interface PulseData {
  totalUsers: number;
  newRegistrations: number;
  registrationChange: number;
  activatedUsers: number;
  planDistribution: Record<string, number>;
  churnRate: number;
  trialsActive: number;
  mrrEstimated: number;
  dau: number;
  mau: number;
  freeToPaidRate: number;
  retentionD1: number;
  retentionD7: number;
  retentionD30: number;
  period: { from: string; to: string };
}

export interface UsersData {
  registrationsByDay: { day: string; count: number }[];
  funnel: {
    registered: number;
    onboarded: number;
    activated: number;
    retainedD1: number;
    retainedD7: number;
    trialStarted: number;
    paid: number;
  };
  cohorts: {
    week: string;
    size: number;
    d1: number;
    d7: number;
    d14: number;
    d30: number;
  }[];
  period: { from: string; to: string };
}

export interface RevenueData {
  mrrCurrent: number;
  mrrPrevious: number;
  mrrChange: number;
  arpu: number;
  subscriptionsByStatus: Record<string, number>;
  revenueByPlan: { PREMIUM: number; PRO: number };
  subscribersByPlan: { PREMIUM: number; PRO: number };
  revenueByPlatform: { stripe: number; revenuecat: number };
  trialsActive: number;
  cancellations30d: number;
  mrrTrend: { month: string; mrr: number; premium: number; pro: number }[];
  payments: { succeeded: number; failed: number; totalAmount: number };
  period: { from: string; to: string };
}

export interface EngagementData {
  transactionsPerActiveUser: number;
  totalTransactions: number;
  activeUsers: number;
  onboardingRate: number;
  zenioActiveUsers: number;
  zenioAdoptionRate: number;
  streakActiveUsers: number;
  streakActiveRate: number;
  timeToFirstTx: {
    medianHours: number | null;
    firstTxRate: number;
    cohortSize: number;
  };
  referrals: { total: number; converted: number; conversionRate: number };
  registrationsByChannel: { country: string; count: number }[];
  period: { from: string; to: string };
}

export interface UnitEconomicsData {
  fixedCosts: {
    items: { name: string; category: string; monthlyAmount: number; notes?: string }[];
    total: number;
  };
  variableCosts: {
    openAI: number;
    stripeFees: number;
    revenueCatFees: number;
    total: number;
  };
  totalCostMonthly: number;
  cashFlowMonthly: number;
  // Por usuario activo (denominador = activeUsers)
  costPerUser: number;
  costAIPerUser: number;
  costInfraPerUser: number;
  // Por usuario total (denominador = totalUsers)
  costPerTotalUser: number;
  costAIPerTotalUser: number;
  costInfraPerTotalUser: number;
  grossMargin: number;
  breakEven: {
    usersNeeded: number | null;
    currentPayingUsers: number;
    progressPct: number;
  };
  mrrCurrent: number;
  arpu: number;
  activeUsers: number;
  totalUsers: number;
  breakdown: {
    concepto: string;
    category: string;
    costo: number;
    type: 'fixed' | 'variable';
    porcentaje: number;
  }[];
  period: { from: string; to: string; days: number };
}

export interface OpenAICostsData {
  totalCost: number;
  costTrend: { date: string; cost: number }[];
  costByFeature: Record<string, number>;
  costByModel: Record<string, number>;
  costByPlan: Record<string, number>;
  topUsers: { userId: string; name: string; cost: number }[];
  anomalies: { feature: string; dailyCost: number; reason: string }[];
  period: { from: string; to: string };
}

// ─── Users List (CRM) Types ─────────────────────────────────────

export interface UserListItem {
  id: string;
  name: string;
  lastName: string;
  email: string;
  country: string;
  verified: boolean;
  createdAt: string;
  plan: 'FREE' | 'PREMIUM' | 'PRO';
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  transactionCount: number;
  lastActivity: string | null;
}

export interface UserListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UsersListResponse {
  users: UserListItem[];
  pagination: UserListPagination;
}

export interface UsersListParams {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  status?: string;
  country?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Helpers ────────────────────────────────────────────────────

export function computeDateParams(range: DateRange): { from: string; to: string } {
  const to = new Date();
  const days = parseInt(range);
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

async function fetchEndpoint<T>(endpoint: string, from: string, to: string): Promise<T> {
  const res = await fetch(`/api/admin/${endpoint}?from=${from}&to=${to}`);
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(`API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

// ─── Public API ─────────────────────────────────────────────────

export async function fetchAllDashboardData(range: DateRange) {
  const { from, to } = computeDateParams(range);

  const [pulse, users, revenue, engagement, openaiCosts, unitEconomics] = await Promise.all([
    fetchEndpoint<PulseData>('pulse', from, to),
    fetchEndpoint<UsersData>('users', from, to),
    fetchEndpoint<RevenueData>('revenue', from, to),
    fetchEndpoint<EngagementData>('engagement', from, to),
    fetchEndpoint<OpenAICostsData>('openai-costs', from, to),
    fetchEndpoint<UnitEconomicsData>('unit-economics', from, to),
  ]);

  return { pulse, users, revenue, engagement, openaiCosts, unitEconomics };
}

// ─── Users List API ─────────────────────────────────────────────

export async function fetchUsersList(params: UsersListParams): Promise<UsersListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.plan) searchParams.set('plan', params.plan);
  if (params.status) searchParams.set('status', params.status);
  if (params.country) searchParams.set('country', params.country);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const res = await fetch(`/api/admin/users/list?${searchParams.toString()}`);
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(`API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as UsersListResponse;
}

export async function fetchDistinctCountries(): Promise<string[]> {
  const res = await fetch('/api/admin/users/countries');
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(`API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as string[];
}
