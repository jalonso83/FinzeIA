import { create } from 'zustand';
import api from '../utils/api';

export interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string | {
    id: string;
    name: string;
    icon: string;
    type: 'INCOME' | 'EXPENSE';
    isDefault: boolean;
  };
  description?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface TransactionFilters {
  type?: 'INCOME' | 'EXPENSE';
  category?: string;
  startDate?: string;
  endDate?: string;
}

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  filters: TransactionFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  
  // Actions
  setTransactions: (transactions: Transaction[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<TransactionFilters>) => void;
  setPagination: (pagination: any) => void;
  
  // CRUD Operations
  fetchTransactions: (page?: number, limit?: number) => Promise<void>;
  createTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction | null>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<Transaction | null>;
  deleteTransaction: (id: string) => Promise<boolean>;
  getTransactionById: (id: string) => Promise<Transaction | null>;
  
  // Utility
  clearError: () => void;
  resetFilters: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  },

  // Setters
  setTransactions: (transactions) => set({ transactions }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
  setPagination: (pagination) => set({ pagination }),
  
  // CRUD Operations
  fetchTransactions: async (page = 1, limit = 10) => {
    const { filters } = get();
    set({ loading: true, error: null });
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      
      const response = await api.get(`/transactions?${params}`);
      const { transactions, pagination } = response.data;
      
      set({ 
        transactions, 
        pagination,
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al cargar transacciones',
        loading: false 
      });
    }
  },

  createTransaction: async (transactionData) => {
    set({ loading: true, error: null });
    
    try {
      const response = await api.post('/transactions', transactionData);
      const newTransaction = response.data.transaction;
      
      // Agregar la nueva transacción al estado
      set((state) => ({
        transactions: [newTransaction, ...state.transactions],
        loading: false
      }));
      
      return newTransaction;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al crear transacción',
        loading: false 
      });
      return null;
    }
  },

  updateTransaction: async (id, transactionData) => {
    set({ loading: true, error: null });
    
    try {
      const response = await api.put(`/transactions/${id}`, transactionData);
      const updatedTransaction = response.data.transaction;
      
      // Actualizar la transacción en el estado
      set((state) => ({
        transactions: state.transactions.map(t => 
          t.id === id ? updatedTransaction : t
        ),
        loading: false
      }));
      
      return updatedTransaction;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al actualizar transacción',
        loading: false 
      });
      return null;
    }
  },

  deleteTransaction: async (id) => {
    set({ loading: true, error: null });
    
    try {
      await api.delete(`/transactions/${id}`);
      
      // Remover la transacción del estado
      set((state) => ({
        transactions: state.transactions.filter(t => t.id !== id),
        loading: false
      }));
      
      return true;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al eliminar transacción',
        loading: false 
      });
      return false;
    }
  },

  getTransactionById: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const response = await api.get(`/transactions/${id}`);
      const transaction = response.data.transaction;
      
      set({ loading: false });
      return transaction;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al obtener transacción',
        loading: false 
      });
      return null;
    }
  },

  // Utility
  clearError: () => set({ error: null }),
  resetFilters: () => set({ filters: {} })
})); 