// GamificationModal - Modal para celebrar logros y mostrar información detallada
// Modales animados con confetti, efectos visuales y diferentes tipos de contenido

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Award, 
  Trophy, 
  Star, 
  Flame, 
  TrendingUp, 
  Zap,
  Gift,
  Crown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { 
  GamificationModalProps, 
  Badge, 
  FinScore, 
  UserStreak 
} from '../../types/gamification';

// ===== CONFIGURACIÓN =====

const MODAL_TYPES = {
  badge: {
    icon: Award,
    title: '¡Nuevo Badge Desbloqueado!',
    bgGradient: 'from-blue-500 via-purple-500 to-pink-500',
    particleColor: '#3B82F6'
  },
  level_up: {
    icon: Trophy,
    title: '¡Subiste de Nivel!',
    bgGradient: 'from-yellow-400 via-orange-500 to-red-500',
    particleColor: '#F59E0B'
  },
  achievement: {
    icon: Star,
    title: '¡Gran Logro!',
    bgGradient: 'from-green-400 via-emerald-500 to-teal-600',
    particleColor: '#10B981'
  },
  streak: {
    icon: Flame,
    title: '¡Racha Increíble!',
    bgGradient: 'from-red-500 via-orange-500 to-yellow-400',
    particleColor: '#EF4444'
  }
} as const;

// ===== COMPONENTE DE CONFETTI =====

const ConfettiParticle: React.FC<{
  delay: number;
  color: string;
  size: number;
}> = ({ delay, color, size }) => (
  <motion.div
    className="absolute rounded-full opacity-80"
    style={{
      backgroundColor: color,
      width: size,
      height: size,
      left: `${Math.random() * 100}%`,
      top: '-10px'
    }}
    initial={{ y: -10, rotate: 0, opacity: 0.8 }}
    animate={{
      y: window.innerHeight + 100,
      rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
      opacity: 0,
      x: (Math.random() - 0.5) * 200
    }}
    transition={{
      duration: 3 + Math.random() * 2,
      delay: delay,
      ease: 'easeOut'
    }}
  />
);

const ConfettiEffect: React.FC<{ 
  active: boolean; 
  color: string; 
  particleCount?: number;
}> = ({ active, color, particleCount = 50 }) => {
  const particles = React.useMemo(
    () => Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      delay: (i / particleCount) * 2,
      size: 4 + Math.random() * 8,
      color: i % 3 === 0 ? color : i % 3 === 1 ? '#FFD700' : '#FF69B4'
    })),
    [particleCount, color]
  );

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          delay={particle.delay}
          color={particle.color}
          size={particle.size}
        />
      ))}
    </div>
  );
};

// ===== COMPONENTE PRINCIPAL =====

