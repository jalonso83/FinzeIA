// Gamification Service - Cliente de API para Sistema de Gamificación
// Servicio frontend robusto con manejo de errores, caché y retry automático

import api from '../utils/api';
import type {
  FinScore,
  FinScoreHistory,
  UserBadge,
  Badge,
  UserStreak,
  GamificationStats,
  LeaderboardEntry,
  ChallengeParticipant,
  GamificationEvent,
  FinScoreResponse,
  FinScoreHistoryResponse,
  BadgesResponse,
  StreakResponse,
  StatsResponse,
  LeaderboardResponse,
  ApiResponse,
  GamificationError
} from '../types/gamification';
import { EventType } from '../types/gamification';

import { logger } from '../utils/logger';
// ===== CONFIGURACIÓN =====
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

// ===== CACHE SIMPLE =====
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cacheMap = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, duration: number = CACHE_DURATION): void {
    this.cacheMap.set(key, {
      data,
      timestamp: Date.now() + duration
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cacheMap.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.timestamp) {
      this.cacheMap.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear(): void {
    this.cacheMap.clear();
  }

  delete(key: string): void {
    this.cacheMap.delete(key);
  }
}

// ===== UTILIDADES =====
class APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;

  constructor(
    message: string,
    statusCode?: number,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Función de retry con backoff exponencial
async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    
    const delay = RETRY_DELAY * (MAX_RETRIES - retries + 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return withRetry(operation, retries - 1);
  }
}

// Manejo robusto de errores de API
function handleApiError(error: any): never {
  logger.error('[GamificationService] API Error:', error);
  
  if (error.response?.status === 401) {
    throw new APIError('No autorizado - sesión expirada', 401, 'UNAUTHORIZED');
  }
  
  if (error.response?.status === 403) {
    throw new APIError('Sin permisos para acceder a esta funcionalidad', 403, 'FORBIDDEN');
  }
  
  if (error.response?.status === 404) {
    throw new APIError('Recurso no encontrado', 404, 'NOT_FOUND');
  }
  
  if (error.response?.status >= 500) {
    throw new APIError('Error interno del servidor', error.response.status, 'SERVER_ERROR');
  }
  
  if (error.code === 'NETWORK_ERROR') {
    throw new APIError('Error de conexión - verifica tu internet', 0, 'NETWORK_ERROR');
  }
  
  const message = error.response?.data?.message || error.message || 'Error desconocido';
  throw new APIError(message, error.response?.status || 0, 'UNKNOWN_ERROR', error.response?.data);
}

// ===== SERVICIO PRINCIPAL =====
export class GamificationService {
  private static instance: GamificationService;
  private cache = new SimpleCache();

  static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }

  // ===== FINSCORE =====

  /**
   * Obtiene el FinScore actual del usuario
   */
  async getFinScore(useCache: boolean = true): Promise<FinScore> {
    const cacheKey = 'finscore';
    
    if (useCache) {
      const cached = this.cache.get<FinScore>(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await withRetry(async () => {
        const res = await api.get<FinScoreResponse>('/gamification/finscore');
        return res.data;
      });

      if (!response.success || !response.data) {
        throw new Error('Respuesta inválida del servidor');
      }

      const finScore = response.data;
      this.cache.set(cacheKey, finScore);
      
      return finScore;
    } catch (error) {
      handleApiError(error);
    }
  }

  /**
   * Obtiene el historial de FinScore del usuario
   */
  async getFinScoreHistory(limit: number = 50): Promise<FinScoreHistory[]> {
    const cacheKey = `finscore-history-${limit}`;
    const cached = this.cache.get<FinScoreHistory[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await withRetry(async () => {
        const res = await api.get<FinScoreHistoryResponse>('/gamification/finscore/history', {
          params: { limit }
        });
        return res.data;
      });

      if (!response.success || !Array.isArray(response.data)) {
        throw new Error('Respuesta inválida del servidor');
      }

      const history = response.data;
      this.cache.set(cacheKey, history, CACHE_DURATION / 2); // Cache más corto para historial
      
      return history;
    } catch (error) {
      handleApiError(error);
    }
  }

  /**
   * Recalcula el FinScore del usuario (útil para testing o correcciones)
   */
  async recalculateFinScore(): Promise<FinScore> {
    try {
      const response = await withRetry(async () => {
        const res = await api.post<FinScoreResponse>('/gamification/finscore/recalculate');
        return res.data;
      });

      if (!response.success || !response.data) {
        throw new Error('Error al recalcular FinScore');
      }

      // Invalidar cache
      this.cache.delete('finscore');
      this.cache.delete('stats');
      
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  }

  // ===== BADGES =====

  /**
   * Obtiene los badges obtenidos por el usuario
   */
  async getUserBadges(): Promise<UserBadge[]> {
    const cacheKey = 'user-badges';
    const cached = this.cache.get<UserBadge[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await withRetry(async () => {
        const res = await api.get<BadgesResponse>('/gamification/badges');
        return res.data;
      });

      if (!response.success || !Array.isArray(response.data)) {
        throw new Error('Respuesta inválida del servidor');
      }

      const badges = response.data;
      this.cache.set(cacheKey, badges);
      
      return badges;
    } catch (error) {
      handleApiError(error);
    }
  }

  /**
   * Obtiene todos los badges disponibles en el sistema
   */
  async getAvailableBadges(): Promise<Badge[]> {
    const cacheKey = 'available-badges';
    const cached = this.cache.get<Badge[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await withRetry(async () => {
        const res = await api.get<ApiResponse<Badge[]>>('/gamification/badges/available');
        return res.data;
      });

      if (!response.success || !Array.isArray(response.data)) {
        throw new Error('Respuesta inválida del servidor');
      }

      const badges = response.data;
      this.cache.set(cacheKey, badges, CACHE_DURATION * 2); // Cache más largo para badges disponibles
      
      return badges;
    } catch (error) {
      handleApiError(error);
    }
  }

  // ===== STREAKS =====

  /**
   * Obtiene la racha actual del usuario
   */
  async getUserStreak(): Promise<UserStreak | null> {
    // TEMPORAL: Invalidar cache completamente para debug
    this.clearCache();

    try {
      const response = await withRetry(async () => {
        const res = await api.get<StreakResponse>(`/gamification/streak?t=${Date.now()}`);
        return res.data;
      });

      if (!response.success) {
        return null; // No hay racha activa
      }

      const streak = response.data;
      logger.log('🔄 RACHA DEL BACKEND:', streak);
      
      return streak;
    } catch (error) {
      // Las rachas pueden no existir, no es un error crítico
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      handleApiError(error);
    }
  }

  // ===== ESTADÍSTICAS =====

  /**
   * Obtiene estadísticas generales de gamificación del usuario
   */
  async getGamificationStats(): Promise<GamificationStats> {
    const cacheKey = 'gamification-stats';
    const cached = this.cache.get<GamificationStats>(cacheKey);
    if (cached) return cached;

    try {
      const response = await withRetry(async () => {
        const res = await api.get<StatsResponse>('/gamification/stats');
        return res.data;
      });

      if (!response.success || !response.data) {
        throw new Error('Respuesta inválida del servidor');
      }

      const stats = response.data;
      this.cache.set(cacheKey, stats, CACHE_DURATION / 2);
      
      return stats;
    } catch (error) {
      handleApiError(error);
    }
  }

  // ===== LEADERBOARD =====

  /**
   * Obtiene el ranking/leaderboard global
   */
  async getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard-${limit}`;
    const cached = this.cache.get<LeaderboardEntry[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await withRetry(async () => {
        const res = await api.get<LeaderboardResponse>('/gamification/leaderboard', {
          params: { limit }
        });
        return res.data;
      });

      if (!response.success || !Array.isArray(response.data)) {
        throw new Error('Respuesta inválida del servidor');
      }

      const leaderboard = response.data;
      this.cache.set(cacheKey, leaderboard, CACHE_DURATION / 3); // Cache más corto para rankings
      
      return leaderboard;
    } catch (error) {
      handleApiError(error);
    }
  }

  // ===== CHALLENGES =====

  /**
   * Obtiene los desafíos del usuario (implementación futura)
   */
  async getUserChallenges(): Promise<ChallengeParticipant[]> {
    const cacheKey = 'user-challenges';
    const cached = this.cache.get<ChallengeParticipant[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await withRetry(async () => {
        const res = await api.get<ApiResponse<ChallengeParticipant[]>>('/gamification/challenges');
        return res.data;
      });

      if (!response.success || !Array.isArray(response.data)) {
        return []; // No hay desafíos activos
      }

      const challenges = response.data;
      this.cache.set(cacheKey, challenges);
      
      return challenges;
    } catch (error) {
      // Los desafíos son opcionales, no fallar la aplicación
      logger.warn('[GamificationService] Error obteniendo desafíos:', error);
      return [];
    }
  }

  // ===== EVENTOS (TESTING) =====

  /**
   * Despacha un evento de gamificación manualmente (solo para testing)
   */
  async dispatchEvent(eventType: EventType, eventData?: Record<string, any>): Promise<void> {
    try {
      await withRetry(async () => {
        const res = await api.post('/gamification/events/dispatch', {
          eventType,
          eventData
        });
        return res.data;
      });

      // Invalidar caches relevantes
      this.invalidateUserData();
    } catch (error) {
      handleApiError(error);
    }
  }

  // ===== UTILIDADES =====

  /**
   * Invalida todos los datos del usuario en caché
   */
  invalidateUserData(): void {
    this.cache.delete('finscore');
    this.cache.delete('user-badges');
    this.cache.delete('user-streak');
    this.cache.delete('gamification-stats');
    this.cache.delete('user-challenges');
  }

  /**
   * Limpia todo el caché
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Precarga datos esenciales de gamificación
   */
  async preloadEssentialData(): Promise<{
    finScore: FinScore;
    badges: UserBadge[];
    streak: UserStreak | null;
    stats: GamificationStats;
  }> {
    try {
      const [finScore, badges, streak, stats] = await Promise.allSettled([
        this.getFinScore(),
        this.getUserBadges(),
        this.getUserStreak(),
        this.getGamificationStats()
      ]);

      return {
        finScore: finScore.status === 'fulfilled' ? finScore.value : { currentScore: 0, level: 1, pointsToNextLevel: 100, totalPointsEarned: 0 },
        badges: badges.status === 'fulfilled' ? badges.value : [],
        streak: streak.status === 'fulfilled' ? streak.value : null,
        stats: stats.status === 'fulfilled' ? stats.value : {
          totalPoints: 0,
          badgesEarned: 0,
          currentStreak: 0,
          transactionsThisMonth: 0,
          goalsCompleted: 0,
          activeBudgets: 0,
          rank: 0,
          completedChallenges: 0
        }
      };
    } catch (error) {
      logger.error('[GamificationService] Error precargando datos:', error);
      throw error;
    }
  }

  /**
   * Verifica el estado de conectividad con el backend
   */
  async checkHealth(): Promise<boolean> {
    try {
      await api.get('/health');
      return true;
    } catch (error) {
      logger.error('[GamificationService] Backend no disponible:', error);
      return false;
    }
  }
}

// ===== EXPORTACIONES =====

// Instancia singleton del servicio
export const gamificationService = GamificationService.getInstance();

// Exportar también la clase para casos avanzados
export { APIError };
export default gamificationService;