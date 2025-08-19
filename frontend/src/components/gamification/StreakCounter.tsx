// StreakCounter - Componente para mostrar rachas con animación de llama
// Diseño atractivo con efectos de fuego y feedback visual

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Calendar, TrendingUp, Zap, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { StreakCounterProps, UserStreak } from '../../types/gamification';

// ===== CONFIGURACIÓN =====

const SIZE_CONFIGS = {
  sm: {
    container: 'w-24 h-24',
    flame: 20,
    text: {
      streak: 'text-lg font-bold',
      label: 'text-xs',
      days: 'text-xs'
    }
  },
  md: {
    container: 'w-32 h-32',
    flame: 28,
    text: {
      streak: 'text-2xl font-bold',
      label: 'text-sm',
      days: 'text-sm'
    }
  },
  lg: {
    container: 'w-40 h-40',
    flame: 36,
    text: {
      streak: 'text-3xl font-bold',
      label: 'text-base',
      days: 'text-base'
    }
  }
} as const;

// Colores basados en la longitud de la racha
const getStreakColor = (streak: number) => {
  if (streak >= 30) return {
    gradient: 'from-red-500 via-orange-500 to-yellow-400',
    flame: 'text-red-500',
    glow: 'shadow-red-500/50'
  };
  if (streak >= 14) return {
    gradient: 'from-orange-500 via-yellow-500 to-yellow-300',
    flame: 'text-orange-500',
    glow: 'shadow-orange-500/40'
  };
  if (streak >= 7) return {
    gradient: 'from-yellow-500 via-orange-400 to-red-400',
    flame: 'text-yellow-500',
    glow: 'shadow-yellow-500/30'
  };
  if (streak >= 3) return {
    gradient: 'from-blue-400 via-blue-500 to-indigo-500',
    flame: 'text-blue-500',
    glow: 'shadow-blue-500/20'
  };
  return {
    gradient: 'from-gray-400 to-gray-500',
    flame: 'text-gray-500',
    glow: 'shadow-gray-500/10'
  };
};

// ===== COMPONENTE PRINCIPAL =====

const StreakCounter: React.FC<StreakCounterProps> = ({
  streak,
  size = 'md',
  showDays = true,
  animate = true,
  className
}) => {
  const config = SIZE_CONFIGS[size];
  
  // Si no hay racha o está inactiva
  if (!streak || !streak.isActive || streak.currentStreak === 0) {
    return (
      <div className={cn(
        'relative flex flex-col items-center justify-center',
        'bg-gradient-to-br from-gray-100 to-gray-200',
        'border-2 border-gray-300 rounded-full shadow-md',
        config.container,
        className
      )}>
        <Calendar className="text-gray-400 mb-2" size={config.flame} />
        <div className={cn(config.text.streak, 'text-gray-500')}>0</div>
        <div className={cn(config.text.label, 'text-gray-400')}>días</div>
      </div>
    );
  }

  const colors = getStreakColor(streak.currentStreak);
  
  // Animaciones de la llama
  const flameVariants = {
    idle: {
      scale: [1, 1.1, 0.9, 1],
      rotate: [-2, 2, -1, 1, 0],
      y: [0, -2, 1, 0]
    },
    active: {
      scale: [1, 1.2, 0.95, 1.1, 1],
      rotate: [-3, 3, -2, 2, 0],
      y: [0, -3, 2, -1, 0]
    }
  };

  const containerVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: 'spring' as const, 
        stiffness: 300, 
        damping: 20
      }
    }
  };

  const numberVariants = {
    initial: { scale: 0.5, opacity: 0 },
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

  // Efecto de partículas (simulado con elementos)
  const particles = Array.from({ length: 6 }, (_, i) => i);

  return (
    <motion.div
      variants={animate ? containerVariants : undefined}
      initial={animate ? 'initial' : undefined}
      animate={animate ? 'animate' : undefined}
      whileHover={{ scale: animate ? 1.05 : undefined }}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'rounded-full shadow-xl',
        `bg-gradient-to-br ${colors.gradient}`,
        `${colors.glow}`,
        'border-2 border-white/20',
        config.container,
        'group cursor-pointer overflow-hidden',
        className
      )}
    >
      {/* Partículas de fondo */}
      {animate && (
        <div className="absolute inset-0">
          {particles.map((i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/60 rounded-full"
              style={{
                left: `${20 + (i * 10)}%`,
                top: `${30 + (i % 2) * 20}%`
              }}
              animate={{
                y: [-10, -30, -10],
                opacity: [0.6, 0.2, 0.6],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      )}

      {/* Llama animada */}
      <motion.div
        animate={animate ? (streak.currentStreak >= 7 ? 'active' : 'idle') : undefined}
        variants={flameVariants}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut'
        }}
        className="mb-2"
      >
        <Flame 
          className={cn(colors.flame, 'drop-shadow-lg filter')} 
          size={config.flame}
          fill="currentColor"
        />
      </motion.div>

      {/* Número de días */}
      <motion.div
        variants={animate ? numberVariants : undefined}
        className={cn(config.text.streak, 'text-white drop-shadow-lg')}
      >
        {animate ? (
          <AnimatedStreakNumber value={streak.currentStreak} />
        ) : (
          streak.currentStreak
        )}
      </motion.div>

      {/* Etiqueta */}
      {showDays && (
        <motion.div
          variants={animate ? numberVariants : undefined}
          className={cn(config.text.label, 'text-white/90 font-medium')}
        >
          {streak.currentStreak === 1 ? 'día' : 'días'}
        </motion.div>
      )}

      {/* Efecto de brillo en hover */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Anillo pulsante para rachas altas */}
      {streak.currentStreak >= 7 && animate && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/40"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}
    </motion.div>
  );
};

// ===== COMPONENTE AUXILIAR: NÚMERO ANIMADO =====

interface AnimatedStreakNumberProps {
  value: number;
  duration?: number;
}

const AnimatedStreakNumber: React.FC<AnimatedStreakNumberProps> = ({ 
  value, 
  duration = 1 
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      const easedProgress = 1 - Math.pow(1 - progress, 2);
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

  return <span>{displayValue}</span>;
};

// ===== VARIANTE COMPACTA =====

export const StreakCompact: React.FC<{
  streak?: UserStreak | null;
  className?: string;
}> = ({ streak, className }) => {
  if (!streak || !streak.isActive || streak.currentStreak === 0) {
    return (
      <div className={cn(
        'flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg',
        className
      )}>
        <Calendar size={16} className="text-gray-400" />
        <span className="text-sm text-gray-500">Sin racha activa</span>
      </div>
    );
  }

  const colors = getStreakColor(streak.currentStreak);

  return (
    <div className={cn(
      'flex items-center space-x-3 px-4 py-3 rounded-lg shadow-md',
      `bg-gradient-to-r ${colors.gradient}`,
      'text-white',
      className
    )}>
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [-2, 2, -2]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
      >
        <Flame size={20} fill="currentColor" />
      </motion.div>
      
      <div>
        <div className="font-bold text-lg">
          {streak.currentStreak}
        </div>
        <div className="text-xs opacity-90">
          {streak.currentStreak === 1 ? 'día' : 'días'}
        </div>
      </div>

      {streak.longestStreak > streak.currentStreak && (
        <div className="text-xs opacity-80 ml-auto">
          Mejor: {streak.longestStreak}
        </div>
      )}
    </div>
  );
};

// ===== WIDGET DE INFORMACIÓN DE RACHA =====

export const StreakInfo: React.FC<{
  streak?: UserStreak | null;
  className?: string;
}> = ({ streak, className }) => {
  if (!streak) return null;

  const daysSinceLastActivity = streak.lastActivityDate 
    ? Math.floor((Date.now() - new Date(streak.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const nextMilestone = [3, 7, 14, 30, 60, 100].find(m => m > streak.currentStreak) || null;

  return (
    <div className={cn('space-y-3 p-4 bg-gray-50 rounded-lg', className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Racha actual</span>
        <span className="text-lg font-bold text-gray-900">{streak.currentStreak} días</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Mejor racha</span>
        <span className="text-sm text-gray-600">{streak.longestStreak} días</span>
      </div>

      {nextMilestone && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Próxima meta</span>
          <span className="text-sm text-blue-600">
            {nextMilestone} días ({nextMilestone - streak.currentStreak} restantes)
          </span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Estado</span>
        <span className={cn(
          'text-sm px-2 py-1 rounded-full',
          streak.isActive && daysSinceLastActivity === 0
            ? 'bg-green-100 text-green-800' 
            : streak.isActive 
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        )}>
          {streak.isActive && daysSinceLastActivity === 0 ? 'Activa hoy' :
           streak.isActive ? `${daysSinceLastActivity} día(s) sin actividad` :
           'Inactiva'}
        </span>
      </div>
    </div>
  );
};

// ===== VERSIÓN MEJORADA CON ESTILO VERDE/AZUL/BLANCO =====

export const StreakCounterFinZen: React.FC<{
  streak?: UserStreak | null;
  size?: number;
  animate?: boolean;
  className?: string;
}> = ({ streak, size = 120, animate = true, className }) => {
  
  // Animaciones comunes
  const containerVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: 'spring' as const, 
        stiffness: 300, 
        damping: 20
      }
    }
  };
  
  // Si no hay racha o está inactiva
  if (!streak || !streak.isActive || streak.currentStreak === 0) {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    return (
      <motion.div
        variants={animate ? containerVariants : undefined}
        initial={animate ? 'initial' : undefined}
        animate={animate ? 'animate' : undefined}
        whileHover={{ scale: animate ? 1.05 : undefined }}
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width: size, height: size }}
      >
        {/* SVG para el anillo de progreso - IGUAL QUE LA VERSIÓN ACTIVA */}
        <svg
          width={size}
          height={size}
          className="absolute transform -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Fondo verde del círculo */}
          <circle
            cx={center}
            cy={center}
            r={radius + strokeWidth/2 + 8}
            fill="#10B981"
            className="drop-shadow-md"
          />

          {/* Círculo de fondo para el aro */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="none"
            className="opacity-40"
          />

          {/* Círculo de progreso azul (sin progreso para 0) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#2563EB"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            className="drop-shadow-sm"
          />
        </svg>

        {/* Contenido central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: animate ? 0.8 : 0,
              delay: animate ? 0.5 : 0,
              type: 'spring',
              stiffness: 200
            }}
            className="text-center"
          >
            <div className="text-3xl font-bold text-white leading-none drop-shadow-lg">0</div>
            <div className="text-xs text-white/90 mt-1 drop-shadow-sm font-medium">DÍAS</div>
            <div className="text-sm text-white/80 mt-1 drop-shadow-sm">Meta: 3</div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Cálculos para el anillo de progreso basado en próxima meta
  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find(m => m > streak.currentStreak) || 100;
  const previousMilestone = milestones.find(m => m <= streak.currentStreak) || 0;
  const progress = previousMilestone === 0 
    ? (streak.currentStreak / nextMilestone) * 100
    : ((streak.currentStreak - previousMilestone) / (nextMilestone - previousMilestone)) * 100;

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Animaciones

  const flameVariants = {
    idle: {
      scale: [1, 1.1, 0.9, 1],
      rotate: [-2, 2, -1, 1, 0],
      y: [0, -2, 1, 0]
    }
  };

  // Efecto de partículas flotantes
  const particles = Array.from({ length: 4 }, (_, i) => i);

  return (
    <motion.div
      variants={animate ? containerVariants : undefined}
      initial={animate ? 'initial' : undefined}
      animate={animate ? 'animate' : undefined}
      whileHover={{ scale: animate ? 1.05 : undefined }}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* SVG para el anillo de progreso */}
      <svg
        width={size}
        height={size}
        className="absolute transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Fondo verde del círculo */}
        <circle
          cx={center}
          cy={center}
          r={radius + strokeWidth/2 + 8}
          fill="#10B981"
          className="drop-shadow-md"
        />

        {/* Círculo de fondo para el aro */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-40"
        />

        {/* Círculo de progreso azul */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#2563EB"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: animate ? circumference : strokeDashoffset }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: animate ? 1.5 : 0,
            ease: [0.4, 0, 0.2, 1],
            delay: animate ? 0.3 : 0
          }}
          className="drop-shadow-sm"
        />

        {/* Punto brillante al final del progreso */}
        {progress > 5 && (
          <motion.circle
            cx={center + radius * Math.cos((progress / 100) * 2 * Math.PI - Math.PI / 2)}
            cy={center + radius * Math.sin((progress / 100) * 2 * Math.PI - Math.PI / 2)}
            r={strokeWidth / 2.5}
            fill="#FFFFFF"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: animate ? 0.5 : 0,
              delay: animate ? 1.4 : 0
            }}
            className="drop-shadow-lg"
          />
        )}
      </svg>

      {/* Partículas flotantes para efecto de fuego */}
      {animate && streak.currentStreak >= 7 && (
        <div className="absolute inset-0">
          {particles.map((i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-white/70 rounded-full"
              style={{
                left: `${40 + (i * 5)}%`,
                top: `${35 + (i % 2) * 15}%`
              }}
              animate={{
                y: [-8, -20, -8],
                opacity: [0.7, 0.3, 0.7],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      )}

      {/* Contenido central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Número de días */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: animate ? 0.8 : 0,
            delay: animate ? 0.5 : 0,
            type: 'spring',
            stiffness: 200
          }}
          className="text-center"
        >
          <div className="text-3xl font-bold text-white leading-none drop-shadow-lg">
            {animate ? (
              <AnimatedStreakNumber value={streak.currentStreak} />
            ) : (
              streak.currentStreak
            )}
          </div>
          <div className="text-xs text-white/90 mt-1 drop-shadow-sm font-medium">
            {streak.currentStreak === 1 ? 'DÍA' : 'DÍAS'}
          </div>
          <div className="text-sm text-white/80 mt-1 drop-shadow-sm">
            Meta: {nextMilestone}
          </div>
        </motion.div>
      </div>

      {/* Anillo pulsante para rachas altas */}
      {streak.currentStreak >= 7 && animate && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/30"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}
    </motion.div>
  );
};

export default StreakCounter;