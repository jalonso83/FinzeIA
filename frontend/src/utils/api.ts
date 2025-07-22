import axios from 'axios'
import { useAuthStore } from '../stores/auth'

// VITE_API_URL debe incluir /api al final (ej: https://backend-url.com/api)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Tipos para las respuestas de la API
export interface ApiResponse<T = any> {
  message: string
  data?: T
  error?: string
}

export interface LoginResponse {
  message: string
  token: string
  user: {
    id: string
    name: string
    email: string
    verified: boolean
    onboardingCompleted?: boolean
  }
}

export interface RegisterResponse {
  message: string
  user: {
    id: string
    email: string
    verified: boolean
  }
}

export interface Transaction {
  id: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category: {
    id: string
    name: string
    icon: string
    type: 'INCOME' | 'EXPENSE'
    isDefault: boolean
  }
  description?: string
  date: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  icon: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id: string
  name: string
  category_id: string
  amount: number
  period: string
  start_date: string
  end_date: string
  spent: number
  is_active: boolean
  alert_percentage: number
  created_at: string
  updated_at: string
  category: {
    id: string
    name: string
    icon: string
    type: 'INCOME' | 'EXPENSE'
    isDefault: boolean
  }
}

export interface ZenioResponse {
  message: string
  response: {
    message: string
    threadId: string
    messageId: string
    timestamp: string
  }
}

// Funciones de la API
export const authAPI = {
  register: async (data: {
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
  }): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  verifyEmail: async (email: string, token: string): Promise<ApiResponse> => {
    const response = await api.post('/auth/verify-email', { email, token })
    return response.data
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse> => {
    const response = await api.post('/auth/reset-password', { token, newPassword })
    return response.data
  },
}

export const transactionsAPI = {
  getAll: async (params?: {
    page?: number
    limit?: number
    type?: string
    category_id?: string
    startDate?: string
    endDate?: string
  }): Promise<{ transactions: Transaction[]; pagination: any }> => {
    const response = await api.get('/transactions', { params })
    return response.data
  },

  getById: async (id: string): Promise<{ transaction: Transaction }> => {
    const response = await api.get(`/transactions/${id}`)
    return response.data
  },

  create: async (data: {
    amount: number
    type: 'INCOME' | 'EXPENSE'
    category_id: string
    description?: string
    date?: string
  }): Promise<{ message: string; transaction: Transaction }> => {
    const response = await api.post('/transactions', data)
    return response.data
  },

  update: async (id: string, data: Partial<Transaction>): Promise<{ message: string; transaction: Transaction }> => {
    const response = await api.put(`/transactions/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/transactions/${id}`)
    return response.data
  },
}

export const budgetsAPI = {
  getAll: async (params?: { 
    page?: number
    limit?: number
    is_active?: boolean
    category_id?: string
  }): Promise<{ budgets: Budget[]; pagination: any }> => {
    const response = await api.get('/budgets', { params })
    return response.data
  },

  getById: async (id: string): Promise<{ budget: Budget }> => {
    const response = await api.get(`/budgets/${id}`)
    return response.data
  },

  create: async (data: {
    name: string
    category_id: string
    amount: number
    period: string
    start_date: string
    end_date: string
    alert_percentage?: number
  }): Promise<{ message: string; budget: Budget }> => {
    const response = await api.post('/budgets', data)
    return response.data
  },

  update: async (id: string, data: Partial<Budget>): Promise<{ message: string; budget: Budget }> => {
    const response = await api.put(`/budgets/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/budgets/${id}`)
    return response.data
  },
}

export const categoriesAPI = {
  getAll: async (params?: { type?: string }): Promise<Category[]> => {
    const response = await api.get('/categories', { params })
    return response.data
  },

  create: async (data: { name: string; type: 'INCOME' | 'EXPENSE'; icon: string }): Promise<{ message: string; category: Category }> => {
    const response = await api.post('/categories', data)
    return response.data
  },

  update: async (id: string, data: { name?: string; icon?: string }): Promise<{ message: string; category: Category }> => {
    const response = await api.put(`/categories/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/categories/${id}`)
    return response.data
  },
}

export const zenioAPI = {
  chat: async (message: string, threadId?: string): Promise<ZenioResponse> => {
    // Log de la URL final y datos enviados
    const url = api.defaults.baseURL + '/zenio/chat'
    let payload: any = { message };
    if (threadId && typeof threadId === 'string' && threadId.startsWith('thread_')) {
      payload.threadId = threadId;
    }
    console.log('[ZenioAPI] URL:', url)
    console.log('[ZenioAPI] Payload:', payload)
    try {
      const response = await api.post('/zenio/chat', payload)
      console.log('[ZenioAPI] Respuesta:', response)
      return response.data
    } catch (error) {
      console.error('[ZenioAPI] Error:', error)
      throw error
    }
  },

  getHistory: async (threadId: string): Promise<{ message: string; threadId: string; messages: any[] }> => {
    let params: any = {};
    if (threadId && typeof threadId === 'string' && threadId.startsWith('thread_')) {
      params.threadId = threadId;
    }
    const response = await api.get('/zenio/history', { params })
    return response.data
  },
}

export default api 