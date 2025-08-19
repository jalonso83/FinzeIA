// FinScoreProgressBar - Barra de progreso elegante para Índice FinZen
// Sistema de niveles con progreso verde y animaciones suaves - v2.0 Nueva escala

import React from 'react';
import { motion } from 'framer-motion';

interface FinScoreProgressBarProps {
  currentScore: number;
  level: number;
  levelName?: string;
  pointsToNextLevel: number;
  animate?: boolean;
  className?: string;
}

// Función para calcular rangos de niveles basados en Índice FinZen
const getLevelRange = (level: number): { min: number; max: number } => {
  switch (level) {
    case 1: return { min: 0, max: 54 };
    case 2: return { min: 55, max: 69 };
    case 3: return { min: 70, max: 81 };
    case 4: return { min: 82, max: 91 };
    case 5: return { min: 92, max: 100 };
    default: return { min: 0, max: 54 };
  }
};

const FinScoreProgressBar: React.FC<FinScoreProgressBarProps> = ({
  currentScore,
  level,
  levelName,
  pointsToNextLevel,
  animate = true,
  className
}) => {
  // Calcular progreso del nivel actual con nueva escala
  const currentLevelRange = getLevelRange(level);
  const progressInLevel = currentScore - currentLevelRange.min;
  const totalNeededInLevel = currentLevelRange.max - currentLevelRange.min + 1;
  const progressPercentage = (progressInLevel / totalNeededInLevel) * 100;

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-gray-800 mb-1">
          NIVEL {level}
        </div>
        <div className="text-sm text-gray-600">
          Índice FinZen - {levelName || 'Principiante'}
        </div>
      </div>

      {/* Barra de progreso principal */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-600">
            {currentScore}/100
          </span>
          <span className="text-xs font-medium text-gray-600">
            Siguiente nivel
          </span>
        </div>
        
        {/* Contenedor de la barra */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full shadow-lg"
            initial={{ width: animate ? 0 : `${Math.min(progressPercentage, 100)}%` }}
            animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
            transition={{
              duration: animate ? 1.5 : 0,
              ease: [0.4, 0, 0.2, 1],
              delay: animate ? 0.3 : 0
            }}
            style={{
              boxShadow: progressPercentage > 80 ? '0 0 10px rgba(34, 197, 94, 0.5)' : undefined
            }}
          />
        </div>

        {/* Progreso en porcentaje */}
        <div className="text-center mt-2">
          <motion.span
            className="text-lg font-bold text-green-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: animate ? 1 : 0 }}
          >
            {Math.round(progressPercentage)}%
          </motion.span>
        </div>
      </div>

      {/* Información adicional */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Para siguiente nivel:</span>
          <span className="font-medium text-green-600">
            {pointsToNextLevel === 0 ? 'Nivel máximo' : `+${pointsToNextLevel} puntos`}
          </span>
        </div>
      </div>

    </div>
  );
};

export default FinScoreProgressBar;