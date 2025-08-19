// Gamification Components - Exportaciones centralizadas
// Archivo de índice para facilitar las importaciones de componentes de gamificación

// ===== COMPONENTES PRINCIPALES =====
export { default as FinScoreDisplay, FinScoreCompact } from './FinScoreDisplay';
export { default as BadgeGrid, BadgeCarousel } from './BadgeGrid';
export { default as StreakCounter, StreakCompact, StreakInfo, StreakCounterFinZen } from './StreakCounter';
export { default as ProgressRing, ProgressRingSmall, ProgressRingMulti, ProgressRingLabeled, ProgressRingPulse, ProgressRingFinScore, PROGRESS_COLORS } from './ProgressRing';
export { default as FinScoreProgressBar } from './FinScoreProgressBar';
export { default as RecentPointsCard } from './RecentPointsCard';
export { default as GamificationModal, useGamificationModal } from './GamificationModal';

// ===== RE-EXPORTACIONES DE TIPOS =====
export type {
  FinScoreDisplayProps,
  BadgeGridProps,
  StreakCounterProps,
  ProgressRingProps,
  GamificationModalProps,
  FinScore,
  UserBadge,
  Badge,
  UserStreak,
  GamificationStats,
  LeaderboardEntry,
  EventType,
  BadgeType,
  BadgeCategory
} from '../../types/gamification';

// ===== RE-EXPORTACIONES DE SERVICIOS Y STORES =====
export { default as gamificationService, APIError } from '../../services/gamificationService';
export { 
  default as useGamificationStore,
  useGamificationInit,
  useGamificationSync,
  useGamificationListener,
  gamificationSelectors,
  refreshGamificationData,
  handleGamificationEvent
} from '../../stores/gamification';

// ===== CONSTANTES ÚTILES =====
export { LEVEL_THRESHOLDS, BADGE_COLORS } from '../../types/gamification';