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

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('✅ API SUCCESS:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.log('❌ API ERROR:', error.config?.url);
    console.log('Error details:', error.message);
    console.log('Response status:', error.response?.status);
    console.log('Response data:', error.response?.data);
    
    // Manejar errores de autenticación
    if (error.response?.status === 401) {
      // Limpiar token y forzar logout
      await removeToken();
      console.log('Token inválido, limpiando almacenamiento...');
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

// API de reportes
export const reportsAPI = {
  getDateReport: (params: {
    startDate: string;
    endDate: string;
    granularity?: string;
    transactionType?: string;
  }) => api.get(`/reports/dates?${new URLSearchParams(params).toString()}`),
};

export default api;