// Gamification Store - Estado global robusto con Zustand para Gamificación
// Store con persistencia, sync automático, y manejo de errores

import React from 'react';
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import toast from 'react-hot-toast';

import { gamificationService, APIError } from '../services/gamificationService';
import type {
  FinScore,
  FinScoreHistory,
  UserBadge,
  Badge,
  UserStreak,
  GamificationStats,
  LeaderboardEntry,
  ChallengeParticipant,
  GamificationState,
  GamificationActions,
  GamificationError
} from '../types/gamification';
import { EventType } from '../types/gamification';

// ===== INTERFACES DEL STORE =====

interface GamificationStore extends GamificationState, GamificationActions {
  // Estados adicionales para UX
  isInitialized: boolean;
  isOnline: boolean;
  syncInProgress: boolean;
  
  // Acciones internas
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
  _setInitialized: (initialized: boolean) => void;
  _setSyncStatus: (syncing: boolean) => void;
  
  // Utilitarias avanzadas
  getFinScoreProgress: () => { current: number; next: number; progress: number };
  getBadgesByCategory: () => Record<string, UserBadge[]>;
  getUnlockedBadges: () => Badge[];
  getLockedBadges: () => Badge[];
}

// ===== CONFIGURACIÓN =====

const SYNC_INTERVAL = 30 * 1000; // 30 segundos
const RETRY_ATTEMPTS = 3;

// ===== STORE PRINCIPAL =====