const GamificationModal: React.FC<GamificationModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
  animate = true
}) => {
  const [showConfetti, setShowConfetti] = React.useState(false);
  const config = MODAL_TYPES[type];
  const IconComponent = config.icon;

  // Activar confetti cuando se abre el modal
  React.useEffect(() => {
    if (isOpen && animate) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, animate]);

  // Animaciones del modal
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8, 
      y: 50,
      rotate: -5
    },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      rotate: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 25,
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: 30,
      transition: { duration: 0.2 }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring' as const, stiffness: 400, damping: 20 }
    }
  };

  // Renderizar contenido específico por tipo
  const renderContent = () => {
    switch (type) {
      case 'badge':
        return <BadgeContent badge={data as Badge} />;
      case 'level_up':
        return <LevelUpContent finScore={data as FinScore} />;
      case 'achievement':
        return <AchievementContent achievement={data} />;
      case 'streak':
        return <StreakContent streak={data as UserStreak} />;
      default:
        return null;
    }
  };

  return (
    <>
      <ConfettiEffect 
        active={showConfetti} 
        color={config.particleColor}
        particleCount={type === 'level_up' ? 100 : 50}
      />
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                'relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden',
                'border-4 border-white/20'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header con gradiente */}
              <div className={cn(
                'relative px-6 py-8 text-center text-white overflow-hidden',
                `bg-gradient-to-br ${config.bgGradient}`
              )}>
                {/* Efectos de fondo */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full"
                />
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, -3, 3, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1
                  }}
                  className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full"
                />

                {/* Contenido del header */}
                <motion.div
                  variants={contentVariants}
                  className="relative z-10"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: 'reverse'
                    }}
                    className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4"
                  >
                    <IconComponent size={40} />
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold mb-2 drop-shadow-lg">
                    {config.title}
                  </h2>
                </motion.div>

                {/* Botón de cerrar */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors duration-200"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Contenido específico */}
              <motion.div
                variants={contentVariants}
                className="p-6"
              >
                {renderContent()}
              </motion.div>

              {/* Footer */}
              <motion.div
                variants={contentVariants}
                className="px-6 pb-6"
              >
                <button
                  onClick={onClose}
                  className={cn(
                    'w-full py-3 px-6 rounded-xl font-semibold text-white shadow-lg',
                    'transition-all duration-200 transform hover:scale-105',
                    `bg-gradient-to-r ${config.bgGradient}`,
                    'hover:shadow-xl'
                  )}
                >
                  ¡Fantástico!
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ===== COMPONENTES DE CONTENIDO =====

const BadgeContent: React.FC<{ badge: Badge }> = ({ badge }) => (
  <div className="text-center space-y-4">
    <div className="text-4xl">🏆</div>
    <h3 className="text-xl font-bold text-gray-900">{badge.name}</h3>
    <p className="text-gray-600">{badge.description}</p>
    <div className="flex justify-center items-center space-x-4">
      <div className="flex items-center space-x-2 px-3 py-2 bg-blue-100 rounded-full">
        <Star size={16} className="text-blue-600" />
        <span className="text-sm font-semibold text-blue-800">
          +{badge.points} puntos
        </span>
      </div>
      {badge.isRare && (
        <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-100 rounded-full">
          <Crown size={16} className="text-yellow-600" />
          <span className="text-sm font-semibold text-yellow-800">
            ¡Raro!
          </span>
        </div>
      )}
    </div>
  </div>
);

const LevelUpContent: React.FC<{ finScore: FinScore }> = ({ finScore }) => (
  <div className="text-center space-y-4">
    <div className="text-4xl">🎉</div>
    <h3 className="text-xl font-bold text-gray-900">
      ¡Alcanzaste el Nivel {finScore.level}!
    </h3>
    <p className="text-gray-600">
      Tu FinScore actual es de <strong>{finScore.currentScore.toLocaleString()}</strong> puntos
    </p>
    {finScore.pointsToNextLevel > 0 && (
      <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-4">
        <p className="text-sm text-orange-800">
          Solo necesitas <strong>{finScore.pointsToNextLevel}</strong> puntos más para el nivel {finScore.level + 1}
        </p>
      </div>
    )}
  </div>
);

const AchievementContent: React.FC<{ achievement: any }> = ({ achievement }) => (
  <div className="text-center space-y-4">
    <div className="text-4xl">⭐</div>
    <h3 className="text-xl font-bold text-gray-900">{achievement.title}</h3>
    <p className="text-gray-600">{achievement.description}</p>
    {achievement.reward && (
      <div className="flex justify-center">
        <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 rounded-full">
          <Gift size={16} className="text-green-600" />
          <span className="text-sm font-semibold text-green-800">
            {achievement.reward}
          </span>
        </div>
      </div>
    )}
  </div>
);

const StreakContent: React.FC<{ streak: UserStreak }> = ({ streak }) => {
  const getStreakMessage = (days: number) => {
    if (days >= 30) return '¡Eres imparable! 🔥';
    if (days >= 14) return '¡Increíble consistencia! 💪';
    if (days >= 7) return '¡Vas por buen camino! 🚀';
    return '¡Sigue así! ⭐';
  };

  return (
    <div className="text-center space-y-4">
      <div className="text-4xl">🔥</div>
      <h3 className="text-xl font-bold text-gray-900">
        {streak.currentStreak} Días Consecutivos
      </h3>
      <p className="text-gray-600">{getStreakMessage(streak.currentStreak)}</p>
      <div className="bg-gradient-to-r from-red-100 to-orange-100 rounded-lg p-4">
        <p className="text-sm text-red-800">
          Tu mejor racha fue de <strong>{streak.longestStreak}</strong> días
        </p>
      </div>
    </div>
  );
};

// ===== HOOK PARA MANEJAR MODALES =====

export const useGamificationModal = () => {
  const [modal, setModal] = React.useState<{
    isOpen: boolean;
    type: GamificationModalProps['type'];
    data: any;
  }>({
    isOpen: false,
    type: 'badge',
    data: null
  });

  const showBadgeModal = (badge: Badge) => {
    setModal({ isOpen: true, type: 'badge', data: badge });
  };

  const showLevelUpModal = (finScore: FinScore) => {
    setModal({ isOpen: true, type: 'level_up', data: finScore });
  };

  const showAchievementModal = (achievement: any) => {
    setModal({ isOpen: true, type: 'achievement', data: achievement });
  };

  const showStreakModal = (streak: UserStreak) => {
    setModal({ isOpen: true, type: 'streak', data: streak });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  return {
    modal,
    showBadgeModal,
    showLevelUpModal,
    showAchievementModal,
    showStreakModal,
    closeModal
  };
};

export default GamificationModal;