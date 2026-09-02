// ─── Types ──────────────────────────────────────────────────────
export type DateRange = '7d' | '14d' | '30d' | '90d';

export interface PulseData {
  totalUsers: number;
  newRegistrations: number;
  registrationChange: number;
  // #8: true cuando el período de comparación cruza el inicio del tracking limpio,
  // por lo que los % "vs período anterior" tienen base parcial y pueden estar inflados.
  prevPeriodTruncated: boolean;
  trackingStart: string | null;
  activatedUsers: number;
  planDistribution: Record<string, number>;
  churnRate: number;
  trialsActive: number;
  trialsStarted: number;
  trialConversionRate: number;
  trialsByMonth: { month: string; trials: number }[];
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
    activated: number;
    retainedD1: number;
    retainedD7: number;
    cohortD1: number;
    cohortD7: number;
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
  zenioActiveUsers: number;
  zenioAdoptionRate: number;
  zenioRealAdoptionRate: number;
  zenioMessagesTotal: number;
  zenioMessagesThisMonth: number;
  txAdoptionRate: number;
  streakActiveUsers: number;
  streakActiveRate: number;
  timeToFirstTx: {
    medianHours: number | null;
    firstTxRate: number;
    cohortSize: number;
  };
  // El bloque `onboarding` (skip / sin terminar / activación por camino) se retiró
  // al eliminar el muro definitivamente: sin muro, entrar a la app ya marca el
  // onboarding como completo, así que esas tasas medían otra cosa.
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

/**
 * Eval del trial PRO de 21 días, firmada el 1 de septiembre de 2026.
 *
 * Los umbrales están en el documento y NO se tocan sin documentar el cambio:
 * activación de Email Sync ≥30%, contraste D7 ≥8 puntos, D30 ≥5 puntos,
 * cancelación temprana >20% = alarma.
 */
export interface TrialEvalData {
  emailSync: {
    activadores: number;
    nuevosDelPeriodo: number;
    pctActivacion: number;
    primeraActivacion: string | null;
  };
  desenlaceTrial: {
    total: number;
    activos: number;
    convirtio: number;
    vencio: number;
    cancelo: number;
    pctConversion: number;
    pctCancelacionTemprana: number;
  };
  retencionPorDia: { dia: number; cohorte: number; activos: number; pct: number }[];
  contraste: {
    d7: ContrasteEmailSync;
    d30: ContrasteEmailSync;
  };
  cohorteLimpiaDesde: string;
  period: { from: string; to: string };
}

export interface ContrasteEmailSync {
  conEmailSync: { cohorte: number; retenidos: number; pct: number };
  sinEmailSync: { cohorte: number; retenidos: number; pct: number };
  /** Ya viene restado: es lo que la eval compara contra su umbral. */
  diferenciaPuntos: number;
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
    medium: string | null;
    campaign: string | null;
    visitors: number;
    leads: number;
    registrations: number;
    subscriptions: number;
    revenue: number;
    conversionRate: number;
    costUSD: number;            // inversión manual cruzada desde Costos (0 si no hay)
    campaignDate: string | null; // ISO; fecha de inicio (de Costos)
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
  goalCount: number;
  goalContributions: number;
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
    // 403 = el rol (ej. marketing) no puede ver este endpoint. Se maneja como
    // "sección vacía" en fetchAllDashboardData, no como error global.
    if (res.status === 403) throw new Error('FORBIDDEN');
    throw new Error(`API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

// ─── Public API ─────────────────────────────────────────────────

export async function fetchAllDashboardData(from: string, to: string) {
  // Un endpoint bloqueado por rol (403/FORBIDDEN) devuelve null para esa sección
  // en vez de tumbar toda la carga. UNAUTHORIZED (token inválido) sí propaga para
  // redirigir a login; cualquier otro error también propaga (comportamiento admin).
  const orNull = async <T>(p: Promise<T>): Promise<T | null> => {
    try {
      return await p;
    } catch (e) {
      if (e instanceof Error && e.message === 'FORBIDDEN') return null;
      throw e;
    }
  };

  const [pulse, users, revenue, engagement, openaiCosts, unitEconomics, financialHealth, acquisition, trialEval] = await Promise.all([
    orNull(fetchEndpoint<PulseData>('pulse', from, to)),
    orNull(fetchEndpoint<UsersData>('users', from, to)),
    orNull(fetchEndpoint<RevenueData>('revenue', from, to)),
    orNull(fetchEndpoint<EngagementData>('engagement', from, to)),
    orNull(fetchEndpoint<OpenAICostsData>('openai-costs', from, to)),
    orNull(fetchEndpoint<UnitEconomicsData>('unit-economics', from, to)),
    // Financial health no usa rango (siempre mes actual + bruto acumulado),
    // pero pasamos los params igual por uniformidad. El backend los ignora.
    orNull(fetchEndpoint<FinancialHealthData>('financial-health', from, to)),
    orNull(fetchEndpoint<AcquisitionData>('acquisition', from, to)),
    // Eval del trial PRO de 21 días — A2..A5 de la eval firmada el 1-sep-2026
    orNull(fetchEndpoint<TrialEvalData>('trial-eval', from, to)),
  ]);

  return { pulse, users, revenue, engagement, openaiCosts, unitEconomics, financialHealth, acquisition, trialEval };
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

// ─── Concesiones de plan (períodos de gracia) ───────────────────
//
// Un plan REGALADO por nosotros con fecha de caducidad: recuperar a alguien que
// se fue, disculparse por un bug, dejar entrar a un beta tester. Vive en sus
// propios campos del backend (`grantedPlan`/`grantedUntil`) y no en `plan`,
// porque Stripe y RevenueCat sobrescriben `plan` en cada sincronización.
//
// Por eso la lista de usuarios sigue mostrando el plan REAL: la concesión se
// pide aparte y se cruza por `userId` para pintar el distintivo.

export interface PlanGrant {
  userId: string;
  plan: 'FREE' | 'PREMIUM' | 'PRO';        // el plan real, lo que de verdad paga
  grantedPlan: 'PREMIUM' | 'PRO' | null;
  grantedUntil: string | null;
  grantedReason: string | null;
  vigente: boolean;                         // false = caducada, se conserva como historial
  user: { email: string; name: string; lastName: string };
}

export async function fetchGrants(): Promise<PlanGrant[]> {
  const res = await fetch('/api/admin/grants');
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(`API error: ${res.status}`);
  }
  const json = await res.json();
  return (json.grants || []) as PlanGrant[];
}

export async function grantPlan(
  userId: string,
  data: {
    plan: 'PREMIUM' | 'PRO';
    days: number;
    reason: string;
    /** Mandarle un push avisándole. Apagado = se lo dices tú por otro canal. */
    notify?: boolean;
    /** Cuerpo del push. Vacío = texto por defecto con el plan y la fecha. */
    message?: string;
  },
): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `No se pudo otorgar el plan (${res.status})`);
  }
}

export async function revokeGrant(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/grant`, { method: 'DELETE' });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `No se pudo retirar la concesión (${res.status})`);
  }
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
  campaignDate: string | null; // ISO; fecha de inicio (solo filas con costo manual)
  hidden: boolean;             // borrado lógico: oculta del dashboard
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

