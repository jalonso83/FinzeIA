// Gamification Types - Sistema de Gamificación FinZen AI
// Tipos TypeScript robustos para el sistema de gamificación

// ===== ENUMS =====
export const EventType = {
  ADD_TRANSACTION: 'add_tx',
  CREATE_BUDGET: 'create_budget',
  CREATE_GOAL: 'create_goal',
  COMPLETE_GOAL: 'goal_complete',
  BUDGET_OVERSPEND: 'budget_overspend',
  CONSECUTIVE_DAYS: 'consecutive_days',
  WEEKLY_STREAK: 'weekly_streak',
  CATEGORY_MILESTONE: 'category_milestone'
} as const;

export type EventType = typeof EventType[keyof typeof EventType];

export const BadgeType = {
  NEWCOMER: 'newcomer',
  TRACKER: 'tracker',
  SAVER: 'saver',
  ACHIEVER: 'achiever',
  STREAKER: 'streaker',
  MASTER: 'master'
} as const;

export type BadgeType = typeof BadgeType[keyof typeof BadgeType];

export const BadgeCategory = {
  GETTING_STARTED: 'getting_started',
  TRANSACTIONS: 'transactions',
  BUDGETS: 'budgets',
  GOALS: 'goals',
  CONSISTENCY: 'consistency',
  ACHIEVEMENTS: 'achievements'
} as const;

export type BadgeCategory = typeof BadgeCategory[keyof typeof BadgeCategory];

// ===== INTERFACES =====

// Evento de Gamificación
export interface GamificationEvent {
  id: string;
  userId: string;
  eventType: EventType;
  eventData?: Record<string, any>;
  pointsAwarded: number;
  createdAt: string;
}

// FinScore
export interface FinScore {
  currentScore: number;
  level: number;
  levelName?: string;
  pointsToNextLevel: number;
  totalPointsEarned: number;
  rank?: number;
}

// Historial de FinScore
export interface FinScoreHistory {
  id: string;
  userId: string;
  score: number;
  pointsEarned: number;
  eventType: EventType;
  createdAt: string;
}

// Badge del Usuario
export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  badge: Badge;
}

// Definición de Badge
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: BadgeType;
  category: BadgeCategory;
  requirement: number;
  points: number;
  isRare: boolean;
  color: string;
}

// Racha del Usuario
export interface UserStreak {
  id: string;
  userId: string;
  streakType: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  isActive: boolean;
}

// Desafío Mensual
export interface MonthlyChallenge {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  points: number;
  month: number;
  year: number;
  isActive: boolean;
}

// Participación en Desafío
export interface ChallengeParticipant {
  id: string;
  userId: string;
  challengeId: string;
  currentProgress: number;
  isCompleted: boolean;
  completedAt?: string;
  challenge: MonthlyChallenge;
}

// ===== ESTADÍSTICAS =====

// Estadísticas de Gamificación
export interface GamificationStats {
  totalPoints: number;
  badgesEarned: number;
  currentStreak: number;
  transactionsThisMonth: number;
  goalsCompleted: number;
  activeBudgets: number;
  rank: number;
  completedChallenges: number;
}

// Datos del Leaderboard
export interface LeaderboardEntry {
  userId: string;
  userName?: string;
  userEmail: string;
  score: number;
  rank: number;
  badgesCount: number;
  streakDays: number;
}

// ===== API RESPONSES =====

// Respuesta de API genérica
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Respuesta de FinScore
export interface FinScoreResponse extends ApiResponse<FinScore> {}

// Respuesta de Historial
export interface FinScoreHistoryResponse extends ApiResponse<FinScoreHistory[]> {}

// Respuesta de Badges
export interface BadgesResponse extends ApiResponse<UserBadge[]> {}

// Respuesta de Racha
export interface StreakResponse extends ApiResponse<UserStreak> {}

// Respuesta de Estadísticas
export interface StatsResponse extends ApiResponse<GamificationStats> {}

// Respuesta de Leaderboard
export interface LeaderboardResponse extends ApiResponse<LeaderboardEntry[]> {}

// ===== HOOKS Y STORE TYPES =====

// Estado del Store de Gamificación
export interface GamificationState {
  finScore: FinScore | null;
  finScoreHistory: FinScoreHistory[];
  badges: UserBadge[];
  availableBadges: Badge[];
  streak: UserStreak | null;
  stats: GamificationStats | null;
  leaderboard: LeaderboardEntry[];
  challenges: ChallengeParticipant[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

// Acciones del Store
export interface GamificationActions {
  // FinScore
  fetchFinScore: () => Promise<void>;
  fetchFinScoreHistory: () => Promise<void>;
  recalculateFinScore: () => Promise<void>;
  
  // Badges
  fetchUserBadges: () => Promise<void>;
  fetchAvailableBadges: () => Promise<void>;
  
  // Streaks
  fetchUserStreak: () => Promise<void>;
  
  // Stats
  fetchGamificationStats: () => Promise<void>;
  
  // Leaderboard
  fetchLeaderboard: () => Promise<void>;
  
  // Challenges
  fetchChallenges: () => Promise<void>;
  
  // Utils
  clearError: () => void;
  resetState: () => void;
}

// ===== COMPONENT PROPS =====

// Props para FinScoreDisplay
export interface FinScoreDisplayProps {
  score?: FinScore;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
  showProgress?: boolean;
  animate?: boolean;
  className?: string;
}

// Props para BadgeGrid
export interface BadgeGridProps {
  badges: UserBadge[];
  availableBadges?: Badge[];
  columns?: number;
  showProgress?: boolean;
  onBadgeClick?: (badge: Badge) => void;
  className?: string;
}

// Props para StreakCounter
export interface StreakCounterProps {
  streak?: UserStreak;
  size?: 'sm' | 'md' | 'lg';
  showDays?: boolean;
  animate?: boolean;
  className?: string;
}

// Props para ProgressRing
export interface ProgressRingProps {
  progress: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showText?: boolean;
  animate?: boolean;
  className?: string;
}

// Props para GamificationModal
export interface GamificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'badge' | 'level_up' | 'achievement' | 'streak';
  data: Badge | FinScore | UserStreak | any;
  animate?: boolean;
}

// ===== UTILITY TYPES =====

// Configuración de Niveles
export interface LevelConfig {
  level: number;
  minPoints: number;
  maxPoints: number;
  title: string;
  color: string;
  benefits: string[];
}

// Configuración de Colores por Categoría
export interface CategoryColors {
  [BadgeCategory.GETTING_STARTED]: string;
  [BadgeCategory.TRANSACTIONS]: string;
  [BadgeCategory.BUDGETS]: string;
  [BadgeCategory.GOALS]: string;
  [BadgeCategory.CONSISTENCY]: string;
  [BadgeCategory.ACHIEVEMENTS]: string;
}

// Configuración de Animaciones
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

// ===== ERROR TYPES =====
export interface GamificationError {
  code: string;
  message: string;
  details?: any;
}

// ===== CONSTANTS =====
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 17500
] as const;

export const BADGE_COLORS: CategoryColors = {
  [BadgeCategory.GETTING_STARTED]: '#10B981', // emerald-500
  [BadgeCategory.TRANSACTIONS]: '#3B82F6',     // blue-500
  [BadgeCategory.BUDGETS]: '#2563EB',          // blue-600
  [BadgeCategory.GOALS]: '#F59E0B',            // amber-500
  [BadgeCategory.CONSISTENCY]: '#EF4444',      // red-500
  [BadgeCategory.ACHIEVEMENTS]: '#6366F1'      // indigo-500
} as const;