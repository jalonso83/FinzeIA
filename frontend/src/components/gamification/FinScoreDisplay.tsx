// FinScoreDisplay - Componente para mostrar el FinScore con animaciones
// Diseño elegante, responsivo y accesible para mostrar puntaje y progreso

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Star, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FinScoreDisplayProps, FinScore } from '../../types/gamification';

// ===== CONFIGURACIÓN =====

const LEVEL_COLORS = {
  1: 'from-slate-400 to-slate-500',
  2: 'from-green-400 to-green-500',
  3: 'from-blue-400 to-blue-500',
  4: 'from-purple-400 to-purple-500',
  5: 'from-yellow-400 to-yellow-500',
  6: 'from-red-400 to-red-500',
  7: 'from-pink-400 to-pink-500',
  8: 'from-indigo-400 to-indigo-500',
  9: 'from-orange-400 to-orange-500',
  10: 'from-gradient-to-r from-yellow-400 via-red-500 to-pink-500'
} as const;

const SIZE_CONFIGS = {
  sm: {
    container: 'w-32 h-32',
    text: {
      score: 'text-lg font-bold',
      level: 'text-xs',
      progress: 'text-xs'
    },
    icon: 16
  },
  md: {
    container: 'w-40 h-40',
    text: {
      score: 'text-2xl font-bold',
      level: 'text-sm',
      progress: 'text-sm'
    },
    icon: 20
  },
  lg: {
    container: 'w-48 h-48',
    text: {
      score: 'text-3xl font-bold',
      level: 'text-base',
      progress: 'text-base'
    },
    icon: 24
  }
} as const;

// ===== COMPONENTE PRINCIPAL =====

const FinScoreDisplay: React.FC<FinScoreDisplayProps> = ({
  score,
  size = 'md',
  showLevel = true,
  showProgress = true,
  animate = true,
  className
}) => {
  const config = SIZE_CONFIGS[size];
  const levelColor = score ? LEVEL_COLORS[Math.min(score.level, 10) as keyof typeof LEVEL_COLORS] : LEVEL_COLORS[1];

  // Animaciones
  const containerVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: 'spring' as const, 
        stiffness: 200, 
        damping: 20,
        staggerChildren: 0.1
      }
    },
    exit: { scale: 0, opacity: 0 }
  };

  const childVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    }
  };

  const scoreVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: 'spring' as const, 
        stiffness: 400, 
        damping: 20,
        delay: 0.2
      }
    }
  };

  // Estado de carga
  if (!score) {
    return (
      <div className={cn(
        'relative flex items-center justify-center rounded-full',
        'bg-gradient-to-br from-gray-100 to-gray-200',
        'border-4 border-gray-300 shadow-lg',
        config.container,
        className
      )}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="flex items-center justify-center"
        >
          <Zap className="w-8 h-8 text-gray-400" />
        </motion.div>
      </div>
    );
  }

  // Cálculos de progreso
  const progress = score.pointsToNextLevel > 0 
    ? ((score.currentScore) / (score.currentScore + score.pointsToNextLevel)) * 100
    : 100;
  
  const circumference = 2 * Math.PI * 45; // Radio de 45px
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      variants={animate ? containerVariants : undefined}
      initial={animate ? 'initial' : undefined}
      animate={animate ? 'animate' : undefined}
      exit={animate ? 'exit' : undefined}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'rounded-full shadow-xl',
        `bg-gradient-to-br ${levelColor}`,
        'border-4 border-white/20 backdrop-blur-sm',
        config.container,
        'group hover:scale-105 transition-transform duration-300',
        className
      )}
      whileHover={{ scale: animate ? 1.05 : undefined }}
      whileTap={{ scale: animate ? 0.95 : undefined }}
    >
      {/* Anillo de progreso */}
      {showProgress && (
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 100 100"
        >
          {/* Círculo de fondo */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="4"
            fill="none"
          />
          {/* Círculo de progreso */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: circumference }}
            animate={{ 
              strokeDashoffset: animate ? strokeDashoffset : strokeDashoffset
            }}
            transition={{ 
              duration: 1.5, 
              ease: 'easeOut',
              delay: animate ? 0.5 : 0
            }}
          />
        </svg>
      )}

      {/* Contenido central */}
      <div className="relative z-10 flex flex-col items-center justify-center text-white">
        {/* Ícono de nivel */}
        <motion.div
          variants={animate ? childVariants : undefined}
          className="mb-1"
        >
          {score.level >= 5 ? (
            <Trophy className={`w-${config.icon/4} h-${config.icon/4} mb-1`} size={config.icon} />
          ) : score.level >= 3 ? (
            <Star className={`w-${config.icon/4} h-${config.icon/4} mb-1`} size={config.icon} />
          ) : (
            <TrendingUp className={`w-${config.icon/4} h-${config.icon/4} mb-1`} size={config.icon} />
          )}
        </motion.div>

        {/* Puntaje */}
        <motion.div
          variants={animate ? scoreVariants : undefined}
          className={cn(config.text.score, 'text-white drop-shadow-lg')}
        >
          {animate ? (
            <AnimatedNumber value={score.currentScore} />
          ) : (
            score.currentScore.toLocaleString()
          )}
        </motion.div>

        {/* Nivel */}
        {showLevel && (
          <motion.div
            variants={animate ? childVariants : undefined}
            className={cn(config.text.level, 'text-white/90 font-medium')}
          >
            Nivel {score.level}
          </motion.div>
        )}

        {/* Progreso al siguiente nivel */}
        {showProgress && score.pointsToNextLevel > 0 && (
          <motion.div
            variants={animate ? childVariants : undefined}
            className={cn(config.text.progress, 'text-white/80 mt-1')}
          >
            {score.pointsToNextLevel} pts para nivel {score.level + 1}
          </motion.div>
        )}
      </div>

      {/* Efecto de brillo */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  );
};

// ===== COMPONENTE AUXILIAR: NÚMERO ANIMADO =====

interface AnimatedNumberProps {
  value: number;
  duration?: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  value, 
  duration = 2 
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      // Easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(easedProgress * value);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
};

// ===== VARIANTE COMPACTA =====

export const FinScoreCompact: React.FC<{
  score?: FinScore;
  className?: string;
}> = ({ score, className }) => {
  if (!score) {
    return (
      <div className={cn(
        'flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg',
        className
      )}>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        <span className="text-sm text-gray-500">Cargando...</span>
      </div>
    );
  }

  const levelColor = LEVEL_COLORS[Math.min(score.level, 10) as keyof typeof LEVEL_COLORS];

  return (
    <div className={cn(
      'flex items-center space-x-3 px-4 py-3 rounded-lg shadow-md',
      `bg-gradient-to-r ${levelColor}`,
      'text-white',
      className
    )}>
      <div className="flex items-center space-x-2">
        <Trophy size={20} />
        <div>
          <div className="font-bold text-lg">
            {score.currentScore.toLocaleString()}
          </div>
          <div className="text-xs opacity-90">
            Nivel {score.level}
          </div>
        </div>
      </div>
      {score.pointsToNextLevel > 0 && (
        <div className="text-xs opacity-80 ml-auto">
          +{score.pointsToNextLevel} pts
        </div>
      )}
    </div>
  );
};

export default FinScoreDisplay;