export async function fetchCampaignCosts(includeHidden = false): Promise<CampaignCostsResponse> {
  const url = includeHidden
    ? '/api/admin/campaign-costs?includeHidden=true'
    : '/api/admin/campaign-costs';
  const res = await fetch(url);
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
  campaignDate?: string | null;
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

export async function setCampaignHidden(input: {
  source: string;
  campaign: string;
  hidden: boolean;
}): Promise<void> {
  const res = await fetch('/api/admin/campaign-costs/hidden', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
}

// ─── Broadcasts (notificaciones masivas) ────────────────────────

export type BroadcastApiType = 'ANNOUNCEMENT' | 'MARKETING' | 'SYSTEM';

export interface BroadcastAudience {
  plans: string[];
  platforms: string[];
  country?: string;
  segments: string[];
  dormantDays?: number;
  trialEndingDays?: number; // segmento trial_ending (propuestas del agente)
  test?: boolean;
  targetEmail?: string; // envío dirigido a un usuario específico
}

export interface BroadcastPreviewResult {
  target: number;
  optedOut: number;
}

export interface BroadcastSendResult {
  targetCount: number;
  successCount: number;
  failureCount: number;
  suppressed: number;
}

export interface BroadcastItem {
  id: string;
  title: string;
  body: string;
  type: BroadcastApiType;
  status: string; // PENDING_APPROVAL | REJECTED | DRAFT | SENDING | SENT | FAILED | ACTIVE | ENDED
  targetCount: number | null;
  successCount: number | null;
  failureCount: number | null;
  audience: BroadcastAudience;
  surface?: string;
  holdoutPct?: number;
  mode?: string;              // ONE_SHOT | EVERGREEN
  trigger?: string | null;    // evergreen: 'first_app_entry'
  activatedAt?: string | null;
  endedAt?: string | null;
  createdBy?: string; // userId del admin, o 'growth-agent' si lo propuso el agente
  // Para propuestas del agente: { rationale, segment_slug, segment_params, proposed_by }
  data?: Record<string, unknown> | null;
  createdAt: string;
  sentAt: string | null;
}

export interface BroadcastsListResponse {
  items: BroadcastItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function previewBroadcast(
  type: BroadcastApiType,
  audience: BroadcastAudience,
): Promise<BroadcastPreviewResult> {
  const res = await fetch('/api/admin/broadcasts/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, audience }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as BroadcastPreviewResult;
}

export type BroadcastSurface = 'push' | 'slot' | 'both';

export type BroadcastMode = 'ONE_SHOT' | 'EVERGREEN';
export type BroadcastTrigger = 'first_app_entry';

export async function createBroadcast(input: {
  title: string;
  body: string;
  type: BroadcastApiType;
  data?: Record<string, string | number>;
  surface?: BroadcastSurface;   // dónde aparece: push / slot del dashboard / ambos
  holdoutPct?: number;          // 0-100: % de la audiencia elegible que NO recibe (control)
  mode?: BroadcastMode;         // ONE_SHOT (default) | EVERGREEN (siempre encendida)
  trigger?: BroadcastTrigger;   // requerido si mode=EVERGREEN
  audience: BroadcastAudience;
}): Promise<BroadcastItem> {
  const res = await fetch('/api/admin/broadcasts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as BroadcastItem;
}

export interface BroadcastStats {
  exposed: number;
  holdout: number;
  impressions: number;
  clicks: number;
  exposedTx: number;
  holdoutTx: number;
  exposedTxRate: number;
  holdoutTxRate: number;
  liftPts: number;
  // Pre/post (referencia descriptiva para campañas sin holdout).
  // Opcionales por retrocompatibilidad con backends sin el campo.
  exposedTxBefore?: number;
  exposedTxBeforeRate?: number;
  prePostPts?: number;
  // Activación de la PRUEBA de 7 días en la ventana. Es el resultado correcto
  // para campañas cuyo objetivo es que el usuario active su trial: "≥1
  // transacción" mide otra cosa (puede activar y no registrar nada esa semana).
  exposedTrial?: number;
  holdoutTrial?: number;
  exposedTrialRate?: number;
  holdoutTrialRate?: number;
  trialLiftPts?: number;
  // Evergreen: modo de la campaña + alcance vivo (inscritos = expuestos + holdout).
  mode?: string;
  enrolled?: number;
}

export async function fetchBroadcastStats(id: string): Promise<BroadcastStats> {
  const res = await fetch(`/api/admin/broadcasts/${encodeURIComponent(id)}/stats`);
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as BroadcastStats;
}

// ─── Experimentos ───────────────────────────────────────────────

export interface ExperimentArm {
  n: number;
  entered: number;
  enteredRate: number;
  activated: number;
  activationRate: number;
}

export interface H10Stats {
  enabled: boolean;
  pct: number;
  from: string | null;
  to: string;
  experimentStart: string | null;
  activationWindowDays: number;
  rollbackThresholdPts: number;
  minSamplePerArm: number;
  sufficientSample: boolean;
  rollbackTriggered: boolean;
  variant: ExperimentArm;
  control: ExperimentArm;
  activationLiftPts: number;
  entryLiftPts: number;
}

export async function fetchH10Stats(from?: string, to?: string): Promise<H10Stats> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await fetch(`/api/admin/experiments/h10/stats?${params.toString()}`);
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as H10Stats;
}

// H13 · Reto de la Primera Semana.
// `matured` = participantes cuya ventana de 7 días ya cerró. La métrica primaria
// se calcula SOLO sobre ellos: quien lleva 2 días dentro del reto todavía puede
// llegar a los 3 días, y contarlo como fracaso hunde la tasa artificialmente.
export interface H13Arm {
  n: number;
  matured: number;
  inProgress: number;
  reachedTarget: number;
  targetRate: number;
  offered: number;
  accepted: number;
  declined: number;
  completed: number;
  acceptRate: number;
}

export interface H13Stats {
  enabled: boolean;
  from: string | null;
  to: string;
  experimentStart: string | null;
  windowDays: number;
  targetDays: number;
  minSamplePerArm: number;
  sufficientSample: boolean;
  reto: H13Arm;
  control: H13Arm;
  targetLiftPts: number;
  /** Razón reto/control. El umbral pre-comprometido es "≥2×". Null si control = 0. */
  targetLiftRatio: number | null;
}

export async function fetchH13Stats(from?: string, to?: string): Promise<H13Stats> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await fetch(`/api/admin/experiments/h13/stats?${params.toString()}`);
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as H13Stats;
}

export async function sendBroadcastById(id: string): Promise<BroadcastSendResult> {
  const res = await fetch(`/api/admin/broadcasts/${encodeURIComponent(id)}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as BroadcastSendResult;
}

// Aprueba una propuesta del agente de crecimiento: PENDING_APPROVAL → DRAFT.
// Después de aprobar, el envío sigue el flujo normal (sendBroadcastById).
export async function approveBroadcastById(id: string): Promise<void> {
  const res = await fetch(`/api/admin/broadcasts/${encodeURIComponent(id)}/approve`, { method: 'POST' });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
}

// Rechaza una propuesta del agente: PENDING_APPROVAL → REJECTED (queda en el historial).
export async function rejectBroadcastById(id: string): Promise<void> {
  const res = await fetch(`/api/admin/broadcasts/${encodeURIComponent(id)}/reject`, { method: 'POST' });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
}

// Enciende una campaña evergreen: DRAFT → ACTIVE (empieza a inscribir usuarios nuevos).
export async function activateBroadcastById(id: string): Promise<void> {
  const res = await fetch(`/api/admin/broadcasts/${encodeURIComponent(id)}/activate`, { method: 'POST' });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
}

// Apaga una campaña evergreen: ACTIVE → ENDED (deja de inscribir; la medición se conserva).
export async function deactivateBroadcastById(id: string): Promise<void> {
  const res = await fetch(`/api/admin/broadcasts/${encodeURIComponent(id)}/deactivate`, { method: 'POST' });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
}

// Quita una campaña del historial. El backend decide: nunca enviada → borrado
// real ('deleted'); ya enviada → soft delete ('hidden', la medición se conserva).
export async function deleteBroadcastById(id: string): Promise<{ action: 'deleted' | 'hidden' }> {
  const res = await fetch(`/api/admin/broadcasts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as { action: 'deleted' | 'hidden' };
}

export async function fetchBroadcasts(page = 1): Promise<BroadcastsListResponse> {
  const res = await fetch(`/api/admin/broadcasts?page=${page}`);
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(`API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as BroadcastsListResponse;
}
