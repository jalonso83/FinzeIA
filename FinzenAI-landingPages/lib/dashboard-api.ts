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
    verified: number;
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
    // null = ventana aún no observable (cohorte inmadura), no 0% de retención.
    d1: number | null;
    d7: number | null;
    d14: number | null;
    d30: number | null;
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
  txAdoptionRate: number;
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

export interface FinancialHealthData {
  grossIncomeTotal: number;
  incomeThisMonth: number;
  expensesThisMonth: number;
  fixedExpensesThisMonth: number;
  variableExpensesThisMonth: number;
  cashFlowThisMonth: number;
  burnRate: number;
  runway: number | null;
  estado: 'Sostenible' | 'Precaución' | 'Crítico';
  currentMonth: { from: string; to: string };
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

export interface AcquisitionData {
  kpis: {
    pageViews: number;
    leads: number;
    registrations: number;
    subscriptions: number;
    pageViewsChange: number;
    leadsChange: number;
    registrationsChange: number;
    subscriptionsChange: number;
  };
  funnel: {
    visitors: number;
    leads: number;
    registrations: number;
    subscriptions: number;
    visitorsToLeadsRate: number;
    leadsToRegistrationsRate: number;
    registrationsToSubscriptionsRate: number;
    visitorsToSubscriptionsRate: number;
  };
  eventsByDay: {
    day: string;
    pageViews: number;
    leads: number;
    registrations: number;
    subscriptions: number;
  }[];
  bySource: {
    source: string;
    campaign: string | null;
    visitors: number;
    leads: number;
    registrations: number;
    subscriptions: number;
    revenue: number;
    conversionRate: number;
  }[];
  cohort: {
    trackingStartDate: string | null;
    historicalUsersCount: number;
  };
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
  zenioQueries: number;
  lastActivity: string | null;
  cohort: 'Android' | 'iOS' | 'Desconocido';
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
  cohort?: string; // 'Android' | 'iOS' | 'Desconocido'
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

// ─── Periodos para el PDF (rolling / mes calendario / trimestre) ──

export interface PeriodParams {
  from: string;  // YYYY-MM-DD
  to: string;    // YYYY-MM-DD
  label: string; // etiqueta legible (portada + header del PDF)
}

const ROLLING_LABELS: Record<DateRange, string> = {
  '7d': 'Últimos 7 días',
  '14d': 'Últimos 14 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
};

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Rango relativo (últimos N días desde hoy) → from/to + etiqueta.
export function computeRollingParams(range: DateRange): PeriodParams {
  const { from, to } = computeDateParams(range);
  return { from, to, label: ROLLING_LABELS[range] };
}

// Mes calendario completo (1ro al último día). monthIndex: 0=Enero … 11=Diciembre.
// Construimos las fechas como strings directos para evitar shifts de zona horaria.
export function computeMonthParams(year: number, monthIndex: number): PeriodParams {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    label: `${MONTH_NAMES[monthIndex]} ${year}`,
  };
}

// Trimestre calendario. quarter: 1 (Ene–Mar), 2 (Abr–Jun), 3 (Jul–Sep), 4 (Oct–Dic).
export function computeQuarterParams(year: number, quarter: number): PeriodParams {
  const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9
  const endMonth = startMonth + 2;      // 2, 5, 8, 11
  const mmStart = String(startMonth + 1).padStart(2, '0');
  const mmEnd = String(endMonth + 1).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, endMonth + 1, 0)).getUTCDate();
  return {
    from: `${year}-${mmStart}-01`,
    to: `${year}-${mmEnd}-${String(lastDay).padStart(2, '0')}`,
    label: `Q${quarter} ${year}`,
  };
}

async function fetchEndpoint<T>(endpoint: string, from: string, to: string): Promise<T> {
  const params = new URLSearchParams({ from, to });

  // Si la página actual fue abierta en modo PDF (Puppeteer), propagar el
  // pdfToken a las requests del API. Sin esto el proxy/backend rechazaría
  // las queries del dashboard porque Puppeteer no tiene cookie de admin.
  if (typeof window !== 'undefined') {
    const currentPdfToken = new URLSearchParams(window.location.search).get('pdfToken');
    if (currentPdfToken) {
      params.set('pdfToken', currentPdfToken);
    }
  }

  const res = await fetch(`/api/admin/${endpoint}?${params.toString()}`);
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(`API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

// ─── Public API ─────────────────────────────────────────────────

export async function fetchAllDashboardData(from: string, to: string) {
  const [pulse, users, revenue, engagement, openaiCosts, unitEconomics, financialHealth, acquisition] = await Promise.all([
    fetchEndpoint<PulseData>('pulse', from, to),
    fetchEndpoint<UsersData>('users', from, to),
    fetchEndpoint<RevenueData>('revenue', from, to),
    fetchEndpoint<EngagementData>('engagement', from, to),
    fetchEndpoint<OpenAICostsData>('openai-costs', from, to),
    fetchEndpoint<UnitEconomicsData>('unit-economics', from, to),
    // Financial health no usa rango (siempre mes actual + bruto acumulado),
    // pero pasamos los params igual por uniformidad. El backend los ignora.
    fetchEndpoint<FinancialHealthData>('financial-health', from, to),
    fetchEndpoint<AcquisitionData>('acquisition', from, to),
  ]);

  return { pulse, users, revenue, engagement, openaiCosts, unitEconomics, financialHealth, acquisition };
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
  if (params.cohort) searchParams.set('cohort', params.cohort);
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

// ─── Campaign Costs ─────────────────────────────────────────────

export interface CampaignCostRow {
  id: string | null;
  source: string;
  campaign: string;        // '' = sin campaña
  costUSD: number;
  notes: string | null;
  visitors: number;
  leads: number;
  registrations: number;   // anonymousIds únicos con Lead (atribuidos)
  cpv: number | null;
  cpl: number | null;
  cac: number | null;
  hasEvents: boolean;      // true si tiene eventos en attribution_events
  isManual: boolean;       // true si SOLO existe como costo (sin eventos todavía)
}

export interface CampaignCostsResponse {
  rows: CampaignCostRow[];
  summary: {
    totalInvested: number;
    totalAttributed: number;
    avgCAC: number | null;
  };
}

export async function fetchCampaignCosts(): Promise<CampaignCostsResponse> {
  const res = await fetch('/api/admin/campaign-costs');
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(`API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as CampaignCostsResponse;
}

export async function upsertCampaignCost(input: {
  source: string;
  campaign: string;
  costUSD: number;
  notes?: string | null;
}): Promise<void> {
  const res = await fetch('/api/admin/campaign-costs', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
}

export async function deleteCampaignCost(id: string): Promise<void> {
  const res = await fetch(`/api/admin/campaign-costs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(`API error: ${res.status}`);
  }
}
