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
  trialToPaidRate: number;
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
  trialsActive: number;
  cancellations30d: number;
  trialToPaidRate: number;
  mrrTrend: { month: string; mrr: number; premium: number; pro: number }[];
  payments: { succeeded: number; failed: number; totalAmount: number };
  period: { from: string; to: string };
}

export interface EngagementData {
  transactionsPerActiveUser: number;
  totalTransactions: number;
  activeUsers: number;
  onboardingRate: number;
  zenioTotalQueries: number;
  referrals: { total: number; converted: number };
  registrationsByChannel: { country: string; count: number }[];
  period: { from: string; to: string };
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

  const [pulse, users, revenue, engagement] = await Promise.all([
    fetchEndpoint<PulseData>('pulse', from, to),
    fetchEndpoint<UsersData>('users', from, to),
    fetchEndpoint<RevenueData>('revenue', from, to),
    fetchEndpoint<EngagementData>('engagement', from, to),
  ]);

  return { pulse, users, revenue, engagement };
}