export const useGamificationStore = create<GamificationStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // ===== ESTADO INICIAL =====
          finScore: null,
          finScoreHistory: [],
          badges: [],
          availableBadges: [],
          streak: null,
          stats: null,
          leaderboard: [],
          challenges: [],
          isLoading: false,
          isInitialized: false,
          isOnline: true,
          syncInProgress: false,
          error: null,
          lastUpdated: null,

          // ===== ACCIONES INTERNAS =====
          _setLoading: (loading: boolean) => set({ isLoading: loading }),
          
          _setError: (error: string | null) => set({ error, isLoading: false }),
          
          _setInitialized: (initialized: boolean) => set({ isInitialized: initialized }),
          
          _setSyncStatus: (syncing: boolean) => set({ syncInProgress: syncing }),

          // ===== FINSCORE =====
          fetchFinScore: async () => {
            const state = get();
            if (state.isLoading) return;

            set({ isLoading: true, error: null });
            
            try {
              const finScore = await gamificationService.getFinScore();
              set({
                finScore,
                isLoading: false,
                lastUpdated: new Date().toISOString()
              });
            } catch (error) {
              const errorMessage = error instanceof APIError 
                ? error.message 
                : 'Error obteniendo FinScore';
              
              set({ error: errorMessage, isLoading: false });
              
              if (!(error instanceof APIError && error.statusCode === 401)) {
                toast.error(errorMessage);
              }
            }
          },

          fetchFinScoreHistory: async () => {
            try {
              const history = await gamificationService.getFinScoreHistory();
              set({ finScoreHistory: history });
            } catch (error) {
              console.error('Error obteniendo historial de FinScore:', error);
              // No mostrar toast para historial, es información secundaria
            }
          },

          recalculateFinScore: async () => {
            const state = get();
            if (state.isLoading) return;

            set({ isLoading: true, error: null });
            
            try {
              const finScore = await gamificationService.recalculateFinScore();
              set({
                finScore,
                isLoading: false,
                lastUpdated: new Date().toISOString()
              });
              
              toast.success('FinScore recalculado exitosamente');
              
              // Recargar stats también
              get().fetchGamificationStats();
            } catch (error) {
              const errorMessage = error instanceof APIError 
                ? error.message 
                : 'Error recalculando FinScore';
              
              set({ error: errorMessage, isLoading: false });
              toast.error(errorMessage);
            }
          },

          // ===== BADGES =====
          fetchUserBadges: async () => {
            try {
              const badges = await gamificationService.getUserBadges();
              set({ badges });
            } catch (error) {
              console.error('Error obteniendo badges del usuario:', error);
              if (error instanceof APIError && error.statusCode !== 404) {
                toast.error('Error cargando badges');
              }
            }
          },

          fetchAvailableBadges: async () => {
            try {
              const availableBadges = await gamificationService.getAvailableBadges();
              set({ availableBadges });
            } catch (error) {
              console.error('Error obteniendo badges disponibles:', error);
              // Los badges disponibles no son críticos para la UX
            }
          },

          // ===== STREAKS =====
          fetchUserStreak: async () => {
            try {
              const streak = await gamificationService.getUserStreak();
              set({ streak });
            } catch (error) {
              console.error('Error obteniendo racha:', error);
              // Las rachas pueden no existir, no es un error
              set({ streak: null });
            }
          },

          // ===== ESTADÍSTICAS =====
          fetchGamificationStats: async () => {
            try {
              const stats = await gamificationService.getGamificationStats();
              set({ stats });
            } catch (error) {
              console.error('Error obteniendo estadísticas:', error);
              if (error instanceof APIError && error.statusCode !== 404) {
                toast.error('Error cargando estadísticas');
              }
            }
          },

          // ===== LEADERBOARD =====
          fetchLeaderboard: async () => {
            try {
              const leaderboard = await gamificationService.getLeaderboard();
              set({ leaderboard });
            } catch (error) {
              console.error('Error obteniendo leaderboard:', error);
              // El leaderboard es opcional
            }
          },

          // ===== CHALLENGES =====
          fetchChallenges: async () => {
            try {
              const challenges = await gamificationService.getUserChallenges();
              set({ challenges });
            } catch (error) {
              console.error('Error obteniendo desafíos:', error);
              // Los desafíos son opcionales
              set({ challenges: [] });
            }
          },

          // ===== UTILIDADES =====
          clearError: () => set({ error: null }),

          resetState: () => set({
            finScore: null,
            finScoreHistory: [],
            badges: [],
            availableBadges: [],
            streak: null,
            stats: null,
            leaderboard: [],
            challenges: [],
            error: null,
            lastUpdated: null,
            isInitialized: false
          }),

          // ===== GETTERS AVANZADOS =====
          getFinScoreProgress: () => {
            const { finScore } = get();
            if (!finScore) return { current: 0, next: 100, progress: 0 };
            
            const current = finScore.currentScore;
            const next = current + finScore.pointsToNextLevel;
            const levelMin = next - finScore.pointsToNextLevel;
            const progress = ((current - levelMin) / finScore.pointsToNextLevel) * 100;
            
            return { current, next, progress: Math.min(100, Math.max(0, progress)) };
          },

          getBadgesByCategory: () => {
            const { badges } = get();
            return badges.reduce((acc, userBadge) => {
              const category = userBadge.badge.category;
              if (!acc[category]) acc[category] = [];
              acc[category].push(userBadge);
              return acc;
            }, {} as Record<string, UserBadge[]>);
          },

          getUnlockedBadges: () => {
            const { badges, availableBadges } = get();
            const unlockedIds = new Set(badges.map(b => b.badgeId));
            return availableBadges.filter(badge => unlockedIds.has(badge.id));
          },

          getLockedBadges: () => {
            const { badges, availableBadges } = get();
            const unlockedIds = new Set(badges.map(b => b.badgeId));
            return availableBadges.filter(badge => !unlockedIds.has(badge.id));
          }
        }))
      ),
      {
        name: 'gamification-store',
        version: 1,
        partialize: (state) => ({
          finScore: state.finScore,
          badges: state.badges,
          availableBadges: state.availableBadges,
          streak: state.streak,
          stats: state.stats,
          lastUpdated: state.lastUpdated
        })
      }
    ),
    {
      name: 'gamification-store'
    }
  )
);

// ===== HOOKS ESPECIALIZADOS =====

/**
 * Hook para inicializar automáticamente el store
 */
