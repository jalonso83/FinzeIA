// BadgeGrid - Componente para mostrar colección de badges
// Grid responsivo con animaciones, filtros y estados de progreso

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, Star, Award, Zap, Target, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { 
  BadgeGridProps, 
  UserBadge, 
  Badge, 
  BadgeType 
} from '../../types/gamification';
import { BADGE_COLORS, BadgeCategory } from '../../types/gamification';

// ===== CONFIGURACIÓN =====

const BADGE_ICONS = {
  // Por categoría
  [BadgeCategory.GETTING_STARTED]: Star,
  [BadgeCategory.TRANSACTIONS]: TrendingUp,
  [BadgeCategory.BUDGETS]: Target,
  [BadgeCategory.GOALS]: Award,
  [BadgeCategory.CONSISTENCY]: Calendar,
  [BadgeCategory.ACHIEVEMENTS]: Zap,
} as const;

const RARITY_EFFECTS = {
  common: 'hover:shadow-lg',
  rare: 'hover:shadow-xl hover:shadow-blue-500/25',
  epic: 'hover:shadow-2xl hover:shadow-purple-500/30',
  legendary: 'hover:shadow-2xl hover:shadow-yellow-500/40'
} as const;

// ===== TIPOS INTERNOS =====

interface BadgeItemProps {
  badge: Badge;
  isUnlocked: boolean;
  earnedAt?: string;
  onClick?: () => void;
  index?: number;
}

// ===== COMPONENTE DE BADGE INDIVIDUAL =====

