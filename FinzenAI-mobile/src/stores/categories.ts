import { create } from 'zustand';
import api from '../utils/api';

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'INCOME' | 'EXPENSE';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoriesState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  
  // Actions
  fetchCategories: () => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoriesByType: (type: 'INCOME' | 'EXPENSE') => Category[];
  clearError: () => void;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,
  lastFetched: null,
  
  fetchCategories: async () => {
    // Evitar fetch innecesario si ya tenemos datos recientes (menos de 5 minutos)
    const now = new Date();
    const lastFetched = get().lastFetched;
    if (lastFetched && (now.getTime() - lastFetched.getTime()) < 5 * 60 * 1000) {
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      const response = await api.get('/categories');
      set({ 
        categories: response.data, 
        loading: false,
        lastFetched: now
      });
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      set({ 
        error: error.response?.data?.error || 'Error al cargar categorías', 
        loading: false 
      });
    }
  },
  
  getCategoryById: (id: string) => {
    return get().categories.find(cat => cat.id === id);
  },
  
  getCategoriesByType: (type: 'INCOME' | 'EXPENSE') => {
    return get().categories.filter(cat => cat.type === type);
  },
  
  clearError: () => {
    set({ error: null });
  }
})); 