export const useGamificationInit = () => {
  const store = useGamificationStore();
  
  React.useEffect(() => {
    if (store.isInitialized) return;
    
    const initializeStore = async () => {
      store._setLoading(true);
      
      try {
        // Verificar conectividad
        const isOnline = await gamificationService.checkHealth();
        store._setSyncStatus(!isOnline);
        
        if (isOnline) {
          // Cargar datos esenciales en paralelo
          await Promise.allSettled([
            store.fetchFinScore(),
            store.fetchUserBadges(),
            store.fetchAvailableBadges(),
            store.fetchUserStreak(),
            store.fetchGamificationStats()
          ]);
        }
        
        store._setInitialized(true);
      } catch (error) {
        console.error('Error inicializando gamificación:', error);
        store._setError('Error inicializando sistema de gamificación');
      } finally {
        store._setLoading(false);
      }
    };
    
    initializeStore();
  }, [store]);
};

/**
 * Hook para sync automático periódico
 */
export const useGamificationSync = (enabled: boolean = true) => {
  const store = useGamificationStore();
  
  React.useEffect(() => {
    if (!enabled || !store.isInitialized) return;
    
    const syncData = async () => {
      if (store.isLoading || store.syncInProgress) return;
      
      store._setSyncStatus(true);
      
      try {
        // Sync silencioso de datos clave
        await Promise.allSettled([
          store.fetchFinScore(),
          store.fetchUserBadges(),
          store.fetchUserStreak(),
          store.fetchGamificationStats()
        ]);
      } catch (error) {
        console.error('Error en sync automático:', error);
      } finally {
        store._setSyncStatus(false);
      }
    };
    
    const interval = setInterval(syncData, SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, store]);
};

/**
 * Hook para escuchar cambios específicos del store
 */
export const useGamificationListener = (
  selector: (state: GamificationStore) => any,
  listener: (value: any, previousValue: any) => void
) => {
  React.useEffect(() => {
    const unsubscribe = useGamificationStore.subscribe(selector, listener);
    return unsubscribe;
  }, [selector, listener]);
};

// ===== SELECTORS =====

export const gamificationSelectors = {
  finScore: (state: GamificationStore) => state.finScore,
  badges: (state: GamificationStore) => state.badges,
  streak: (state: GamificationStore) => state.streak,
  stats: (state: GamificationStore) => state.stats,
  isLoading: (state: GamificationStore) => state.isLoading,
  error: (state: GamificationStore) => state.error,
  progress: (state: GamificationStore) => state.getFinScoreProgress(),
  badgesByCategory: (state: GamificationStore) => state.getBadgesByCategory(),
  unlockedBadges: (state: GamificationStore) => state.getUnlockedBadges(),
  lockedBadges: (state: GamificationStore) => state.getLockedBadges()
};

// ===== UTILIDADES DE EXPORTACIÓN =====

/**
 * Función para invalidar y refrescar todos los datos
 */
export const refreshGamificationData = async () => {
  const store = useGamificationStore.getState();
  
  gamificationService.clearCache();
  
  await Promise.allSettled([
    store.fetchFinScore(),
    store.fetchUserBadges(),
    store.fetchUserStreak(),
    store.fetchGamificationStats(),
    store.fetchLeaderboard()
  ]);
};

/**
 * Función para manejar eventos de gamificación en tiempo real
 */
export const handleGamificationEvent = async (eventType: EventType, data?: any) => {
  const store = useGamificationStore.getState();
  
  // Invalidar cache del servicio
  gamificationService.invalidateUserData();
  
  // Refrescar datos específicos basados en el evento
  switch (eventType) {
    case EventType.ADD_TRANSACTION:
      await Promise.allSettled([
        store.fetchFinScore(),
        store.fetchUserStreak(),
        store.fetchGamificationStats()
      ]);
      break;
      
    case EventType.CREATE_BUDGET:
    case EventType.CREATE_GOAL:
      await Promise.allSettled([
        store.fetchFinScore(),
        store.fetchGamificationStats()
      ]);
      break;
      
    case EventType.COMPLETE_GOAL:
      // Puede otorgar nuevos badges
      await Promise.allSettled([
        store.fetchFinScore(),
        store.fetchUserBadges(),
        store.fetchGamificationStats()
      ]);
      break;
      
    default:
      // Refresh completo para eventos desconocidos
      await refreshGamificationData();
  }
};

export default useGamificationStore;