const BadgeItem: React.FC<BadgeItemProps> = ({
  badge,
  isUnlocked,
  earnedAt,
  onClick,
  index = 0
}) => {
  const IconComponent = BADGE_ICONS[badge.category] || Award;
  const categoryColor = BADGE_COLORS[badge.category];
  
  const getRarity = (badge: Badge): keyof typeof RARITY_EFFECTS => {
    if (badge.isRare) return 'legendary';
    if (badge.points >= 100) return 'epic';
    if (badge.points >= 50) return 'rare';
    return 'common';
  };

  const rarity = getRarity(badge);

  const containerVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 25,
        delay: index * 0.05 // Animación escalonada
      }
    }
  };

  const glowVariants = {
    idle: { scale: 1, opacity: 0.7 },
    hover: { 
      scale: 1.05, 
      opacity: 1,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={cn(
        'relative group cursor-pointer',
        'bg-white rounded-xl shadow-md overflow-hidden',
        'border-2 transition-all duration-300',
        isUnlocked 
          ? `border-[${categoryColor}] ${RARITY_EFFECTS[rarity]}` 
          : 'border-gray-200 hover:border-gray-300',
        !isUnlocked && 'opacity-60'
      )}
      onClick={onClick}
    >
      {/* Efecto de brillo para badges desbloqueados */}
      {isUnlocked && (
        <motion.div
          variants={glowVariants}
          className={cn(
            'absolute inset-0 opacity-20 rounded-xl',
            `bg-gradient-to-br from-[${categoryColor}] to-transparent`
          )}
        />
      )}

      {/* Header del badge */}
      <div className={cn(
        'px-4 py-3 text-center relative',
        isUnlocked 
          ? `bg-gradient-to-r from-[${categoryColor}] to-[${categoryColor}]/80`
          : 'bg-gray-100'
      )}>
        <div className="relative flex justify-center">
          {/* Ícono principal */}
          <div className={cn(
            'p-3 rounded-full',
            isUnlocked ? 'bg-white/20' : 'bg-gray-200'
          )}>
            <IconComponent 
              size={32} 
              className={isUnlocked ? 'text-white' : 'text-gray-400'}
            />
          </div>

          {/* Estado de desbloqueo */}
          <div className="absolute -top-2 -right-2">
            {isUnlocked ? (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            ) : (
              <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                <Lock size={12} className="text-white" />
              </div>
            )}
          </div>

          {/* Indicador de rareza */}
          {badge.isRare && isUnlocked && (
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse'
              }}
              className="absolute -top-1 -left-1"
            >
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Contenido del badge */}
      <div className="p-4">
        <h3 className={cn(
          'font-semibold text-sm mb-2 text-center line-clamp-2',
          isUnlocked ? 'text-gray-900' : 'text-gray-500'
        )}>
          {badge.name}
        </h3>

        <p className={cn(
          'text-xs text-center mb-3 line-clamp-3',
          isUnlocked ? 'text-gray-600' : 'text-gray-400'
        )}>
          {badge.description}
        </p>

        {/* Información adicional */}
        <div className="flex justify-between items-center text-xs">
          <span className={cn(
            'px-2 py-1 rounded-full',
            isUnlocked 
              ? `bg-[${categoryColor}]/10 text-[${categoryColor}]`
              : 'bg-gray-100 text-gray-500'
          )}>
            {badge.points} pts
          </span>

          {earnedAt && (
            <span className="text-gray-500">
              {new Date(earnedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Overlay de hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  );
};

// ===== COMPONENTE PRINCIPAL =====

const BadgeGrid: React.FC<BadgeGridProps> = ({
  badges,
  availableBadges = [],
  columns = 4,
  showProgress = true,
  onBadgeClick,
  className
}) => {
  const [filter, setFilter] = React.useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<BadgeCategory | 'all'>('all');

  // Crear mapa de badges desbloqueados
  const unlockedBadgesMap = React.useMemo(() => {
    const map = new Map<string, UserBadge>();
    badges.forEach(userBadge => {
      map.set(userBadge.badgeId, userBadge);
    });
    return map;
  }, [badges]);

  // Filtrar badges
  const filteredBadges = React.useMemo(() => {
    let filtered = availableBadges;

    // Filtrar por estado
    if (filter === 'unlocked') {
      filtered = filtered.filter(badge => unlockedBadgesMap.has(badge.id));
    } else if (filter === 'locked') {
      filtered = filtered.filter(badge => !unlockedBadgesMap.has(badge.id));
    }

    // Filtrar por categoría
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(badge => badge.category === categoryFilter);
    }

    return filtered;
  }, [availableBadges, unlockedBadgesMap, filter, categoryFilter]);

  // Estadísticas
  const stats = React.useMemo(() => {
    const total = availableBadges.length;
    const unlocked = badges.length;
    const percentage = total > 0 ? (unlocked / total) * 100 : 0;

    return { total, unlocked, percentage };
  }, [availableBadges.length, badges.length]);

  // Grid responsivo según el número de columnas
  const gridCols = cn(
    'grid gap-6',
    {
      'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4': columns === 4,
      'grid-cols-2 sm:grid-cols-3': columns === 3,
      'grid-cols-1 sm:grid-cols-2': columns === 2,
      'grid-cols-1': columns === 1
    }
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header con estadísticas y filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Estadísticas */}
        {showProgress && (
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{stats.unlocked}</span> de{' '}
              <span className="font-semibold">{stats.total}</span> badges
            </div>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${stats.percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <span className="text-sm text-gray-500">
              {Math.round(stats.percentage)}%
            </span>
          </div>
        )}

        {/* Filtros */}
        <div className="flex space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos</option>
            <option value="unlocked">Desbloqueados</option>
            <option value="locked">Bloqueados</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todas las categorías</option>
            <option value={BadgeCategory.GETTING_STARTED}>Primeros pasos</option>
            <option value={BadgeCategory.TRANSACTIONS}>Transacciones</option>
            <option value={BadgeCategory.BUDGETS}>Presupuestos</option>
            <option value={BadgeCategory.GOALS}>Metas</option>
            <option value={BadgeCategory.CONSISTENCY}>Consistencia</option>
            <option value={BadgeCategory.ACHIEVEMENTS}>Logros</option>
          </select>
        </div>
      </div>

      {/* Grid de badges */}
      <AnimatePresence mode="wait">
        {filteredBadges.length > 0 ? (
          <motion.div
            key={`${filter}-${categoryFilter}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={gridCols}
          >
            {filteredBadges.map((badge, index) => {
              const userBadge = unlockedBadgesMap.get(badge.id);
              return (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  isUnlocked={!!userBadge}
                  earnedAt={userBadge?.earnedAt}
                  onClick={() => onBadgeClick?.(badge)}
                  index={index}
                />
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Award size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              No hay badges que coincidan con los filtros seleccionados.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== VARIANTE CAROUSEL =====

export const BadgeCarousel: React.FC<{
  badges: UserBadge[];
  limit?: number;
  className?: string;
}> = ({ badges, limit = 5, className }) => {
  const recentBadges = badges
    .slice()
    .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    .slice(0, limit);

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-gray-700">Badges Recientes</h3>
      <div className="flex space-x-3 overflow-x-auto pb-2">
        {recentBadges.map((userBadge, index) => (
          <motion.div
            key={userBadge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg"
          >
            <Award size={24} className="text-white" />
          </motion.div>
        ))}
        {recentBadges.length === 0 && (
          <div className="text-sm text-gray-500 py-4">
            ¡Completa acciones para desbloquear badges!
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgeGrid;