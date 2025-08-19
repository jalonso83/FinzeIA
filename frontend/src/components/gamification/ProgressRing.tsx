// ProgressRing - Componente de anillo de progreso reutilizable
// Anillo SVG animado con configuración flexible y múltiples estilos

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { ProgressRingProps } from '../../types/gamification';

// ===== CONFIGURACIÓN =====

const DEFAULT_SIZE = 120;
const DEFAULT_STROKE_WIDTH = 8;
const DEFAULT_COLOR = '#2563EB'; // Azul de la aplicación
const DEFAULT_BACKGROUND_COLOR = '#E5E7EB';

// Presets de colores comunes
export const PROGRESS_COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  yellow: '#F59E0B',
  red: '#EF4444',
  indigo: '#6366F1',
  pink: '#EC4899',
  gradient: {
    blue: 'url(#gradient-blue)',
    purple: 'url(#gradient-purple)',
    rainbow: 'url(#gradient-rainbow)',
    fire: 'url(#gradient-fire)'
  }
} as const;

// ===== COMPONENTE PRINCIPAL =====

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  max,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  color = DEFAULT_COLOR,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
  showText = true,
  animate = true,
  className
}) => {
  // Cálculos del círculo
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  
  // Normalizar el progreso
  const normalizedProgress = Math.min(Math.max(progress, 0), max);
  const percentage = (normalizedProgress / max) * 100;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Identificar si es un gradiente
  const isGradient = typeof color === 'string' && color.startsWith('url(');

  // Generar ID único para gradientes
  const gradientId = React.useId();

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Definición de gradientes */}
        <defs>
          <linearGradient id={`gradient-blue-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id={`gradient-purple-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id={`gradient-rainbow-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="33%" stopColor="#EF4444" />
            <stop offset="66%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id={`gradient-fire-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="25%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>

        {/* Fondo verde del círculo */}
        <circle
          cx={center}
          cy={center}
          r={radius + strokeWidth/2}
          fill="#10B981"
          className="opacity-90"
        />

        {/* Círculo de fondo para el aro */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-30"
        />

        {/* Círculo de progreso */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke={
            color === PROGRESS_COLORS.gradient.blue ? `url(#gradient-blue-${gradientId})` :
            color === PROGRESS_COLORS.gradient.purple ? `url(#gradient-purple-${gradientId})` :
            color === PROGRESS_COLORS.gradient.rainbow ? `url(#gradient-rainbow-${gradientId})` :
            color === PROGRESS_COLORS.gradient.fire ? `url(#gradient-fire-${gradientId})` :
            color
          }
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: animate ? circumference : strokeDashoffset }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: animate ? 1.5 : 0,
            ease: [0.4, 0, 0.2, 1], // Custom easing curve
            delay: animate ? 0.2 : 0
          }}
          className={cn(
            'transition-all duration-300',
            percentage > 90 && 'drop-shadow-lg filter'
          )}
          style={{
            filter: percentage > 90 ? `drop-shadow(0 0 6px ${color}40)` : undefined
          }}
        />

        {/* Punto al final del progreso (opcional) */}
        {percentage > 5 && (
          <motion.circle
            cx={center + radius * Math.cos((percentage / 100) * 2 * Math.PI - Math.PI / 2)}
            cy={center + radius * Math.sin((percentage / 100) * 2 * Math.PI - Math.PI / 2)}
            r={strokeWidth / 3}
            fill={color}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: animate ? 0.5 : 0,
              delay: animate ? 1.2 : 0
            }}
            className="drop-shadow-sm"
          />
        )}
      </svg>

      {/* Texto central */}
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: animate ? 0.8 : 0,
              delay: animate ? 0.5 : 0,
              type: 'spring',
              stiffness: 200
            }}
            className="text-center"
          >
            <div className="text-2xl font-bold text-white leading-none drop-shadow-sm">
              {animate ? (
                <AnimatedNumber value={percentage} suffix="%" />
              ) : (
                `${Math.round(percentage)}%`
              )}
            </div>
            <div className="text-xs text-white/80 mt-1 drop-shadow-sm">
              {normalizedProgress.toLocaleString()} / {max.toLocaleString()}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// ===== COMPONENTE AUXILIAR: NÚMERO ANIMADO =====

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  duration?: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  value, 
  suffix = '', 
  duration = 1.5 
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      // Easing function (ease-out-cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = easedProgress * value;

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

  return <span>{Math.round(displayValue)}{suffix}</span>;
};

// ===== VARIANTES ESPECIALIZADAS =====

// Anillo de progreso pequeño para widgets
export const ProgressRingSmall: React.FC<{
  progress: number;
  max: number;
  color?: string;
  className?: string;
}> = ({ progress, max, color = PROGRESS_COLORS.blue, className }) => (
  <ProgressRing
    progress={progress}
    max={max}
    size={48}
    strokeWidth={4}
    color={color}
    showText={false}
    className={className}
  />
);

// Anillo de progreso con múltiples segmentos
export const ProgressRingMulti: React.FC<{
  segments: Array<{ value: number; color: string; label?: string }>;
  max: number;
  size?: number;
  className?: string;
}> = ({ segments, max, size = 120, className }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedProgress = 0;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Círculo de fondo */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={DEFAULT_BACKGROUND_COLOR}
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-30"
        />

        {/* Segmentos de progreso */}
        {segments.map((segment, index) => {
          const segmentPercentage = (segment.value / max) * 100;
          const startOffset = circumference - (accumulatedProgress / 100) * circumference;
          const segmentLength = (segmentPercentage / 100) * circumference;
          
          accumulatedProgress += segmentPercentage;

          return (
            <motion.circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: startOffset }}
              transition={{
                duration: 1.5,
                delay: index * 0.2,
                ease: [0.4, 0, 0.2, 1]
              }}
            />
          );
        })}
      </svg>

      {/* Texto central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-gray-900">
          {Math.round((accumulatedProgress))}%
        </div>
        <div className="text-xs text-gray-500">
          {segments.reduce((sum, seg) => sum + seg.value, 0).toLocaleString()} / {max.toLocaleString()}
        </div>
      </div>
    </div>
  );
};

// Anillo de progreso con etiquetas externas
export const ProgressRingLabeled: React.FC<{
  progress: number;
  max: number;
  label: string;
  sublabel?: string;
  color?: string;
  size?: number;
  className?: string;
}> = ({ progress, max, label, sublabel, color = PROGRESS_COLORS.blue, size = 120, className }) => (
  <div className={cn('flex flex-col items-center space-y-3', className)}>
    <ProgressRing
      progress={progress}
      max={max}
      size={size}
      color={color}
      showText={true}
    />
    <div className="text-center">
      <div className="font-semibold text-gray-900">{label}</div>
      {sublabel && <div className="text-sm text-gray-500">{sublabel}</div>}
    </div>
  </div>
);

// Anillo de progreso con animación de pulso para valores altos
export const ProgressRingPulse: React.FC<ProgressRingProps> = (props) => {
  const { progress, max } = props;
  const percentage = (progress / max) * 100;

  return (
    <motion.div
      animate={
        percentage > 90
          ? {
              scale: [1, 1.05, 1],
              opacity: [1, 0.9, 1]
            }
          : {}
      }
      transition={{
        duration: 2,
        repeat: percentage > 90 ? Infinity : 0,
        ease: 'easeInOut'
      }}
    >
      <ProgressRing {...props} />
    </motion.div>
  );
};

// Anillo de progreso especializado para FinScore con estilo verde y azul
export const ProgressRingFinScore: React.FC<{
  progress: number;
  max: number;
  level: number;
  size?: number;
  animate?: boolean;
  className?: string;
}> = ({ progress, max, level, size = 120, animate = true, className }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  
  // Normalizar el progreso
  const normalizedProgress = Math.min(Math.max(progress, 0), max);
  const percentage = (normalizedProgress / max) * 100;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Fondo verde del círculo completo */}
        <circle
          cx={center}
          cy={center}
          r={radius + strokeWidth/2}
          fill="#10B981"
          className="drop-shadow-md"
        />

        {/* Círculo de fondo para el aro (gris claro) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-40"
        />

        {/* Círculo de progreso azul de la aplicación */}
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
            delay: animate ? 0.2 : 0
          }}
          className="drop-shadow-sm"
          style={{
            filter: percentage > 80 ? 'drop-shadow(0 0 6px #2563EB60)' : undefined
          }}
        />

        {/* Punto brillante al final del progreso */}
        {percentage > 5 && (
          <motion.circle
            cx={center + radius * Math.cos((percentage / 100) * 2 * Math.PI - Math.PI / 2)}
            cy={center + radius * Math.sin((percentage / 100) * 2 * Math.PI - Math.PI / 2)}
            r={strokeWidth / 2.5}
            fill="#FFFFFF"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: animate ? 0.5 : 0,
              delay: animate ? 1.2 : 0
            }}
            className="drop-shadow-lg"
          />
        )}
      </svg>

      {/* Texto central con fondo verde y letras blancas */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: animate ? 0.8 : 0,
            delay: animate ? 0.5 : 0,
            type: 'spring',
            stiffness: 200
          }}
          className="text-center"
        >
          <div className="text-2xl font-bold text-white leading-none drop-shadow-lg">
            {level}
          </div>
          <div className="text-xs text-white/90 mt-0.5 drop-shadow-sm font-medium">
            NIVEL
          </div>
          <div className="text-lg font-bold text-white mt-1 drop-shadow-sm">
            {Math.round(percentage)}%
          </div>
          <div className="text-sm text-white/90 mt-0.5 drop-shadow-sm font-medium">
            {normalizedProgress.toLocaleString()} pts
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProgressRing;