// API Configuration for FinZen Mobile App
// Adaptado del frontend web para React Native

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Configuración de la API - HARDCODEADA PARA DEBUGGING
const API_BASE_URL = 'https://finzenai-backend-production.up.railway.app';
const API_URL_WITH_PATH = `${API_BASE_URL}/api`;

// Debug para verificar la URL
console.log('=== DEBUG API CONFIG ===');
console.log('expoConfig API_URL:', Constants.expoConfig?.extra?.API_URL);
console.log('manifest API_URL:', Constants.manifest?.extra?.API_URL);
console.log('Final API_BASE_URL:', API_BASE_URL);
console.log('Final API_URL_WITH_PATH:', API_URL_WITH_PATH);
console.log('========================');

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
    console.error('Error getting stored token:', error);
    return null;
  }
};

// Función para guardar el token en el almacenamiento seguro
export const saveToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

// Función para eliminar el token del almacenamiento seguro
export const removeToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
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

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('✅ API SUCCESS:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    const url = error.config?.url || '';
    console.log('❌ API ERROR:', url);
    console.log('Error details:', error.message);
    console.log('Response status:', error.response?.status);
    console.log('Response data:', error.response?.data);

    // Manejar errores de autenticación
    if (error.response?.status === 401) {
      // Verificar si es un endpoint que no debe causar logout
      const shouldSkipLogout = SKIP_LOGOUT_ENDPOINTS.some(endpoint => url.includes(endpoint));

      if (!shouldSkipLogout) {
        // Limpiar token y forzar logout solo para endpoints críticos
        await removeToken();
        console.log('Token inválido, limpiando almacenamiento...');
      } else {
        console.log('401 en endpoint no crítico, no se hace logout');
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
  category?: Category;
  userId: string;
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
  
  create: (data: Omit<Transaction, 'id' | 'userId'>) => 
    api.post<Transaction>('/transactions', data),
  
  update: (id: string, data: Partial<Transaction>) => 
    api.put<Transaction>(`/transactions/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/transactions/${id}`),
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
    api.post('/auth/login', { email, password }),
  
  register: (userData: { 
    name: string; 
    lastName: string;
    email: string; 
    password: string;
    phone: string;
    birthDate: string;
    country: string;
    state: string;
    city: string;
    currency: string;
    preferredLanguage: string;
    occupation: string;
    company?: string;
  }) => 
    api.post('/auth/register', userData),
  
  verifyEmail: (token: string) => 
    api.post('/auth/verify-email', { token }),
  
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
    api.post('/zenio/chat', { message, threadId, isOnboarding }),

  updateOnboardingStatus: (completed: boolean) =>
    api.put('/auth/onboarding-status', { onboardingCompleted: completed }),
};

// API de Detective de Gastos Hormiga
export const antExpenseAPI = {
  // Obtener configuración y opciones disponibles
  getConfig: () =>
    api.get('/zenio/ant-expense-config'),

  // Analizar gastos hormiga con parámetros configurables
  analyze: (params?: {
    antThreshold?: number;
    minFrequency?: number;
    monthsToAnalyze?: number;
    useAI?: boolean;
  }) =>
    api.get('/zenio/ant-expense-analysis', { params }),
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

// API de suscripciones
export const subscriptionsAPI = {
  // Obtener todos los planes disponibles (público)
  getPlans: () =>
    api.get('/subscriptions/plans'),

  // Obtener suscripción actual del usuario (requiere auth)
  getCurrent: () =>
    api.get('/subscriptions/current'),

  // Crear sesión de checkout para upgrade (requiere auth)
  createCheckout: (plan: 'PREMIUM' | 'PRO') =>
    api.post('/subscriptions/checkout', { plan }),

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
  changePlan: (newPlan: 'PREMIUM' | 'PRO') =>
    api.post('/subscriptions/change-plan', { newPlan }),

  // Obtener historial de pagos (requiere auth)
  getPayments: (limit: number = 10) =>
    api.get(`/subscriptions/payments?limit=${limit}`),

  // Verificar estado de sesión de checkout (requiere auth)
  checkCheckoutSession: (sessionId: string) =>
    api.get(`/subscriptions/checkout/${sessionId}`),
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

  // Marcar como leída
  markAsRead: (notificationId: string) =>
    api.put(`/notifications/${notificationId}/read`),

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

export default api;