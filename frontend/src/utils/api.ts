import axios from 'axios'
import { useAuthStore } from '../stores/auth'

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
    email: string
    verified: boolean
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
  category: string
  description?: string
  date: string
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id: string
  amount: number
  month: number
  year: number
  createdAt: string
  updatedAt: string
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
  register: async (email: string, password: string): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', { email, password })
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
    category?: string
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
    category: string
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
  getAll: async (params?: { year?: number }): Promise<{ budgets: Budget[] }> => {
    const response = await api.get('/budgets', { params })
    return response.data
  },

  getById: async (id: string): Promise<{ budget: Budget }> => {
    const response = await api.get(`/budgets/${id}`)
    return response.data
  },

  create: async (data: { amount: number; month: number; year: number }): Promise<{ message: string; budget: Budget }> => {
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

export const zenioAPI = {
  chat: async (message: string, threadId?: string): Promise<ZenioResponse> => {
    const response = await api.post('/zenio/chat', { message, threadId })
    return response.data
  },

  getHistory: async (threadId: string): Promise<{ message: string; threadId: string; messages: any[] }> => {
    const response = await api.get('/zenio/history', { params: { threadId } })
    return response.data
  },
}

export default api 