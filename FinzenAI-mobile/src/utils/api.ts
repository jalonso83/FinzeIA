// API Configuration for FinZen Mobile App
// Adaptado del frontend web para React Native

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

import { logger } from './logger';

// API Configuration - Production
const API_BASE_URL = 'https://finzenai-backend-production.up.railway.app';
const API_URL_WITH_PATH = `${API_BASE_URL}/api`;

// Clave para almacenar el token de forma segura
const TOKEN_KEY = 'finzen_auth_token';

// Crear instancia de axios
const api: AxiosInstance = axios.create({
  baseURL: API_URL_WITH_PATH,
  timeout: 60000, // 60 segundos para Zenio AI
  headers: {
    'Content-Type': 'application/json',
  },
});

// Función para obtener el token del almacenamiento seguro
const getStoredToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    logger.error('Error getting stored token:', error);
    return null;
  }
};

// Función para guardar el token en el almacenamiento seguro
export const saveToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    logger.error('Error saving token:', error);
  }
};

// Función para eliminar el token del almacenamiento seguro
export const removeToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    logger.error('Error removing token:', error);
  }
};

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Endpoints que NO deben causar logout automático en 401
const SKIP_LOGOUT_ENDPOINTS = [
  '/email-sync/status',
  '/email-sync/gmail/auth-url',
  '/notifications/',
  '/reports/',
];

// Callback para forzar logout desde fuera (se configura desde el AuthStore)
let forceLogoutCallback: (() => void) | null = null;

export const setForceLogoutCallback = (callback: () => void) => {
  forceLogoutCallback = callback;
};

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response: AxiosResponse) => {
    logger.log('✅ API SUCCESS:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    const url = error.config?.url || '';
    logger.log('❌ API ERROR:', url);
    logger.log('Error details:', error.message);
    logger.log('Response status:', error.response?.status);
    logger.log('Response data:', error.response?.data);

    // Manejar errores de autenticación (401 y 403 con token inválido)
    const status = error.response?.status;
    const errorMessage = (error.response?.data?.message || '').toLowerCase();

    if (status === 401 || (status === 403 && errorMessage.includes('invalid token'))) {
      const shouldSkipLogout = SKIP_LOGOUT_ENDPOINTS.some(endpoint => url.includes(endpoint));

      if (!shouldSkipLogout) {
        logger.log('Token invalido detectado, forzando logout...');
        await removeToken();
        if (forceLogoutCallback) {
          forceLogoutCallback();
        }
      }
    }

    return Promise.reject(error);
  }
);

// Interfaces para las APIs (copiadas del frontend web)
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category_id: string;
  categoryId?: string;
  category?: Category;
  userId: string;
  // Si viene con valor, esta transacción la generó automáticamente una regla
  // de recurrencia (se le muestra el badge 🔄). null = la creó el usuario.
  recurringId?: string | null;
}

// Gastos / ingresos recurrentes
export type RecurrenceFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface RecurringTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string | null;
  category_id: string;
  category?: Category;
  frequency: RecurrenceFrequency;
  startDate: string;
  nextRunDate: string;
  lastRunAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'INCOME' | 'EXPENSE' | 'BOTH';
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  category_id: string;
  category?: Category;
  period: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

// APIs para transacciones
export const transactionsAPI = {
  getAll: (params?: { limit?: number }) => 
    api.get<{ transactions: Transaction[] }>('/transactions', { params }),
  
  // `recurrence` es opcional: si viene, el backend además de la transacción de
  // hoy crea la regla que la repetirá. La primera generada es la SIGUIENTE.
  create: (data: Omit<Transaction, 'id' | 'userId'> & { recurrence?: { frequency: RecurrenceFrequency } }) =>
    api.post<Transaction>('/transactions', data),

  update: (id: string, data: Partial<Transaction>) =>
    api.put<Transaction>(`/transactions/${id}`, data),

  delete: (id: string) =>
    api.delete(`/transactions/${id}`),
};

// APIs para gastos/ingresos recurrentes.
// Las reglas se CREAN desde transactionsAPI.create (campo `recurrence`); aquí
// solo se listan, se apagan/prenden y se borran.
export const recurringAPI = {
  getAll: () =>
    api.get<{ recurringTransactions: RecurringTransaction[] }>('/recurring-transactions'),

  toggle: (id: string, isActive: boolean) =>
    api.patch<{ message: string; recurringTransaction: RecurringTransaction }>(
      `/recurring-transactions/${id}/toggle`,
      { isActive }
    ),

  delete: (id: string) =>
    api.delete(`/recurring-transactions/${id}`),
};

// APIs para categorías
export const categoriesAPI = {
  getAll: () => 
    api.get<Category[]>('/categories'),
  
  create: (data: Omit<Category, 'id'>) => 
    api.post<Category>('/categories', data),
};

// APIs para presupuestos
export const budgetsAPI = {
  getAll: (params?: { is_active?: boolean; category_id?: string }) => 
    api.get<{ budgets: Budget[] }>('/budgets', { params }),
  
  create: (data: Omit<Budget, 'id' | 'spent'>) => 
    api.post<Budget>('/budgets', data),
  
  update: (id: string, data: Partial<Budget>) => 
    api.put<Budget>(`/budgets/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/budgets/${id}`),
};

// API de autenticación
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email: email.toLowerCase().trim(), password }),

  register: (userData: {
    name: string;
    lastName: string;
    email: string;
    password: string;
    country: string;
    currency: string;
    // Campos legacy — opcionales. El formulario nuevo no los pide.
    // Apps viejas que aún los envían siguen funcionando (backend los acepta).
    phone?: string;
    birthDate?: string;
    state?: string;
    city?: string;
    preferredLanguage?: string;
    occupation?: string;
    company?: string;
    referralCode?: string;
  }) =>
    api.post('/auth/register', { ...userData, email: userData.email.toLowerCase().trim() }),

  verifyEmail: (token: string) =>
    api.post('/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email: email.toLowerCase().trim() }),

  logout: () =>
    api.post('/auth/logout'),

  getProfile: () => 
    api.get('/auth/profile'),

  updateProfile: (userData: {
    name?: string;
    lastName?: string;
    phone?: string;
    birthDate?: string;
    country?: string;
    state?: string;
    city?: string;
    currency?: string;
    preferredLanguage?: string;
    occupation?: string;
    company?: string;
  }) =>
    api.put('/auth/profile', userData),

  deleteAccount: (password: string) =>
    api.delete('/auth/account', { data: { password } }),

  // SSO — Sign in with Apple / Google.
  // El backend hace login del usuario existente (match por sub) o crea uno nuevo,
  // y para email verificado linkea automáticamente con cuenta password existente.
  // deviceCountry / deviceLocale se usan para inferir país y moneda en users nuevos.
  appleSignIn: (payload: {
    identityToken: string;
    name?: string;
    lastName?: string;
    referralCode?: string;
    deviceCountry?: string;
    deviceLocale?: string;
  }) =>
    api.post<SSOAuthResponse>('/auth/apple', payload),

  googleSignIn: (payload: {
    idToken: string;
    referralCode?: string;
    deviceCountry?: string;
    deviceLocale?: string;
  }) =>
    api.post<SSOAuthResponse>('/auth/google', payload),
};

export interface SSOAuthResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    verified: boolean;
    onboardingCompleted: boolean;
  };
  isNewUser: boolean;
  linked: boolean;
}

// API de onboarding (saltar onboarding — gateado por feature flag)
export const onboardingAPI = {
  skip: () =>
    api.post<{ message: string; user: any; alreadyCompleted: boolean }>('/auth/onboarding/skip'),

  // Marca el onboarding como completado, validando que exista perfil financiero.
  // Devuelve 409 con code: 'ONBOARDING_PROFILE_MISSING' si no hay perfil.
  complete: () =>
    api.post<{ message: string; user: any; alreadyCompleted: boolean }>('/auth/onboarding/complete'),
};

// API de configuración / feature flags por usuario
export const configAPI = {
  getFeatures: () =>
    api.get<{ onboardingSkipEnabled: boolean; onboardingNonblockingEnabled: boolean }>('/config/features'),
  // Señal de entrada a la app (H10). Idempotente en el backend: marca firstAppEntryAt
  // para todos y, en la variante no-bloqueante, flipea onboardingCompleted='nonblocking'.
  markAppEntered: () => api.post<{ ok: boolean }>('/config/app-entered'),
};

// API de anuncios in-app (slot del dashboard). Mensajes empujados desde el panel
// admin (broadcast con surface slot/both). Los eventos alimentan el funnel de medición.
export const announcementsAPI = {
  list: () => api.get<{ messages: any[] }>('/announcements'),
  trackEvent: (id: string, event: 'impression' | 'click' | 'dismiss') =>
    api.post(`/announcements/${id}/event`, { event }),
};

// H13 · Reto de la Primera Semana. El slot consulta getState al abrir el dashboard
// y llama a offer/hour/optout cuando el usuario toca un botón del reto.
export interface H13View {
  view: 'offer' | 'hour_picker' | 'none';
  message?: string;
  buttons?: { label: string; action: string; value: string }[];
}
export const h13API = {
  getState: () => api.get<H13View>('/h13/state'),
  offer: (decision: 'accept' | 'decline') => api.post<H13View>('/h13/offer', { decision }),
  hour: (hour: number) => api.post<{ ok: boolean }>('/h13/hour', { hour }),
  optout: () => api.post<{ ok: boolean }>('/h13/optout'),
};

// API de gamificación
export const gamificationAPI = {
  getUserStats: () => 
    api.get('/gamification/user-stats'),
  
  getRecentEvents: (limit?: number) => 
    api.get('/gamification/events/recent', { params: { limit } }),
  
  getUserStreak: () => 
    api.get('/gamification/streak'),
};

// API de metas/goals (cuando esté disponible)
export const goalsAPI = {
  getAll: () => 
    api.get('/goals'),
  
  create: (data: any) => 
    api.post('/goals', data),
  
  update: (id: string, data: any) => 
    api.put(`/goals/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/goals/${id}`),
  
  contribute: (id: string, data: { amount: number }) => 
    api.post(`/goals/${id}/contribute`, data),
};

// API de Zenio (chat AI)
export const zenioAPI = {
  chat: (message: string, threadId?: string, isOnboarding?: boolean) => 
    api.post('/zenio/agents/chat', { message, threadId, isOnboarding }),
  
  updateOnboardingStatus: (completed: boolean) => 
    api.put('/auth/onboarding-status', { onboardingCompleted: completed }),
};

// API de reportes
export const reportsAPI = {
  getDateReport: (params: {
    startDate: string;
    endDate: string;
    granularity?: string;
    transactionType?: string;
  }) => api.get(`/reports/dates?${new URLSearchParams(params).toString()}`),
};

// API de suscripciones (Stripe)
export const subscriptionsAPI = {
  // Obtener todos los planes disponibles (público)
  getPlans: () =>
    api.get('/subscriptions/plans'),

  // Obtener suscripción actual del usuario (requiere auth)
  getCurrent: () =>
    api.get('/subscriptions/current'),

  // Crear sesión de checkout para upgrade (requiere auth)
  createCheckout: (plan: 'PREMIUM' | 'PRO', billingPeriod: 'monthly' | 'yearly' = 'monthly') =>
    api.post('/subscriptions/checkout', { plan, billingPeriod }),

  // Cancelar suscripción al final del período (requiere auth)
  cancel: () =>
    api.post('/subscriptions/cancel'),

  // Reactivar suscripción cancelada (requiere auth)
  reactivate: () =>
    api.post('/subscriptions/reactivate'),

  // Crear portal de cliente de Stripe (requiere auth)
  createCustomerPortal: () =>
    api.post('/subscriptions/customer-portal'),

  // Cambiar de plan (requiere auth)
  changePlan: (newPlan: 'PREMIUM' | 'PRO', billingPeriod: 'monthly' | 'yearly' = 'monthly') =>
    api.post('/subscriptions/change-plan', { newPlan, billingPeriod }),

  // Obtener historial de pagos (requiere auth)
  getPayments: (limit: number = 10) =>
    api.get(`/subscriptions/payments?limit=${limit}`),

  // Verificar estado de sesión de checkout (requiere auth)
  checkCheckoutSession: (sessionId: string) =>
    api.get(`/subscriptions/checkout/${sessionId}`),

  // Iniciar período de prueba de 7 días (sin tarjeta)
  startTrial: (plan: 'PREMIUM' | 'PRO', deviceInfo?: { deviceId: string; platform: 'ios' | 'android'; deviceName?: string }) =>
    api.post('/subscriptions/start-trial', { plan, ...deviceInfo }),
};

// API de notificaciones push
export const notificationsAPI = {
  // Registrar dispositivo
  registerDevice: (data: {
    fcmToken: string;
    platform: 'ANDROID' | 'IOS';
    deviceName?: string;
    appVersion?: string;
  }) => api.post('/notifications/device', data),

  // Desregistrar dispositivo
  unregisterDevice: (fcmToken: string) =>
    api.delete('/notifications/device', { data: { fcmToken } }),

  // Obtener preferencias
  getPreferences: () =>
    api.get('/notifications/preferences'),

  // Actualizar preferencias
  updatePreferences: (preferences: {
    emailSyncEnabled?: boolean;
    budgetAlertsEnabled?: boolean;
    goalRemindersEnabled?: boolean;
    weeklyReportEnabled?: boolean;
    tipsEnabled?: boolean;
    budgetAlertThreshold?: number;
    quietHoursStart?: number | null;
    quietHoursEnd?: number | null;
  }) => api.put('/notifications/preferences', preferences),

  // Obtener historial
  getHistory: (limit: number = 50) =>
    api.get(`/notifications/history?limit=${limit}`),

  // Marcar como leída (read=true) o no leída (read=false)
  markAsRead: (notificationId: string, read: boolean = true) =>
    api.put(`/notifications/${notificationId}/read`, { read }),

  // Eliminar una notificación
  delete: (notificationId: string) =>
    api.delete(`/notifications/${notificationId}`),

  // Eliminar todas las notificaciones
  deleteAll: () =>
    api.delete('/notifications/all'),

  // Enviar notificación de prueba (solo desarrollo)
  sendTest: () =>
    api.post('/notifications/test'),
};

// Interfaces para recordatorios de pago
export interface PaymentReminder {
  id: string;
  userId: string;
  name: string;
  type: PaymentType;
  dueDay: number;
  cutoffDay?: number | null;
  amount?: number | null;
  currency: string;
  creditLimit?: number | null;
  isDualCurrency: boolean;
  creditLimitUSD?: number | null;
  reminderDays: number[];
  notifyOnCutoff: boolean;
  isActive: boolean;
  lastNotifiedAt?: string | null;
  lastDueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  typeInfo?: PaymentTypeInfo;
}

export type PaymentType =
  | 'CREDIT_CARD'
  | 'LOAN'
  | 'MORTGAGE'
  | 'UTILITY'
  | 'INSURANCE'
  | 'SUBSCRIPTION'
  | 'OTHER';

export interface PaymentTypeInfo {
  label: string;
  icon: string;
}

export interface UpcomingPayment {
  id: string;
  name: string;
  type: PaymentType;
  dueDate: string;
  daysUntilDue: number;
  amount?: number | null;
  currency: string;
  typeInfo?: PaymentTypeInfo;
}

export interface ReminderStats {
  totalReminders: number;
  activeReminders: number;
  totalMonthlyAmount: number;
  upcomingThisWeek: number;
  byType: Record<PaymentType, number>;
}

// API de recordatorios de pago
export const remindersAPI = {
  // Obtener tipos de pago disponibles (público)
  getPaymentTypes: () =>
    api.get<{ success: boolean; types: { value: PaymentType; label: string; icon: string }[] }>('/reminders/types'),

  // Obtener todos los recordatorios del usuario
  getAll: (activeOnly: boolean = true) =>
    api.get<{ success: boolean; reminders: PaymentReminder[]; total: number }>('/reminders', {
      params: { active: activeOnly }
    }),

  // Obtener un recordatorio por ID
  getById: (id: string) =>
    api.get<{ success: boolean; reminder: PaymentReminder }>(`/reminders/${id}`),

  // Crear nuevo recordatorio
  create: (data: {
    name: string;
    type?: PaymentType;
    dueDay: number;
    cutoffDay?: number;
    amount?: number;
    currency?: string;
    creditLimit?: number;
    isDualCurrency?: boolean;
    creditLimitUSD?: number;
    reminderDays?: number[];
    notifyOnCutoff?: boolean;
    notes?: string;
  }) =>
    api.post<{ success: boolean; message: string; reminder: PaymentReminder }>('/reminders', data),

  // Actualizar recordatorio
  update: (id: string, data: {
    name?: string;
    type?: PaymentType;
    dueDay?: number;
    cutoffDay?: number | null;
    amount?: number | null;
    currency?: string;
    creditLimit?: number | null;
    isDualCurrency?: boolean;
    creditLimitUSD?: number | null;
    reminderDays?: number[];
    notifyOnCutoff?: boolean;
    notes?: string | null;
    isActive?: boolean;
  }) =>
    api.put<{ success: boolean; message: string; reminder: PaymentReminder }>(`/reminders/${id}`, data),

  // Eliminar recordatorio
  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/reminders/${id}`),

  // Obtener próximos pagos
  getUpcoming: (days: number = 30) =>
    api.get<{ success: boolean; upcoming: UpcomingPayment[]; total: number }>('/reminders/upcoming', {
      params: { days }
    }),

  // Obtener estadísticas
  getStats: () =>
    api.get<{ success: boolean; stats: ReminderStats }>('/reminders/stats'),

  // Activar/desactivar recordatorio
  toggle: (id: string, isActive: boolean) =>
    api.patch<{ success: boolean; message: string; reminder: { id: string; name: string; isActive: boolean } }>(
      `/reminders/${id}/toggle`,
      { isActive }
    ),
};

// API de Detector de Gastos Hormiga
export const antExpenseAPI = {
  // Obtener configuración y opciones disponibles
  getConfig: () =>
    api.get('/zenio/v2/ant-expense-config'),

  // Analizar gastos hormiga con parámetros configurables
  analyze: (params?: {
    antThreshold?: number;
    minFrequency?: number;
    monthsToAnalyze?: number;
    useAI?: boolean;
  }) =>
    api.get('/zenio/v2/ant-expense-analysis', { params }),
};

// Interfaces para sistema de referidos
export interface ReferralInfo {
  enabled: boolean;
  benefits: {
    referee: {
      discount: number;
      description: string;
    };
    referrer: {
      freeMonths: number;
      description: string;
    };
  };
  terms: {
    expiryDays: number;
    description: string;
  };
}

export interface ReferralCodeResponse {
  success: boolean;
  referralCode: string;
  shareUrl: string;
  discount: string;
  reward: string;
  message: string;
}

export interface ReferralValidation {
  valid: boolean;
  referrerName?: string;
  discount?: string;
  discountMessage?: string;
  reason?: string;
  message?: string;
}

export interface ReferralStats {
  referralCode: string;
  shareUrl: string;
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  rewardedReferrals: number;
  expiredReferrals: number;
  totalRewardsEarned: number;
  pendingRewards: number;
  referralsList: Array<{
    id: string;
    refereeName: string;
    refereeEmail: string;
    status: 'PENDING' | 'CONVERTED' | 'REWARDED' | 'EXPIRED' | 'CANCELLED';
    createdAt: string;
    convertedAt: string | null;
  }>;
  config: {
    discountPercent: number;
    freeMonths: number;
    expiryDays: number;
  };
}

export interface ReferralReward {
  id: string;
  type: 'REFERRER_FREE_MONTH' | 'REFEREE_DISCOUNT';
  value: number;
  description: string;
  createdAt: string;
}

// API de sistema de referidos
export const referralsAPI = {
  // Obtener información del sistema de referidos (público)
  getInfo: () =>
    api.get<ReferralInfo>('/referrals/info'),

  // Validar un código de referido (público, para pre-registro)
  validateCode: (code: string) =>
    api.get<ReferralValidation>(`/referrals/validate/${code}`),

  // Obtener o generar código de referido del usuario (requiere auth)
  getCode: () =>
    api.get<ReferralCodeResponse>('/referrals/code'),

  // Obtener estadísticas de referidos del usuario (requiere auth)
  getStats: () =>
    api.get<{ success: boolean } & ReferralStats>('/referrals/stats'),

  // Obtener recompensas pendientes del usuario (requiere auth)
  getRewards: () =>
    api.get<{ success: boolean; pendingRewards: ReferralReward[]; totalPending: number }>('/referrals/rewards'),
};

// API de tasas de cambio
export const exchangeRatesAPI = {
  // Obtener todas las tasas de cambio actuales
  getAll: () =>
    api.get<{ success: boolean; rates: Array<{ currency: string; rateToDop: number; rateToUsd: number; date: string; source: string }>; count: number }>('/exchange-rates'),

  // Obtener tasa de una moneda específica
  getRate: (currency: string) =>
    api.get<{ success: boolean; rate: { currency: string; rateToDop: number; rateToUsd: number; date: string; source: string } }>(`/exchange-rates/${currency}`),
};

export default api;