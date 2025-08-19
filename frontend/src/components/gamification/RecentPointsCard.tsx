// RecentPointsCard - Componente para mostrar puntos ganados en los últimos 30 días
// Display simple y claro de actividad reciente

import React from 'react';
import { motion } from 'framer-motion';

interface RecentPointsCardProps {
  points: number;
  animate?: boolean;
  className?: string;
}

const RecentPointsCard: React.FC<RecentPointsCardProps> = ({
  points,
  animate = true,
  className
}) => {
  return (
    <div className={`bg-white rounded-lg p-4 text-center ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <div className="text-2xl mb-2">🎮</div>
        <div className="text-sm text-gray-600 font-medium">
          Puntos Recientes
        </div>
      </div>

      {/* Número principal */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: animate ? 0.8 : 0,
          delay: animate ? 0.2 : 0,
          type: 'spring',
          stiffness: 200
        }}
        className="mb-3"
      >
        <div className="text-3xl font-bold text-blue-600">
          +{points.toLocaleString()}
        </div>
      </motion.div>

      {/* Subtitle */}
      <div className="text-sm text-gray-500 mb-4">
        últimos 30 días
      </div>

      {/* Indicador de actividad */}
      <div className="flex justify-center">
        <motion.div
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            points > 100 
              ? 'bg-blue-100 text-blue-800' 
              : points > 50 
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <span className="mr-1">
            {points > 100 ? '🚀' : points > 50 ? '📈' : '📊'}
          </span>
          {points > 100 ? 'Muy activo' : points > 50 ? 'Activo' : 'Actividad'}
        </motion.div>
      </div>
    </div>
  );
};

export default RecentPointsCard;